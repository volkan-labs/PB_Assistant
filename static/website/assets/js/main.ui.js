$(document).ready(function () {
    // Make sure the overlay is hidden on page load
    $('#loading-overlay').addClass('hidden');

    const userActionsButton = $('#userActionsButton');
    const userActionsMenu = $('#userActionsMenu');

    if (userActionsButton.length && userActionsMenu.length) {
        userActionsButton.on('click', function (e) {
            e.stopPropagation();
            userActionsMenu.toggleClass('hidden');
        });

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
    let spotlightFilter = 'all';

    function renderSpotlight(items, showNewChat) {
        spotlightResults.empty();
        if (showNewChat) {
            spotlightResults.append(`
                <button type="button" id="spotlightNewChat"
                    class="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background-light dark:focus-visible:ring-offset-background-dark">
                    <div class="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        <span class="material-symbols-outlined text-[18px] text-slate-400">add</span>
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
                    <span class="material-symbols-outlined text-[18px] text-slate-400">add</span>
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

    if (spotlightClose.length) {
        spotlightClose.on('click', function () {
            closeSpotlight();
        });
    }

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

    $(document).on('keydown', function (e) {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            openSpotlight();
        }
        if (e.shiftKey && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') {
            e.preventDefault();
            window.location.href = '/index';
        }
        if (e.key === 'Escape' && !spotlightOverlay.hasClass('hidden')) {
            e.preventDefault();
            closeSpotlight();
        }
        if (!spotlightOverlay.hasClass('hidden')) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                spotlightIndex = Math.min(spotlightIndex + 1, spotlightResults.children('button').length - 1);
                filterSpotlight();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                spotlightIndex = Math.max(spotlightIndex - 1, 0);
                filterSpotlight();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const active = spotlightResults.children('button').eq(spotlightIndex);
                if (active.length) active.trigger('click');
            }
        }
    });

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
