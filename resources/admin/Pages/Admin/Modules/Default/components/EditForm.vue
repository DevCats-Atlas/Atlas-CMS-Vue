<script setup>
import { useForm, usePage } from '@inertiajs/vue3';
import { computed, ref, watch } from 'vue';
import ToastStack from '@/components/ToastStack.vue';
import { useToast } from '@/composables/useToast.js';
import CustomFieldsTabs from './CustomFieldsTabs.vue';

const props = defineProps({
    title: {
        type: String,
        default: 'Edit Entry',
    },
    moduleHandle: {
        type: String,
        required: true,
    },
    module: {
        type: Object,
        required: true,
    },
    itemType: {
        type: Object,
        required: true,
    },
    fields: {
        type: Array,
        default: () => [],
    },
    customFieldTabs: {
        type: Array,
        default: () => [],
    },
    systemFields: {
        type: Array,
        default: () => [],
    },
    item: {
        type: Object,
        required: true,
    },
    updateUrl: {
        type: String,
        required: true,
    },
    indexUrl: {
        type: String,
        required: true,
    },
    inline: {
        type: Boolean,
        default: false,
    },
    fieldId: {
        type: Number,
        default: null,
    },
});

const emit = defineEmits(['saved', 'cancel']);

const { toasts, dismissToast } = useToast();
const languages = computed(() => usePage().props.languages || []);

const normalizeCheckboxValue = (value) => {
    if (value === null || value === undefined) {
        return false;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        return value === '1' || value === 'true' || value === 'on';
    }
    return !!value;
};

const buildCustomFieldState = () => {
    const state = {};

    // Include regular custom field tabs
    props.customFieldTabs.forEach((tab) => {
        (tab.fields || []).forEach((field) => {
            // For file fields, initialize as null (File objects will be set when selected)
            // For checkbox fields, normalize boolean values
            // For other fields, use the stored values
            const isFileField = field.type === 'file';
            const isCheckboxField = field.type === 'checkbox';
            
            let defaultValue;
            if (isFileField) {
                defaultValue = null;
            } else if (isCheckboxField) {
                defaultValue = normalizeCheckboxValue(field.values?.default);
            } else {
                defaultValue = field.values?.default ?? '';
            }
            
            let translations = {};
            if (field.values?.translations) {
                if (isFileField) {
                    // For file fields, set translations to null initially
                    Object.keys(field.values.translations).forEach((lang) => {
                        translations[lang] = null;
                    });
                } else if (isCheckboxField) {
                    // For checkbox fields, normalize boolean values
                    Object.keys(field.values.translations).forEach((lang) => {
                        translations[lang] = normalizeCheckboxValue(field.values.translations[lang]);
                    });
                } else {
                    translations = { ...field.values.translations };
                }
            }
            
            state[field.id] = {
                default: defaultValue,
                translations,
            };
        });
    });
    
    // Also include system fields (from _system tab) for title/content
    if (props.systemFields && props.systemFields.length > 0) {
        props.systemFields.forEach((field) => {
            // For file fields, initialize as null (File objects will be set when selected)
            // For checkbox fields, normalize boolean values
            // For other fields, use the stored values
            const isFileField = field.type === 'file';
            const isCheckboxField = field.type === 'checkbox';
            
            let defaultValue;
            if (isFileField) {
                defaultValue = null;
            } else if (isCheckboxField) {
                defaultValue = normalizeCheckboxValue(field.values?.default);
            } else {
                defaultValue = field.values?.default ?? '';
            }
            
            let translations = {};
            if (field.values?.translations) {
                if (isFileField) {
                    // For file fields, set translations to null initially
                    Object.keys(field.values.translations).forEach((lang) => {
                        translations[lang] = null;
                    });
                } else if (isCheckboxField) {
                    // For checkbox fields, normalize boolean values
                    Object.keys(field.values.translations).forEach((lang) => {
                        translations[lang] = normalizeCheckboxValue(field.values.translations[lang]);
                    });
                } else {
                    translations = { ...field.values.translations };
                }
            }
            
            state[field.id] = {
                default: defaultValue,
                translations,
            };
        });
    }

    return state;
};

const initialValues = computed(() => props.item.values || {});

const buildFormPayload = () => {
    const values = { ...props.item.values };
    delete values.item_file_url;

    const payload = {
        ...values,
        item_id: props.item.id,
        custom_fields: buildCustomFieldState(),
    };

    // Initialize item_file as null instead of deleting it
    // This ensures the property is tracked by Inertia's form
    if (!(payload.item_file instanceof File)) {
        payload.item_file = null;
    }

    // Initialize delete_item_file flag
    payload.delete_item_file = false;

    if (props.itemType.slugIsMultilingual && !payload.slug_translations) {
        payload.slug_translations = {};
    }

    return payload;
};

const editForm = useForm(buildFormPayload());

editForm.transform((data) => {
    const payload = { ...data };

    if (!(payload.item_file instanceof File)) {
        delete payload.item_file;
    }

    // Include field_id if provided (for child item updates)
    if (props.fieldId) {
        payload.field_id = props.fieldId;
    }

    payload._method = 'put';

    return payload;
});

const submitting = ref(false);

const submit = () => {
    submitting.value = true;
    editForm.post(props.updateUrl, {
        preserveScroll: true,
        forceFormData: true,
        onFinish: () => {
            submitting.value = false;
        },
        onSuccess: () => {
            // Note: Success toast is handled by the parent Edit page via flash messages
            // Reset all file inputs after successful save
            // Reset item_file input
            const itemFileInput = document.getElementById('field-item_file');
            if (itemFileInput) {
                itemFileInput.value = '';
            }
            
            // Reset all custom field file inputs
            props.customFieldTabs.forEach((tab) => {
                (tab.fields || []).forEach((field) => {
                    if (field.type === 'file') {
                        // Single language field
                        const inputId = `field-${field.id}`;
                        const input = document.getElementById(inputId);
                        if (input) {
                            input.value = '';
                        }
                        
                        // Multi-language fields
                        if (field.multilanguage && languages.value.length > 0) {
                            languages.value.forEach((language) => {
                                const langKey = language?.id ?? language?.slug ?? language?.code;
                                const langInputId = `field-${field.id}-${langKey}`;
                                const langInput = document.getElementById(langInputId);
                                if (langInput) {
                                    langInput.value = '';
                                }
                            });
                        }
                    }
                });
            });

            emit('saved');
        },
    });
};

const cancel = () => {
    emit('cancel');
};

watch(
    () => [props.item, props.customFieldTabs],
    () => {
        editForm.defaults(buildFormPayload());
        editForm.reset();
    },
    { deep: true }
);
</script>

<template>
    <div :class="{ 'space-y-6': !inline }" class="relative">
        <form id="edit-form" class="space-y-6" @submit.prevent="submit">
            <CustomFieldsTabs
                :fields="fields"
                :form="editForm"
                :custom-tabs="customFieldTabs"
                :initial-values="initialValues"
                :system-fields="systemFields"
                :parent-item-id="item.id"
            />
            <input v-model="editForm.item_id" type="hidden" />
            
            <!-- Sticky bottom toolbar with save button (non-inline only) -->
            <div v-if="!inline" class="sticky bottom-0 z-20 bg-white dark:bg-gray-800 pt-4 pb-4 mt-6 border-t border-gray-200 dark:border-gray-700">
                <div class="flex items-center gap-3">
                    <button type="submit" class="btn btn-primary" :disabled="submitting || editForm.processing">
                        {{ editForm.processing ? 'Saving…' : 'Save changes' }}
                    </button>
                    <button type="button" class="btn-text" @click="cancel">Cancel</button>
                </div>
            </div>
            
            <!-- Inline mode: keep buttons in their original position -->
            <div v-else class="flex items-center gap-3">
                <button type="submit" class="btn btn-primary" :disabled="submitting || editForm.processing">
                    {{ editForm.processing ? 'Saving…' : 'Save changes' }}
                </button>
                <button type="button" class="btn-text" @click="cancel">Close</button>
            </div>
        </form>
        
        <ToastStack :toasts="toasts" @dismiss="dismissToast" />
    </div>
</template>

