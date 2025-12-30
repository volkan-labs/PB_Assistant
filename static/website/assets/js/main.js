$(document).ready(function () {
    $.unblockUI(); // Ensure any persistent blockUI is cleared on new page load

    $('#userPromptForm').submit(function () {
        $.blockUI({
            message: `<div class="custom-blockui">
                            <div class="spinner"></div>
                            <h1>Loading, please wait...</h1>
                        </div>`,
            css: {
                border: 'none',
                padding: '15px',
                backgroundColor: '#111418', // surface-dark
                '-webkit-border-radius': '10px',
                '-moz-border-radius': '10px',
                color: '#fff'
            },
            overlayCSS: {
                backgroundColor: '#BBE0EF', // Solid light blue (BBE0EF)
            }
        });
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
                        console.error('Error:', error);
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
        $('#error-toast').addClass('hidden');
    });

    // Set dynamic copyright year
    $('#copyright-year').text(new Date().getFullYear());

    $('#closePanelIcon').click(function() {
        hideContentPanel(selectedRowId);
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

function showError(message) {
    $('#error-toast-message').text(message);
    $('#error-toast').removeClass('hidden');
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
                    console.error('Error:', error);
                }
            });
        }
    );
}


function loadPromptHistory() {
    const activeHistoryId = parseInt($('body').attr('data-history-id'), 10);
    $.getJSON('/history/', function (historyItems) {

        if (!jQuery.isEmptyObject(historyItems)) {
            $('#userPromptHistory').empty();
            $.each(historyItems, function (index, value) {
                $('#emptyHistory').hide();
                $('#clearButton').show();

                const isActive = value.id === activeHistoryId;
                let classes = "group flex items-center justify-between rounded-lg pl-3 pr-2 transition-colors";
                if (isActive) {
                    classes += " bg-primary/20"; // Active state class
                } else {
                    classes += " hover:bg-slate-100 dark:hover:bg-slate-800/50"; // Non-active hover state
                }

                $('#userPromptHistory').append(
                    `
                        <div class="${classes}">
                            <a href="/history-item/${value.id}" class="flex flex-1 items-center gap-3 py-3 text-left min-w-0">
                                <span
                                    class="material-symbols-outlined text-slate-400 text-[20px] group-hover:text-slate-600 dark:group-hover:text-slate-300 shrink-0">history</span>
                                <span
                                    class="truncate text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">${formatTitle(value.title)}</span>
                            </a>
                            <button aria-label="Remove item" onclick="deletePrompt(${value.id})"
                                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-all focus:opacity-100 focus:outline-none">
                                <span class="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>
                        `
                );
            });

        } else {
            $('#userPromptHistory').hide();
            $('#emptyHistory').show();
            $('#clearButton').hide();
        }
    });
}

function formatTitle(title) {
    if (title.length > 18) {
        return title.substr(0, 15) + '...';
    }
    return title;
}
