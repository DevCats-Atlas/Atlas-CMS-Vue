<script setup>
import { computed } from 'vue';
import { usePage } from '@inertiajs/vue3';

import WysiwigEditor from '@/components/WysiwigEditor.vue';

const props = defineProps({
    fields: {
        type: Array,
        default: () => [],
    },
    form: {
        type: Object,
        required: true,
    },
    initialValues: {
        type: Object,
        default: () => ({}),
    },
    customFieldTabs: {
        type: Array,
        default: () => [],
    },
    systemFields: {
        type: Array,
        default: () => [],
    },
});

const languages = computed(() => usePage().props.languages || []);

// Helper to find a field by key
const getField = (key) => {
    return props.fields.find(field => field.key === key);
};

// Check if field exists and should be displayed
const hasField = (key) => {
    return props.fields.some(field => field.key === key);
};

const ensureSlugTranslations = () => {
    if (!props.form.slug_translations || typeof props.form.slug_translations !== 'object') {
        props.form.slug_translations = {};
    }

    return props.form.slug_translations;
};

const slugLanguageCode = (language, index) => language?.slug || language?.code || language?.id || `lang-${index}`;
const slugLanguageLabel = (language) => language?.title || language?.name || language?.label || language?.slug || 'Language';
const isDefaultLanguage = (language) => Boolean(language?.is_default);

const slugTranslationValue = (language, index) => {
    const code = slugLanguageCode(language, index);
    const store = ensureSlugTranslations();

    if (store[code] === undefined) {
        store[code] = '';
    }

    return store[code];
};

const updateSlugTranslation = (language, index, value) => {
    const code = slugLanguageCode(language, index);
    ensureSlugTranslations();
    props.form.slug_translations[code] = value;
};

const slugTranslationError = (language, index) => {
    const code = slugLanguageCode(language, index);
    return props.form.errors?.[`slug_translations.${code}`];
};

const handleFileInput = (event, fieldKey) => {
    const [file] = event?.target?.files || [];
    props.form[fieldKey] = file ?? null;
    // Clear delete flag when a new file is selected
    if (file && props.form[`delete_${fieldKey}`] !== undefined) {
        props.form[`delete_${fieldKey}`] = false;
    }
    // Don't reset file input - let it show the selected filename
    // Reset will happen after successful save
};

const hasSelectedFile = (fieldKey) => {
    return props.form[fieldKey] instanceof File;
};

const selectedFileName = (fieldKey) => {
    const file = props.form[fieldKey];
    return file instanceof File ? file.name : null;
};

const clearFile = (fieldKey) => {
    const hasSelected = hasSelectedFile(fieldKey);
    
    if (hasSelected) {
        // Just remove the newly selected file, don't delete current file
        props.form[fieldKey] = null;
    } else {
        // No newly selected file, mark current file for deletion
        props.form[fieldKey] = null;
        props.form[`delete_${fieldKey}`] = true;
    }
    
    // Reset the file input element visually
    const inputId = `field-${fieldKey}`;
    const input = document.getElementById(inputId);
    if (input) {
        input.value = '';
    }
};

const currentFileValue = (field) => props.initialValues?.[field.key] ?? null;
const currentFileUrl = (field) => props.initialValues?.[`${field.key}_url`] ?? null;
const hasCurrentFile = (field) => {
    // Don't show current file if it's marked for deletion
    if (props.form[`delete_${field.key}`]) {
        return false;
    }
    return Boolean(currentFileUrl(field) || currentFileValue(field));
};

// Find custom field by checking if it exists in customFieldTabs or systemFields
// Match by title (case-insensitive), node, code, or handle
const findCustomField = (fieldKey) => {
    const matchKey = fieldKey.toLowerCase().trim();
    
    // First check systemFields (from _system tab) for title/content
    if (props.systemFields && props.systemFields.length > 0) {
        const systemField = props.systemFields.find(f => {
            const fieldNode = (f.node || '').toLowerCase().trim();
            const fieldTitle = (f.title || '').toLowerCase().trim();
            return fieldNode === matchKey || fieldTitle === matchKey;
        });
        
        if (systemField) {
            return systemField;
        }
    }
    
    // Then check regular customFieldTabs
    for (const tab of props.customFieldTabs || []) {
        const field = (tab.fields || []).find(f => {
            // Check if field title/node/code/handle matches the fieldKey (title/content)
            const fieldTitle = (f.title || '').toLowerCase().trim();
            const fieldNode = (f.node || '').toLowerCase().trim();
            const fieldCode = (f.code || '').toLowerCase().trim();
            const fieldHandle = (f.handle || '').toLowerCase().trim();
            
            return fieldTitle === matchKey || fieldNode === matchKey || fieldCode === matchKey || fieldHandle === matchKey;
        });
        if (field) {
            return field;
        }
    }
    
    return null;
};

// Helper to get custom field model (for multilingual fields)
// Ensures the model exists and is properly initialized
const getCustomFieldModel = (fieldId) => {
    if (!fieldId) {
        return null;
    }
    
    if (!props.form.custom_fields) {
        props.form.custom_fields = {};
    }
    
    if (!props.form.custom_fields[fieldId]) {
        // Initialize with empty default and translations
        props.form.custom_fields[fieldId] = {
            default: '',
            translations: {},
        };
    }
    
    if (!props.form.custom_fields[fieldId].translations) {
        props.form.custom_fields[fieldId].translations = {};
    }
    
    return props.form.custom_fields[fieldId];
};

// Helper for language handling
const languageKey = (language, index) => language?.id ?? language?.slug ?? language?.code ?? index;
const languageLabel = (language) => language?.title || language?.name || language?.label || language?.slug || 'Language';
const ensureTranslationKey = (language, index, model) => {
    const key = language?.slug ?? language?.code ?? language?.id ?? index;
    if (!model.translations) {
        model.translations = {};
    }
    if (model.translations[key] === undefined) {
        model.translations[key] = '';
    }
    return key;
};

// Check if a basic field (title/content) has a multilingual custom field equivalent
const hasMultilingualCustomField = (fieldKey) => {
    const customField = findCustomField(fieldKey);
    return customField && customField.multilanguage && languages.value.length > 0;
};
</script>

<template>
    <div class="grid gap-6 lg:grid-cols-2">
        <!-- Left side: All fields except content -->
        <div class="space-y-6">
            <!-- 1. Visible checkbox -->
            <div v-if="hasField('visible')" class="space-y-1">
                <label class="inline-flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <input v-model="form.visible" type="checkbox" class="form-checkbox" />
                    <span class="ml-2">{{ getField('visible')?.label || 'Visible' }}</span>
                </label>
                <p v-if="form.errors.visible" class="text-sm text-red-600">
                    {{ form.errors.visible }}
                </p>
            </div>

            <!-- 2. Title -->
            <div v-if="hasField('title')" class="space-y-1">
                <template v-if="hasMultilingualCustomField('title')">
                    <!-- Multilingual title from custom field -->
                    <div class="space-y-3">
                        <template v-if="languages.length">
                            <div
                                v-for="(language, index) in languages"
                                :key="languageKey(language, index)"
                                class="space-y-1"
                            >
                                <label class="form-label">
                                    {{ getField('title')?.label || 'Title' }} ({{ languageLabel(language) }})
                                </label>
                                <input
                                    :id="`field-title-${languageKey(language, index)}`"
                                    :value="(() => {
                                        const customField = findCustomField('title');
                                        if (!customField) return '';
                                        const model = getCustomFieldModel(customField.id);
                                        if (!model) return '';
                                        const key = ensureTranslationKey(language, index, model);
                                        return model.translations[key] || '';
                                    })()"
                                    type="text"
                                    class="form-input"
                                    :required="getField('title')?.required"
                                    @input="(event) => {
                                        const customField = findCustomField('title');
                                        if (customField) {
                                            const model = getCustomFieldModel(customField.id);
                                            if (model) {
                                                const key = ensureTranslationKey(language, index, model);
                                                model.translations[key] = event.target.value;
                                            }
                                        }
                                    }"
                                />
                                <p v-if="form.errors[`custom_fields.${findCustomField('title')?.id}.translations.${languageKey(language, index)}`]" class="text-sm text-red-600">
                                    {{ form.errors[`custom_fields.${findCustomField('title')?.id}.translations.${languageKey(language, index)}`] }}
                                </p>
                            </div>
                        </template>
                    </div>
                    <p v-if="form.errors.title" class="text-sm text-red-600">
                        {{ form.errors.title }}
                    </p>
                </template>
                <template v-else>
                    <!-- Regular title field -->
                    <label class="form-label" :for="`field-title`">
                        {{ getField('title')?.label || 'Title' }}
                    </label>
                    <input
                        id="field-title"
                        v-model="form.title"
                        type="text"
                        class="form-input"
                        :required="getField('title')?.required"
                    />
                    <p v-if="form.errors.title" class="text-sm text-red-600">
                        {{ form.errors.title }}
                    </p>
                </template>
            </div>

            <!-- 3. Order -->
            <div v-if="hasField('order_index')" class="space-y-1">
                <label class="form-label" :for="`field-order_index`">
                    {{ getField('order_index')?.label || 'Order' }}
                </label>
                <input
                    id="field-order_index"
                    v-model="form.order_index"
                    type="number"
                    class="form-input"
                    :required="getField('order_index')?.required"
                />
                <p v-if="form.errors.order_index" class="text-sm text-red-600">
                    {{ form.errors.order_index }}
                </p>
            </div>

            <!-- 4. Slug (single or multilingual) -->
            <div v-if="hasField('slug')" class="space-y-1">
                <label class="form-label">
                    {{ getField('slug')?.label || 'Slug' }}
                </label>
                <template v-if="getField('slug')?.multilingual">
                    <div class="space-y-3">
                        <template v-if="languages.length">
                            <div
                                v-for="(language, index) in languages"
                                :key="slugLanguageCode(language, index)"
                                class="space-y-1"
                            >
                                <label class="form-label text-sm text-gray-600 dark:text-gray-300">
                                    {{ slugLanguageLabel(language) }}
                                    <span v-if="isDefaultLanguage(language)" class="text-xs text-gray-500">
                                        (Default)
                                    </span>
                                </label>
                                <input
                                    :id="`field-slug-${slugLanguageCode(language, index)}`"
                                    :value="slugTranslationValue(language, index)"
                                    type="text"
                                    class="form-input"
                                    @input="updateSlugTranslation(language, index, $event.target.value)"
                                />
                                <p v-if="slugTranslationError(language, index)" class="text-sm text-red-600">
                                    {{ slugTranslationError(language, index) }}
                                </p>
                            </div>
                        </template>
                        <p v-else class="text-sm text-gray-500">
                            No languages are configured for multilingual slugs.
                        </p>
                        <p v-if="form.errors.slug" class="text-sm text-red-600">
                            {{ form.errors.slug }}
                        </p>
                    </div>
                </template>
                <template v-else>
                    <input
                        id="field-slug"
                        v-model="form.slug"
                        type="text"
                        class="form-input"
                        :required="getField('slug')?.required"
                    />
                    <p v-if="form.errors.slug" class="text-sm text-red-600">
                        {{ form.errors.slug }}
                    </p>
                </template>
            </div>

            <!-- 5. File input -->
            <div v-if="hasField('item_file')" class="space-y-2">
                <label class="form-label" :for="`field-item_file`">
                    {{ getField('item_file')?.label || 'File' }}
                </label>
                <input
                    id="field-item_file"
                    type="file"
                    class="form-input"
                    @change="handleFileInput($event, 'item_file')"
                />
                <div v-if="hasSelectedFile('item_file')" class="flex items-center justify-between gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                    <div class="flex-1 min-w-0">
                        <span class="text-gray-500 dark:text-gray-400">Selected file: </span>
                        <span class="text-blue-700 dark:text-blue-300 font-medium truncate">{{ selectedFileName('item_file') }}</span>
                    </div>
                    <button
                        type="button"
                        @click="clearFile('item_file')"
                        class="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                        Clear
                    </button>
                </div>
                <div v-if="hasCurrentFile(getField('item_file'))" class="flex items-center justify-between gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                    <div class="flex-1 min-w-0">
                        <span class="text-gray-500 dark:text-gray-400">Current file: </span>
                        <a
                            v-if="currentFileUrl(getField('item_file'))"
                            :href="currentFileUrl(getField('item_file'))"
                            class="text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                            target="_blank"
                            rel="noreferrer"
                        >
                            {{ currentFileUrl(getField('item_file')) }}
                        </a>
                        <span v-else class="text-gray-700 dark:text-gray-300 truncate">{{ currentFileValue(getField('item_file')) }}</span>
                    </div>
                    <button
                        type="button"
                        @click="clearFile('item_file')"
                        class="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                        Clear
                    </button>
                </div>
                <p v-if="form.delete_item_file" class="text-xs text-orange-600 dark:text-orange-400">
                    File will be removed when you save changes.
                </p>
                <p v-if="form.errors.item_file" class="text-sm text-red-600">
                    {{ form.errors.item_file }}
                </p>
            </div>

            <!-- 6. Publish and Archive dates (in one row) -->
            <div v-if="hasField('publish_at') || hasField('archive_at')" class="grid gap-4 md:grid-cols-2">
                <div v-if="hasField('publish_at')" class="space-y-1">
                    <label class="form-label" :for="`field-publish_at`">
                        {{ getField('publish_at')?.label || 'Publish date' }}
                    </label>
                    <input
                        id="field-publish_at"
                        v-model="form.publish_at"
                        type="datetime-local"
                        class="form-input"
                    />
                    <p v-if="form.errors.publish_at" class="text-sm text-red-600">
                        {{ form.errors.publish_at }}
                    </p>
                </div>
                <div v-if="hasField('archive_at')" class="space-y-1">
                    <label class="form-label" :for="`field-archive_at`">
                        {{ getField('archive_at')?.label || 'Archive date' }}
                    </label>
                    <input
                        id="field-archive_at"
                        v-model="form.archive_at"
                        type="datetime-local"
                        class="form-input"
                    />
                    <p v-if="form.errors.archive_at" class="text-sm text-red-600">
                        {{ form.errors.archive_at }}
                    </p>
                </div>
            </div>
        </div>

        
        <!-- Right side: Content field -->
        <div v-if="hasField('content')" class="space-y-1">            

            <template v-if="hasMultilingualCustomField('content')">
                <!-- Multilingual content from custom field -->
                <div class="space-y-3">
                    <template v-if="languages.length">
                        <div
                            v-for="(language, index) in languages"
                            :key="languageKey(language, index)"
                            class="space-y-1"
                        >
                            <label class="form-label">
                                {{ getField('content')?.label || 'Content' }} ({{ languageLabel(language) }})
                            </label>

                            <WysiwigEditor 
                                :model-value="(() => {
                                    const customField = findCustomField('content');
                                    if (!customField) return '';
                                    const model = getCustomFieldModel(customField.id);
                                    if (!model) return '';
                                    const key = ensureTranslationKey(language, index, model);
                                    return model.translations[key] || '';
                                })()"
                                @update:model-value="(value) => {
                                    const customField = findCustomField('content');
                                    if (customField) {
                                        const model = getCustomFieldModel(customField.id);
                                        if (model) {
                                            const key = ensureTranslationKey(language, index, model);
                                            model.translations[key] = value;
                                        }
                                    }
                                }"
                            />

                            <!-- <textarea
                                :id="`field-content-${languageKey(language, index)}`"
                                :value="(() => {
                                    const customField = findCustomField('content');
                                    if (!customField) return '';
                                    const model = getCustomFieldModel(customField.id);
                                    if (!model) return '';
                                    const key = ensureTranslationKey(language, index, model);
                                    return model.translations[key] || '';
                                })()"
                                class="form-textarea h-full min-h-[400px]"
                                :required="getField('content')?.required"
                                @input="(event) => {
                                    const customField = findCustomField('content');
                                    if (customField) {
                                        const model = getCustomFieldModel(customField.id);
                                        if (model) {
                                            const key = ensureTranslationKey(language, index, model);
                                            model.translations[key] = event.target.value;
                                        }
                                    }
                                }"
                            ></textarea> -->
                            <p v-if="form.errors[`custom_fields.${findCustomField('content')?.id}.translations.${languageKey(language, index)}`]" class="text-sm text-red-600">
                                {{ form.errors[`custom_fields.${findCustomField('content')?.id}.translations.${languageKey(language, index)}`] }}
                            </p>
                        </div>
                    </template>
                </div>
                <p v-if="form.errors.content" class="text-sm text-red-600">
                    {{ form.errors.content }}
                </p>
            </template>
            <template v-else>
                <!-- Regular content field -->
                <label class="form-label" :for="`field-content`">
                    {{ getField('content')?.label || 'Content' }}
                </label>
                <WysiwigEditor 
                    :model-value="form.content || ''"
                    @update:model-value="(value) => {
                        form.content = value;
                    }"
                />
                <p v-if="form.errors.content" class="text-sm text-red-600">
                    {{ form.errors.content }}
                </p>
            </template>
        </div>
    </div>
</template>
