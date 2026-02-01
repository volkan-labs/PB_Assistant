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

    let currentPage = 1;
    let totalPages = 1;
    let selectedCategory = 'all';

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
                renderCategories(data.categories || []);
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

    fetchNotifications();
});
