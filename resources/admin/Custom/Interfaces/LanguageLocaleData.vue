<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';

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

// Computed JSON preview (computed from properties array, not from model.default)
const jsonPreview = computed(() => {
    const obj = {};
    properties.value.forEach((item) => {
        if (item.key && item.key.trim() !== '') {
            obj[item.key.trim()] = item.value || '';
        }
    });
    
    try {
        return Object.keys(obj).length > 0 ? JSON.stringify(obj, null, 2) : '{}';
    } catch (error) {
        return '{}';
    }
});

// Key-value pairs array
const properties = ref([]);
let nextId = 1;
const copySuccessMessage = ref('');
const pasteErrorMessage = ref('');

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

// Save properties to JSON (only when explicitly called)
const saveToJson = () => {
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
};

// Handle input blur - save when user leaves the field
const handleInputBlur = () => {
    saveToJson();
};

// Add new property
const addProperty = () => {
    properties.value.push({
        id: generateId(),
        key: '',
        value: '',
    });
    // Save after adding (in case user adds and immediately submits)
    saveToJson();
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

// Copy properties to clipboard
const copyProperties = async () => {
    try {
        const obj = {};
        properties.value.forEach((item) => {
            if (item.key && item.key.trim() !== '') {
                obj[item.key.trim()] = item.value || '';
            }
        });
        
        const jsonString = Object.keys(obj).length > 0 ? JSON.stringify(obj, null, 2) : '{}';
        
        // Try modern clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(jsonString);
                copySuccessMessage.value = 'Properties copied to clipboard!';
                setTimeout(() => {
                    copySuccessMessage.value = '';
                }, 3000);
                return;
            } catch (clipboardError) {
                console.warn('Clipboard API failed, trying fallback method:', clipboardError);
            }
        }
        
        // Fallback method: create temporary textarea
        const textarea = document.createElement('textarea');
        textarea.value = jsonString;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        textarea.style.top = '-999999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        try {
            const successful = document.execCommand('copy');
            document.body.removeChild(textarea);
            
            if (successful) {
                copySuccessMessage.value = 'Properties copied to clipboard!';
                setTimeout(() => {
                    copySuccessMessage.value = '';
                }, 3000);
            } else {
                throw new Error('execCommand copy failed');
            }
        } catch (fallbackError) {
            document.body.removeChild(textarea);
            throw fallbackError;
        }
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        pasteErrorMessage.value = 'Failed to copy to clipboard. Please check browser permissions or try manually copying the JSON below.';
        setTimeout(() => {
            pasteErrorMessage.value = '';
        }, 5000);
    }
};

// Paste properties from clipboard
const pasteProperties = async () => {
    try {
        pasteErrorMessage.value = '';
        
        let text = '';
        
        // Try modern clipboard API first
        if (navigator.clipboard && navigator.clipboard.readText) {
            try {
                text = await navigator.clipboard.readText();
            } catch (clipboardError) {
                console.warn('Clipboard API read failed:', clipboardError);
                // Show prompt for manual paste
                const manualText = prompt('Please paste the JSON here:');
                if (manualText === null) {
                    return; // User cancelled
                }
                text = manualText;
            }
        } else {
            // Fallback: prompt user to paste manually
            const manualText = prompt('Please paste the JSON here:');
            if (manualText === null) {
                return; // User cancelled
            }
            text = manualText;
        }
        
        if (!text || text.trim() === '') {
            pasteErrorMessage.value = 'Clipboard is empty';
            setTimeout(() => {
                pasteErrorMessage.value = '';
            }, 3000);
            return;
        }
        
        const parsed = JSON.parse(text);
        
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            pasteErrorMessage.value = 'Invalid JSON format. Expected an object.';
            setTimeout(() => {
                pasteErrorMessage.value = '';
            }, 3000);
            return;
        }
        
        // Confirm before pasting (will replace current properties)
        if (properties.value.length > 0) {
            if (!confirm('This will replace all current properties. Are you sure?')) {
                return;
            }
        }
        
        // Load the pasted data
        properties.value = Object.entries(parsed).map(([key, value]) => ({
            id: generateId(),
            key: key,
            value: String(value),
        }));
        
        // Save immediately
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
        
        // Show success message
        copySuccessMessage.value = 'Properties pasted successfully!';
        setTimeout(() => {
            copySuccessMessage.value = '';
        }, 3000);
    } catch (error) {
        console.error('Failed to paste from clipboard:', error);
        if (error instanceof SyntaxError) {
            pasteErrorMessage.value = 'Invalid JSON format. Please check the JSON syntax.';
        } else {
            pasteErrorMessage.value = 'Failed to paste. Please try pasting manually using Ctrl+V (Cmd+V on Mac) in the prompt.';
        }
        setTimeout(() => {
            pasteErrorMessage.value = '';
        }, 5000);
    }
};

// Initialize on mount
onMounted(() => {
    // Ensure model.default exists
    if (!props.model.default) {
        props.model.default = '';
    }
    
    loadFromJson();
});

// Save to JSON before component is unmounted (when form is submitted)
onBeforeUnmount(() => {
    saveToJson();
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
                    <div class="flex items-center gap-2">
                        <button
                            type="button"
                            @click="copyProperties"
                            class="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors"
                            :disabled="properties.length === 0"
                        >
                            Copy
                        </button>
                        <button
                            type="button"
                            @click="pasteProperties"
                            class="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors"
                        >
                            Paste
                        </button>
                        <button
                            type="button"
                            @click="addProperty"
                            class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                        >
                            Add Property
                        </button>
                    </div>
                </div>
                
                <!-- Success/Error messages -->
                <div v-if="copySuccessMessage" class="p-2 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <p class="text-sm text-green-800 dark:text-green-200">{{ copySuccessMessage }}</p>
                </div>
                <div v-if="pasteErrorMessage" class="p-2 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p class="text-sm text-red-800 dark:text-red-200">{{ pasteErrorMessage }}</p>
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
                                    @blur="handleInputBlur"
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
                                    @blur="handleInputBlur"
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

