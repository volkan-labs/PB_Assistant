$(document).ready(function () {
    const STORAGE_KEY = 'knowledgeDocuments';
    const PAGE_SIZE = 10;
    let currentPage = 1;
    let documents = [];

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

    function loadDocuments() {
        try {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
            documents = Array.isArray(stored) ? stored : [];
        } catch (e) {
            documents = [];
        }
        const sampleDocs = [
                {
                    id: 'sample-1',
                    title: 'Safe and just Earth system boundaries',
                    abstract: 'A synthesis of Earth system boundaries that defines a safe and just operating space for humanity.',
                    authors: 'Rockström, J.; Gupta, J.; et al.',
                    planetaryBoundary: 'Climate Change',
                    source: 'fetched'
                },
                {
                    id: 'sample-2',
                    title: 'A planetary boundary for green water',
                    abstract: 'Explores the role of green water in regulating Earth system stability and proposes a boundary.',
                    authors: 'Wang-Erlandsson, L.; et al.',
                    planetaryBoundary: 'Freshwater Change',
                    source: 'fetched'
                },
                {
                    id: 'sample-3',
                    title: 'Novel entities and the safe operating space',
                    abstract: 'Assesses chemical pollution and novel entities against planetary boundary criteria.',
                    authors: 'Persson, L.; et al.',
                    planetaryBoundary: 'Novel Entities',
                    source: 'uploaded'
                },
                {
                    id: 'sample-4',
                    title: 'Biosphere integrity and functional diversity',
                    abstract: 'Evaluates biosphere integrity by measuring functional diversity and resilience.',
                    authors: 'Steffen, W.; et al.',
                    planetaryBoundary: 'Biosphere Integrity',
                    source: 'fetched'
                },
                {
                    id: 'sample-5',
                    title: 'Land-system change in the Anthropocene',
                    abstract: 'Reviews land-system change impacts and the thresholds for Earth system stability.',
                    authors: 'Pimm, S.; et al.',
                    planetaryBoundary: 'Land-system Change',
                    source: 'uploaded'
                },
                {
                    id: 'sample-6',
                    title: 'Biogeochemical flows of nitrogen and phosphorus',
                    abstract: 'A review of nutrient flows and their planetary boundary implications.',
                    authors: 'Galloway, J.; et al.',
                    planetaryBoundary: 'Biogeochemical Flows',
                    source: 'fetched'
                }
                ,
                {
                    id: 'sample-7',
                    title: 'Ocean acidification thresholds and resilience',
                    abstract: 'Examines ocean acidification signals and early warning indicators for ecosystem collapse.',
                    authors: 'Doney, S.; et al.',
                    planetaryBoundary: 'Ocean Acidification',
                    source: 'fetched'
                },
                {
                    id: 'sample-8',
                    title: 'Atmospheric aerosol loading and climate impacts',
                    abstract: 'A synthesis of aerosol loading impacts on monsoons and regional climate stability.',
                    authors: 'Ramanathan, V.; et al.',
                    planetaryBoundary: 'Atmospheric Aerosol Loading',
                    source: 'uploaded'
                },
                {
                    id: 'sample-9',
                    title: 'Stratospheric ozone recovery trajectories',
                    abstract: 'Evaluates ozone recovery under multiple emissions scenarios and policy responses.',
                    authors: 'Solomon, S.; et al.',
                    planetaryBoundary: 'Stratospheric Ozone Depletion',
                    source: 'fetched'
                },
                {
                    id: 'sample-10',
                    title: 'Greenhouse forcing and climate feedbacks',
                    abstract: 'Quantifies feedback strengths and implications for Earth system sensitivity.',
                    authors: 'Hansen, J.; et al.',
                    planetaryBoundary: 'Climate Change',
                    source: 'uploaded'
                },
                {
                    id: 'sample-11',
                    title: 'Regional freshwater availability under warming',
                    abstract: 'Assesses freshwater stress and regional tipping points under warming trajectories.',
                    authors: 'Gleeson, T.; et al.',
                    planetaryBoundary: 'Freshwater Change',
                    source: 'fetched'
                },
                {
                    id: 'sample-12',
                    title: 'Land degradation and biosphere stability',
                    abstract: 'Links land degradation hotspots to biosphere resilience metrics.',
                    authors: 'Foley, J.; et al.',
                    planetaryBoundary: 'Land-system Change',
                    source: 'uploaded'
                },
                {
                    id: 'sample-13',
                    title: 'The emerging boundary for novel entities',
                    abstract: 'Maps chemical footprints and outlines governance gaps for novel entities.',
                    authors: 'Wang, Z.; et al.',
                    planetaryBoundary: 'Novel Entities',
                    source: 'fetched'
                },
                {
                    id: 'sample-14',
                    title: 'Nitrogen fixation and ecosystem tipping points',
                    abstract: 'Explores nitrogen fixation rates and ecological thresholds.',
                    authors: 'Vitousek, P.; et al.',
                    planetaryBoundary: 'Biogeochemical Flows',
                    source: 'uploaded'
                },
                {
                    id: 'sample-15',
                    title: 'Biodiversity loss and ecosystem function',
                    abstract: 'Evaluates biodiversity loss and impacts on ecosystem function across biomes.',
                    authors: 'Cardinale, B.; et al.',
                    planetaryBoundary: 'Biosphere Integrity',
                    source: 'fetched'
                },
                {
                    id: 'sample-16',
                    title: 'Arctic amplification and climate extremes',
                    abstract: 'Analyzes polar amplification and mid-latitude extreme weather connections.',
                    authors: 'Serreze, M.; et al.',
                    planetaryBoundary: 'Climate Change',
                    source: 'fetched'
                },
                {
                    id: 'sample-17',
                    title: 'Aerosols and regional precipitation shifts',
                    abstract: 'Investigates aerosol impacts on precipitation patterns in Asia and Africa.',
                    authors: 'Giorgi, F.; et al.',
                    planetaryBoundary: 'Atmospheric Aerosol Loading',
                    source: 'uploaded'
                },
                {
                    id: 'sample-18',
                    title: 'Phosphorus loading in freshwater systems',
                    abstract: 'Tracks phosphorus loading trends and lake eutrophication risk.',
                    authors: 'Carpenter, S.; et al.',
                    planetaryBoundary: 'Biogeochemical Flows',
                    source: 'fetched'
                }
            ];
        if (!documents.length) {
            documents = sampleDocs;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
            return;
        }
        if (documents.length < 12) {
            const existingIds = new Set(documents.map((doc) => doc.id));
            const merged = [...documents];
            sampleDocs.forEach((doc) => {
                if (!existingIds.has(doc.id)) merged.push(doc);
            });
            documents = merged;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
        }
    }

    function renderBoundaryOptions(boundaries) {
        boundaryFilter.find('option:not(:first)').remove();
        boundaries.forEach((boundary) => {
            boundaryFilter.append(`<option value="${escapeHtml(boundary)}">${escapeHtml(boundary)}</option>`);
        });
    }

    function loadBoundaries() {
        fetch('/api/planetary-boundaries/')
            .then((response) => response.json())
            .then((data) => {
                const boundaries = Array.isArray(data)
                    ? data.map((item) => item.name || item.short_name).filter(Boolean)
                    : [];
                renderBoundaryOptions(boundaries);
            })
            .catch(() => {
                // Fallback to document-derived boundaries if API is unavailable.
                const fallback = Array.from(new Set(documents.map((doc) => doc.planetaryBoundary).filter(Boolean))).sort();
                renderBoundaryOptions(fallback);
            });
    }

    function escapeHtml(value) {
        return $('<div>').text(value ?? '').html();
    }

    function matchesSearch(doc, query) {
        const haystack = [
            doc.title,
            doc.abstract,
            doc.authors
        ].join(' ').toLowerCase();
        return haystack.includes(query);
    }

    function applyFilters() {
        const selectedBoundary = boundaryFilter.val();
        const searchQuery = librarySearch.val().trim().toLowerCase();
        let filtered = documents;

        if (selectedBoundary) {
            filtered = filtered.filter((doc) => doc.planetaryBoundary === selectedBoundary);
        }
        if (searchQuery) {
            filtered = filtered.filter((doc) => matchesSearch(doc, searchQuery));
        }

        return filtered;
    }

    function paginate(items) {
        const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
        currentPage = Math.min(currentPage, totalPages);
        const start = (currentPage - 1) * PAGE_SIZE;
        const pageItems = items.slice(start, start + PAGE_SIZE);
        return { pageItems, totalPages };
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
        const filtered = applyFilters();
        const hasFilters = Boolean(boundaryFilter.val() || librarySearch.val().trim());
        const { pageItems, totalPages } = paginate(filtered);

        documentList.empty();
        if (!documents.length || !filtered.length) {
            renderEmptyState(documents.length > 0, hasFilters);
        } else {
            emptyState.addClass('hidden');
            pageItems.forEach((doc) => {
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

        renderPageNumbers(totalPages);
        prevPage.prop('disabled', currentPage <= 1);
        nextPage.prop('disabled', currentPage >= totalPages);
    }

    boundaryFilter.on('change', function () {
        currentPage = 1;
        renderDocuments();
    });

    function updateClearButton() {
        if (librarySearch.val().trim()) {
            librarySearchClear.removeClass('hidden');
        } else {
            librarySearchClear.addClass('hidden');
        }
    }

    librarySearch.on('input', function () {
        currentPage = 1;
        updateClearButton();
        renderDocuments();
    });

    librarySearchClear.on('click', function () {
        librarySearch.val('');
        updateClearButton();
        currentPage = 1;
        renderDocuments();
        librarySearch.focus();
    });

    librarySearchButton.on('click', function () {
        currentPage = 1;
        renderDocuments();
    });

    prevPage.on('click', function () {
        if (currentPage > 1) {
            currentPage -= 1;
            renderDocuments();
        }
    });

    nextPage.on('click', function () {
        currentPage += 1;
        renderDocuments();
    });

    loadDocuments();
    loadBoundaries();
    updateClearButton();
    renderDocuments();
});
