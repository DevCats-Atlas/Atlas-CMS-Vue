<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue';

const props = defineProps({
    options: {
        type: Array,
        default: () => [],
    },
    modelValue: {
        type: [Array, String, Number],
        default: () => [],
    },
    placeholder: {
        type: String,
        default: 'Select...',
    },
    searchable: {
        type: Boolean,
        default: true,
    },
    showSearch: {
        type: Boolean,
        default: null, // Auto-detect if > 10 options
    },
    onSearch: {
        type: Function,
        default: null, // Callback for async loading
    },
});

const emit = defineEmits(['update:modelValue']);

const isOpen = ref(false);
const dropdownRef = ref(null);
const searchInputRef = ref(null);
const optionsListRef = ref(null);
const searchTerm = ref('');

const shouldShowSearch = computed(() => {
    if (props.showSearch !== null) return props.showSearch;
    return props.searchable && props.options.length > 10;
});

const filteredOptions = computed(() => {
    console.log('MultiSelect - filteredOptions computed:', {
        optionsCount: props.options.length,
        shouldShowSearch: shouldShowSearch.value,
        searchTerm: searchTerm.value,
        options: props.options
    });
    
    if (!shouldShowSearch.value || !searchTerm.value.trim()) {
        return props.options;
    }
    
    const term = searchTerm.value.toLowerCase().trim();
    const filtered = props.options.filter(option => {
        const label = String(option.label || option.title || option.name || '').toLowerCase();
        const key = String(option.key || option.id || option.value || '').toLowerCase();
        return label.includes(term) || key.includes(term);
    });
    
    console.log('MultiSelect - filtered options:', {
        term,
        filteredCount: filtered.length,
        filtered
    });
    
    return filtered;
});

const selectedValues = computed(() => {
    if (Array.isArray(props.modelValue)) {
        return props.modelValue.map(v => String(v));
    }
    return props.modelValue ? [String(props.modelValue)] : [];
});

const displayValue = computed(() => {
    if (selectedValues.value.length === 0) {
        return props.placeholder;
    }
    
    // Get labels for all selected values
    const labels = selectedValues.value.map(val => {
        const option = props.options.find(opt => String(opt.key || opt.id || opt.value) === val);
        return option?.label || option?.title || option?.name || val;
    }).filter(Boolean);
    
    // Show comma-separated labels
    return labels.join(', ');
});

const toggleDropdown = async () => {
    const wasOpen = isOpen.value;
    
    // If closing, just close
    if (wasOpen) {
        isOpen.value = false;
        return;
    }
    
    // Opening dropdown
    isOpen.value = true;
    
    console.log('MultiSelect - toggleDropdown (opening):', {
        optionsCount: props.options.length,
        filteredOptionsCount: filteredOptions.value.length,
        hasOnSearch: !!props.onSearch
    });
    
    // Only call onSearch if we have no options yet (for async loading)
    // If options are already loaded, don't call onSearch again
    if (props.onSearch && props.options.length === 0 && !searchTerm.value) {
        console.log('MultiSelect - No options, calling onSearch callback');
        await props.onSearch('');
    }
    
    nextTick(() => {
        console.log('MultiSelect - Dropdown opened:', {
            isOpen: isOpen.value,
            filteredOptionsCount: filteredOptions.value.length,
            filteredOptions: filteredOptions.value.slice(0, 3) // Show first 3 for debugging
        });
        if (searchInputRef.value && shouldShowSearch.value) {
            searchInputRef.value.focus();
        }
    });
};

const closeDropdown = () => {
    isOpen.value = false;
    searchTerm.value = '';
};

const toggleOption = (option) => {
    const value = String(option.key || option.id || option.value);
    const currentValues = [...selectedValues.value];
    
    const index = currentValues.indexOf(value);
    if (index > -1) {
        currentValues.splice(index, 1);
    } else {
        currentValues.push(value);
    }
    
    emit('update:modelValue', currentValues.length > 0 ? currentValues : []);
};

const isSelected = (option) => {
    const value = String(option.key || option.id || option.value);
    return selectedValues.value.includes(value);
};

const removeOption = (value) => {
    const currentValues = [...selectedValues.value];
    const index = currentValues.indexOf(String(value));
    if (index > -1) {
        currentValues.splice(index, 1);
        emit('update:modelValue', currentValues.length > 0 ? currentValues : []);
    }
};

// Watch search term for async loading
let searchTimeout = null;
watch(searchTerm, async (newTerm) => {
    console.log('MultiSelect - searchTerm changed:', newTerm);
    if (props.onSearch) {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        searchTimeout = setTimeout(async () => {
            console.log('MultiSelect - Calling onSearch after debounce:', newTerm);
            await props.onSearch(newTerm);
        }, 300);
    }
});

// Watch options prop changes
watch(() => props.options, (newOptions) => {
    console.log('MultiSelect - options prop changed:', {
        count: newOptions.length,
        options: newOptions
    });
}, { deep: true, immediate: true });

// Close dropdown when clicking outside
const handleClickOutside = (event) => {
    if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
        closeDropdown();
    }
};

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
    <div class="relative" ref="dropdownRef">
        <!-- Trigger button -->
        <button
            type="button"
            @click="toggleDropdown"
            class="form-select text-left cursor-pointer flex items-center justify-between w-full min-h-[38px]"
            :class="{ 'ring-2 ring-indigo-500': isOpen }"
        >
            <div class="flex-1 flex items-center gap-2 flex-wrap">
                <span v-if="selectedValues.length === 0" class="text-gray-400">{{ placeholder }}</span>
                <template v-else>
                    <span
                        v-for="value in selectedValues.slice(0, 2)"
                        :key="value"
                        class="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 rounded text-xs"
                    >
                        {{ options.find(opt => String(opt.key || opt.id || opt.value) === value)?.label || options.find(opt => String(opt.key || opt.id || opt.value) === value)?.title || value }}
                        <button
                            type="button"
                            @click.stop="removeOption(value)"
                            class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200"
                        >
                            ×
                        </button>
                    </span>
                    <span v-if="selectedValues.length > 2" class="text-sm text-gray-600 dark:text-gray-400">
                        +{{ selectedValues.length - 2 }} more
                    </span>
                </template>
            </div>
            <svg class="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" :class="{ 'rotate-180': isOpen }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
        </button>
        
        <!-- Dropdown -->
        <div
            v-if="isOpen"
            class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg max-h-96 overflow-hidden"
        >
            <!-- Search input -->
            <div v-if="shouldShowSearch" class="p-2 border-b border-gray-200 dark:border-gray-700">
                <input
                    ref="searchInputRef"
                    v-model="searchTerm"
                    type="text"
                    class="form-input text-sm w-full"
                    placeholder="Search options..."
                    autocomplete="off"
                    @keydown.escape="closeDropdown"
                />
            </div>
            
            <!-- Options list -->
            <div ref="optionsListRef" class="overflow-y-auto max-h-80">
                <div
                    v-if="filteredOptions.length === 0"
                    class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400"
                >
                    {{ searchTerm ? `No options found matching "${searchTerm}"` : 'No options available' }}
                </div>
                <button
                    v-for="option in filteredOptions"
                    :key="option.key || option.id || option.value || option.label"
                    type="button"
                    @click.stop="toggleOption(option)"
                    class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                    <input
                        type="checkbox"
                        :checked="isSelected(option)"
                        class="form-checkbox pointer-events-none"
                        @change.stop.prevent
                        @click.stop.prevent
                        tabindex="-1"
                    />
                    <span>{{ option.label || option.title || option.name || option.key || option.id || option.value }}</span>
                </button>
            </div>
            
            <!-- Results count -->
            <div v-if="searchTerm && filteredOptions.length > 0" class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                Showing {{ filteredOptions.length }} of {{ options.length }} options
            </div>
        </div>
    </div>
</template>

