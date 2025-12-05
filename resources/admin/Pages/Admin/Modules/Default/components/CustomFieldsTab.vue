<script setup>
import { resolveInterfaceComponent } from './interfaces';
import { usePage } from '@inertiajs/vue3';

const props = defineProps({
    tab: {
        type: Object,
        required: true,
    },
    form: {
        type: Object,
        required: true,
    },
    parentItemId: {
        type: Number,
        default: null,
    },
});

const componentForField = (field) => resolveInterfaceComponent(field.type, field.config);

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

const ensureFieldModel = (field) => {
    if (!props.form.custom_fields) {
        props.form.custom_fields = {};
    }

    const isFileField = field.type === 'file';
    const isCheckboxField = field.type === 'checkbox';
    
    if (!props.form.custom_fields[field.id]) {
        // For file fields, initialize as null (File objects will be set when selected)
        // For checkbox fields, normalize boolean values
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
        
        props.form.custom_fields[field.id] = {
            default: defaultValue,
            translations,
        };
    } else {
        if (props.form.custom_fields[field.id].default === undefined) {
            if (isFileField) {
                props.form.custom_fields[field.id].default = null;
            } else if (isCheckboxField) {
                props.form.custom_fields[field.id].default = normalizeCheckboxValue(field.values?.default);
            } else {
                props.form.custom_fields[field.id].default = field.values?.default ?? '';
            }
        }

        if (!props.form.custom_fields[field.id].translations) {
            props.form.custom_fields[field.id].translations = {};
        }
    }
    
    // Initialize delete flags for file fields
    if (field.type === 'file') {
        if (props.form.custom_fields[field.id].delete_default === undefined) {
            props.form.custom_fields[field.id].delete_default = false;
        }
        if (field.multilanguage) {
            // Initialize delete flags for translations
            const languages = usePage().props.languages || [];
            languages.forEach((language) => {
                const langKey = language?.id ?? language?.slug ?? language?.code;
                const deleteKey = `delete_translations_${langKey}`;
                if (props.form.custom_fields[field.id][deleteKey] === undefined) {
                    props.form.custom_fields[field.id][deleteKey] = false;
                }
            });
        }
    }

    return props.form.custom_fields[field.id];
};
</script>

<template>
    <div class="space-y-4">
        <div>
            <p v-if="!(tab.fields || []).length" class="text-sm text-gray-500 dark:text-gray-400">
                This tab does not contain any custom fields yet.
            </p>
        </div>
        <section v-if="(tab.fields || []).length" class="space-y-3">
            <div
                v-for="field in tab.fields"
                :key="field.id"
                class="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-4"
            >
                <component
                    :is="componentForField(field)"
                    :field="field"
                    :model="ensureFieldModel(field)"
                    :parent-item-id="parentItemId"
                />
            </div>
        </section>
    </div>
</template>
