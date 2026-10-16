import { router, useForm } from '@inertiajs/vue3';

/** The list search box: submits `search` to the list URL and clears it, reloading only the list props. */
export function useListSearch(url, initial = '', only = ['items', 'search', 'pagination']) {
    const form = useForm({ search: initial || '' });
    const visit = (params) => router.get(typeof url === 'function' ? url() : url, params, {
        preserveState: true,
        preserveScroll: true,
        only,
    });

    return {
        form,
        perform: () => visit({ search: form.search }),
        clear: () => {
            form.search = '';
            visit({});
        },
    };
}
