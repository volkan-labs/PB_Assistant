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

    // Sidebar filter: debounced input that filters folders and history items
    function debounce(fn, delay) {
        let timer = null;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    function applySidebarFilter(query) {
        const q = query.trim().toLowerCase();
        // Reset when empty: show all and restore persisted open state
        if (!q) {
            $('#folderList > .flex').show().each(function () {
                const f = $(this);
                const content = f.find('.flex-col.gap-1.ml-4');
                content.css('display', 'none');
                const header = f.find('.folder-header');
                f.find('.section-toggle-icon').removeClass('rotate-90');
                header.attr('aria-expanded', 'false');
            });
            $('#userPromptHistory').children().show();
            // restore the open folders the user had before filtering
            setTimeout(restoreFolderState, 50);
            $('#sidebarFilterClear').addClass('hidden');
            return;
        }

        // Show clear button
        $('#sidebarFilterClear').removeClass('hidden');

        // Filter top-level history items
        $('#userPromptHistory').children().each(function () {
            const el = $(this);
            const title = el.find('.truncate').first().text().toLowerCase();
            if (title.indexOf(q) !== -1) el.show(); else el.hide();
        });

        // Filter folders: show folder if folder name matches OR any child item matches
        $('#folderList > .flex').each(function () {
            const folder = $(this);
            const name = folder.find('.folder-name-text').text().toLowerCase();
            let matches = name.indexOf(q) !== -1;

            // Check items inside the folder
            folder.find('.flex-col.gap-1.ml-4 .truncate').each(function () {
                const t = $(this).text().toLowerCase();
                if (t.indexOf(q) !== -1) matches = true;
            });

            if (matches) {
                folder.show();
                // expand folder to reveal matching items
                const content = folder.find('.flex-col.gap-1.ml-4');
                content.css('display', 'flex');
                folder.find('.section-toggle-icon').addClass('rotate-90');
                folder.find('.folder-header').attr('aria-expanded', 'true');
            } else {
                folder.hide();
            }
        });

        // Hide empty message while filtering
        $('#emptyHistory').hide();
    }

    const debouncedFilter = debounce(function () {
        applySidebarFilter($('#sidebarFilter').val() || '');
    }, 180);

    $('#sidebarFilter').on('input', debouncedFilter);
    $('#sidebarFilterClear').on('click', function () {
        $('#sidebarFilter').val('');
        $(this).addClass('hidden');
        $('#sidebarFilter').trigger('input');
        $('#sidebarFilter').focus();
    });

    // Folder header toggles are bound after folder list is built (see loadPromptHistory)
});
