$(document).ready(function () {
    const list = $('#notificationList');
    const loading = $('#notificationLoading');
    const empty = $('#notificationEmpty');
    const error = $('#notificationError');
    const categories = $('#notificationCategories');
    const range = $('#notificationRange');
    const includeDismissed = $('#includeDismissed');
    const prevBtn = $('#notifPrev');
    const nextBtn = $('#notifNext');
    const pages = $('#notifPages');
    const retryBtn = $('#notificationRetry');
    const adminModal = $('#notificationAdminModal');
    const adminOpenBtn = $('#openNotificationAdmin');
    const adminCloseBtn = $('#notificationAdminClose');
    const adminCancelBtn = $('#notifAdminCancel');
    const adminSaveBtn = $('#notifAdminSave');
    const adminTitle = $('#notifAdminTitle');
    const adminBody = $('#notifAdminBody');
    const adminCategory = $('#notifAdminCategory');
    const adminPriority = $('#notifAdminPriority');
    const adminPublish = $('#notifAdminPublish');
    const adminExpiry = $('#notifAdminExpiry');
    const adminError = $('#notifAdminError');
    const adminLinkBtn = $('.notif-editor-link');
    const adminCmdBtns = $('.notif-editor-btn');

    let currentPage = 1;
    let totalPages = 1;
    let selectedCategory = 'all';
    let cachedCategories = [];
    let editorRange = null;

    function escapeHtml(value) {
        return $('<div>').text(value ?? '').html();
    }

    function fetchNotifications() {
        loading.removeClass('hidden');
        error.addClass('hidden');
        empty.addClass('hidden');
        list.empty();
        const days = range.val();
        const url = `/api/notifications/?days=${days}&page=${currentPage}&page_size=8`;
        fetch(url)
            .then((res) => res.json())
            .then((data) => {
                loading.addClass('hidden');
                cachedCategories = data.categories || [];
                renderCategories(cachedCategories);
                renderAdminCategories(cachedCategories);
                const allItems = data.notifications || [];
                const filteredDismissed = includeDismissed.is(':checked')
                    ? allItems
                    : allItems.filter(n => !n.dismissed);
                const items = selectedCategory === 'all'
                    ? filteredDismissed
                    : filteredDismissed.filter(n => n.category && n.category.slug === selectedCategory);
                totalPages = data.pagination?.total_pages || 1;
                if (!items.length) {
                    empty.removeClass('hidden');
                } else {
                    renderNotifications(items);
                }
                renderPagination();
            })
            .catch(() => {
                loading.addClass('hidden');
                error.removeClass('hidden');
                console.error('Failed to load notifications');
            });
    }

    function renderCategories(items) {
        if (!items.length) return;
        categories.empty();
        categories.append(`<button class="notif-category-btn ${selectedCategory === 'all' ? 'bg-primary/15 text-primary border-primary/30' : ''} rounded-full border border-slate-200 dark:border-[#334155] px-3 py-1 text-xs font-semibold" data-category="all">All</button>`);
        items.forEach((cat) => {
            const active = selectedCategory === cat.slug ? 'bg-primary/15 text-primary border-primary/30' : '';
            categories.append(`<button class="notif-category-btn ${active} rounded-full border border-slate-200 dark:border-[#334155] px-3 py-1 text-xs font-semibold" data-category="${escapeHtml(cat.slug)}">${escapeHtml(cat.name)}</button>`);
        });
    }

    function renderAdminCategories(items) {
        if (!adminCategory.length || !items.length) return;
        adminCategory.empty();
        items.forEach((cat) => {
            adminCategory.append(`<option value="${escapeHtml(cat.id)}">${escapeHtml(cat.name)}</option>`);
        });
    }

    function formatLocalDateTime(value) {
        const date = value instanceof Date ? value : new Date();
        const pad = (num) => String(num).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    function openAdminModal() {
        if (!adminModal.length) return;
        adminError.addClass('hidden');
        adminTitle.val('');
        adminBody.html('');
        adminPriority.val('normal');
        if (cachedCategories.length) {
            renderAdminCategories(cachedCategories);
        }
        adminPublish.val(formatLocalDateTime(new Date()));
        adminExpiry.val('');
        adminModal.removeClass('hidden');
        adminTitle.trigger('focus');
        $('body').addClass('overflow-hidden');
    }

    function closeAdminModal() {
        if (!adminModal.length) return;
        adminModal.addClass('hidden');
        $('body').removeClass('overflow-hidden');
    }

    function getEditorHtml() {
        return (adminBody.html() || '').trim();
    }

    function focusEditorAtEnd() {
        const el = adminBody[0];
        if (!el) return;
        el.focus();
        const selection = window.getSelection();
        if (!selection) return;
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function saveEditorSelection() {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        if (adminBody[0] && adminBody[0].contains(range.commonAncestorContainer)) {
            editorRange = range;
        }
    }

    function restoreEditorSelection() {
        const selection = window.getSelection();
        if (!selection) return false;
        if (editorRange) {
            selection.removeAllRanges();
            selection.addRange(editorRange);
            return true;
        }
        return false;
    }

    function renderNotifications(items) {
        list.empty();
        items.forEach((notif) => {
            const unread = !notif.read;
            const priority = notif.priority || 'normal';
            const badge = priority === 'critical'
                ? 'bg-red-100 text-red-700'
                : priority === 'high'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 text-slate-600';
            const date = notif.published_at ? new Date(notif.published_at).toLocaleString() : '';
            const card = $(`
                <div class="rounded-xl border border-slate-200 dark:border-[#283039] bg-white dark:bg-surface-dark px-4 py-4 shadow-sm ${unread ? 'ring-1 ring-primary/30' : ''}" data-notif-id="${notif.id}">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                        <div class="min-w-0">
                            <div class="flex items-center gap-2">
                                ${unread ? '<span class="inline-flex h-2 w-2 rounded-full bg-primary"></span>' : ''}
                                <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">${escapeHtml(notif.title)}</h3>
                                ${unread ? '<span class="inline-flex rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">Unread</span>' : ''}
                            </div>
                            <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">${escapeHtml(date)}</div>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="inline-flex items-center rounded-full ${badge} px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">${escapeHtml(priority)}</span>
                            <span class="inline-flex items-center rounded-full border border-slate-200/70 dark:border-slate-700/70 bg-slate-50 dark:bg-surface-highlight px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">${escapeHtml(notif.category?.name || '')}</span>
                        </div>
                    </div>
                    <div class="prose prose-sm dark:prose-invert mt-3 max-w-none">${notif.body || ''}</div>
                    <div class="mt-4 flex flex-wrap items-center gap-2">
                        <button class="notif-read-btn rounded-lg border border-emerald-200 dark:border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200 px-3 py-1.5 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-500/20" data-id="${notif.id}" data-read="${notif.read}">
                            ${notif.read ? 'Mark unread' : 'Mark read'}
                        </button>
                        <button class="notif-dismiss-btn rounded-lg border border-red-200 dark:border-red-500/40 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-200 px-3 py-1.5 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-500/20" data-id="${notif.id}" data-dismiss="${notif.dismissed}">
                            ${notif.dismissed ? 'Undismiss' : 'Dismiss'}
                        </button>
                    </div>
                </div>
            `);
            card.find('.prose a').each(function () {
                const anchor = $(this);
                anchor.addClass('notif-body-link');
                if (!anchor.find('.notif-link-icon').length) {
                    anchor.append(' <span class="material-symbols-outlined notif-link-icon" aria-hidden="true">link</span>');
                }
                anchor.attr('target', '_blank').attr('rel', 'noopener noreferrer');
            });
            list.append(card);
        });
    }

    function renderPagination() {
        pages.empty();
        prevBtn.prop('disabled', currentPage <= 1);
        nextBtn.prop('disabled', currentPage >= totalPages);
        if (totalPages <= 1) return;
        const maxButtons = 5;
        let start = Math.max(1, currentPage - 2);
        let end = Math.min(totalPages, start + maxButtons - 1);
        if (end - start < maxButtons - 1) {
            start = Math.max(1, end - maxButtons + 1);
        }

        const addBtn = (page, label = null) => {
            const active = page === currentPage ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-highlight';
            const btn = $(`<button type="button" class="min-w-[32px] rounded-md px-2 py-1 text-xs font-semibold ${active}"></button>`);
            btn.text(label || page);
            btn.on('click', function () {
                currentPage = page;
                fetchNotifications();
            });
            pages.append(btn);
        };

        if (start > 1) {
            addBtn(1);
            if (start > 2) pages.append('<span class="px-1 text-xs text-slate-400">…</span>');
        }

        for (let i = start; i <= end; i += 1) addBtn(i);

        if (end < totalPages) {
            if (end < totalPages - 1) pages.append('<span class="px-1 text-xs text-slate-400">…</span>');
            addBtn(totalPages);
        }
    }

    range.on('change', function () {
        currentPage = 1;
        fetchNotifications();
    });

    includeDismissed.on('change', function () {
        currentPage = 1;
        fetchNotifications();
    });

    retryBtn.on('click', function () {
        fetchNotifications();
    });

    categories.on('click', '.notif-category-btn', function () {
        selectedCategory = $(this).data('category');
        currentPage = 1;
        fetchNotifications();
    });

    list.on('click', '.notif-read-btn', function () {
        const id = $(this).data('id');
        const next = $(this).data('read') ? false : true;
        fetch(`/api/notifications/${id}/state/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || ''
            },
            body: JSON.stringify({ read: next })
        }).then(() => fetchNotifications());
    });

    list.on('click', '.notif-dismiss-btn', function () {
        const id = $(this).data('id');
        const next = $(this).data('dismiss') ? false : true;
        fetch(`/api/notifications/${id}/state/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || ''
            },
            body: JSON.stringify({ dismiss: next })
        }).then(() => fetchNotifications());
    });

    if (adminModal.length) {
        adminOpenBtn.on('click', openAdminModal);
        adminCloseBtn.on('click', closeAdminModal);
        adminCancelBtn.on('click', closeAdminModal);

        adminModal.on('click', function (event) {
            if (event.target === adminModal[0] || $(event.target).hasClass('absolute')) {
                closeAdminModal();
            }
        });

        $(document).on('keydown', function (event) {
            if (event.key === 'Escape' && !adminModal.hasClass('hidden')) {
                closeAdminModal();
            }
        });

        adminBody.on('keyup mouseup', function () {
            saveEditorSelection();
        });

        adminBody.on('focus', function () {
            if (!restoreEditorSelection()) {
                focusEditorAtEnd();
            }
        });

        adminCmdBtns.on('mousedown', function (event) {
            event.preventDefault();
        });

        adminCmdBtns.on('click', function (event) {
            event.preventDefault();
            const command = $(this).data('cmd');
            if (!restoreEditorSelection()) {
                focusEditorAtEnd();
            }
            document.execCommand(command, false, null);
            saveEditorSelection();
        });

        adminLinkBtn.on('mousedown', function (event) {
            event.preventDefault();
        });

        adminLinkBtn.on('click', function (event) {
            event.preventDefault();
            if (!restoreEditorSelection()) {
                focusEditorAtEnd();
            }
            let url = prompt('Enter link URL');
            if (url) {
                url = url.trim();
                if (!/^https?:\/\//i.test(url)) {
                    url = `https://${url}`;
                }
                restoreEditorSelection();
                const selection = window.getSelection();
                const selectedText = selection && selection.toString() ? selection.toString() : '';
                if (selectedText) {
                    document.execCommand('createLink', false, url);
                } else {
                    const label = prompt('Link text', url);
                    const safeLabel = label ? escapeHtml(label) : escapeHtml(url);
                    document.execCommand('insertHTML', false, `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${safeLabel}</a>`);
                }
                const anchors = adminBody.find('a');
                anchors.attr('target', '_blank').attr('rel', 'noopener noreferrer');
                saveEditorSelection();
            }
        });

        adminSaveBtn.on('click', function () {
            const payload = {
                title: (adminTitle.val() || '').trim(),
                body: getEditorHtml(),
                category_id: adminCategory.val(),
                priority: adminPriority.val(),
                published_at: adminPublish.val(),
                expires_at: adminExpiry.val() || null
            };

            if (!payload.title || !payload.body || !payload.category_id) {
                adminError.removeClass('hidden');
                return;
            }
            adminError.addClass('hidden');

            fetch('/api/notifications/create/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || ''
                },
                body: JSON.stringify(payload)
            })
                .then((res) => {
                    if (!res.ok) {
                        throw new Error('Failed');
                    }
                    return res.json();
                })
                .then(() => {
                    closeAdminModal();
                    fetchNotifications();
                })
                .catch(() => {
                    adminError.text('Unable to publish announcement right now.').removeClass('hidden');
                });
        });
    }

    fetchNotifications();
});
