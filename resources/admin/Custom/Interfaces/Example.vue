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
                This is a custom interface component located at:
                <code class="ml-1 px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">
                    resources/admin/Custom/Interfaces/{{ field.config?.interface_path || 'N/A' }}.vue
                </code>
            </p>
            
            <div class="mt-4 space-y-2">
                <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Custom Field Value
                    </label>
                    <input
                        v-model="model.default"
                        type="text"
                        class="form-input"
                        placeholder="Enter analytics data..."
                    />
                </div>
                
                <p class="text-xs text-gray-500 dark:text-gray-400">
                    Field ID: <span class="font-mono">{{ field.id }}</span> | 
                    Node: <span class="font-mono">{{ field.node || 'N/A' }}</span>
                </p>
            </div>
        </div>
    </div>
</template>

