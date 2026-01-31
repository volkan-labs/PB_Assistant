$(document).ready(function () {
    // Make sure the overlay is hidden on page load
    $('#loading-overlay').addClass('hidden');

    const userActionsButton = $('#userActionsButton');
    const userActionsMenu = $('#userActionsMenu');
    const userAvatarButton = $('#userAvatarButton');

    if (userActionsButton.length && userActionsMenu.length) {
        userActionsButton.on('click', function (e) {
            e.stopPropagation();
            userActionsMenu.toggleClass('hidden');
        });

        if (userAvatarButton.length) {
            userAvatarButton.on('click', function (e) {
                if (!$('body').hasClass('sidebar-collapsed')) return;
                e.stopPropagation();
                userActionsMenu.toggleClass('hidden');
            });
        }

        userActionsMenu.on('click', function (e) {
            e.stopPropagation();
        });

        $(document).on('click', function () {
            userActionsMenu.addClass('hidden');
        });

        $(document).on('keydown', function (e) {
            if (e.key === 'Escape') {
                userActionsMenu.addClass('hidden');
            }
        });
    }

    const sidebarToggle = $('#sidebarToggle');
    const leftSidebar = $('#leftSidebar');
    const sidebarBackdrop = $('#sidebarBackdrop');
    const sidebarCollapseToggle = $('#sidebarCollapseToggle');
    const sidebarCollapseToggleCollapsed = $('#sidebarCollapseToggleCollapsed');
    const rightSidebarCollapseToggle = $('#rightSidebarCollapseToggle');

    function closeSidebar() {
        leftSidebar.addClass('max-md:-translate-x-full').removeClass('max-md:translate-x-0').attr('aria-hidden', 'true');
        sidebarBackdrop.addClass('hidden');
        $('body').removeClass('overflow-hidden');
    }

    function openSidebar() {
        leftSidebar.removeClass('max-md:-translate-x-full').addClass('max-md:translate-x-0').attr('aria-hidden', 'false');
        sidebarBackdrop.removeClass('hidden');
        $('body').addClass('overflow-hidden');
    }

    if (sidebarToggle.length && leftSidebar.length) {
        sidebarToggle.on('click', function () {
            if (leftSidebar.hasClass('max-md:-translate-x-full')) {
                openSidebar();
            } else {
                closeSidebar();
            }
        });

        sidebarBackdrop.on('click', closeSidebar);

        $(document).on('keydown', function (e) {
            if (e.key === 'Escape') {
                closeSidebar();
            }
        });
    }

    function setSidebarCollapsed(isCollapsed) {
        const body = $('body');
        const icon = sidebarCollapseToggle.find('.material-symbols-outlined');
        if (isCollapsed) {
            body.addClass('sidebar-collapsed');
            sidebarCollapseToggle.attr('aria-label', 'Expand sidebar').attr('aria-pressed', 'true');
            if (icon.length) icon.text('menu');
        } else {
            body.removeClass('sidebar-collapsed');
            sidebarCollapseToggle.attr('aria-label', 'Collapse sidebar').attr('aria-pressed', 'false');
            if (icon.length) icon.text('menu');
        }
        localStorage.setItem('uiCollapseNavigation', isCollapsed ? 'true' : 'false');
        $('#uiCollapseNavigationToggle').prop('checked', isCollapsed);
    }

    if (sidebarCollapseToggle.length || sidebarCollapseToggleCollapsed.length) {
        const storedCollapsed = localStorage.getItem('uiCollapseNavigation') === 'true';
        setSidebarCollapsed(storedCollapsed);
        sidebarCollapseToggle.on('click', function () {
            setSidebarCollapsed(!$('body').hasClass('sidebar-collapsed'));
        });
        sidebarCollapseToggleCollapsed.on('click', function () {
            setSidebarCollapsed(false);
        });
    }

    function setRightSidebarCollapsed(isCollapsed) {
        const body = $('body');
        if (isCollapsed) {
            body.addClass('right-sidebar-collapsed');
            rightSidebarCollapseToggle.attr('aria-label', 'Expand right sidebar').attr('aria-pressed', 'true');
        } else {
            body.removeClass('right-sidebar-collapsed');
            rightSidebarCollapseToggle.attr('aria-label', 'Collapse right sidebar').attr('aria-pressed', 'false');
        }
        localStorage.setItem('uiCollapseInsights', isCollapsed ? 'true' : 'false');
        $('#uiCollapseInsightsToggle').prop('checked', isCollapsed);
    }

    if (rightSidebarCollapseToggle.length) {
        const storedRightCollapsed = localStorage.getItem('uiCollapseInsights') === 'true';
        setRightSidebarCollapsed(storedRightCollapsed);
        rightSidebarCollapseToggle.on('click', function () {
            setRightSidebarCollapsed(!$('body').hasClass('right-sidebar-collapsed'));
        });
    }

    // UI behavior toggles (persist immediately)
    $('#uiCollapseInsightsToggle').on('change', function () {
        const isCollapsed = $(this).is(':checked');
        localStorage.setItem('uiCollapseInsights', isCollapsed);
        setRightSidebarCollapsed(isCollapsed);
    });

    $('#uiCollapseNavigationToggle').on('change', function () {
        const isCollapsed = $(this).is(':checked');
        localStorage.setItem('uiCollapseNavigation', isCollapsed);
        setSidebarCollapsed(isCollapsed);
    });

    $('#uiSyncLayoutToggle').on('change', function () {
        if ($(this).is(':disabled')) return; // coming soon
        const enabled = $(this).is(':checked');
        localStorage.setItem('uiSyncLayout', enabled);
    });

    // Spotlight search
    const spotlightOverlay = $('#spotlightOverlay');
    const spotlightInput = $('#spotlightInput');
    const spotlightResults = $('#spotlightResults');
    const spotlightOpen = $('#spotlightOpen');
    const spotlightHint = $('#spotlightHint');
    const newChatHint = $('#newChatHint');
    const spotlightClose = $('#spotlightClose');
    const spotlightFilterButtons = $('[data-spotlight-filter]');
    let spotlightItems = [];
    let spotlightIndex = -1;

    function initUserAvatarInitials() {
        const avatarName = $('.user-meta').data('user-name');
        const avatarInitials = $('#userAvatarInitials');
        const avatarImage = $('#userAvatarImage');
        if (!avatarInitials.length || !avatarImage.length) return;
        if (!avatarName || typeof avatarName !== 'string') {
            avatarInitials.addClass('hidden');
            avatarImage.removeClass('hidden');
            return;
        }
        const parts = avatarName.trim().split(/\s+/).filter(Boolean);
        const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
        if (!initials) {
            avatarInitials.addClass('hidden');
            avatarImage.removeClass('hidden');
            return;
        }
        avatarInitials.text(initials);
        avatarInitials.removeClass('hidden').addClass('flex');
        avatarImage.addClass('hidden');
    }
    let spotlightFilter = 'all';

    function renderSpotlight(items, showNewChat) {
        spotlightResults.empty();
        if (showNewChat) {
            spotlightResults.append(`
                <button type="button" id="spotlightNewChat"
                    class="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background-light dark:focus-visible:ring-offset-background-dark">
                    <div class="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        <span class="material-symbols-outlined text-[18px] text-slate-400">edit_document</span>
                        New chat
                    </div>
                </button>
            `);
        }
        if (!items.length) {
            spotlightResults.append('<div class="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">No matches found.</div>');
            return;
        }
        items.forEach((item, idx) => {
            const isActive = idx === spotlightIndex;
            const row = $(`
                <button type="button" class="w-full text-left px-4 py-3 transition-colors ${isActive ? 'bg-primary/10' : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'} focus:outline-none">
                    <div class="flex items-center justify-between gap-3">
                        <div class="min-w-0">
                            <div class="truncate text-sm font-medium text-slate-700 dark:text-slate-200">${item.title}</div>
                            <div class="text-xs text-slate-400 dark:text-slate-500">${timeAgo(item.timestamp)}</div>
                        </div>
                        <span class="material-symbols-outlined text-[18px] text-slate-400">arrow_forward</span>
                    </div>
                </button>
            `);
            row.on('click', () => {
                if (item.folder_id) {
                    const openFolders = JSON.parse(localStorage.getItem('openFolders') || '[]');
                    const folderKey = `folder-${item.folder_id}`;
                    if (!openFolders.includes(folderKey)) {
                        openFolders.push(folderKey);
                        localStorage.setItem('openFolders', JSON.stringify(openFolders));
                    }
                }
                window.location.href = `/history-item/${item.id}`;
            });
            spotlightResults.append(row);
        });
    }

    function filterSpotlight() {
        const q = (spotlightInput.val() || '').trim().toLowerCase();
        let filtered = spotlightItems;

        if (spotlightFilter === 'folders') {
            filtered = filtered.filter(item => item.folder_id);
        } else if (spotlightFilter === 'unfiled') {
            filtered = filtered.filter(item => !item.folder_id);
        }

        const showNewChat = !q;
        if (q) {
            filtered = filtered.filter(item => (item.title || '').toLowerCase().includes(q));
        }

        spotlightIndex = filtered.length ? 0 : -1;
        const limit = q ? 20 : 10;
        renderSpotlight(filtered.slice(0, limit), showNewChat);
    }

    function openSpotlight() {
        spotlightOverlay.removeClass('hidden');
        $('body').addClass('overflow-hidden');
        setTimeout(() => spotlightInput.trigger('focus'), 50);
        if (spotlightFilterButtons.length) {
            setSpotlightFilter('all');
        }
        if (!spotlightItems.length) {
        spotlightResults.html(`
            <button type="button" id="spotlightNewChat"
                class="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background-light dark:focus-visible:ring-offset-background-dark">
                <div class="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <span class="material-symbols-outlined text-[18px] text-slate-400">edit_document</span>
                    New chat
                </div>
            </button>
            <div class="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">Loading history...</div>
        `);
            $.getJSON('/history/').done(function (data) {
                spotlightItems = Array.isArray(data) ? data : [];
                filterSpotlight();
            }).fail(function () {
                spotlightResults.html('<div class="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">Failed to load history.</div>');
            });
        } else {
            filterSpotlight();
        }
    }

    function closeSpotlight() {
        spotlightOverlay.addClass('hidden');
        $('body').removeClass('overflow-hidden');
        spotlightInput.val('');
        spotlightIndex = -1;
    }

    if (spotlightOpen.length) {
        spotlightOpen.on('click', function () {
            openSpotlight();
        });
    }

    if (spotlightHint.length) {
        const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
        if (!isMac) {
            spotlightHint.html('<span class="rounded border border-slate-300/70 dark:border-slate-600/70 px-2 py-0.5">Ctrl + K</span>');
        }
    }
    if (newChatHint.length) {
        const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
        if (!isMac) {
            newChatHint.html('<span class="rounded border border-slate-300/70 dark:border-slate-600/70 px-2 py-0.5">Shift + Ctrl + O</span>');
        }
    }

    $('.nav-tooltip').each(function () {
        const tooltip = $(this);
        const base = tooltip.data('tooltip');
        const mac = tooltip.data('shortcut-mac');
        const win = tooltip.data('shortcut-win');
        if (!base) return;
        const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
        const shortcut = isMac ? mac : win;
        tooltip.text(shortcut ? `${base} · ${shortcut}` : base);
    });

    const settingsShortcutHint = $('#settingsShortcutHint');
    if (settingsShortcutHint.length) {
        const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
        settingsShortcutHint.text(isMac ? '⌘ ⇧ S' : 'Ctrl + Shift + S');
    }

    if (spotlightClose.length) {
        spotlightClose.on('click', function () {
            closeSpotlight();
        });
    }

    initUserAvatarInitials();

    function setSpotlightFilter(filter) {
        spotlightFilter = filter;
        spotlightFilterButtons.removeClass('bg-primary/15 text-primary border-primary/30');
        spotlightFilterButtons.filter(`[data-spotlight-filter="${filter}"]`)
            .addClass('bg-primary/15 text-primary border-primary/30');
        filterSpotlight();
    }

    if (spotlightFilterButtons.length) {
        setSpotlightFilter('all');
        spotlightFilterButtons.on('click', function () {
            setSpotlightFilter($(this).data('spotlight-filter'));
        });
    }

    const settingsModal = $('#settingsModal');
    const settingsModalClose = $('#settingsModalClose');
    const openSettingsModal = $('#openSettingsModal');
    const settingsTabButtons = $('.settings-tab-btn');

    function openSettings() {
        settingsModal.removeClass('hidden');
        $('body').addClass('overflow-hidden');
        const active = settingsTabButtons.first();
        if (active.length) {
            settingsTabButtons.removeClass('settings-tab-active');
            active.addClass('settings-tab-active');
            const panel = active.data('settings-tab');
            $('.settings-panel').addClass('hidden');
            $(`[data-settings-panel="${panel}"]`).removeClass('hidden');
        }
        // Initialize UI behavior toggles from localStorage
        const uiCollapseInsights = localStorage.getItem('uiCollapseInsights') === 'true';
        const uiCollapseNavigation = localStorage.getItem('uiCollapseNavigation') === 'true';
        const uiSyncLayout = localStorage.getItem('uiSyncLayout') === 'true';
        $('#uiCollapseInsightsToggle').prop('checked', uiCollapseInsights);
        $('#uiCollapseNavigationToggle').prop('checked', uiCollapseNavigation);
        $('#uiSyncLayoutToggle').prop('checked', uiSyncLayout);
    }

    function closeSettings() {
        settingsModal.addClass('hidden');
        $('body').removeClass('overflow-hidden');
    }

    if (openSettingsModal.length) {
        openSettingsModal.on('click', function (e) {
            e.preventDefault();
            openSettings();
        });
    }

    if (settingsModalClose.length) {
        settingsModalClose.on('click', function () {
            closeSettings();
        });
    }

    settingsTabButtons.on('click', function () {
        const btn = $(this);
        settingsTabButtons.removeClass('settings-tab-active');
        btn.addClass('settings-tab-active');
        const panel = btn.data('settings-tab');
        $('.settings-panel').addClass('hidden');
        $(`[data-settings-panel="${panel}"]`).removeClass('hidden');
    });

    const themeChoiceButtons = $('.theme-choice-btn');
    function applyThemeChoice(choice) {
        themeChoiceButtons.removeClass('bg-primary/15 text-primary border-primary/30');
        themeChoiceButtons.filter(`[data-theme-choice="${choice}"]`)
            .addClass('bg-primary/15 text-primary border-primary/30');
    }

    if (themeChoiceButtons.length) {
        const storedTheme = localStorage.getItem('theme') || 'system';
        applyThemeChoice(storedTheme);
        themeChoiceButtons.on('click', function () {
            const choice = $(this).data('theme-choice');
            localStorage.setItem('theme', choice);
            applyThemeChoice(choice);
            if (choice === 'dark') {
                document.documentElement.classList.add('dark');
            } else if (choice === 'light') {
                document.documentElement.classList.remove('dark');
            } else {
                if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            }
        });
    }

    const defaultModelSelect = $('#defaultModelSelect');
    if (defaultModelSelect.length) {
        defaultModelSelect.html('<option>Loading models…</option>').prop('disabled', true);
        fetch('/api/ollama/models/')
            .then(res => res.json().then(data => ({ ok: res.ok, data })))
            .then(({ ok, data }) => {
                if (!ok) throw new Error(data.error || 'Failed to fetch models');
                const models = data.models || [];
                if (!models.length) {
                    defaultModelSelect.html('<option value="">No models found</option>');
                    return;
                }
                const saved = localStorage.getItem('defaultLlmModel') || '';
                defaultModelSelect.html(models.map(n => `<option value="${n}">${n}</option>`).join(''));
                if (saved && models.includes(saved)) {
                    defaultModelSelect.val(saved);
                }
                defaultModelSelect.prop('disabled', false);
            })
            .catch(() => {
                defaultModelSelect.html('<option value="">Error loading models</option>');
            });

        defaultModelSelect.on('change', function () {
            const val = $(this).val();
            localStorage.setItem('defaultLlmModel', val);
            const mainSelect = $('#ollamaModels');
            if (mainSelect.length) {
                mainSelect.val(val);
                mainSelect.trigger('change');
            }
        });
    }

    const rssAlertsToggle = $('#rssAlertsToggle');
    if (rssAlertsToggle.length) {
        if (!rssAlertsToggle.is(':disabled')) {
            const storedAlerts = localStorage.getItem('rssAlertsEnabled');
            if (storedAlerts !== null) {
                rssAlertsToggle.prop('checked', storedAlerts === 'true');
            }
            rssAlertsToggle.on('change', function () {
                localStorage.setItem('rssAlertsEnabled', $(this).is(':checked'));
            });
        }
    }

    const searchBehaviorToggle = $('#searchBehaviorToggle');
    if (searchBehaviorToggle.length) {
        const storedBehavior = localStorage.getItem('searchBehaviorEnabled');
        if (storedBehavior !== null) {
            searchBehaviorToggle.prop('checked', storedBehavior === 'true');
        }
        searchBehaviorToggle.on('change', function () {
            if ($(this).is(':disabled')) return; // coming soon
            localStorage.setItem('searchBehaviorEnabled', $(this).is(':checked'));
        });
    }

    const modalInterestsGrid = $('#modal-interests-planetary-boundaries-grid');

    function createBoundaryChip(boundary) {
        return `
            <label class="relative cursor-pointer h-full">
                <input class="peer sr-only" type="checkbox" name="interest_boundary" value="${boundary.name}" data-boundary-id="${boundary.id}" />
                <div class="h-full min-h-[64px] px-4 py-3 rounded-xl text-sm font-medium border border-slate-200 dark:border-[#2a3447] bg-white dark:bg-surface-dark text-slate-600 dark:text-slate-300 peer-checked:bg-primary/10 peer-checked:text-primary peer-checked:border-primary transition-all flex items-center justify-between gap-2 hover:border-primary/50">
                    <span class="text-left leading-snug line-clamp-3">${boundary.name}</span>
                    <span class="material-symbols-outlined text-[20px] opacity-0 peer-checked:opacity-100 transition-opacity flex-shrink-0">check_circle</span>
                </div>
            </label>
        `;
    }

    if (modalInterestsGrid.length) {
        fetch('/api/planetary-boundaries/')
            .then(res => res.json().then(data => ({ ok: res.ok, data })))
            .then(({ ok, data }) => {
                if (!ok || !Array.isArray(data)) throw new Error('Failed to load boundaries');
                modalInterestsGrid.html(data.map(createBoundaryChip).join(''));
                modalInterestsGrid.on('change', 'input[name="interest_boundary"]', async function () {
                    const selected = modalInterestsGrid.find('input[name="interest_boundary"]:checked')
                        .map((_, cb) => cb.dataset.boundaryId).get();
                    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
                    try {
                        await fetch('/api/preferences/save/', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {})
                            },
                            body: JSON.stringify({
                                default_llm: localStorage.getItem('defaultLlmModel'),
                                interface_theme: localStorage.getItem('theme'),
                                planetary_boundary_interests: selected
                            })
                        });
                    } catch (e) {}
                });
            })
            .catch(() => {
                modalInterestsGrid.html('<p class="text-sm text-red-500 mt-2 col-span-full">Error loading planetary boundaries.</p>');
            });
    }

    settingsModal.on('click', function (e) {
        if ($(e.target).is('#settingsModal, #settingsModal > .absolute')) {
            closeSettings();
        }
    });


    spotlightOverlay.on('click', function (e) {
        if ($(e.target).is('#spotlightOverlay, #spotlightOverlay > .absolute')) {
            closeSpotlight();
        }
    });

    spotlightInput.on('input', function () {
        filterSpotlight();
    });

    spotlightResults.on('click', '#spotlightNewChat', function () {
        closeSpotlight();
        window.location.href = '/index';
    });

    // Capture shortcuts early to avoid conflicts with focused inputs or other handlers
    document.addEventListener('keydown', function (e) {
        const key = e.key.toLowerCase();
        if ((e.metaKey || e.ctrlKey) && key === 'k') {
            e.preventDefault();
            openSpotlight();
            return;
        }
        if (e.shiftKey && (e.metaKey || e.ctrlKey) && key === 'o') {
            e.preventDefault();
            window.location.href = '/index';
            return;
        }
        if (e.shiftKey && (e.metaKey || e.ctrlKey) && key === 's') {
            e.preventDefault();
            openSettings();
            return;
        }
        if (key === 'escape') {
            if (!spotlightOverlay.hasClass('hidden')) {
                e.preventDefault();
                closeSpotlight();
            }
            if (!settingsModal.hasClass('hidden')) {
                e.preventDefault();
                closeSettings();
            }
        }
        if (!spotlightOverlay.hasClass('hidden')) {
            if (key === 'arrowdown') {
                e.preventDefault();
                spotlightIndex = Math.min(spotlightIndex + 1, spotlightResults.children('button').length - 1);
                filterSpotlight();
            } else if (key === 'arrowup') {
                e.preventDefault();
                spotlightIndex = Math.max(spotlightIndex - 1, 0);
                filterSpotlight();
            } else if (key === 'enter') {
                e.preventDefault();
                const active = spotlightResults.children('button').eq(spotlightIndex);
                if (active.length) active.trigger('click');
            }
        }
    }, true);

    function autoGrowTextarea(textarea) {
        textarea.style.height = 'auto';
        const styles = window.getComputedStyle(textarea);
        const maxHeight = parseFloat(styles.maxHeight);
        const targetHeight = Number.isFinite(maxHeight) ? Math.min(textarea.scrollHeight, maxHeight) : textarea.scrollHeight;
        textarea.style.height = `${targetHeight}px`;

        if (Number.isFinite(maxHeight) && textarea.scrollHeight > maxHeight + 1) {
            textarea.classList.remove('no-scrollbar');
        } else {
            textarea.classList.add('no-scrollbar');
        }
    }

    // Generic function to handle collapsible sections
    function toggleSection(headerId, contentId, localStorageKey) {
        const header = $(`#${headerId}`);
        const content = $(`#${contentId}`);
        const icon = header.find(`.section-toggle-icon`);

        // Restore state from local storage on load
        const isCollapsed = localStorage.getItem(localStorageKey) === 'true';
        if (isCollapsed) {
            content.hide();
            icon.removeClass('rotate-90'); // No rotation for collapsed state (arrow pointing right/expand)
            header.addClass('collapsed');
            header.attr('aria-expanded', 'false');
        } else {
            content.show();
            icon.addClass('rotate-90'); // Rotated for expanded state (arrow pointing down/collapse)
            header.removeClass('collapsed');
            header.attr('aria-expanded', 'true');
        }

        function toggleContent() {
            content.slideToggle(200, function () {
                const nowCollapsed = !$(this).is(':visible');
                localStorage.setItem(localStorageKey, nowCollapsed);
                if (nowCollapsed) {
                    icon.removeClass('rotate-90'); // No rotation for collapsed state (arrow pointing right/expand)
                    header.addClass('collapsed');
                    header.attr('aria-expanded', 'false');
                } else {
                    icon.addClass('rotate-90'); // Rotated for expanded state (arrow pointing down/collapse)
                    header.removeClass('collapsed');
                    header.attr('aria-expanded', 'true');
                }
            });
        }

        header.on('click', function (e) {
            // Prevent event from propagating if a child (like the "New Folder" button or clear button) is clicked
            if ($(e.target).is('button') || $(e.target).closest('button').length) {
                return;
            }
            toggleContent();
        });

        header.on('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleContent();
            }
        });
    }

    $('textarea[data-autogrow="true"]').each(function () {
        autoGrowTextarea(this);
    }).on('input', function () {
        autoGrowTextarea(this);
    });

    $('#userPromptForm').submit(function (event) {
        const userPrompt = $('textarea[name="user_prompt"]').val().trim();
        if (!userPrompt) {
            showError('Please enter a query before searching.');
            event.preventDefault(); // Prevent form submission
            return;
        }

        $('#loading-overlay-text').text('Loading, please wait...');
        $('#loading-overlay').removeClass('hidden');

        const searchButton = $('#searchButton');
        const searchText = $('#searchText');
        const searchSpinner = $('#searchSpinner');

        // Show loading state on button
        searchButton.prop('disabled', true);
        searchText.addClass('hidden');
        searchSpinner.removeClass('hidden');
    });

    $('#clearButton').click(function () {
        showConfirmationModal(
            'Clear All History',
            'Are you sure you want to delete all search history? This action cannot be undone.',
            'Delete All',
            function () {
                $.ajax({
                    url: '/history/clear/',
                    type: 'DELETE',
                    headers: { 'X-CSRFToken': csrftoken },
                    success: function () {
                        window.location.href = "/";
                    },
                    error: function (xhr, status, error) {
                        showError('Failed to clear history.');
                    }
                });
            }
        );
    });

    loadModels();

    $('#newSearchButton').click(function () {
        window.location.href = "/";
    });

    // Modal cancel button
    $('#modalCancelButton').click(function () {
        $('#confirmationModal').addClass('hidden');
    });

    // Error toast close button
    $('#error-toast-close').click(function () {
        clearTimeout(errorToastTimeout);
        $('#error-toast').addClass('hidden');
    });

    // Set dynamic copyright year
    $('#copyright-year').text(new Date().getFullYear());

    $('#closePanelIcon').click(function () {
        hideContentPanel(selectedRowId);
    });

    // Initialize collapsible sections
    toggleSection('folder-header', 'folder-content', 'folderSectionState');
    toggleSection('searches-header', 'searches-content', 'searchesSectionState');

    $('#newFolderButton').click(function () {

        $('#newFolderModal').removeClass('hidden');

        $('#newFolderName').val(''); // Clear input on open

        $('#newFolderError').text('').addClass('hidden'); // Clear and hide error

        // Reset color picker to default

        const defaultColor = '#6c757d';

        $('#newFolderColor').val(defaultColor);

        $('#newFolderColorTrigger span').css('color', defaultColor);

        $('#newFolderColorPalette').addClass('hidden');

    });

    $('#closeNewFolderModalButton').click(function () {

        $('#newFolderModal').addClass('hidden');

        $('#newFolderError').text('').addClass('hidden'); // Clear and hide error on cancel

        $('#newFolderColorPalette').addClass('hidden');

    });

    $('#newFolderName').on('input', function () {

        $('#newFolderError').text('').addClass('hidden'); // Clear error when typing

    });

    $('#newFolderColorTrigger').on('click', function (e) {

        e.stopPropagation();

        $('#newFolderColorPalette').toggleClass('hidden');

    });

    $(document).on('click', '.color-swatch', function () {

        const selectedColor = $(this).data('color');

        $('#newFolderColor').val(selectedColor);

        $('#newFolderColorTrigger span').css('color', selectedColor);

        $('#newFolderColorPalette').addClass('hidden');

    });

    // Hide palette if clicking outside the modal content

    $(document).on('click', function (e) {

        if (!$('#newFolderColorPalette').hasClass('hidden') && !$(e.target).closest('.relative').length) {

            $('#newFolderColorPalette').addClass('hidden');

        }

    });

    $('#createFolderButton').click(function () {

        const folderName = $('#newFolderName').val().trim();

        const folderColor = $('#newFolderColor').val();

        const newFolderErrorSpan = $('#newFolderError');

        newFolderErrorSpan.text('').addClass('hidden'); // Clear previous errors

        if (!folderName) {

            newFolderErrorSpan.text('Folder name cannot be empty.').removeClass('hidden');

            return;

        }

        // Client-side check for duplicate folder names

        $.ajax({

            url: '/api/folders/',

            type: 'GET',

            success: function (existingFolders) {

                const isDuplicate = existingFolders.some(folder => folder.name.toLowerCase() === folderName.toLowerCase());

                if (isDuplicate) {

                    newFolderErrorSpan.text(`A folder with the name "${folderName}" already exists.`).removeClass('hidden');

                    return;

                }

                // If not a duplicate, proceed with creating the folder

                $.ajax({

                    url: '/api/folders/create/',

                    type: 'POST',

                    headers: { 'X-CSRFToken': csrftoken },

                    contentType: 'application/json',

                    data: JSON.stringify({ name: folderName, color: folderColor }),

                    success: function () {

                        $('#newFolderModal').addClass('hidden');

                        $('#newFolderName').val('');

                        newFolderErrorSpan.text('').addClass('hidden'); // Clear and hide error on success

                        // Reset color picker to default after successful creation

                        const defaultColor = '#6c757d';

                        $('#newFolderColor').val(defaultColor);

                        $('#newFolderColorTrigger span').css('color', defaultColor);

                        $('#newFolderColorPalette').addClass('hidden');

                        loadPromptHistory();

                    },

                    error: function (xhr) {

                        let errorMessage = 'Failed to create folder.';

                        if (xhr.responseJSON && xhr.responseJSON.error) {

                            errorMessage = xhr.responseJSON.error;

                            // Display server-side validation errors directly in the modal

                            newFolderErrorSpan.text(errorMessage).removeClass('hidden');

                        } else if (xhr.responseText) {

                            try {

                                const response = JSON.parse(xhr.responseText);

                                if (response.error) {

                                    errorMessage = response.error;

                                    newFolderErrorSpan.text(errorMessage).removeClass('hidden');

                                }

                            } catch (e) {

                                // Fallback to global error message for unexpected formats

                                showError(errorMessage);

                            }

                        } else {

                            // Fallback to global error message for generic errors

                            showError(errorMessage);

                        }

                    }

                });

            },

            error: function () {

                // If fetching existing folders fails, use the global error toast

                showError('Failed to fetch existing folders for validation.');

            }

        });

    });

    // Folder header toggles are bound after folder list is built (see loadPromptHistory)
});
