$(document).ready(function () {
    const PAGE_SIZE = 10;
    let currentPage = 1;
    let documents = [];
    let totalPages = 1;

    const boundaryFilter = $('#boundaryFilter');
    const librarySearch = $('#librarySearch');
    const librarySearchButton = $('#librarySearchButton');
    const librarySearchClear = $('#librarySearchClear');
    const documentList = $('#documentList');
    const emptyState = $('#documentEmptyState');
    const emptyTitle = $('#documentEmptyTitle');
    const emptyBody = $('#documentEmptyBody');
    const prevPage = $('#prevPage');
    const nextPage = $('#nextPage');
    const pageNumbers = $('#pageNumbers');
    const loadingOverlay = $('#knowledgeLoadingOverlay');
    const paginationContainer = $('#knowledgePagination');

    function loadDocuments() {
        loadingOverlay.removeClass('hidden');
        const q = librarySearch.val().trim();
        const boundary = boundaryFilter.val();
        const boundaryId = boundaryFilter.find('option:selected').data('id');
        const boundaryParam = boundary && boundary !== 'all' ? (boundaryId || boundary) : '';
        const params = new URLSearchParams({
            page: String(currentPage),
            page_size: String(PAGE_SIZE),
        });
        if (q) params.set('q', q);
        if (boundaryParam) params.set('boundary', boundaryParam);
        return fetch(`/api/knowledge-documents/?${params.toString()}`)
            .then((res) => res.json())
            .then((data) => {
                documents = Array.isArray(data.documents) ? data.documents : [];
                totalPages = data.pagination?.total_pages || 1;
                loadingOverlay.addClass('hidden');
            })
            .catch(() => {
                documents = [];
                totalPages = 1;
                loadingOverlay.addClass('hidden');
            });
    }

    function renderBoundaryOptions(boundaries) {
        boundaryFilter.find('option:not(:first)').remove();
        boundaries.forEach((boundary) => {
            boundaryFilter.append(`<option value="${escapeHtml(boundary.name)}" data-id="${escapeHtml(boundary.id)}">${escapeHtml(boundary.name)}</option>`);
        });
    }

    function loadBoundaries() {
        fetch('/api/planetary-boundaries/')
            .then((response) => response.json())
            .then((data) => {
                const boundaries = Array.isArray(data)
                    ? data.map((item) => ({ id: item.id, name: item.name || item.short_name })).filter((item) => item.id && item.name)
                    : [];
                renderBoundaryOptions(boundaries);
            })
            .catch(() => {
                // Fallback to document-derived boundaries if API is unavailable.
                const fallback = Array.from(new Set(documents.map((doc) => doc.planetaryBoundary).filter(Boolean))).sort();
                renderBoundaryOptions(fallback.map((name) => ({ id: name, name })));
            });
    }

    function escapeHtml(value) {
        return $('<div>').text(value ?? '').html();
    }

    function hasFilters() {
        return Boolean(boundaryFilter.val() || librarySearch.val().trim());
    }

    function renderPageNumbers(totalPages) {
        pageNumbers.empty();
        if (totalPages <= 1) return;

        const maxButtons = 5;
        let start = Math.max(1, currentPage - 2);
        let end = Math.min(totalPages, start + maxButtons - 1);
        if (end - start < maxButtons - 1) {
            start = Math.max(1, end - maxButtons + 1);
        }

        const addButton = (page, label = null) => {
            const isActive = page === currentPage;
            const btn = $(`<button type="button" class="min-w-[32px] rounded-md px-2 py-1 text-xs font-semibold transition-colors"></button>`);
            btn.text(label || page);
            if (isActive) {
                btn.addClass('bg-primary text-white');
            } else {
                btn.addClass('text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-highlight');
            }
            btn.on('click', function () {
                currentPage = page;
                renderDocuments();
            });
            pageNumbers.append(btn);
        };

        if (start > 1) {
            addButton(1);
            if (start > 2) {
                pageNumbers.append('<span class="px-1 text-xs text-slate-400">…</span>');
            }
        }

        for (let i = start; i <= end; i += 1) {
            addButton(i);
        }

        if (end < totalPages) {
            if (end < totalPages - 1) {
                pageNumbers.append('<span class="px-1 text-xs text-slate-400">…</span>');
            }
            addButton(totalPages);
        }
    }

    function renderEmptyState(hasDocs, hasFilters) {
        emptyState.removeClass('hidden');
        if (!hasDocs) {
            emptyTitle.text('No documents yet');
            emptyBody.text('Upload your research documents to build your library.');
        } else if (hasFilters) {
            emptyTitle.text('No matches found');
            emptyBody.text('Try another boundary or update your search terms.');
        }
    }

    function renderDocuments() {
        const activeFilters = hasFilters();

        documentList.empty();
        if (!documents.length) {
            renderEmptyState(false, activeFilters);
        } else {
            emptyState.addClass('hidden');
            documents.forEach((doc) => {
                const card = $(`
                    <div class="rounded-xl border border-slate-200 dark:border-[#283039] bg-white dark:bg-surface-dark px-4 py-4 shadow-sm transition-colors hover:border-primary/40 dark:hover:border-primary/30">
                        <div class="flex flex-wrap items-start justify-between gap-3">
                            <div class="min-w-0">
                                <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">${escapeHtml(doc.title)}</h3>
                                <div class="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    <span class="material-symbols-outlined text-[14px] text-primary/80">group</span>
                                    <span>${escapeHtml(doc.authors || 'Unknown authors')}</span>
                                </div>
                            </div>
                            <span class="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 dark:border-primary/30 dark:bg-primary/20 px-2 py-0.5 text-[11px] font-medium text-primary">
                                <span class="material-symbols-outlined text-[12px]">public</span>
                                ${escapeHtml(doc.planetaryBoundary || 'Uncategorized')}
                            </span>
                        </div>
                        <p class="mt-3 text-sm text-slate-600 dark:text-slate-300 line-clamp-3">${escapeHtml(doc.abstract || 'No abstract available.')}</p>
                        <div class="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200 px-2 py-0.5 text-[11px] font-medium">
                            <span class="material-symbols-outlined text-[12px] text-amber-500">database</span>
                            ${escapeHtml(doc.source || 'Unknown')}
                        </div>
                    </div>
                `);
                documentList.append(card);
            });
        }

        if (totalPages <= 1) {
            paginationContainer.addClass('hidden');
        } else {
            paginationContainer.removeClass('hidden');
            renderPageNumbers(totalPages);
            prevPage.prop('disabled', currentPage <= 1);
            nextPage.prop('disabled', currentPage >= totalPages);
        }
    }

    boundaryFilter.on('change', function () {
        // Wait for explicit search action
    });

    function updateClearButton() {
        if (librarySearch.val().trim()) {
            librarySearchClear.removeClass('hidden');
        } else {
            librarySearchClear.addClass('hidden');
        }
    }

    librarySearch.on('input', function () {
        updateClearButton();
    });

    librarySearch.on('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            currentPage = 1;
            loadDocuments().then(renderDocuments);
        }
    });

    librarySearchClear.on('click', function () {
        librarySearch.val('');
        updateClearButton();
        librarySearch.focus();
    });

    librarySearchButton.on('click', function () {
        currentPage = 1;
        updateClearButton();
        loadDocuments().then(renderDocuments);
    });

    prevPage.on('click', function () {
        if (currentPage > 1) {
            currentPage -= 1;
            loadDocuments().then(renderDocuments);
        }
    });

    nextPage.on('click', function () {
        currentPage += 1;
        loadDocuments().then(renderDocuments);
    });

    loadDocuments().then(() => {
        loadBoundaries();
        updateClearButton();
        renderDocuments();
    });
});
