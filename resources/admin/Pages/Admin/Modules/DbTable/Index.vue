<script setup>
import { adminUrl } from '@/utils/adminUrl';
import { computed, ref, watch } from 'vue';
import { Head, Link, router } from '@inertiajs/vue3';
import AdminLayout from '@admin/Layouts/AdminLayout.vue';
import { confirmDialog } from '@admin/js/utils/confirmDialog.js';
import { useTranslation } from '@admin/js/utils/useTranslation';
import { resolveInterfaceComponent } from '@admin/Pages/Admin/Modules/Default/components/interfaces';
import MultiSelect from './components/MultiSelect.vue';
import RelationshipFilterSelect from './components/RelationshipFilterSelect.vue';
import axios from 'axios';
import { dropPlacement, flatten } from '@admin/js/lists/tree.js';
import { useCreateChild } from '@admin/js/lists/useCreateChild.js';
import { useExpandedState } from '@admin/js/lists/useExpandedState.js';
import { useListSearch } from '@admin/js/lists/useListSearch.js';
import { useTreeDragDrop } from '@admin/js/lists/useTreeDragDrop.js';
import ListPagination from '@admin/js/lists/ListPagination.vue';
import { useToast } from '@admin/js/composables/useToast.js';

const { t } = useTranslation();
const { showToast } = useToast();

const props = defineProps({
    title: {
        type: String,
        default: 'Module View',
    },
    moduleHandle: {
        type: String,
        required: true,
    },
    module: {
        type: Object,
        required: true,
    },
    tableName: {
        type: String,
        required: true,
    },
    columns: {
        type: Array,
        default: () => [],
    },
    items: {
        type: Array,
        default: () => [],
    },
    pagination: {
        type: Object,
        default: null,
    },
    search: {
        type: String,
        default: '',
    },
    uiConfig: {
        type: Object,
        default: () => ({}),
    },
    primaryKeyColumn: {
        type: String,
        default: 'id',
    },
    hasDeepStructure: {
        type: Boolean,
        default: false,
    },
    parentColumn: {
        type: String,
        default: 'parent_id',
    },
    hasOrderIndex: {
        type: Boolean,
        default: false,
    },
    hasSortingEnabled: {
        type: Boolean,
        default: false,
    },
    sortingColumn: {
        type: String,
        default: 'order_index',
    },
    hasWideLayout: {
        type: Boolean,
        default: false,
    },
    // relationships prop removed - relationships are managed on Edit page only
    // Keeping prop for backward compatibility but not using it
    relationships: {
        type: Array,
        default: () => [],
    },
    filterConfig: {
        type: Object,
        default: null,
    },
});

const baseUrl = computed(() => adminUrl(`${props.moduleHandle}`));

// Filter state management
const hasFilterConfig = computed(() => {
    return props.filterConfig && props.filterConfig.filters && props.filterConfig.filters.length > 0;
});

// Initialize filter values from query parameters
const filterValues = ref({});
const defaultSearchValue = ref(props.search || '');

// Filter values from the URL (links, reloads): `filter[id]`, `filter[id][]` / `filter[id][0]` lists, `filter[id][from|to]` ranges
const initializeFilters = () => {
    const params = new URLSearchParams(window.location.search);
    defaultSearchValue.value = params.get('search') || '';
    const values = {};

    for (const filter of props.filterConfig?.filters ?? []) {
        if (!filter.enabled) {
            continue;
        }
        const key = `filter[${filter.id}]`;
        const list = [...params.entries()]
            .filter(([name]) => name.startsWith(key) && /^\[\d*\]$/.test(name.slice(key.length)))
            .map(([, value]) => value);
        const from = params.get(`${key}[from]`);
        const to = params.get(`${key}[to]`);
        const single = params.get(key);

        if (list.length > 0) {
            values[filter.id] = filter.multiple ? list : list[0];
        } else if (from !== null || to !== null) {
            values[filter.id] = { from: from ?? '', to: to ?? '' };
        } else if (single !== null) {
            values[filter.id] = filter.multiple ? [single] : single;
        } else if (filter.operator === 'range') {
            values[filter.id] = { from: '', to: '' };
        }
    }

    filterValues.value = values;
};

// Initialize on mount
initializeFilters();

// Watch for filter config changes
watch(() => props.filterConfig, () => {
    initializeFilters();
}, { deep: true });

// Build query parameters from filter values
const buildFilterParams = () => {
    const params = {};
    
    // Add default search if enabled and has value
    if (props.filterConfig?.default_search?.enabled && defaultSearchValue.value && defaultSearchValue.value.trim() !== '') {
        params.search = defaultSearchValue.value.trim();
    }
    
    // Add custom filter values
    Object.keys(filterValues.value).forEach(filterId => {
        const value = filterValues.value[filterId];
        
        // Check if value is not empty
        const isEmpty = value === null || value === undefined || value === '' || 
                       (Array.isArray(value) && value.length === 0) ||
                       (typeof value === 'object' && !Array.isArray(value) && !value.from && !value.to);
        
        if (!isEmpty) {
            // Handle array values (for multiple select)
            if (Array.isArray(value) && value.length > 0) {
                // For arrays, use indexed notation: filter[filterId][0], filter[filterId][1], etc.
                // This is how Laravel expects array parameters
                const filteredArray = value.filter(v => v !== null && v !== undefined && v !== '');
                if (filteredArray.length > 0) {
                    filteredArray.forEach((v, index) => {
                        params[`filter[${filterId}][${index}]`] = String(v);
                    });
                }
            } 
            // Handle range values
            else if (typeof value === 'object' && !Array.isArray(value) && (value.from || value.to)) {
                if (value.from && value.from.toString().trim() !== '') {
                    params[`filter[${filterId}][from]`] = value.from.toString().trim();
                }
                if (value.to && value.to.toString().trim() !== '') {
                    params[`filter[${filterId}][to]`] = value.to.toString().trim();
                }
            }
            // Handle single values
            else if (!Array.isArray(value)) {
                params[`filter[${filterId}]`] = String(value).trim();
            }
        }
    });
    
    return params;
};

// Apply filters
const applyFilters = () => {
    router.get(baseUrl.value, buildFilterParams(), {
        preserveState: false,
        preserveScroll: true,
        only: ['items', 'search', 'pagination', 'filterConfig'],
    });
};

// Clear specific filter
const clearFilter = (filterId) => {
    delete filterValues.value[filterId];
    applyFilters();
};

// Clear all filters
const clearAllFilters = () => {
    filterValues.value = {};
    defaultSearchValue.value = '';
    router.get(baseUrl.value, {}, {
        preserveState: true,
        preserveScroll: true,
        only: ['items', 'search', 'pagination', 'filterConfig'],
    });
};

// Plain search box (modules without filter config)
const { form: searchForm, perform: performSearch, clear: clearSearch } = useListSearch(() => baseUrl.value, props.search);

// Get active filters count
const activeFiltersCount = computed(() => {
    let count = 0;
    if (defaultSearchValue.value) count++;
    Object.keys(filterValues.value).forEach(key => {
        const value = filterValues.value[key];
        if (value !== null && value !== undefined && value !== '') {
            if (Array.isArray(value) && value.length > 0) {
                count++;
            } else if (typeof value === 'object' && (value.from || value.to)) {
                count++;
            } else if (typeof value !== 'object') {
                count++;
            }
        }
    });
    return count;
});

// Initialize range values properly
watch(() => props.filterConfig, (newConfig) => {
    if (newConfig && newConfig.filters) {
        newConfig.filters.forEach(filter => {
            if (filter.type === 'field' && filter.operator === 'range' && !filterValues.value[filter.id]) {
                filterValues.value[filter.id] = { from: '', to: '' };
            }
        });
    }
}, { deep: true, immediate: true });

const formatValue = (value, column) => {
    if (value === null || value === undefined) {
        return '-';
    }
    
    if (column.interface === 'checkbox') {
        return value ? 'Yes' : 'No';
    }
    
    if (column.interface === 'datetime') {
        // Try to parse as date
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            return date.toLocaleString();
        }
    }
    
    return String(value);
};

// Get select options for a field
const getSelectOptions = (fieldName) => {
    const fieldConfig = props.uiConfig[fieldName];
    if (!fieldConfig) return [];
    
    // If options is already an array (from backend), use it directly
    const optionsData = fieldConfig.options || fieldConfig.config?.options;
    if (Array.isArray(optionsData)) {
        return optionsData.map(opt => {
            if (typeof opt === 'string') {
                return { key: opt, label: opt };
            }
            return {
                key: opt.key || opt.value || String(opt),
                label: opt.label || opt.name || opt.key || opt.value || String(opt),
            };
        });
    }
    
    // Parse options from string
    const optionsString = optionsData || '';
    if (!optionsString || typeof optionsString !== 'string') return [];
    
    // Auto-detect format if it looks like value_label format (contains = and newlines)
    const hasEquals = optionsString.includes('=');
    const hasNewlines = optionsString.includes('\n');
    const looksLikeValueLabel = hasEquals && hasNewlines;
    
    // Handle different option formats
    if (fieldConfig.select_type === 'static') {
        let inputType = fieldConfig.select_input_type || 'comma';
        
        // Auto-detect: if string has = and newlines, treat as value_label
        if (looksLikeValueLabel && inputType === 'comma') {
            inputType = 'value_label';
        }
        
        if (inputType === 'comma') {
            return optionsString.split(',').map(opt => {
                const trimmed = opt.trim();
                return { key: trimmed, label: trimmed };
            }).filter(opt => opt.key);
        } else if (inputType === 'newline') {
            return optionsString.split('\n').map(opt => {
                const trimmed = opt.trim();
                return { key: trimmed, label: trimmed };
            }).filter(opt => opt.key);
        } else if (inputType === 'value_label') {
            // Handle both = and : separators
            return optionsString.split('\n').map(opt => {
                const trimmed = opt.trim();
                if (!trimmed) return null;
                
                // Try = first (most common), then :
                if (trimmed.includes('=')) {
                    const parts = trimmed.split('=');
                    if (parts.length >= 2) {
                        const key = parts[0].trim();
                        const label = parts.slice(1).join('=').trim(); // Join in case label contains '='
                        return { key, label: label || key };
                    }
                } else if (trimmed.includes(':')) {
                    const parts = trimmed.split(':');
                    if (parts.length >= 2) {
                        const key = parts[0].trim();
                        const label = parts.slice(1).join(':').trim(); // Join in case label contains ':'
                        return { key, label: label || key };
                    }
                }
                
                // If no separator found, use the whole line as both key and label
                return { key: trimmed, label: trimmed };
            }).filter(opt => opt !== null && opt.key);
        }
    }
    
    return [];
};

// Get display text for select field
const getSelectDisplayText = (filterId, fieldName) => {
    const value = filterValues.value[filterId];
    if (!value || value === '') return '';
    
    const options = getSelectOptions(fieldName);
    if (Array.isArray(value)) {
        // Multiple select - show comma-separated labels
        return value.map(v => {
            const option = options.find(opt => String(opt.key) === String(v));
            return option ? option.label : v;
        }).filter(Boolean).join(', ');
    } else {
        // Single select - show label
        const option = options.find(opt => String(opt.key) === String(value));
        return option ? option.label : String(value);
    }
};

// Format filter value for display
const formatFilterValue = (value, filter) => {
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        return '';
    }
    if (typeof value === 'object' && !Array.isArray(value) && !value.from && !value.to) {
        return ''; // empty range
    }

    // Select fields show option labels, not stored keys
    if (filter?.type === 'field' && filter.field && getSelectOptions(filter.field).length > 0) {
        return getSelectDisplayText(filter.id, filter.field);
    }

    if (Array.isArray(value)) {
        return value.join(', ');
    }
    
    if (typeof value === 'object' && (value.from || value.to)) {
        const parts = [];
        if (value.from) parts.push(`From: ${value.from}`);
        if (value.to) parts.push(`To: ${value.to}`);
        return parts.join(', ');
    }
    
    // Format based on filter type
    if (filter && filter.type === 'field' && filter.field && props.uiConfig[filter.field]?.interface === 'checkbox') {
        return value === '1' || value === 1 || value === true ? 'Yes' : 'No';
    }
    
    return String(value);
};


const confirmDelete = async (item) => {
    // Use the primary key column passed from backend
    const recordId = item[props.primaryKeyColumn];
    
    const confirmed = await confirmDialog({
        title: t('admin.db_table.delete_confirm'),
        confirmLabel: t('admin.common.delete'),
        intent: 'danger',
    });
    
    if (!confirmed) {
        return;
    }
    
    router.delete(`${baseUrl.value}/delete`, {
        data: {
            item_id: recordId,
        },
        preserveScroll: true,
        onSuccess: () => {
            router.reload({ preserveScroll: true });
        },
    });
};

// Tree: expanded branches, drag-and-drop moves, quick child creation
const { isExpanded, expand, toggle: toggleExpand } = useExpandedState();
const idOf = (item) => item[props.primaryKeyColumn];

// Reordering needs manual sorting, a tree or an order_index column
const canReorder = computed(() => props.hasSortingEnabled || props.hasDeepStructure || props.hasOrderIndex);

// Positions are 0-based among the siblings; root rows on later pages start after the earlier pages
const rootOffset = computed(() => Math.max((props.pagination?.from ?? 1) - 1, 0));

const { draggedItem, draggedOverIndex, handleDragStart, handleDragEnd, handleDragOver, handleDrop } = useTreeDragDrop({
    canDrag: () => canReorder.value,
    onDrop: async (dragged, target) => {
        const placement = props.hasDeepStructure
            ? dropPlacement(props.items, idOf(dragged), idOf(target), { idOf, parentOf: (item) => item[props.parentColumn] ?? null })
            : dropPlacement(props.items.map((item) => ({ ...item, children: [] })), idOf(dragged), idOf(target), { idOf, parentOf: () => null });
        if (!placement) {
            return;
        }
        const isRoot = placement.parentId === null || placement.parentId === undefined;

        try {
            await axios.post(adminUrl(`${props.moduleHandle}/reorder`), {
                record_id: idOf(dragged),
                new_parent_id: props.hasDeepStructure ? placement.parentId : null,
                new_order_index: placement.index + (isRoot ? rootOffset.value : 0),
            });
            if (placement.asChild) {
                expand(placement.parentId);
            }
            router.reload({ preserveScroll: true });
        } catch (error) {
            showToast({ title: t('admin.errors.error_reordering'), message: error.response?.data?.error || '', intent: 'danger' });
        }
    },
});

const displayItems = computed(() => flatten(props.items, { idOf, isExpanded, tree: props.hasDeepStructure }));

const {
    open: openCreateChildForm,
    close: closeCreateChildForm,
    submit: submitCreateChild,
    isOpen: isCreateChildOpen,
    formFor: childFormFor,
} = useCreateChild(() => `${baseUrl.value}/create-child`, { onCreated: (parentId) => expand(parentId) });
</script>

<template>
    <AdminLayout>
        <Head :title="title" />

        <div class="py-6">
            <div :class="['mx-auto sm:px-6 lg:px-8 space-y-6', hasWideLayout ? '' : 'max-w-7xl']">
                <div class="bg-white dark:bg-gray-800 shadow rounded-xl p-6">
                    <div class="flex items-start justify-between gap-4 mb-6">
                        <div>
                            <h1 class="heading-1">{{ title }}</h1>
                            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {{ t('admin.db_table.table') }} <code class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">{{ tableName }}</code>
                            </p>
                        </div>
                        <button type="button" class="btn btn-primary" @click="router.visit(baseUrl + '/create')">
                            {{ t('admin.common.create') }}
                        </button>
                    </div>

                    <!-- Filter Form -->
                    <div v-if="hasFilterConfig" class="mb-6 pb-4 border-divider">
                        <form @submit.prevent="applyFilters">
                            <!-- Compact Grid Layout -->
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                <!-- Default Search -->
                                <div v-if="props.filterConfig?.default_search?.enabled" class="md:col-span-2 lg:col-span-3 xl:col-span-4">
                                    <div class="flex items-center gap-2">
                                        <div class="flex-1">
                                            <input
                                                v-model="defaultSearchValue"
                                                type="text"
                                                class="form-input"
                                                :placeholder="props.filterConfig.default_search.placeholder || t('admin.common.search')"
                                            />
                                        </div>
                                        <button type="submit" class="btn btn-primary whitespace-nowrap">
                                            {{ t('admin.common.search') }}
                                        </button>
                                        <button
                                            v-if="activeFiltersCount > 0"
                                            type="button"
                                            class="btn btn-outline whitespace-nowrap"
                                            @click="clearAllFilters"
                                        >
                                            {{ t('admin.common.clear_all') }}
                                        </button>
                                    </div>
                                </div>

                                <!-- Custom Filters -->
                                <div
                                    v-for="filter in (props.filterConfig?.filters || [])"
                                    :key="filter.id"
                                    v-show="filter && filter.enabled"
                                    class="flex items-start gap-2"
                                >
                                    <div class="flex-1 min-w-0">
                                        <label class="form-label text-xs mb-1">{{ filter.label }}</label>
                                        
                                        <!-- Search Filter -->
                                        <input
                                            v-if="filter.type === 'search'"
                                            v-model="filterValues[filter.id]"
                                            type="text"
                                            class="form-input text-sm"
                                            :placeholder="filter.placeholder || filter.label"
                                        />
                                        
                                        <!-- Field Filter: Select (Single) -->
                                        <div v-else-if="filter.type === 'field' && uiConfig[filter.field]?.interface === 'select' && !filter.multiple" class="relative">
                                            <select
                                                v-model="filterValues[filter.id]"
                                                class="form-select text-sm"
                                            >
                                                <option value="">{{ filter.placeholder || 'Select...' }}</option>
                                                <option
                                                    v-for="option in getSelectOptions(filter.field)"
                                                    :key="option.key"
                                                    :value="option.key"
                                                >
                                                    {{ option.label }}
                                                </option>
                                            </select>
                                        </div>
                                        
                                        <!-- Field Filter: Select (Multiple) -->
                                        <MultiSelect
                                            v-else-if="filter.type === 'field' && uiConfig[filter.field]?.interface === 'select' && filter.multiple"
                                            :options="getSelectOptions(filter.field)"
                                            :model-value="Array.isArray(filterValues[filter.id]) ? filterValues[filter.id] : (filterValues[filter.id] ? [filterValues[filter.id]] : [])"
                                            :placeholder="filter.placeholder || filter.label"
                                            @update:model-value="(val) => { filterValues[filter.id] = val; }"
                                        />
                                        
                                        <!-- Field Filter: Date/DateTime -->
                                        <div v-else-if="filter.type === 'field' && (uiConfig[filter.field]?.interface === 'date' || uiConfig[filter.field]?.interface === 'datetime')" class="flex gap-1">
                                            <input
                                                v-if="filter.operator === 'range'"
                                                v-model="filterValues[filter.id].from"
                                                :type="uiConfig[filter.field]?.interface === 'datetime' ? 'datetime-local' : 'date'"
                                                class="form-input text-sm flex-1"
                                                :placeholder="t('admin.db_table.from')"
                                            />
                                            <input
                                                v-if="filter.operator === 'range'"
                                                v-model="filterValues[filter.id].to"
                                                :type="uiConfig[filter.field]?.interface === 'datetime' ? 'datetime-local' : 'date'"
                                                class="form-input text-sm flex-1"
                                                :placeholder="t('admin.db_table.to')"
                                            />
                                            <input
                                                v-else
                                                v-model="filterValues[filter.id]"
                                                :type="uiConfig[filter.field]?.interface === 'datetime' ? 'datetime-local' : 'date'"
                                                class="form-input text-sm"
                                            />
                                        </div>
                                        
                                        <!-- Field Filter: Checkbox -->
                                        <select
                                            v-else-if="filter.type === 'field' && uiConfig[filter.field]?.interface === 'checkbox'"
                                            v-model="filterValues[filter.id]"
                                            class="form-select text-sm"
                                        >
                                            <option value="">{{ t('admin.db_table.any') }}</option>
                                            <option value="1">{{ t('admin.common.yes') }}</option>
                                            <option value="0">{{ t('admin.common.no') }}</option>
                                        </select>
                                        
                                        <!-- Field Filter: Number/Text Range -->
                                        <div v-else-if="filter.type === 'field' && filter.operator === 'range'" class="flex gap-1">
                                            <input
                                                v-model="filterValues[filter.id].from"
                                                type="number"
                                                class="form-input text-sm flex-1"
                                                :placeholder="t('admin.db_table.min')"
                                            />
                                            <input
                                                v-model="filterValues[filter.id].to"
                                                type="number"
                                                class="form-input text-sm flex-1"
                                                :placeholder="t('admin.db_table.max')"
                                            />
                                        </div>
                                        
                                        <!-- Field Filter: Number/Text -->
                                        <input
                                            v-else-if="filter.type === 'field'"
                                            v-model="filterValues[filter.id]"
                                            type="text"
                                            class="form-input text-sm"
                                            :placeholder="filter.placeholder || filter.label"
                                        />
                                        
                                        <!-- Relationship Filter -->
                                        <RelationshipFilterSelect
                                            v-else-if="filter.type === 'relationship'"
                                            :filter="filter"
                                            :relationships="relationships"
                                            :module-handle="moduleHandle"
                                            v-model="filterValues[filter.id]"
                                        />
                                    </div>
                                </div>
                            </div>

                            <!-- Active Filters Display -->
                            <div v-if="activeFiltersCount > 0" class="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                <span class="text-sm text-gray-600 dark:text-gray-400">{{ t('admin.common.active_filters') }}:</span>
                                <span
                                    v-if="defaultSearchValue"
                                    class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded text-sm"
                                >
                                    {{ props.filterConfig?.default_search?.label || t('admin.common.search') }}: {{ defaultSearchValue }}
                                    <button
                                        type="button"
                                        @click="defaultSearchValue = ''; applyFilters()"
                                        class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                                    >
                                        ×
                                    </button>
                                </span>
                                <template v-if="props.filterConfig && props.filterConfig.filters">
                                    <template v-for="filter in props.filterConfig.filters" :key="filter.id">
                                    <span
                                        v-if="filter && filter.enabled && formatFilterValue(filterValues[filter.id], filter) !== ''"
                                        class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded text-sm"
                                    >
                                        {{ filter.label }}: {{ formatFilterValue(filterValues[filter.id], filter) }}
                                        <button
                                            type="button"
                                            @click="clearFilter(filter.id)"
                                            class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                                        >
                                            ×
                                        </button>
                                    </span>
                                    </template>
                                </template>
                            </div>
                        </form>
                    </div>

                    <!-- Legacy Search Form (backward compatibility) -->
                    <div v-else class="mb-6 pb-6 border-divider">
                        <form @submit.prevent="performSearch" class="space-y-4">
                            <div>
                                <label class="form-label">{{ t('admin.common.search') }}</label>
                                <div class="flex items-center gap-2">
                                    <div class="flex-1">
                                        <input
                                            v-model="searchForm.search"
                                            type="text"
                                            class="form-input"
                                            :placeholder="t('admin.common.search')"
                                        />
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <button type="submit" class="btn btn-primary" :disabled="searchForm.processing">
                                            {{ searchForm.processing ? t('admin.common.loading') : t('admin.common.search') }}
                                        </button>
                                        <button
                                            v-if="search"
                                            type="button"
                                            class="btn btn-outline"
                                            @click="clearSearch"
                                        >
                                            {{ t('admin.common.clear') }}
                                        </button>
                                    </div>
                                </div>
                                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {{ t('admin.db_table.search_all_hint') }}
                                </p>
                            </div>
                        </form>
                    </div>

                    <div v-if="displayItems.length === 0" class="text-center py-12">
                        <p class="text-gray-500 dark:text-gray-400">
                            {{ search ? t('admin.common.no_results') : t('admin.db_table.no_records') }}
                        </p>
                    </div>

                    <div v-else class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead class="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th
                                        v-for="column in columns"
                                        :key="column.name"
                                        class="table-header-sm-padded"
                                    >
                                        {{ column.title }}
                                    </th>
                                    <th
                                        v-if="hasDeepStructure"
                                        class="table-header-sm-padded"
                                    >
                                        {{ t('admin.db_table.children') }}
                                    </th>
                                    <th class="table-header-sm-actions" style="width: 1%;">
                                        {{ t('admin.common.actions') }}
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                <template v-for="(item, index) in displayItems" :key="item[props.primaryKeyColumn]">
                                <tr
                                    :draggable="canReorder"
                                    class="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                    :class="{
                                        'cursor-move': canReorder,
                                        'opacity-50': draggedItem && draggedItem[props.primaryKeyColumn] === item[props.primaryKeyColumn],
                                        'bg-blue-50 dark:bg-blue-900/20': draggedOverIndex === index && draggedItem && draggedItem[props.primaryKeyColumn] !== item[props.primaryKeyColumn],
                                    }"
                                    @dragstart="canReorder && handleDragStart($event, item)"
                                    @dragend="canReorder && handleDragEnd($event)"
                                    @dragover.prevent="canReorder && handleDragOver($event, index)"
                                    @drop="canReorder && handleDrop($event, item, index)"
                                >
                                        <td
                                            v-for="(column, colIndex) in columns"
                                            :key="column.name"
                                            class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                                            :style="hasDeepStructure && item._isChild ? { paddingLeft: `${24 + (item._depth * 24)}px` } : {}"
                                        >
                                            {{ formatValue(item[column.name], column) }}
                                        </td>
                                        <td
                                            v-if="hasDeepStructure"
                                            class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                                        >
                                            <div class="flex items-center gap-2">
                                                <button
                                                    v-if="item.has_children"
                                                    type="button"
                                                    class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                                    draggable="false"
                                                    @click.stop="toggleExpand(item[props.primaryKeyColumn])"
                                                    :title="isExpanded(item[props.primaryKeyColumn]) ? t('admin.common.collapse') : t('admin.common.expand')"
                                                >
                                                    <svg
                                                        class="w-4 h-4 transition-transform"
                                                        :class="{ 'rotate-90': isExpanded(item[props.primaryKeyColumn]) }"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            stroke-linecap="round"
                                                            stroke-linejoin="round"
                                                            stroke-width="2"
                                                            d="M9 5l7 7-7 7"
                                                        />
                                                    </svg>
                                                </button>
                                                <span v-if="item.has_children" class="text-xs text-gray-500 dark:text-gray-400">
                                                    {{ item.children?.length || 0 }}
                                                </span>
                                            </div>
                                        </td>
                                        <td class="px-2 py-2 whitespace-nowrap text-sm font-medium" style="width: 1%;">
                                            <div class="btn-group" role="group">
                                                <button
                                                    v-if="hasDeepStructure"
                                                    type="button"
                                                    class="btn-group-item-edit"
                                                    draggable="false"
                                                    @click.stop="openCreateChildForm(item[props.primaryKeyColumn])"
                                                    :title="t('admin.db_table.create_child')"
                                                >
                                                    <svg
                                                        class="w-4 h-4"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            stroke-linecap="round"
                                                            stroke-linejoin="round"
                                                            stroke-width="2"
                                                            d="M12 4v16m8-8H4"
                                                        />
                                                    </svg>
                                                </button>
                                                <Link
                                                    :href="`${baseUrl}/edit?id=${item[props.primaryKeyColumn]}`"
                                                    class="btn-group-item-edit"
                                                    preserve-scroll
                                                    @click.stop
                                                    :title="t('admin.common.edit')"
                                                >
                                                    <svg
                                                        class="w-4 h-4"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            stroke-linecap="round"
                                                            stroke-linejoin="round"
                                                            stroke-width="2"
                                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                        />
                                                    </svg>
                                                </Link>
                                                <button
                                                    type="button"
                                                    class="btn-group-item-delete"
                                                    @click.stop="confirmDelete(item)"
                                                    :title="t('admin.common.delete')"
                                                >
                                                    <svg
                                                        class="w-4 h-4"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            stroke-linecap="round"
                                                            stroke-linejoin="round"
                                                            stroke-width="2"
                                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                        />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    <!-- Create child form row -->
                                    <tr
                                        v-if="hasDeepStructure && isCreateChildOpen(item[props.primaryKeyColumn])"
                                        class="bg-blue-50 dark:bg-blue-900/20"
                                    >
                                        <td :colspan="columns.length + (hasDeepStructure ? 1 : 0) + 1" class="px-6 py-4">
                                            <form class="flex items-center gap-2" @submit.prevent="submitCreateChild(item[props.primaryKeyColumn])">
                                                <input
                                                    v-model="childFormFor(item[props.primaryKeyColumn]).title"
                                                    type="text"
                                                    class="form-input flex-1"
                                                    :placeholder="t('admin.db_table.child_title')"
                                                    required
                                                    autofocus
                                                />
                                                <button type="submit" class="btn btn-primary btn-sm" :disabled="childFormFor(item[props.primaryKeyColumn])?.processing">
                                                    {{ childFormFor(item[props.primaryKeyColumn])?.processing ? t('admin.common.loading') : t('admin.db_table.create_child') }}
                                                </button>
                                                <button type="button" class="btn btn-outline btn-sm" @click="closeCreateChildForm(item[props.primaryKeyColumn])">
                                                    {{ t('admin.common.cancel') }}
                                                </button>
                                            </form>
                                            <p v-if="childFormFor(item[props.primaryKeyColumn])?.errors?.title" class="mt-1 text-sm text-red-600">
                                                {{ childFormFor(item[props.primaryKeyColumn]).errors.title }}
                                            </p>
                                        </td>
                                    </tr>
                                </template>
                            </tbody>
                        </table>

                        <ListPagination :pagination="pagination" />
                    </div>
                </div>
            </div>
        </div>
    </AdminLayout>
</template>

