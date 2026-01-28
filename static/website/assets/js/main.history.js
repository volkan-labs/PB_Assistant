function moveHistoryItem(historyId, targetFolderId) {
    $.ajax({
        url: `/api/history/${historyId}/move/`,
        type: 'PUT',
        headers: { 'X-CSRFToken': csrftoken },
        contentType: 'application/json',
        data: JSON.stringify({ folder_id: targetFolderId }), // targetFolderId can be null
        success: function () {
            loadPromptHistory();
        },
        error: function () {
            showError('Failed to move item.');
        }
    });
}

function deletePrompt(promptId) {
    showConfirmationModal(
        'Delete Search Item',
        'Are you sure you want to delete this item? This action cannot be undone.',
        'Delete Item',
        function () {
            const activeHistoryId = parseInt($('body').attr('data-history-id'), 10);
            $.ajax({
                url: '/delete-history/' + promptId,
                type: 'DELETE',
                headers: { 'X-CSRFToken': csrftoken },
                mode: 'same-origin',
                success: function (response) {
                    if (promptId === activeHistoryId) {
                        window.location.href = "/";
                    } else {
                        loadPromptHistory();
                    }
                },
                error: function (xhr, status, error) {
                    showError('Failed to delete the resource.');
                }
            });
        }
    );
}

function loadPromptHistory() {
    const activeHistoryId = parseInt($('body').attr('data-history-id'), 10);

    $.when(
        $.getJSON('/api/folders/'),
        $.getJSON('/history/')
    ).done(function (foldersResponse, historyResponse) {
        // Remove any floating menus before rebuilding the list
        $('.item-actions-floating').remove();
        const folders = foldersResponse[0];
        const historyItems = historyResponse[0];

        $('#folderList').empty();
        $('#userPromptHistory').empty();

        const folderMap = new Map();

        folders.forEach(folder => {
            folderMap.set(folder.id, $(`
                <div class="flex flex-col">
                    <div class="folder-header flex items-center justify-between gap-2 pl-2 pr-1 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer" id="folder-${folder.id}">
                        <div class="flex items-center gap-2 min-w-0">
                            <span class="material-symbols-outlined text-base transition-transform duration-300 section-toggle-icon">chevron_right</span>
                            <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${folder.color};"></span>
                            <span class="folder-name-text text-sm font-medium text-slate-600 dark:text-slate-300 truncate">${folder.name}</span>
                        </div>
                        <div class="flex items-center gap-1">
                            <button aria-label="Delete folder" data-folder-id="${folder.id}" class="folder-delete-btn flex h-8 w-8 items-center justify-center rounded-md text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-opacity transition-colors focus:outline-none">
                                <span class="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                        </div>
                    </div>
                    <div class="flex flex-col gap-1 ml-4" style="display: none;">
                        <div class="folder-empty text-sm text-slate-400 dark:text-slate-500 italic px-3 py-2">No items in this folder.</div>
                    </div>
                </div>`
            ));
            $('#folderList').append(folderMap.get(folder.id));
        });

        // Show placeholder when there are no folders
        if (!folders || folders.length === 0) {
            $('#folderList').hide();
            $('#emptyFolders').show();
        } else {
            $('#folderList').show();
            $('#emptyFolders').hide();
        }

        if (!jQuery.isEmptyObject(historyItems)) {
            historyItems.forEach(function (value) {
                const isActive = value.id === activeHistoryId;
                let classes = "group flex items-center justify-between rounded-lg pl-3 pr-2 transition-colors";
                if (isActive) {
                    classes += " bg-primary/20"; // Active state class
                } else {
                    classes += " hover:bg-slate-100 dark:hover:bg-slate-800/50"; // Non-active hover state
                }

                const historyElement = `
                    <div class="${classes} relative" draggable="true" data-history-id="${value.id}">
                        <a href="/history-item/${value.id}" class="flex flex-1 items-center gap-3 py-2 text-left min-w-0">
                            <div class="flex flex-col min-w-0">
                                <span
                                    class="truncate text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">${formatTitle(value.title)}</span>
                                <span class="text-xs text-slate-400 dark:text-slate-500">${timeAgo(value.timestamp)}</span>
                            </div>
                        </a>
                        <div class="relative">
                            <button aria-label="Item actions" id="itemActionsButton-${value.id}"
                                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-all focus:opacity-100 focus:outline-none">
                                <span class="material-symbols-outlined text-[18px]">more_vert</span>
                            </button>
                            <div id="itemActionsMenu-${value.id}" data-history-id="${value.id}"
                                class="absolute right-0 z-[2000] hidden w-48 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                                role="menu" aria-orientation="vertical" aria-labelledby="itemActionsButton-${value.id}" tabindex="-1">
                                <div class="py-1" role="none">
                                <div class="relative">
                                    <button class="text-slate-700 dark:text-slate-200 block w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-gray-700 flex items-center gap-2" role="menuitem" tabindex="-1" id="moveToFolderOption-${value.id}">
                                        <span class="material-symbols-outlined text-[18px]">drive_file_move</span>
                                        Move to folder
                                        <span class="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-sm">chevron_right</span>
                                    </button>
                                    <div id="folderMoveSubmenu-${value.id}"
                                        class="absolute left-full top-0 ml-1 z-[2001] hidden w-48 origin-top-left rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                                        role="menu" aria-orientation="vertical" tabindex="-1">
                                        <div class="py-1" role="none">
                                            <div id="availableFolders-${value.id}" class="flex flex-col">
                                                <!-- Folders will be dynamically inserted here -->
                                            </div>
                                            <div class="border-t border-slate-300 dark:border-gray-700 my-1" role="none"></div>
                                            <button class="text-slate-700 dark:text-slate-200 block w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-gray-700 flex items-center gap-2" role="menuitem" tabindex="-1" id="createNewFolderInMenu-${value.id}">
                                                <span class="material-symbols-outlined text-[18px]">create_new_folder</span>
                                                Create new folder
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                    <button class="text-red-600 block w-full text-left px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900 flex items-center gap-2" role="menuitem" tabindex="-1" id="deleteItemButton-${value.id}">
                                        <span class="material-symbols-outlined text-[18px]">delete</span>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    `;

                if (value.folder_id && folderMap.has(value.folder_id)) {
                    const folderContent = folderMap.get(value.folder_id).find('.flex-col.gap-1.ml-4');
                    // remove the empty indicator when adding items
                    folderContent.find('.folder-empty').remove();
                    folderContent.append(historyElement);
                } else {
                    $('#userPromptHistory').append(historyElement);
                }
            });

            // If no items were added to the top-level history list (all moved into folders),
            // show the empty indicator inside the history card.
            if ($('#userPromptHistory').children().length === 0) {
                $('#userPromptHistory').hide();
                $('#emptyHistory').show();
            } else {
                $('#userPromptHistory').show();
                $('#emptyHistory').hide();
            }

            // Show clear button when there are any history items overall
            if (historyItems.length > 0) {
                $('#clearButton').show();
            } else {
                $('#clearButton').hide();
            }
        } else {
            $('#userPromptHistory').hide();
            $('#emptyHistory').show();
            $('#clearButton').hide();
        }

        // Bind toggle only to the expand icon and folder name text to avoid large clickable areas
        $('#folderList').off('click', '.folder-header .section-toggle-icon, .folder-header .folder-name-text').on('click', '.folder-header .section-toggle-icon, .folder-header .folder-name-text', function (e) {
            const clicked = $(this);
            const header = clicked.closest('.folder-header');
            const folderContent = header.next('.flex-col.gap-1.ml-4');
            folderContent.slideToggle(200, function () {
                const isVisible = $(this).is(':visible');
                const folderElement = header;
                const folderId = folderElement.attr('id');
                const icon = header.find('.section-toggle-icon');
                if (isVisible) {
                    icon.addClass('rotate-90');
                    addOpenFolder(folderId);
                } else {
                    icon.removeClass('rotate-90');
                    removeOpenFolder(folderId);
                }
            });
        });

        // Enable drag and drop of history items to folders
        let draggedItem = null;

        $('#userPromptHistory, #folderList').off('dragstart', '[data-history-id]').on('dragstart', '[data-history-id]', function (e) {
            draggedItem = this;
            $(this).addClass('opacity-50');
            e.originalEvent.dataTransfer.setData('text/plain', $(this).data('history-id'));
        }).off('dragend', '[data-history-id]').on('dragend', '[data-history-id]', function () {
            $(this).removeClass('opacity-50');
            draggedItem = null;
        });

        $('.folder-header').off('dragover').on('dragover', function (e) {
            e.preventDefault();
            $(this).addClass('border-2 border-primary');
        }).off('dragleave').on('dragleave', function () {
            $(this).removeClass('border-2 border-primary');
        }).off('drop').on('drop', function (e) {
            e.preventDefault();
            $(this).removeClass('border-2 border-primary');
            if (draggedItem) {
                const historyId = $(draggedItem).data('history-id');
                const folderId = $(this).attr('id').split('-')[1];
                moveHistoryItem(historyId, folderId); // Use the new function
            }
        });

        // Drag and drop to move items back to Recent Searches
        $('#userPromptHistory').off('dragover').on('dragover', function (e) {
            e.preventDefault();
            // Only highlight if the dragged item is currently in a folder
            if (draggedItem && $(draggedItem).closest('[id^="folder-"]').length > 0) {
                $(this).addClass('border-2 border-primary');
            }
        }).off('dragleave').on('dragleave', function () {
            $(this).removeClass('border-2 border-primary');
        }).off('drop').on('drop', function (e) {
            e.preventDefault();
            $(this).removeClass('border-2 border-primary');
            if (draggedItem) {
                const historyId = $(draggedItem).data('history-id');
                // Only move if the item is currently in a folder
                if ($(draggedItem).closest('[id^="folder-"]').length > 0) {
                    moveHistoryItem(historyId, null); // Move to no folder (Recent Searches)
                }
            }
        });

        // Expand folder if it contains the active item
        const activeItem = $('.bg-primary\\/20');
        if (activeItem.length > 0) {
            const parentFolderContent = activeItem.closest('.flex-col.gap-1.ml-4');
            if (parentFolderContent.length > 0) {
                parentFolderContent.css('display', 'flex');
                const folderHeader = parentFolderContent.prev('.folder-header');
                const leftIcon = folderHeader.find('.section-toggle-icon');
                const rightIcon = folderHeader.find('.folder-delete-btn .material-symbols-outlined');
                leftIcon.text('expand_less'); // show expanded state for expand icon
                rightIcon.text('delete'); // ensure delete icon remains delete
            }
        }
        // After building folders, restore any previously saved open folders (async to avoid race with other handlers)
        setTimeout(restoreFolderState, 50);

        // Action Menu Logic

        let openMenuId = null; // Track which main menu is currently open

        let openSubMenuId = null; // Track which submenu is currently open

        const sidebarScrollArea = $('#sidebarScrollArea');
        const menuItemSelectedClasses = 'bg-slate-100 dark:bg-slate-800/50';

        function positionActionsMenu(itemId) {
            const menu = $(`#itemActionsMenu-${itemId}`);
            const button = $(`#itemActionsButton-${itemId}`);
            if (!menu.length || !button.length) return;

            const rect = button[0].getBoundingClientRect();
            const menuWidth = menu.outerWidth();
            const menuHeight = menu.outerHeight();

            let top = rect.top;
            let left = rect.left;
            const viewportW = window.innerWidth;
            const viewportH = window.innerHeight;

            if (left < 8) left = 8;
            if (left + menuWidth > viewportW - 8) left = viewportW - menuWidth - 8;
            if (top + menuHeight > viewportH - 8) top = rect.top - menuHeight - 6;
            if (top < 8) top = 8;

            menu.css({
                position: 'fixed',
                top: `${top}px`,
                left: `${left}px`,
                zIndex: 3000,
            });
        }

        function floatActionsMenu(itemId) {
            const menu = $(`#itemActionsMenu-${itemId}`);
            if (!menu.length) return;
            if (!menu.data('original-parent')) {
                menu.data('original-parent', menu.parent());
            }
            if (!menu.hasClass('item-actions-floating')) {
                $('body').append(menu);
                menu.addClass('item-actions-floating');
            }
            positionActionsMenu(itemId);
        }

        function restoreActionsMenu(itemId) {
            const menu = $(`#itemActionsMenu-${itemId}`);
            if (!menu.length || !menu.hasClass('item-actions-floating')) return;
            const originalParent = menu.data('original-parent');
            if (originalParent && originalParent.length) {
                originalParent.append(menu);
            }
            menu.removeClass('item-actions-floating').css({
                position: '',
                top: '',
                left: '',
                zIndex: '',
            });
        }

        function closeOpenMenu() {
            if (!openMenuId) return;
            $(`#itemActionsMenu-${openMenuId}`).addClass('hidden');
            $(`#itemActionsButton-${openMenuId}`).removeClass('bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200');
            $(`[data-history-id="${openMenuId}"]`).removeClass(menuItemSelectedClasses);
            restoreActionsMenu(openMenuId);
            if (openSubMenuId) {
                $(`#folderMoveSubmenu-${openSubMenuId}`).addClass('hidden');
                openSubMenuId = null;
            }
            openMenuId = null;
        }

        $(document).off('click.itemActions').on('click.itemActions', function (e) {

            // If a main menu is open and the click is outside that menu and its button, close it

            if (openMenuId && !$(e.target).closest(`#itemActionsMenu-${openMenuId}`).length && !$(e.target).closest(`#itemActionsButton-${openMenuId}`).length) {
                closeOpenMenu();
            }

        });

        $('[id^="itemActionsButton-"]').off('click.itemActionsButton').on('click.itemActionsButton', function (e) {

            e.stopPropagation(); // Prevent document click from immediately closing

            const itemId = $(this).attr('id').split('-')[1];

            const menu = $(`#itemActionsMenu-${itemId}`);

            // Close other open main menus

            if (openMenuId && openMenuId !== itemId) {
                closeOpenMenu();
            }

            // Close any open submenu

            if (openSubMenuId) {

                $(`#folderMoveSubmenu-${openSubMenuId}`).addClass('hidden');

                openSubMenuId = null;

            }

            menu.toggleClass('hidden');

            if (menu.hasClass('hidden')) {
                $(`#itemActionsButton-${itemId}`).removeClass('bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200');
                $(`[data-history-id="${itemId}"]`).removeClass(menuItemSelectedClasses);
                restoreActionsMenu(itemId);
                openMenuId = null;
            } else {
                $(`#itemActionsButton-${itemId}`).addClass('bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200');
                $(`[data-history-id="${itemId}"]`).addClass(menuItemSelectedClasses);
                openMenuId = itemId;
                floatActionsMenu(itemId);
            }

        });

        // Reposition the floating menu on scroll/resize
        sidebarScrollArea.off('scroll.itemActions').on('scroll.itemActions', function () {
            if (openMenuId) {
                positionActionsMenu(openMenuId);
            }
        });
        $(window).off('resize.itemActions').on('resize.itemActions', function () {
            if (openMenuId) {
                positionActionsMenu(openMenuId);
            }
        });

        $('[id^="moveToFolderOption-"]').off('click.moveToFolder').on('click.moveToFolder', function (e) {

            // e.stopPropagation(); // Temporarily removed for debugging

            const itemId = $(this).attr('id').split('-')[1];

            const subMenu = $(`#folderMoveSubmenu-${itemId}`);

            // Close other open submenus if any

            if (openSubMenuId && openSubMenuId !== itemId) {

                $(`#folderMoveSubmenu-${openSubMenuId}`).addClass('hidden');

            }

            subMenu.toggleClass('hidden');

            openSubMenuId = subMenu.hasClass('hidden') ? null : itemId;

            // Populate folders for this submenu if it's being opened

            if (!subMenu.hasClass('hidden')) {

                const availableFoldersContainer = $(`#availableFolders-${itemId}`);

                availableFoldersContainer.empty(); // Clear previous folders

                if (folders.length > 0) {

                    folders.forEach(folder => {

                        const folderButtonHtml = `<button class="text-slate-700 dark:text-slate-200 block w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-gray-700 move-to-folder-btn flex items-center gap-2" role="menuitem" data-folder-id="${folder.id}"><span class="w-3 h-3 rounded-full mr-2 shrink-0" style="background-color: ${folder.color};"></span>${folder.name}</button>`;

                        const $folderButton = $(folderButtonHtml); // Convert to jQuery object

                        $folderButton.on('click', function (e) {
                            e.stopPropagation();
                            console.log('Direct click on folder button:', $(this).data('folder-id'), $(this).text()); // Debugging
                            const targetFolderId = $(this).data('folder-id');
                            const itemId = $(this).closest('[id^="itemActionsMenu-"]').data('history-id');
                            moveHistoryItem(itemId, targetFolderId);
                            $(`#itemActionsMenu-${itemId}`).addClass('hidden'); // Close main menu
                            $(`#folderMoveSubmenu-${itemId}`).addClass('hidden'); // Close submenu
                            restoreActionsMenu(itemId);
                            openMenuId = null;
                            openSubMenuId = null;
                        });

                        availableFoldersContainer.append($folderButton);

                    });

                } else {

                    availableFoldersContainer.append('<span class="block w-full text-left px-4 py-2 text-xs italic text-slate-700 dark:text-slate-400">No folders available.</span>');

                }

            }

        });

        // Handle moving to a specific folder

        $('.move-to-folder-btn').off('click.moveItem').on('click.moveItem', function (e) {
            e.stopPropagation();
            const targetFolderId = $(this).data('folder-id');
            const itemId = $(this).closest('[id^="itemActionsMenu-"]').data('history-id');
            moveHistoryItem(itemId, targetFolderId);
            $(`#itemActionsMenu-${itemId}`).addClass('hidden'); // Close main menu
            $(`#folderMoveSubmenu-${itemId}`).addClass('hidden'); // Close submenu
            restoreActionsMenu(itemId);
            openMenuId = null;
            openSubMenuId = null;
        });

        // Handle Create new folder button in menu

        $('[id^="createNewFolderInMenu-"]').off('click.createNewFolder').on('click.createNewFolder', function (e) {
            e.stopPropagation();
            // Just open the new folder modal, the user can then create and manually move
            $('#newFolderModal').removeClass('hidden');
            // Close the actions menu
            const itemId = $(this).closest('[id^="itemActionsMenu-"]').data('history-id');
            $(`#itemActionsMenu-${itemId}`).addClass('hidden');
            $(`#folderMoveSubmenu-${itemId}`).addClass('hidden'); // Close submenu
            restoreActionsMenu(itemId);
            openMenuId = null;
            openSubMenuId = null;
        });

        // Handle Delete button in menu

        $('[id^="deleteItemButton-"]').off('click.deleteItem').on('click.deleteItem', function (e) {
            e.stopPropagation();
            const itemId = $(this).attr('id').split('-')[1];
            deletePrompt(itemId);
            $(`#itemActionsMenu-${itemId}`).addClass('hidden'); // Close main menu
            restoreActionsMenu(itemId);
            // Close any open submenu
            if (openSubMenuId) {
                $(`#folderMoveSubmenu-${openSubMenuId}`).addClass('hidden');
                openSubMenuId = null;
            }
            openMenuId = null;
        });

    });
}

function formatTitle(title) {
    if (title.length > 25) {
        return title.substr(0, 22) + '...';
    }
    return title;
}

function saveFolderState() {
    const openFolders = [];
    $('#folderList > .flex').each(function () {
        const folderId = $(this).attr('id');
        const folderContent = $(this).find('.flex-col.gap-1.ml-4');
        if (folderContent.is(':visible')) {
            openFolders.push(folderId);
        }
    });
    localStorage.setItem('openFolders', JSON.stringify(openFolders));
}

function addOpenFolder(folderId) {
    const openFolders = JSON.parse(localStorage.getItem('openFolders') || '[]');
    if (!openFolders.includes(folderId)) {
        openFolders.push(folderId);
        localStorage.setItem('openFolders', JSON.stringify(openFolders));
    }
}

function removeOpenFolder(folderId) {
    const openFolders = JSON.parse(localStorage.getItem('openFolders') || '[]');
    const filtered = openFolders.filter(id => id !== folderId);
    localStorage.setItem('openFolders', JSON.stringify(filtered));
}

function restoreFolderState() {
    const openFolders = JSON.parse(localStorage.getItem('openFolders') || '[]');
    console.debug('[restoreFolderState] openFolders:', openFolders);
    openFolders.forEach(rawId => {
        // Support stored formats: "folder-123", "123", or numeric 123
        let folderSelector = null;
        if (typeof rawId === 'number') {
            folderSelector = `#folder-${rawId}`;
        } else if (typeof rawId === 'string') {
            if (rawId.startsWith('folder-')) {
                folderSelector = `#${rawId}`;
            } else if (/^\d+$/.test(rawId)) {
                folderSelector = `#folder-${rawId}`;
            } else {
                // Unexpected format: try to use as-is
                folderSelector = `#${rawId}`;
            }
        }

        if (!folderSelector) return;

        const folderElement = $(folderSelector);
        console.debug('[restoreFolderState] trying selector', folderSelector, 'found:', folderElement.length);
        if (folderElement.length === 0) return;

        const folderContent = folderElement.find('.flex-col.gap-1.ml-4');
        console.debug('[restoreFolderState] folderContent length for', folderSelector, folderContent.length);
        if (folderContent.length > 0) {
            folderContent.css('display', 'flex');
            const icon = folderElement.find('.section-toggle-icon');
            if (icon.length) icon.addClass('rotate-90');
        }
    });
}

// removed global folder-element click handler to avoid a large clickable area; toggles are delegated in `loadPromptHistory`

$(window).on('load', function () {
    loadPromptHistory();
});
