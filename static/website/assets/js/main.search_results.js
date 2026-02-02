$(document).ready(function () {
    const sortSelect = document.getElementById('resultSort');
    const list = document.querySelector('.search-results-list');
    if (sortSelect && list) {
        const items = Array.from(list.children);

        function getYear(el) {
            const value = parseInt(el.dataset.year, 10);
            return Number.isFinite(value) ? value : null;
        }

        function getAuthor(el) {
            return (el.dataset.author || '').toLowerCase();
        }

        function getTitle(el) {
            return (el.dataset.title || '').toLowerCase();
        }

        function getSource(el) {
            return (el.dataset.source || '').toLowerCase();
        }

        function getIndex(el) {
            return parseInt(el.dataset.index, 10) || 0;
        }

        function sortItems(compareFn) {
            const sorted = items.slice().sort(compareFn);
            sorted.forEach((el) => list.appendChild(el));
        }

        function sortByRelevance() {
            sortItems((a, b) => getIndex(a) - getIndex(b));
        }

        function sortByNewest() {
            sortItems((a, b) => {
                const ay = getYear(a);
                const by = getYear(b);
                if (ay === null && by === null) return getIndex(a) - getIndex(b);
                if (ay === null) return 1;
                if (by === null) return -1;
                if (by !== ay) return by - ay;
                return getIndex(a) - getIndex(b);
            });
        }

        function sortByOldest() {
            sortItems((a, b) => {
                const ay = getYear(a);
                const by = getYear(b);
                if (ay === null && by === null) return getIndex(a) - getIndex(b);
                if (ay === null) return 1;
                if (by === null) return -1;
                if (ay !== by) return ay - by;
                return getIndex(a) - getIndex(b);
            });
        }

        function sortByAuthor() {
            sortItems((a, b) => {
                const aa = getAuthor(a);
                const ba = getAuthor(b);
                if (!aa && !ba) return getIndex(a) - getIndex(b);
                if (!aa) return 1;
                if (!ba) return -1;
                const diff = aa.localeCompare(ba);
                return diff !== 0 ? diff : getIndex(a) - getIndex(b);
            });
        }

        function sortByTitle() {
            sortItems((a, b) => {
                const at = getTitle(a);
                const bt = getTitle(b);
                if (!at && !bt) return getIndex(a) - getIndex(b);
                if (!at) return 1;
                if (!bt) return -1;
                const diff = at.localeCompare(bt);
                return diff !== 0 ? diff : getIndex(a) - getIndex(b);
            });
        }

        function sortBySource() {
            sortItems((a, b) => {
                const as = getSource(a);
                const bs = getSource(b);
                if (!as && !bs) return getIndex(a) - getIndex(b);
                if (!as) return 1;
                if (!bs) return -1;
                const diff = as.localeCompare(bs);
                return diff !== 0 ? diff : getIndex(a) - getIndex(b);
            });
        }

        const storedSort = localStorage.getItem('searchResultSort');
        if (storedSort) {
            sortSelect.value = storedSort;
        }

        function applySort(value) {
            if (value === 'Newest first') {
                sortByNewest();
            } else if (value === 'Oldest first') {
                sortByOldest();
            } else if (value === 'Author A–Z') {
                sortByAuthor();
            } else if (value === 'Title A–Z') {
                sortByTitle();
            } else if (value === 'Source A–Z') {
                sortBySource();
            } else {
                sortByRelevance();
            }
        }

        applySort(sortSelect.value);

        sortSelect.addEventListener('change', function () {
            localStorage.setItem('searchResultSort', sortSelect.value);
            applySort(sortSelect.value);
        });
    }

    const avatar = document.querySelector('.user-avatar-mini');
    if (avatar) {
        const userMeta = document.querySelector('.user-meta');
        const name = userMeta?.dataset?.userName || 'User';
        const parts = name.trim().split(/\s+/);
        const initials = parts.length >= 2
            ? `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
            : `${parts[0][0] || ''}`.toUpperCase();
        const storedColor = localStorage.getItem('avatarColor');
        if (storedColor) {
            avatar.style.backgroundColor = storedColor;
        }
        avatar.textContent = initials || 'U';

        const label = document.querySelector('.user-name-label');
        if (label) {
            const formatted = parts.length >= 2
                ? `${parts[0]} ${parts[1][0] || ''}.`
                : name;
            label.textContent = formatted;
        }
    }

    document.querySelectorAll('.timestamp-local').forEach((el) => {
        const raw = el.getAttribute('data-timestamp');
        if (!raw) return;
        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) return;
        const datePart = parsed.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        const timePart = parsed.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        el.textContent = `${datePart} · ${timePart}`;
    });

});
