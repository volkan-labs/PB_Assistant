let selectedRowId = '';
let errorToastTimeout; // Global variable for the timeout

function display_contents(id, title, page_contents, page_contents_not_used_by_llm) {

    if (selectedRowId != '') {
        $("#row-" + selectedRowId).removeClass('article-selected');
        $("#row-" + selectedRowId).find('.selected-badge').addClass('hidden');
    }
    selectedRowId = id;

    $("#row-" + id).addClass('article-selected');
    $("#row-" + id).find('.selected-badge').removeClass('hidden');

    clearDocumentContent();

    if (!(jQuery.isEmptyObject(page_contents) && jQuery.isEmptyObject(page_contents_not_used_by_llm))) {

        $('#documentContentsPanel').removeClass('hidden');
        document.body.classList.add('content-panel-open');
        document.body.classList.add('overflow-hidden');
        let formattedTitle = title.length > 80 ? `${title.substring(0, 77)}...` : title;
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
    document.body.classList.remove('content-panel-open');
    document.body.classList.remove('overflow-hidden');
    $('#row-' + id).removeClass("article-selected");
    $('#row-' + id).find('.selected-badge').addClass('hidden');
}

function clearDocumentContent() {
    $('#documentContents').empty();
    $('#documentContentsTitle').empty();
}

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
    $('#modalConfirmButton').off('click').on('click', function () {
        onConfirm();
        $('#confirmationModal').addClass('hidden');
    });

    $('#confirmationModal').removeClass('hidden');
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

document.addEventListener('DOMContentLoaded', function () {
    const panel = document.getElementById('documentContentsPanel');
    const backdrop = document.querySelector('.document-panel-backdrop');
    const backBtn = document.getElementById('documentContentsBack');
    if (backBtn) {
        backBtn.addEventListener('click', function () {
            if (selectedRowId) {
                hideContentPanel(selectedRowId);
            } else if (panel) {
                panel.classList.add('hidden');
                document.body.classList.remove('content-panel-open');
                document.body.classList.remove('overflow-hidden');
            }
        });
    }
    if (backdrop) {
        backdrop.addEventListener('click', function () {
            if (selectedRowId) {
                hideContentPanel(selectedRowId);
            } else if (panel) {
                panel.classList.add('hidden');
                document.body.classList.remove('overflow-hidden');
            }
        });
    }
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && panel && !panel.classList.contains('hidden')) {
            if (selectedRowId) {
                hideContentPanel(selectedRowId);
            } else {
                panel.classList.add('hidden');
                document.body.classList.remove('content-panel-open');
                document.body.classList.remove('overflow-hidden');
            }
        }
    });
});
