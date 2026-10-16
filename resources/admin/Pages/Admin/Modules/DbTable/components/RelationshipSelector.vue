<script setup>
import { computed } from 'vue';
import { useRelationshipOptions } from '@/composables/useRelationshipOptions.js';
import { useTranslation } from '@admin/js/utils/useTranslation';

const { t } = useTranslation();

const props = defineProps({
    relationship: {
        type: Object,
        required: true,
    },
    selectedIds: {
        type: Array,
        default: () => [],
    },
    relatedTableName: {
        type: String,
        required: true,
    },
    primaryKeyColumn: {
        type: String,
        default: 'id',
    },
    moduleHandle: {
        type: String,
        required: true,
    },
});

const emit = defineEmits(['update:selectedIds']);

const { records: availableRecords, loading, loadingCount, searchQuery, totalCount, requiresSearch } = useRelationshipOptions(
    () => props.moduleHandle, () => props.relationship.name || props.relationship.related_table,
);

const isSingleSelection = computed(() => {
    return props.relationship.type === 'belongsTo' || props.relationship.type === 'hasOne';
});

const toggleSelection = (recordId) => {
    const currentIds = [...props.selectedIds];
    const index = currentIds.indexOf(recordId);
    
    if (index > -1) {
        // If single selection, allow deselecting (set to empty)
        if (isSingleSelection.value) {
            currentIds.splice(0, currentIds.length);
        } else {
            // Multiple selection - remove
            currentIds.splice(index, 1);
        }
    } else {
        if (isSingleSelection.value) {
            // Single selection - replace
            currentIds.splice(0, currentIds.length, recordId);
        } else {
            // Multiple selection - add
            currentIds.push(recordId);
        }
    }
    
    emit('update:selectedIds', currentIds);
};

const isSelected = (recordId) => {
    return props.selectedIds.includes(recordId);
};

const getRecordLabel = (record) => {
    const titleFields = ['title', 'name', 'label', 'email'];
    for (const field of titleFields) {
        if (record[field]) {
            return record[field];
        }
    }
    return `Record #${record[props.primaryKeyColumn] ?? record.id}`;
};

</script>

<template>
    <div class="space-y-4">
        <!-- Search -->
        <div>
            <input
                v-model="searchQuery"
                type="text"
                class="form-input"
                :placeholder="requiresSearch ? t('admin.common.type_to_search') + '...' : t('admin.common.search') + '...'"
            />
            <p v-if="requiresSearch && totalCount !== null" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {{ t('admin.common.records_found', { count: totalCount }) }} {{ t('admin.common.please_search') }}
            </p>
            <p v-else-if="!requiresSearch && totalCount !== null" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {{ t('admin.common.showing_all', { count: totalCount }) }}
            </p>
            <p v-if="searchQuery && !loading" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {{ t('admin.relationships.searching_for', { query: searchQuery }) }}
            </p>
        </div>

        <!-- Loading count state -->
        <div v-if="loadingCount" class="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
            {{ t('admin.common.checking_record_count') }}
        </div>

        <!-- Loading state -->
        <div v-else-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
            {{ t('admin.common.loading_records') }}
        </div>
        
        <!-- Prompt for search if required -->
        <div v-else-if="requiresSearch && !searchQuery.trim() && availableRecords.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-4 text-center border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
            <p class="mb-2">{{ t('admin.common.this_table_has', { count: totalCount }) }}</p>
            <p>{{ t('admin.common.please_enter_search') }}</p>
        </div>

        <!-- Records list -->
        <div v-else class="space-y-2 max-h-96 overflow-y-auto">
            <div
                v-for="record in availableRecords"
                :key="record[primaryKeyColumn] ?? record.id"
                class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                @click="toggleSelection(record[primaryKeyColumn] ?? record.id)"
            >
                <input
                    :type="isSingleSelection ? 'radio' : 'checkbox'"
                    :checked="isSelected(record[primaryKeyColumn] ?? record.id)"
                    :name="isSingleSelection ? `relationship-${relationship.name || relationship.related_table}` : undefined"
                    :class="isSingleSelection ? 'form-radio' : 'form-checkbox'"
                    @click.stop="toggleSelection(record[primaryKeyColumn] ?? record.id)"
                />
                <div class="flex-1">
                    <p class="text-sm font-medium text-gray-900 dark:text-white">
                        {{ getRecordLabel(record) }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        ID: {{ record[primaryKeyColumn] ?? record.id }}
                    </p>
                </div>
            </div>
            
            <div v-if="availableRecords.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                {{ t('admin.common.no_results') }}
            </div>
        </div>

        <!-- Selected count -->
        <div v-if="selectedIds.length > 0" class="text-sm text-gray-600 dark:text-gray-400">
            {{ t('admin.relationships.selected_count', { count: selectedIds.length }) }}
        </div>
    </div>
</template>

