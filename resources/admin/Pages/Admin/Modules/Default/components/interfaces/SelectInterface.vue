<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';

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

// Search functionality for large option lists
const searchTerm = ref('');
const showSearch = computed(() => options.value.length > 50);
const isOpen = ref(false);
const dropdownRef = ref(null);
const searchInputRef = ref(null);

const filteredOptions = computed(() => {
    if (!showSearch.value || !searchTerm.value.trim()) {
        return options.value;
    }
    
    const term = searchTerm.value.toLowerCase().trim();
    return options.value.filter(option => {
        const label = String(option.label || '').toLowerCase();
        const key = String(option.key || '').toLowerCase();
        return label.includes(term) || key.includes(term);
    });
});

const selectedOption = computed(() => {
    if (!props.model.default) return null;
    return options.value.find(opt => String(opt.key) === String(props.model.default));
});

const displayValue = computed(() => {
    return selectedOption.value?.label || 'Select…';
});

const toggleDropdown = () => {
    if (showSearch.value) {
        isOpen.value = !isOpen.value;
        if (isOpen.value && searchInputRef.value) {
            setTimeout(() => searchInputRef.value?.focus(), 50);
        }
    }
};

const selectOption = (option) => {
    props.model.default = option.key;
    isOpen.value = false;
    searchTerm.value = '';
};

const closeDropdown = () => {
    isOpen.value = false;
    searchTerm.value = '';
};

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
    <div class="space-y-4 ">
        <div class="space-y-1">
            <label v-if="!hideTitle" class="form-label">{{ field.title }}</label>
            
            <!-- Searchable select for large lists -->
            <div v-if="showSearch" class="relative" ref="dropdownRef">
                <!-- Trigger button (looks like a select) -->
                <button
                    type="button"
                    @click="toggleDropdown"
                    class="form-select text-left cursor-pointer flex items-center justify-between w-full"
                    :class="{ 'ring-2 ring-indigo-500': isOpen }"
                >
                    <span :class="{ 'text-gray-400': !model.default }">{{ displayValue }}</span>
                    <svg class="w-4 h-4 text-gray-400 flex-shrink-0" :class="{ 'rotate-180': isOpen }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                
                <!-- Dropdown with search -->
                <div
                    v-if="isOpen"
                    class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg max-h-96 overflow-hidden"
                >
                    <!-- Search input -->
                    <div class="p-2 border-b border-gray-200 dark:border-gray-700">
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
                    <div class="overflow-y-auto max-h-80">
                        <div
                            v-if="filteredOptions.length === 0"
                            class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400"
                        >
                            {{ searchTerm ? `No options found matching "${searchTerm}"` : 'No options available' }}
                        </div>
                        <button
                            v-for="option in filteredOptions"
                            :key="option.key"
                            type="button"
                            @click="selectOption(option)"
                            class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            :class="{
                                'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400': String(model.default) === String(option.key)
                            }"
                        >
                            {{ option.label }}
                        </button>
                    </div>
                    
                    <!-- Results count -->
                    <div v-if="searchTerm && filteredOptions.length > 0" class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        Showing {{ filteredOptions.length }} of {{ options.length }} options
                    </div>
                </div>
            </div>
            
            <!-- Regular select for small lists -->
            <select v-else v-model="model.default" class="form-select">
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
