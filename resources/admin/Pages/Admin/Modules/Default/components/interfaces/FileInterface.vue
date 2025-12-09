<script setup>
import { computed } from 'vue';
import { usePage } from '@inertiajs/vue3';

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

const languages = computed(() => usePage().props.languages || []);
const hasTranslations = computed(() => props.field.multilanguage && languages.value.length > 0);
const hideTitle = computed(() => props.field.config?.hide_title === true);

const languageKey = (language, index) => language?.id ?? language?.slug ?? language?.code ?? index;
const languageLabel = (language) => language?.title || language?.name || language?.label || language?.slug || 'Language';

const handleFileInput = (event, languageCode = null) => {
    const [file] = event?.target?.files || [];
    
    if (languageCode !== null) {
        // Multilanguage field
        if (!props.model.translations) {
            props.model.translations = {};
        }
        props.model.translations[languageCode] = file ?? null;
        // Clear delete flag when a new file is selected
        if (file && props.model[`delete_translations_${languageCode}`] !== undefined) {
            props.model[`delete_translations_${languageCode}`] = false;
        }
    } else {
        // Single language field
        props.model.default = file ?? null;
        // Clear delete flag when a new file is selected
        if (file && props.model.delete_default !== undefined) {
            props.model.delete_default = false;
        }
    }
    
    // Don't reset the input value - let the browser show the selected filename
};

const clearFile = (languageCode = null) => {
    const hasSelected = hasSelectedFile(languageCode);
    
    if (languageCode !== null) {
        // Multilanguage field
        if (!props.model.translations) {
            props.model.translations = {};
        }
        
        if (hasSelected) {
            // Just remove the newly selected file, don't delete current file
            props.model.translations[languageCode] = null;
        } else {
            // No newly selected file, mark current file for deletion
            props.model.translations[languageCode] = null;
            props.model[`delete_translations_${languageCode}`] = true;
        }
    } else {
        // Single language field
        if (hasSelected) {
            // Just remove the newly selected file, don't delete current file
            props.model.default = null;
        } else {
            // No newly selected file, mark current file for deletion
            props.model.default = null;
            props.model.delete_default = true;
        }
    }
    
    // Reset the file input element visually
    const inputId = languageCode !== null 
        ? `field-${props.field.id}-${languageCode}` 
        : `field-${props.field.id}`;
    const input = document.getElementById(inputId);
    if (input) {
        input.value = '';
    }
};

const currentFileValue = (languageCode = null) => {
    if (languageCode !== null) {
        return props.field.values?.translations?.[languageCode] ?? null;
    }
    return props.field.values?.default ?? null;
};

const currentFileUrl = (languageCode = null) => {
    let url = null;
    if (languageCode !== null) {
        url = props.field.values?.translations_url?.[languageCode] ?? null;
    } else {
        url = props.field.values?.default_url ?? null;
    }
    
    // If no URL is provided but we have a file path, generate URL from path
    if (!url) {
        const filePath = currentFileValue(languageCode);
        if (filePath) {
            // Generate URL from file path (assuming files are stored in public storage)
            // This works for both items and db_table file paths
            url = `/storage/${filePath}`;
        }
    }
    
    return url;
};

const getFileName = (filePath) => {
    if (!filePath) return '';
    // Extract filename from path
    return filePath.split('/').pop() || filePath;
};

const hasCurrentFile = (languageCode = null) => {
    // Don't show current file if it's marked for deletion
    const deleteKey = languageCode !== null 
        ? `delete_translations_${languageCode}` 
        : 'delete_default';
    
    if (props.model[deleteKey]) {
        return false;
    }
    
    return Boolean(currentFileUrl(languageCode) || currentFileValue(languageCode));
};

const isDeleteFlagged = (languageCode = null) => {
    const deleteKey = languageCode !== null 
        ? `delete_translations_${languageCode}` 
        : 'delete_default';
    return Boolean(props.model[deleteKey]);
};

const selectedFile = (languageCode = null) => {
    if (languageCode !== null) {
        return props.model.translations?.[languageCode] ?? null;
    }
    return props.model.default ?? null;
};

const hasSelectedFile = (languageCode = null) => {
    const file = selectedFile(languageCode);
    return file instanceof File;
};

const selectedFileName = (languageCode = null) => {
    const file = selectedFile(languageCode);
    return file instanceof File ? file.name : null;
};
</script>

<template>
    <div class="space-y-4">
        <template v-if="hasTranslations">
            <div v-for="(language, index) in languages" :key="languageKey(language, index)" class="space-y-2">
                <label v-if="!hideTitle" class="form-label" :for="`field-${field.id}-${languageKey(language, index)}`">
                    {{ field.title }} ({{ languageLabel(language) }})
                </label>
                <input
                    :id="`field-${field.id}-${languageKey(language, index)}`"
                    type="file"
                    class="form-input"
                    @change="handleFileInput($event, languageKey(language, index))"
                />
                <div v-if="hasSelectedFile(languageKey(language, index))" class="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                    <div class="flex-1 min-w-0 overflow-hidden">
                        <span class="text-gray-500 dark:text-gray-400">Selected file: </span>
                        <span class="text-blue-700 dark:text-blue-300 font-medium break-all">{{ selectedFileName(languageKey(language, index)) }}</span>
                    </div>
                    <button
                        type="button"
                        @click="clearFile(languageKey(language, index))"
                        class="flex-shrink-0 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                        Clear
                    </button>
                </div>
                <div v-if="hasCurrentFile(languageKey(language, index))" class="flex items-center justify-between gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                    <div class="flex-1 min-w-0">
                        <span class="text-gray-500 dark:text-gray-400">Current file: </span>
                        <a
                            v-if="currentFileUrl(languageKey(language, index))"
                            :href="currentFileUrl(languageKey(language, index))"
                            class="text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                            target="_blank"
                            rel="noreferrer"
                        >
                            {{ getFileName(currentFileValue(languageKey(language, index))) || currentFileValue(languageKey(language, index)) }}
                        </a>
                        <span v-else class="text-gray-700 dark:text-gray-300 truncate">{{ currentFileValue(languageKey(language, index)) }}</span>
                    </div>
                    <button
                        type="button"
                        @click="clearFile(languageKey(language, index))"
                        class="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                        Clear
                    </button>
                </div>
                <p v-if="isDeleteFlagged(languageKey(language, index))" class="text-xs text-orange-600 dark:text-orange-400">
                    File will be removed when you save changes.
                </p>
            </div>
        </template>
        <div v-else class="space-y-2">
            <label v-if="!hideTitle" class="form-label" :for="`field-${field.id}`">{{ field.title }}</label>
            <input
                :id="`field-${field.id}`"
                type="file"
                class="form-input"
                @change="handleFileInput($event)"
            />
            <div v-if="hasSelectedFile()" class="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                <div class="flex-1 min-w-0 overflow-hidden">
                    <span class="text-gray-500 dark:text-gray-400">Selected file: </span>
                    <span class="text-blue-700 dark:text-blue-300 font-medium break-all">{{ selectedFileName() }}</span>
                </div>
                <button
                    type="button"
                    @click="clearFile()"
                    class="flex-shrink-0 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                >
                    Clear
                </button>
            </div>
            <div v-if="hasCurrentFile()" class="flex items-center justify-between gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                <div class="flex-1 min-w-0">
                    <span class="text-gray-500 dark:text-gray-400">Current file: </span>
                    <a
                        v-if="currentFileUrl()"
                        :href="currentFileUrl()"
                        class="text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                        target="_blank"
                        rel="noreferrer"
                    >
                        {{ getFileName(currentFileValue()) || currentFileValue() }}
                    </a>
                    <span v-else class="text-gray-700 dark:text-gray-300 truncate">{{ currentFileValue() }}</span>
                </div>
                <button
                    type="button"
                    @click="clearFile()"
                    class="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                >
                    Clear
                </button>
            </div>
            <p v-if="isDeleteFlagged()" class="text-xs text-orange-600 dark:text-orange-400">
                File will be removed when you save changes.
            </p>
        </div>
    </div>
</template>
