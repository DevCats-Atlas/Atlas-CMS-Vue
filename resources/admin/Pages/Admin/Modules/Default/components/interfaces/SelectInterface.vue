<script setup>
import { computed } from 'vue';

const props = defineProps({
    field: {
        type: Object,
        required: true,
    },
    model: {
        type: Object,
        required: true,
    },
});

const listType = computed(() => props.field.config?.list_type || 'static');
const options = computed(() => props.field.options ?? props.field.config?.options ?? []);
const hideTitle = computed(() => props.field.config?.hide_title === true);
</script>

<template>
    <div class="space-y-4 max-w-xs">
        <div class="space-y-1">
            <label v-if="!hideTitle" class="form-label">{{ field.title }}</label>
            <select v-model="model.default" class="form-select">
                <option value="" disabled>Select…</option>
                <option v-for="option in options" :key="option.key" :value="option.key">
                    {{ option.label }}
                </option>
            </select>
            <p class="text-xs text-gray-500 dark:text-gray-400" v-if="listType === 'dynamic' && options.length === 0">
                No items found for the configured root.
            </p>
        </div>
    </div>
</template>
