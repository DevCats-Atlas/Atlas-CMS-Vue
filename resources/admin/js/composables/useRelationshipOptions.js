import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import axios from 'axios';
import { adminUrl } from '@/utils/adminUrl';

// Only the latest search/context may update options; small lists load without a search.
export function useRelationshipOptions(moduleHandle, relationshipName, { immediate = true, allowEmptySearch = false } = {}) {
    const records = ref([]);
    const loading = ref(false);
    const loadingCount = ref(false);
    const searchQuery = ref('');
    const totalCount = ref(null);
    const requiresSearch = ref(false);
    let generation = 0;
    let requestId = 0;
    let timer;
    const url = () => adminUrl(`${encodeURIComponent(moduleHandle())}/relationships/${encodeURIComponent(relationshipName())}/options`);

    const load = async () => {
        const current = ++requestId;
        if (!relationshipName() || (requiresSearch.value && !searchQuery.value.trim() && !allowEmptySearch)) {
            records.value = [];
            loading.value = false;
            return;
        }
        loading.value = true;
        try {
            const response = await axios.get(url(), { params: { search: searchQuery.value, per_page: requiresSearch.value ? 50 : 100 } });
            if (current === requestId) records.value = response.data.records || [];
        } catch {
            if (current === requestId) records.value = [];
        } finally {
            if (current === requestId) loading.value = false;
        }
    };

    const initialize = async () => {
        clearTimeout(timer);
        const current = ++generation;
        ++requestId;
        records.value = [];
        totalCount.value = null;
        loading.value = false;
        loadingCount.value = false;
        if (!relationshipName()) return;
        loadingCount.value = true;
        try {
            const response = await axios.get(`${url()}/count`);
            if (current !== generation) return;
            totalCount.value = response.data.count || 0;
            requiresSearch.value = totalCount.value >= 100;
        } catch {
            if (current !== generation) return;
            requiresSearch.value = true;
        } finally {
            if (current === generation) loadingCount.value = false;
        }
        if (current === generation) await load();
    };

    watch(searchQuery, () => {
        // Invalidate the previous response as soon as the user changes the query.
        ++requestId;
        clearTimeout(timer);
        timer = setTimeout(load, 300);
    });
    watch([moduleHandle, relationshipName], initialize);
    if (immediate) onMounted(initialize);
    onBeforeUnmount(() => { ++generation; ++requestId; clearTimeout(timer); });

    return { records, loading, loadingCount, searchQuery, totalCount, requiresSearch, initialize, load };
}
