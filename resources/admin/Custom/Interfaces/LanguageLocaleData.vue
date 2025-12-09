<script setup>
import { computed, ref, watch, onMounted, nextTick } from 'vue';

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

// Computed JSON preview (only updates when model.default changes, not during typing)
const jsonPreview = computed(() => {
    return props.model.default || '{}';
});

// Key-value pairs array
const properties = ref([]);
let nextId = 1;
let saveTimeout = null;

// Generate unique ID for properties
const generateId = () => {
    return `prop_${nextId++}_${Date.now()}`;
};

// Initialize properties from JSON
const loadFromJson = () => {
    try {
        const jsonValue = props.model.default;
        if (jsonValue && typeof jsonValue === 'string' && jsonValue.trim() !== '') {
            const parsed = JSON.parse(jsonValue);
            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                properties.value = Object.entries(parsed).map(([key, value]) => ({
                    id: generateId(),
                    key: key,
                    value: String(value),
                }));
            } else {
                properties.value = [];
            }
        } else {
            properties.value = [];
        }
    } catch (error) {
        console.error('Failed to parse JSON:', error);
        properties.value = [];
    }
};

// Save properties to JSON (debounced)
const saveToJson = () => {
    // Clear previous timeout
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    
    // Set new timeout - wait 300ms after user stops typing
    saveTimeout = setTimeout(() => {
        const obj = {};
        properties.value.forEach((item) => {
            if (item.key && item.key.trim() !== '') {
                obj[item.key.trim()] = item.value || '';
            }
        });
        
        try {
            props.model.default = Object.keys(obj).length > 0 ? JSON.stringify(obj) : '';
        } catch (error) {
            console.error('Failed to stringify JSON:', error);
        }
    }, 300);
};

// Add new property
const addProperty = () => {
    properties.value.push({
        id: generateId(),
        key: '',
        value: '',
    });
};

// Remove property
const removeProperty = (propertyId) => {
    const index = properties.value.findIndex(p => p.id === propertyId);
    if (index !== -1) {
        const property = properties.value[index];
        const key = property.key || 'this property';
        
        // Confirm before removing
        if (!confirm(`Are you sure you want to remove the property "${key}"?`)) {
            return;
        }
        
        properties.value.splice(index, 1);
        // Save immediately when removing (no debounce needed)
        const obj = {};
        properties.value.forEach((item) => {
            if (item.key && item.key.trim() !== '') {
                obj[item.key.trim()] = item.value || '';
            }
        });
        
        try {
            props.model.default = Object.keys(obj).length > 0 ? JSON.stringify(obj) : '';
        } catch (error) {
            console.error('Failed to stringify JSON:', error);
        }
    }
};

// Watch for changes and save (debounced)
watch(
    properties,
    () => {
        // Use nextTick to ensure this runs after the current render cycle
        nextTick(() => {
            saveToJson();
        });
    },
    { deep: true }
);

// Initialize on mount
onMounted(() => {
    // Ensure model.default exists
    if (!props.model.default) {
        props.model.default = '';
    }
    
    loadFromJson();
});
</script>

<template>
    <div class="space-y-4">
        <div v-if="!hideTitle" class="space-y-1">
            <label class="form-label">{{ field.title }}</label>
        </div>
        
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
            <div class="space-y-3">
                <div class="flex items-center justify-between">
                    <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Locale Properties
                    </p>
                    <button
                        type="button"
                        @click="addProperty"
                        class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                    >
                        Add Property
                    </button>
                </div>
                
                <div v-if="properties.length === 0" class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No properties added yet. Click "Add Property" to start.
                </div>
                
                <div v-else class="space-y-3">
                    <div
                        v-for="property in properties"
                        :key="property.id"
                        class="flex items-start gap-2 p-3 bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700"
                    >
                        <div class="flex-1 grid grid-cols-2 gap-2">
                            <div>
                                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Key
                                </label>
                                <input
                                    v-model="property.key"
                                    type="text"
                                    class="form-input text-sm"
                                    placeholder="Property key"
                                />
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Value
                                </label>
                                <input
                                    v-model="property.value"
                                    type="text"
                                    class="form-input text-sm"
                                    placeholder="Property value"
                                />
                            </div>
                        </div>
                        <button
                            type="button"
                            @click="removeProperty(property.id)"
                            class="mt-6 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                        >
                            Remove
                        </button>
                    </div>
                </div>
                
                <div v-if="properties.length > 0" class="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                        Data will be saved as JSON: 
                        <code class="ml-1 px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">
                            {{ jsonPreview }}
                        </code>
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

