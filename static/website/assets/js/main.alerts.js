$(document).ready(function () {
    const ALERTS_KEY = 'alerts';
    let alerts = [];
    let modalMode = 'create';
    let currentAlertId = null;
    let initialFormState = null;
    let showErrors = false;

    const alertsList = $('#alertsList');
    const alertsEmptyState = $('#alertsEmptyState');
    const createAlertButton = $('#createAlertButton');
    const alertsModal = $('#alertsModal');
    const alertsModalTitle = $('#alertsModalTitle');
    const alertsModalClose = $('#alertsModalClose');
    const alertsModalCancel = $('#alertsModalCancel');
    const alertsModalSave = $('#alertsModalSave');
    const alertsOverlay = $('[data-alerts-overlay]');
    const alertsUnsavedDialog = $('#alertsUnsavedDialog');
    const alertsUnsavedCancel = $('#alertsUnsavedCancel');
    const alertsUnsavedDiscard = $('#alertsUnsavedDiscard');

    const alertNameInput = $('#alertNameInput');
    const alertDescriptionInput = $('#alertDescriptionInput');
    const alertThresholdInput = $('#alertThresholdInput');
    const alertThresholdValue = $('#alertThresholdValue');
    const alertActiveToggle = $('#alertActiveToggle');
    const alertNameError = $('#alertNameError');
    const alertDescriptionError = $('#alertDescriptionError');

    function loadAlerts() {
        try {
            const stored = JSON.parse(localStorage.getItem(ALERTS_KEY));
            alerts = Array.isArray(stored) ? stored : [];
        } catch (e) {
            alerts = [];
        }
    }

    function saveAlerts() {
        localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
    }

    function renderAlerts() {
        alertsList.empty();
        if (!alerts.length) {
            alertsEmptyState.removeClass('hidden');
            return;
        }
        alertsEmptyState.addClass('hidden');
        alerts.forEach((alert) => {
            alertsList.append(renderAlertRow(alert));
        });
    }

    function renderAlertRow(alert) {
        const statusClass = alert.isActive
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-700/40 dark:text-slate-300';
        const statusLabel = alert.isActive ? 'Active' : 'Inactive';

        const row = $(`
            <div class="grid grid-cols-[2fr_1fr_1fr_auto] items-center gap-4 rounded-xl border border-slate-200 dark:border-[#283039] bg-white dark:bg-surface-dark px-3 py-3">
                <div class="flex min-w-[200px] flex-col">
                    <span class="text-sm font-semibold text-slate-800 dark:text-slate-100">${escapeHtml(alert.name)}</span>
                    <span class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">${escapeHtml(alert.description)}</span>
                </div>
                <div class="text-sm font-semibold text-slate-700 dark:text-slate-200">${alert.similarityThreshold}%</div>
                <span class="inline-flex w-fit items-center justify-center rounded-full px-2 py-1 text-xs font-semibold ${statusClass}">
                    ${statusLabel}
                </span>
                <div class="relative justify-self-end">
                    <button class="alert-actions-toggle flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800/60 dark:hover:text-slate-200 transition-colors" data-id="${alert.id}" aria-label="Alert actions">
                        <span class="material-symbols-outlined text-[18px]">more_vert</span>
                    </button>
                    <div class="alert-actions-menu absolute right-0 top-full mt-2 hidden w-40 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 z-20">
                        <button class="alert-toggle w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-700" data-id="${alert.id}">
                            ${alert.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button class="alert-edit w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-700" data-id="${alert.id}">
                            Edit
                        </button>
                        <button class="alert-delete w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/40" data-id="${alert.id}">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `);

        return row;
    }

    function escapeHtml(text) {
        return $('<div>').text(text).html();
    }

    function getFormState() {
        return {
            name: alertNameInput.val().trim(),
            description: alertDescriptionInput.val().trim(),
            similarityThreshold: parseInt(alertThresholdInput.val(), 10),
            isActive: alertActiveToggle.is(':checked')
        };
    }

    function setFormState(alert) {
        alertNameInput.val(alert.name || '');
        alertDescriptionInput.val(alert.description || '');
        alertThresholdInput.val(alert.similarityThreshold ?? 70);
        alertThresholdValue.text(alert.similarityThreshold ?? 70);
        alertActiveToggle.prop('checked', alert.isActive ?? true);
    }

    function resetFormErrors() {
        alertNameError.addClass('hidden');
        alertDescriptionError.addClass('hidden');
    }

    function isFormValid() {
        const state = getFormState();
        return Boolean(state.name && state.description);
    }

    function renderErrors() {
        if (!showErrors) return;
        const state = getFormState();
        if (!state.name) {
            alertNameError.removeClass('hidden');
        } else {
            alertNameError.addClass('hidden');
        }
        if (!state.description) {
            alertDescriptionError.removeClass('hidden');
        } else {
            alertDescriptionError.addClass('hidden');
        }
    }

    function isDirty() {
        const state = getFormState();
        if (!initialFormState) return false;
        return JSON.stringify(state) !== JSON.stringify(initialFormState);
    }

    function updateSaveButtonState() {
        const valid = isFormValid();
        const dirty = modalMode === 'create' ? hasAnyInput() : isDirty();
        alertsModalSave.prop('disabled', !valid || !dirty);
        alertsModalSave.toggleClass('opacity-50 cursor-not-allowed', !valid || !dirty);
        renderErrors();
    }

    function hasAnyInput() {
        const state = getFormState();
        return state.name || state.description || state.similarityThreshold !== 70 || state.isActive !== true;
    }

    function openModal(mode, alert) {
        modalMode = mode;
        currentAlertId = alert?.id || null;
        showErrors = false;
        resetFormErrors();
        const baseState = alert || { name: '', description: '', similarityThreshold: 70, isActive: true };
        setFormState(baseState);
        initialFormState = getFormState();
        alertsModalTitle.text(mode === 'create' ? 'Create Alert' : 'Edit Alert');
        alertsModalSave.text(mode === 'create' ? 'Create Alert' : 'Save Changes');
        alertsModal.removeClass('hidden');
        $('body').addClass('overflow-hidden');
        updateSaveButtonState();
    }

    function closeModal(force = false) {
        if (!force && isDirty()) {
            showUnsavedDialog();
            return;
        }
        alertsModal.addClass('hidden');
        $('body').removeClass('overflow-hidden');
        hideUnsavedDialog();
    }

    function showUnsavedDialog() {
        alertsUnsavedDialog.removeClass('hidden');
    }

    function hideUnsavedDialog() {
        alertsUnsavedDialog.addClass('hidden');
    }

    function handleSave() {
        showErrors = true;
        if (!isFormValid()) {
            updateSaveButtonState();
            return;
        }
        const state = getFormState();
        if (modalMode === 'create') {
            alerts.unshift({
                id: Date.now().toString(),
                ...state
            });
        } else {
            alerts = alerts.map((alert) =>
                alert.id === currentAlertId ? { ...alert, ...state } : alert
            );
        }
        saveAlerts();
        renderAlerts();
        closeModal(true);
    }

    function handleDelete(id) {
        const confirmed = window.confirm('Delete this alert? This action cannot be undone.');
        if (!confirmed) return;
        alerts = alerts.filter((alert) => alert.id !== id);
        saveAlerts();
        renderAlerts();
    }

    function bindRowEvents() {
        alertsList.on('click', '.alert-actions-toggle', function (e) {
            e.stopPropagation();
            const menu = $(this).siblings('.alert-actions-menu');
            $('.alert-actions-menu').not(menu).addClass('hidden');
            menu.toggleClass('hidden');
        });

        alertsList.on('click', '.alert-toggle', function () {
            const id = $(this).data('id');
            alerts = alerts.map((alert) =>
                alert.id === id ? { ...alert, isActive: !alert.isActive } : alert
            );
            saveAlerts();
            renderAlerts();
        });

        alertsList.on('click', '.alert-edit', function () {
            const id = $(this).data('id');
            const alert = alerts.find((item) => item.id === id);
            if (alert) openModal('edit', alert);
        });

        alertsList.on('click', '.alert-delete', function () {
            const id = $(this).data('id');
            handleDelete(id);
        });
    }

    alertThresholdInput.on('input', function () {
        alertThresholdValue.text($(this).val());
        updateSaveButtonState();
    });

    alertNameInput.on('input', updateSaveButtonState);
    alertDescriptionInput.on('input', updateSaveButtonState);
    alertActiveToggle.on('change', updateSaveButtonState);

    createAlertButton.on('click', function () {
        openModal('create');
    });

    alertsModalClose.on('click', function () {
        closeModal();
    });

    alertsModalCancel.on('click', function () {
        closeModal();
    });

    alertsModalSave.on('click', function () {
        handleSave();
    });

    alertsOverlay.on('click', function () {
        closeModal();
    });

    $(document).on('click', function () {
        $('.alert-actions-menu').addClass('hidden');
    });

    alertsList.on('click', '.alert-actions-menu', function (e) {
        e.stopPropagation();
    });

    alertsUnsavedCancel.on('click', function () {
        hideUnsavedDialog();
    });

    alertsUnsavedDiscard.on('click', function () {
        closeModal(true);
    });

    $(document).on('keydown', function (e) {
        if (alertsModal.hasClass('hidden')) return;
        if (e.key === 'Escape') {
            closeModal();
        }
    });

    loadAlerts();
    renderAlerts();
    bindRowEvents();
});
