$(document).ready(function () {
    // Make sure the overlay is hidden on page load
    $('#loading-overlay').addClass('hidden');

    $('#userPromptForm').submit(function (event) {
        const userPrompt = $('textarea[name="user_prompt"]').val().trim();
        if (!userPrompt) {
            showError('Please enter a query before searching.');
            event.preventDefault(); // Prevent form submission
            return;
        }

        $('#loading-overlay-text').text('Loading, please wait...');
        $('#loading-overlay').removeClass('hidden');
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
    $('#modalCancelButton').click(function() {
        $('#confirmationModal').addClass('hidden');
    });

    // Error toast close button
    $('#error-toast-close').click(function() {
        clearTimeout(errorToastTimeout);
        $('#error-toast').addClass('hidden');
    });

    // Set dynamic copyright year
    $('#copyright-year').text(new Date().getFullYear());

    $('#closePanelIcon').click(function() {
        hideContentPanel(selectedRowId);
    });

    $('#newFolderButton').click(function() {
        $('#newFolderModal').removeClass('hidden');
    });

    $('#cancelNewFolderButton').click(function() {
        $('#newFolderModal').addClass('hidden');
    });

    $('#createFolderButton').click(function() {
        const folderName = $('#newFolderName').val().trim();
        if (folderName) {
            $.ajax({
                url: '/api/folders/create/',
                type: 'POST',
                headers: { 'X-CSRFToken': csrftoken },
                contentType: 'application/json',
                data: JSON.stringify({ name: folderName }),
                success: function() {
                    $('#newFolderModal').addClass('hidden');
                    $('#newFolderName').val('');
                    loadPromptHistory();
                },
                error: function() {
                    showError('Failed to create folder.');
                }
            });
        }
    });

    restoreFolderState();

    $('.flex.items-center.justify-between.px-2.cursor-pointer').off('click').on('click', function() {
        const header = $(this);
        const folderContent = header.next('.flex-col.gap-1.ml-4');
        folderContent.slideToggle(200, function() {
            const isVisible = $(this).is(':visible');
            const folderElement = $(this).closest('[id^="folder-"]');
            const folderId = folderElement.attr('id');
            const icon = header.find('.material-symbols-outlined');
            if (isVisible) {
                icon.text('expand_less');
                addOpenFolder(folderId);
            } else {
                icon.text('expand_more');
                removeOpenFolder(folderId);
            }
        });
    });
});

let selectedRowId = '';
function display_contents(id, title, page_contents, page_contents_not_used_by_llm) {

    if(selectedRowId != '') {
        $("#row-" + selectedRowId).removeClass('bg-primary/20');
    }
    selectedRowId = id;

    $("#row-" + id).addClass('bg-primary/20');

    clearDocumentContent();

    if (!(jQuery.isEmptyObject(page_contents) && jQuery.isEmptyObject(page_contents_not_used_by_llm) )) {

        $('#documentContentsPanel').removeClass('hidden');
        let formattedTitle = title.length > 80 ? `${title.substring(0,77)}...` : title;
        $('#documentContentsTitle').html(formattedTitle);

        $.each(page_contents, function (index, value) {
            $('#documentContents').append(`<p><strong>... ${value} ...</strong></p>`)
        });
        $.each(page_contents_not_used_by_llm, function (index, value) {
            $('#documentContents').append(`<p>... ${value} ...</p>`)
        });

    } else {
        hideContentPanel(id);
    }
}

function hideContentPanel(id) {
    clearDocumentContent();
    $('#documentContentsPanel').addClass('hidden');
    $('#row-'+id).removeClass("bg-primary/20");
}

function clearDocumentContent() {
    $('#documentContents').empty();
    $('#documentContentsTitle').empty();
}

$(window).on('load', function () {
    loadPromptHistory();
});

let errorToastTimeout; // Global variable for the timeout

function showError(message) {
    clearTimeout(errorToastTimeout); // Clear any existing timeouts

    const toast = $('#error-toast');
    const loader = $('#error-toast-loader');

    $('#error-toast-message').text(message);
    toast.removeClass('hidden');

    // Reset and start animation
    loader.css('width', '100%');
    // Force a reflow to restart the animation
    loader.get(0).offsetHeight; 
    loader.css('width', '0%');


    errorToastTimeout = setTimeout(() => {
        toast.addClass('hidden');
    }, 5000);
}

function showConfirmationModal(title, body, confirmText, onConfirm) {
    $('#modalTitle').text(title);
    $('#modalBody').text(body);
    $('#modalConfirmButton').text(confirmText);

    // Use .off() to prevent multiple handlers from being attached
    $('#modalConfirmButton').off('click').on('click', function() {
        onConfirm();
        $('#confirmationModal').addClass('hidden');
    });

    $('#confirmationModal').removeClass('hidden');
}

async function loadModels() {
    const ollamaModelsDropdown = $('#ollamaModels');
    ollamaModelsDropdown.html('<option>Loading models…</option>');
    ollamaModelsDropdown.prop('disabled', true);

    try {
        const result = await fetch('/api/ollama/models/');
        const data = await result.json();
        if (!result.ok) throw new Error(data.error || 'Failed to fetch models');

        const availableModels = data.models || [];
        if (availableModels.length === 0) {
            showError('No models found. Is Ollama running? Try `ollama serve` and `ollama pull <model>`.');
            return;
        }
        ollamaModelsDropdown.html(availableModels.map(n => `<option value="${n}">${n}</option>`).join(''));
        ollamaModelsDropdown.prop('disabled', false); // important: enabled so it gets submitted
    } catch (e) {
        ollamaModelsDropdown.html('<option value="">Error loading models</option>');
        showError('Could not reach Ollama. Check your Docker compose and OLLAMA_BASE_URL.');
    }
}


function deletePrompt(promptId) {
    showConfirmationModal(
        'Delete Search Item',
        'Are you sure you want to delete this item? This action cannot be undone.',
        'Delete Item',
        function() {
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


function timeAgo(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.round((now - date) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);
    const weeks = Math.round(days / 7);
    const months = Math.round(days / 30.44);
    const years = Math.round(days / 365.25);

    if (seconds < 60) return `Just now`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (weeks < 5) return `${weeks}w ago`;
    if (months < 12) return `${months}mo ago`;
    return `${years}y ago`;
}


function loadPromptHistory() {
    const activeHistoryId = parseInt($('body').attr('data-history-id'), 10);
    
    $.when(
        $.getJSON('/api/folders/'),
        $.getJSON('/history/')
    ).done(function(foldersResponse, historyResponse) {
        const folders = foldersResponse[0];
        const historyItems = historyResponse[0];

        $('#folderList').empty();
        $('#userPromptHistory').empty();

        const folderMap = new Map();
        const folderColors = ['#f97316', '#06b6d4', '#8b5cf6', '#ef4444', '#10b981', '#f59e0b'];
        folders.forEach(folder => {
            const color = folderColors[folder.id % folderColors.length];
            folderMap.set(folder.id, $(
                `<div class="flex flex-col gap-1" id="folder-${folder.id}">
                    <div class="flex items-center justify-between px-2 cursor-pointer">
                        <h4 class="text-sm font-medium text-slate-400 dark:text-slate-500 flex items-center">
                            <span class="w-3 h-3 rounded-full mr-2 shrink-0" style="background-color: ${color};"></span>
                            ${folder.name}
                        </h4>
                        <span class="material-symbols-outlined text-slate-400 text-lg">expand_more</span>
                    </div>
                    <div class="flex flex-col gap-1 ml-4" style="display: none;">
                        <div class="folder-empty text-sm text-slate-400 dark:text-slate-500 italic px-3 py-2">No items in this folder.</div>
                    </div>
                </div>`
            ));
            $('#folderList').append(folderMap.get(folder.id));
        });

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
                    <div class="${classes}" draggable="true" data-history-id="${value.id}">
                        <a href="/history-item/${value.id}" class="flex flex-1 items-center gap-3 py-2 text-left min-w-0">
                            <span
                                class="material-symbols-outlined text-slate-400 text-[20px] group-hover:text-slate-600 dark:group-hover:text-slate-300 shrink-0">history</span>
                            <div class="flex flex-col min-w-0">
                                <span
                                    class="truncate text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">${formatTitle(value.title)}</span>
                                <span class="text-xs text-slate-400 dark:text-slate-500">${timeAgo(value.timestamp)}</span>
                            </div>
                        </a>
                        <button aria-label="Remove item" onclick="deletePrompt(${value.id})"
                            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-all focus:opacity-100 focus:outline-none">
                            <span class="material-symbols-outlined text-[18px]">delete</span>
                        </button>
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

        $('.flex.items-center.justify-between.px-2.cursor-pointer').off('click').on('click', function() {
            const header = $(this);
            const folderContent = header.next('.flex-col.gap-1.ml-4');
            folderContent.slideToggle(200, function() {
                const isVisible = $(this).is(':visible');
                const folderElement = $(this).closest('[id^="folder-"]');
                const folderId = folderElement.attr('id');
                const icon = header.find('.material-symbols-outlined');
                if (isVisible) {
                    icon.text('expand_less');
                    addOpenFolder(folderId);
                } else {
                    icon.text('expand_more');
                    removeOpenFolder(folderId);
                }
            });
        });

        // Drag and drop functionality
        let draggedItem = null;

        $('[draggable="true"]').on('dragstart', function(e) {
            draggedItem = this;
            e.originalEvent.dataTransfer.effectAllowed = 'move';
            e.originalEvent.dataTransfer.setData('text/html', this.innerHTML);
        });

        $('#folderList > div').on('dragover', function(e) {
            e.preventDefault();
            $(this).addClass('bg-primary/10');
        }).on('dragleave', function() {
            $(this).removeClass('bg-primary/10');
        }).on('drop', function(e) {
            e.preventDefault();
            $(this).removeClass('bg-primary/10');
            if (draggedItem) {
                const historyId = $(draggedItem).data('history-id');
                const folderId = $(this).attr('id').split('-')[1];
                
                $.ajax({
                    url: `/api/history/${historyId}/move/`,
                    type: 'PUT',
                    headers: { 'X-CSRFToken': csrftoken },
                    contentType: 'application/json',
                    data: JSON.stringify({ folder_id: folderId }),
                    success: function() {
                        loadPromptHistory();
                    },
                    error: function() {
                        showError('Failed to move item.');
                    }
                });
            }
        });

        // Expand folder if it contains the active item
        const activeItem = $('.bg-primary\\/20');
        if (activeItem.length > 0) {
            const parentFolderContent = activeItem.closest('.flex-col.gap-1.ml-4');
            if (parentFolderContent.length > 0) {
                parentFolderContent.show();
                const parentFolder = parentFolderContent.parent();
                const leftIcon = parentFolder.find('.material-symbols-outlined').first();
                const rightIcon = parentFolder.find('.material-symbols-outlined').last();
                leftIcon.text('expand_more'); // Ensure folder expand icon remains unchanged
                rightIcon.text('delete'); // Right icon
            }
        }
        // After building folders, restore any previously saved open folders
        restoreFolderState();
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
    $('#folderList > .flex').each(function() {
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
    openFolders.forEach(folderId => {
        const folderElement = $(`#${folderId}`);
        const folderContent = folderElement.find('.flex-col.gap-1.ml-4');
        if (folderContent.length > 0) {
            folderContent.show();
            const icon = folderElement.find('.material-symbols-outlined').first();
            icon.text('expand_less');
        }
    });
}

$(document).ready(function () {
    restoreFolderState();

    $('#folderList > .flex').off('click').on('click', function() {
        const folderElement = $(this);
        const folderContent = folderElement.find('.flex-col.gap-1.ml-4');
        folderContent.slideToggle(200, function() {
            const isVisible = $(this).is(':visible');
            const folderId = folderElement.attr('id');
            const icon = folderElement.find('.material-symbols-outlined').first();
            if (isVisible) {
                icon.text('expand_less');
                addOpenFolder(folderId);
            } else {
                icon.text('expand_more');
                removeOpenFolder(folderId);
            }
        });
    });
});