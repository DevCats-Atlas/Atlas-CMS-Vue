import { computed, ref, watch } from 'vue';
import { router } from '@inertiajs/vue3';
import { confirmDialog } from '@/utils/confirmDialog.js';
import { pruneSelection, selectableIds, selectionState } from './selection.js';

/**
 * Row selection and bulk delete of a list. `rows()` returns the rows on screen; `allIds()` every id the list holds
 * (selections outside it are dropped after a reload). `confirm(count)` gives the ConfirmDialog texts.
 * Rows are deleted one by one through `deleteUrl` (`{ item_id }`); those that fail stay selected.
 */
export function useSelection(rows, { deletable = () => true, allIds = null, deleteUrl, confirm }) {
    const selected = ref(new Set());
    const isDeleting = ref(false);

    const ids = computed(() => selectableIds(rows(), { deletable }));
    const state = computed(() => selectionState(selected.value, ids.value));

    const isSelected = (id) => selected.value.has(String(id));
    const toggle = (id) => {
        const next = new Set(selected.value);
        next.has(String(id)) ? next.delete(String(id)) : next.add(String(id));
        selected.value = next;
    };
    const toggleAll = (checked) => {
        selected.value = checked ? new Set(ids.value) : new Set();
    };

    watch(() => (allIds ? allIds() : rows().map((row) => row.id)), (listed) => {
        selected.value = pruneSelection(selected.value, listed);
    });

    const deleteSelected = async () => {
        const chosen = [...selected.value];
        if (chosen.length === 0 || !(await confirmDialog({ intent: 'danger', ...confirm(chosen.length) }))) {
            return;
        }

        isDeleting.value = true;
        const url = typeof deleteUrl === 'function' ? deleteUrl() : deleteUrl;
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        const failed = [];
        for (const id of chosen) {
            try {
                const response = await fetch(url, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': csrfToken,
                        Accept: 'application/json',
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({ item_id: id }),
                });
                if (!response.ok) {
                    failed.push(id);
                }
            } catch {
                failed.push(id);
            }
        }
        selected.value = new Set(failed);
        isDeleting.value = false;
        router.reload({ preserveScroll: true });
    };

    return {
        selected,
        count: computed(() => selected.value.size),
        isSelected,
        toggle,
        toggleAll,
        isAllSelected: computed(() => state.value.all),
        isIndeterminate: computed(() => state.value.some),
        isDeleting,
        deleteSelected,
    };
}
