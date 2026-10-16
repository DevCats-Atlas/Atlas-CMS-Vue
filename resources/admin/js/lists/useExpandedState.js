import { ref } from 'vue';

/**
 * Expanded tree branches. Ids are compared as strings. With a `storageKey` the set survives reloads within the
 * browser tab (sessionStorage); storage errors are ignored.
 */
export function useExpandedState(storageKey = null) {
    const load = () => {
        if (!storageKey) {
            return new Set();
        }
        try {
            const stored = sessionStorage.getItem(storageKey);
            return new Set(stored ? JSON.parse(stored).map(String) : []);
        } catch {
            return new Set();
        }
    };

    const expanded = ref(load());
    let persist = true;

    const save = () => {
        if (!storageKey || !persist) {
            return;
        }
        try {
            sessionStorage.setItem(storageKey, JSON.stringify(Array.from(expanded.value)));
        } catch {
            // Storage unavailable (private mode, quota): expansion lasts until the page is left
        }
    };

    const isExpanded = (id) => expanded.value.has(String(id));
    const expand = (id) => {
        expanded.value.add(String(id));
        save();
    };
    const toggle = (id) => {
        const key = String(id);
        if (expanded.value.has(key)) {
            expanded.value.delete(key);
        } else {
            expanded.value.add(key);
        }
        save();
    };

    /** Show exactly these branches without overwriting the stored set (search results), or restore it (null). */
    const showOnly = (ids) => {
        persist = ids === null;
        expanded.value = ids === null ? load() : new Set(ids.map(String));
    };

    return { expanded, isExpanded, expand, toggle, showOnly };
}
