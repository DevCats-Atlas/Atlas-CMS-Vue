import { ref } from 'vue';
import { router, useForm } from '@inertiajs/vue3';

/**
 * Inline "add child" forms of a tree list, one per parent row. On success the list reloads and `onCreated(parentId)`
 * runs (e.g. to keep the parent expanded).
 */
export function useCreateChild(url, { onCreated = () => {} } = {}) {
    const forms = ref({});
    const visible = ref({});

    const open = (parentId) => {
        const key = String(parentId);
        forms.value[key] ??= useForm({ parent_id: parentId, title: '' });
        visible.value[key] = true;
    };

    const close = (parentId) => {
        const key = String(parentId);
        visible.value[key] = false;
        forms.value[key]?.reset();
    };

    const submit = (parentId) => {
        const form = forms.value[String(parentId)];
        if (!form || !form.title.trim()) {
            return;
        }
        onCreated(parentId);
        form.post(typeof url === 'function' ? url() : url, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                close(parentId);
                router.reload({ preserveScroll: true, onSuccess: () => onCreated(parentId) });
            },
        });
    };

    const isOpen = (parentId) => Boolean(visible.value[String(parentId)]);
    const formFor = (parentId) => forms.value[String(parentId)];

    return { open, close, submit, isOpen, formFor };
}
