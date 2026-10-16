<script setup>
import { computed, ref, watch } from 'vue';
import { router } from '@inertiajs/vue3';
import { useTranslation } from '@/utils/useTranslation.js';
import { activeFilterCount, filterChipText, filterQuery, filterValuesFromQuery, selectOptions } from '@/dbTable/listFilters.js';
import MultiSelect from './MultiSelect.vue';
import RelationshipFilterSelect from './RelationshipFilterSelect.vue';

/** Filter form of a db_table list (module `db_table_filters`) with its "Active Filters" chips. */
const props = defineProps({
    filterConfig: { type: Object, required: true },
    uiConfig: { type: Object, default: () => ({}) },
    relationships: { type: Array, default: () => [] },
    moduleHandle: { type: String, required: true },
    // List URL the filters are submitted to
    url: { type: String, required: true },
});

const { t } = useTranslation();
const only = ['items', 'search', 'pagination', 'filterConfig'];

const values = ref({});
const search = ref('');
const searchEnabled = computed(() => Boolean(props.filterConfig.default_search?.enabled));
const filters = computed(() => props.filterConfig.filters ?? []);
const enabledFilters = computed(() => filters.value.filter((filter) => filter.enabled));

const readQuery = () => {
    search.value = new URLSearchParams(window.location.search).get('search') || '';
    values.value = filterValuesFromQuery(window.location.search, filters.value);
};
readQuery();
watch(() => props.filterConfig, readQuery, { deep: true });

const apply = () => router.get(props.url, filterQuery(values.value, searchEnabled.value ? search.value : ''), {
    preserveState: false,
    preserveScroll: true,
    only,
});
const clear = (id) => {
    delete values.value[id];
    values.value = { ...filterValuesFromQuery('', filters.value), ...values.value };
    apply();
};
const clearSearch = () => {
    search.value = '';
    apply();
};
const clearAll = () => {
    values.value = filterValuesFromQuery('', filters.value);
    search.value = '';
    router.get(props.url, {}, { preserveState: true, preserveScroll: true, only });
};

const activeCount = computed(() => activeFilterCount(values.value, search.value));
const chipLabels = computed(() => ({
    yes: t('admin.common.yes'),
    no: t('admin.common.no'),
    from: (value) => t('admin.db_table.range_from', { value }),
    to: (value) => t('admin.db_table.range_to', { value }),
}));
const chips = computed(() => enabledFilters.value
    .map((filter) => ({ filter, text: filterChipText(values.value[filter.id], filter, props.uiConfig, chipLabels.value) }))
    .filter((chip) => chip.text !== ''));

const columnInterface = (filter) => props.uiConfig[filter.field]?.interface;
const dateType = (filter) => (columnInterface(filter) === 'datetime' ? 'datetime-local' : 'date');
const asList = (value) => (Array.isArray(value) ? value : (value ? [value] : []));
</script>

<template>
    <div class="mb-6 pb-4 border-divider">
        <form @submit.prevent="apply">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                <div v-if="searchEnabled || enabledFilters.length" class="md:col-span-2 lg:col-span-3 xl:col-span-4">
                    <div class="flex items-center gap-2">
                        <input v-if="searchEnabled" v-model="search" type="text" class="form-input flex-1" :placeholder="filterConfig.default_search.placeholder || t('admin.db_table.search_all_placeholder')" />
                        <button type="submit" class="btn btn-primary whitespace-nowrap">{{ t(searchEnabled ? 'admin.common.search' : 'admin.common.apply') }}</button>
                        <button v-if="activeCount > 0" type="button" class="btn btn-outline whitespace-nowrap" @click="clearAll">
                            {{ t('admin.common.clear_all') }}
                        </button>
                    </div>
                </div>

                <div
                    v-for="filter in enabledFilters"
                    :key="filter.id"
                    class="min-w-0"
                    :class="{ 'md:col-span-2': filter.operator === 'range' && ['date', 'datetime'].includes(columnInterface(filter)) }"
                >
                    <label class="form-label text-xs mb-1">{{ filter.label }}</label>

                    <input
                        v-if="filter.type === 'search'"
                        v-model="values[filter.id]"
                        type="text"
                        class="form-input text-sm"
                        :placeholder="filter.placeholder || filter.label"
                    />

                    <template v-else-if="filter.type === 'field' && columnInterface(filter) === 'select'">
                        <MultiSelect
                            v-if="filter.multiple"
                            :options="selectOptions(uiConfig[filter.field])"
                            :model-value="asList(values[filter.id])"
                            :placeholder="filter.placeholder || filter.label"
                            @update:model-value="(value) => { values[filter.id] = value; }"
                        />
                        <select v-else v-model="values[filter.id]" class="form-select text-sm">
                            <option value="">{{ filter.placeholder || t('admin.common.select_placeholder') }}</option>
                            <option v-for="option in selectOptions(uiConfig[filter.field])" :key="option.key" :value="option.key">
                                {{ option.label }}
                            </option>
                        </select>
                    </template>

                    <div v-else-if="filter.type === 'field' && ['date', 'datetime'].includes(columnInterface(filter))" class="flex gap-1">
                        <template v-if="filter.operator === 'range'">
                            <input v-model="values[filter.id].from" :type="dateType(filter)" class="form-input text-sm flex-1 min-w-0" :placeholder="t('admin.db_table.from')" />
                            <input v-model="values[filter.id].to" :type="dateType(filter)" class="form-input text-sm flex-1 min-w-0" :placeholder="t('admin.db_table.to')" />
                        </template>
                        <input v-else v-model="values[filter.id]" :type="dateType(filter)" class="form-input text-sm" />
                    </div>

                    <select v-else-if="filter.type === 'field' && columnInterface(filter) === 'checkbox'" v-model="values[filter.id]" class="form-select text-sm">
                        <option value="">{{ t('admin.db_table.any') }}</option>
                        <option value="1">{{ t('admin.common.yes') }}</option>
                        <option value="0">{{ t('admin.common.no') }}</option>
                    </select>

                    <div v-else-if="filter.type === 'field' && filter.operator === 'range'" class="flex gap-1">
                        <input v-model="values[filter.id].from" type="number" class="form-input text-sm flex-1 min-w-0" :placeholder="t('admin.db_table.min')" />
                        <input v-model="values[filter.id].to" type="number" class="form-input text-sm flex-1 min-w-0" :placeholder="t('admin.db_table.max')" />
                    </div>

                    <input
                        v-else-if="filter.type === 'field'"
                        v-model="values[filter.id]"
                        type="text"
                        class="form-input text-sm"
                        :placeholder="filter.placeholder || filter.label"
                    />

                    <RelationshipFilterSelect
                        v-else-if="filter.type === 'relationship'"
                        v-model="values[filter.id]"
                        :filter="filter"
                        :relationships="relationships"
                        :module-handle="moduleHandle"
                    />
                </div>
            </div>

            <div v-if="activeCount > 0" class="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <span class="text-sm text-gray-600 dark:text-gray-400">{{ t('admin.common.active_filters') }}:</span>
                <span v-if="search" class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded text-sm">
                    {{ filterConfig.default_search?.label || t('admin.common.search') }}: {{ search }}
                    <button type="button" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200" :aria-label="t('admin.common.clear')" @click="clearSearch">×</button>
                </span>
                <span
                    v-for="chip in chips"
                    :key="chip.filter.id"
                    class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded text-sm"
                >
                    {{ chip.filter.label }}: {{ chip.text }}
                    <button type="button" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200" :aria-label="t('admin.common.clear')" @click="clear(chip.filter.id)">×</button>
                </span>
            </div>
        </form>
    </div>
</template>
