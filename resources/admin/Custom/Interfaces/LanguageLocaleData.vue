<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import ModalDialog from '@/components/ModalDialog.vue';
import { useTranslation } from '@/utils/useTranslation.js';
import { confirmDialog } from '@/utils/confirmDialog.js';
import { localeDataObject, parseLocaleData, serializeLocaleData } from '@/localeData.js';

const { t } = useTranslation();

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

// Key-value rows; written to model.default as flat JSON
const properties = ref([]);
let nextId = 1;
const copySuccessMessage = ref('');
const pasteErrorMessage = ref('');
// Manual paste when the clipboard cannot be read
const manualPasteOpen = ref(false);
const manualPasteText = ref('');
const manualPasteError = ref('');

const generateId = () => `prop_${nextId++}_${Date.now()}`;
const rowsFrom = (entries) => entries.map(([key, value]) => ({ id: generateId(), key, value }));

const flash = (target, message, duration) => {
    target.value = message;
    setTimeout(() => {
        target.value = '';
    }, duration);
};

const loadFromJson = () => {
    const value = props.model.default;
    const result = typeof value === 'string' && value.trim() !== '' ? parseLocaleData(value) : { ok: true, entries: [] };
    if (!result.ok) {
        console.error('Stored locale data is not a JSON object:', value);
    }
    properties.value = result.ok ? rowsFrom(result.entries) : [];
};

const saveToJson = () => {
    props.model.default = serializeLocaleData(properties.value);
};

const handleInputBlur = () => {
    saveToJson();
};

const addProperty = () => {
    properties.value.push({ id: generateId(), key: '', value: '' });
    // Save after adding (in case user adds and immediately submits)
    saveToJson();
};

const removeProperty = async (propertyId) => {
    const property = properties.value.find((p) => p.id === propertyId);
    if (!property) {
        return;
    }

    const confirmed = await confirmDialog({
        message: t('admin.locale_data.remove_confirm', { key: property.key || '' }),
        confirmLabel: t('admin.common.delete'),
        intent: 'danger',
    });
    if (!confirmed) {
        return;
    }

    // The list may have changed while the dialog was open
    const current = properties.value.findIndex((p) => p.id === propertyId);
    if (current === -1) {
        return;
    }
    properties.value.splice(current, 1);
    saveToJson();
};

const copyProperties = async () => {
    const data = localeDataObject(properties.value);
    const jsonString = Object.keys(data).length > 0 ? JSON.stringify(data, null, 2) : '{}';

    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(jsonString);
                flash(copySuccessMessage, t('admin.locale_data.copy_success'), 3000);
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
            if (!successful) {
                throw new Error('execCommand copy failed');
            }
            flash(copySuccessMessage, t('admin.locale_data.copy_success'), 3000);
        } finally {
            document.body.removeChild(textarea);
        }
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        flash(pasteErrorMessage, t('admin.locale_data.copy_error'), 5000);
    }
};

const PASTE_ERRORS = { empty: 'paste_error_empty', syntax: 'paste_error_syntax', format: 'paste_error_invalid_format' };
const pasteErrorText = (error) => t(`admin.locale_data.${PASTE_ERRORS[error]}`);

// Replace the rows with pasted JSON (after confirmation when there are rows)
const applyPastedText = async (text) => {
    const result = parseLocaleData(text);
    if (!result.ok) {
        flash(pasteErrorMessage, pasteErrorText(result.error), result.error === 'empty' ? 3000 : 5000);
        return false;
    }
    if (properties.value.length > 0 && !(await confirmDialog({ message: t('admin.locale_data.paste_confirm') }))) {
        return false;
    }

    properties.value = rowsFrom(result.entries);
    saveToJson();
    flash(copySuccessMessage, t('admin.locale_data.paste_success'), 3000);

    return true;
};

const openManualPaste = () => {
    manualPasteText.value = '';
    manualPasteError.value = '';
    manualPasteOpen.value = true;
};

const pasteProperties = async () => {
    pasteErrorMessage.value = '';
    if (!navigator.clipboard || !navigator.clipboard.readText) {
        openManualPaste();
        return;
    }

    let text;
    try {
        text = await navigator.clipboard.readText();
    } catch (clipboardError) {
        console.warn('Clipboard API read failed:', clipboardError);
        openManualPaste();
        return;
    }
    await applyPastedText(text);
};

const applyManualPaste = async () => {
    const text = manualPasteText.value;
    // Invalid text stays in the dialog to be fixed
    const result = parseLocaleData(text);
    if (!result.ok) {
        manualPasteError.value = pasteErrorText(result.error);
        return;
    }
    // Close first: the replace confirmation is a dialog of its own
    manualPasteOpen.value = false;
    await applyPastedText(text);
};

onMounted(() => {
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
                        {{ t('admin.locale_data.title') }}
                    </p>
                    <div class="flex items-center gap-2">
                        <button
                            type="button"
                            @click="copyProperties"
                            class="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors"
                            :disabled="properties.length === 0"
                        >
                            {{ t('admin.locale_data.copy') }}
                        </button>
                        <button
                            type="button"
                            @click="pasteProperties"
                            class="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors"
                        >
                            {{ t('admin.locale_data.paste') }}
                        </button>
                        <button
                            type="button"
                            @click="addProperty"
                            class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                        >
                            {{ t('admin.locale_data.add_property') }}
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
                    {{ t('admin.locale_data.no_properties') }}
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
                                    {{ t('admin.locale_data.key') }}
                                </label>
                                <input
                                    v-model="property.key"
                                    type="text"
                                    class="form-input text-sm"
                                    :placeholder="t('admin.locale_data.key_placeholder')"
                                    @blur="handleInputBlur"
                                />
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {{ t('admin.locale_data.value') }}
                                </label>
                                <input
                                    v-model="property.value"
                                    type="text"
                                    class="form-input text-sm"
                                    :placeholder="t('admin.locale_data.value_placeholder')"
                                    @blur="handleInputBlur"
                                />
                            </div>
                        </div>
                        <button
                            type="button"
                            @click="removeProperty(property.id)"
                            class="mt-6 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                        >
                            {{ t('admin.locale_data.remove') }}
                        </button>
                    </div>
                </div>
                
                
            </div>
        </div>

        <!-- No <form> inside: this interface is part of the record form; Enter in the textarea adds a line -->
        <ModalDialog :open="manualPasteOpen" :title="t('admin.locale_data.paste_manual_title')" @close="manualPasteOpen = false">
            <div class="space-y-4">
                <label class="form-label" for="locale-data-manual-paste">{{ t('admin.locale_data.paste_prompt') }}</label>
                <textarea
                    id="locale-data-manual-paste"
                    v-model="manualPasteText"
                    rows="10"
                    class="form-input font-mono text-sm"
                    translate="no"
                    placeholder='{ "site_title": "My site" }'
                ></textarea>
                <p v-if="manualPasteError" class="text-sm text-red-600 dark:text-red-400">{{ manualPasteError }}</p>
                <div class="flex justify-end gap-2">
                    <button type="button" class="btn btn-outline" @click="manualPasteOpen = false">{{ t('admin.common.cancel') }}</button>
                    <button type="button" class="btn btn-primary" @click="applyManualPaste">{{ t('admin.locale_data.paste_apply') }}</button>
                </div>
            </div>
        </ModalDialog>
    </div>
</template>
