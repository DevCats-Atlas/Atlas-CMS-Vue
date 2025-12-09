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

const hideTitle = computed(() => props.field.config?.hide_title === true);
</script>

<template>
    <div class="space-y-4">
        <div v-if="!hideTitle" class="space-y-1">
            <label class="form-label">{{ field.title }}</label>
        </div>
        
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
            <p class="text-sm text-gray-600 dark:text-gray-400">
                Language Locale Data interface component.
            </p>
            
            <div class="mt-4 space-y-2">
                <p class="text-xs text-gray-500 dark:text-gray-400">
                    Field ID: <span class="font-mono">{{ field.id }}</span> | 
                    Node: <span class="font-mono">{{ field.node || 'N/A' }}</span>
                </p>
            </div>
        </div>
    </div>
</template>

