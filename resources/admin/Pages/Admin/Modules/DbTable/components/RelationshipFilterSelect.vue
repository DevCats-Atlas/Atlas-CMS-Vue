<script setup>
import { computed } from 'vue';
import { useRelationshipOptions } from '@/composables/useRelationshipOptions.js';
import MultiSelect from './MultiSelect.vue';
import { useTranslation } from '@/utils/useTranslation.js';

const props = defineProps({
    filter: {
        type: Object,
        required: true,
    },
    relationships: {
        type: Array,
        default: () => [],
    },
    moduleHandle: {
        type: String,
        required: true,
    },
    modelValue: {
        type: [String, Number, Array],
        default: null,
    },
});

const { t } = useTranslation();

const emit = defineEmits(['update:modelValue']);

const relationship = computed(() => props.relationships.find(r => r.related_table === props.filter.relationship) || null);
const { records: availableRecords, loading, searchQuery, requiresSearch, load: loadAvailableRecords } = useRelationshipOptions(
    () => props.moduleHandle, () => relationship.value?.name || relationship.value?.related_table || '', { allowEmptySearch: true },
);
const isMultiple = computed(() => props.filter.multiple || false);

// Handle value changes
const updateValue = (value) => {
    emit('update:modelValue', value);
};

const getRecordId = (record) => record.id;
const getRecordDisplay = (record) => record.label;

// Get display value for selected record(s)
const getDisplayValue = (recordId) => {
    const record = availableRecords.value.find(r => String(getRecordId(r)) === String(recordId));
    if (record) {
        return getRecordDisplay(record);
    }
    return `#${recordId}`;
};

const recordOptions = computed(() => availableRecords.value.map(record => ({
    key: String(record.id), id: record.id, value: String(record.id), label: record.label,
})));

// Handle value changes for MultiSelect
const handleMultiSelectChange = (value) => {
    emit('update:modelValue', value);
};

// Get current value as array for MultiSelect
const multiSelectValue = computed(() => {
    if (isMultiple.value) {
        if (Array.isArray(props.modelValue)) {
            return props.modelValue.map(v => String(v));
        }
        return props.modelValue !== null && props.modelValue !== '' ? [String(props.modelValue)] : [];
    }
    return [];
});

// Expose method to load records when dropdown opens (for MultiSelect)
const loadRecordsForMultiSelect = async (searchTerm = '') => {
    if (searchQuery.value === searchTerm) {
        if (availableRecords.value.length === 0) await loadAvailableRecords();
    } else {
        searchQuery.value = searchTerm;
    }
};

// Expose load function for external use
defineExpose({
    loadRecordsForMultiSelect,
});
</script>

<template>
    <div class="relative">
        <!-- Single Select -->
        <div v-if="!isMultiple" class="relative">
            <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-2">
                {{ t('admin.common.loading') }}
            </div>
            <select
                v-else
                :key="`select-${filter.relationship}-${availableRecords.length}`"
                :value="modelValue"
                @change="updateValue($event.target.value)"
                class="form-select text-sm"
            >
                <option value="">{{ filter.placeholder || t('admin.common.select_placeholder') }}</option>
                <option
                    v-for="record in availableRecords"
                    :key="`option-${getRecordId(record)}`"
                    :value="getRecordId(record)"
                >
                    {{ getRecordDisplay(record) }}
                </option>
            </select>
            <div v-if="!loading && availableRecords.length === 0" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {{ t('admin.common.no_results') }}
            </div>
        </div>
        
        <!-- Multiple Select using MultiSelect component -->
        <div v-else>
            <MultiSelect
                :options="recordOptions"
                :model-value="multiSelectValue"
                :placeholder="filter.placeholder || t('admin.common.select_placeholder')"
                :searchable="true"
                :on-search="loadRecordsForMultiSelect"
                @update:model-value="handleMultiSelectChange"
            />
            <div v-if="loading" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {{ t('admin.common.loading_records') }}
            </div>
        </div>
    </div>
</template>

