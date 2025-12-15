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

// Determine input type: datetime-local for datetime fields, date for date fields
const inputType = computed(() => {
    const fieldType = props.field.type || props.field.interface || 'date';
    const configInputType = props.field.config?.inputType;
    
    if (fieldType === 'datetime' || fieldType === 'datetime-local' || configInputType === 'datetime-local') {
        return 'datetime-local';
    }
    return 'date';
});

const languageKey = (language, index) => language?.id ?? language?.slug ?? language?.code ?? index;
const languageLabel = (language) => language?.title || language?.name || language?.label || language?.slug || 'Language';
const ensureTranslationKey = (language, index) => {
    const key = language?.slug ?? language?.code ?? language?.id ?? index;

    if (!props.model.translations) {
        props.model.translations = {};
    }

    if (props.model.translations[key] === undefined) {
        props.model.translations[key] = '';
    }

    return key;
};
</script>

<template>
    <div class="space-y-4 max-w-xs">
        <template v-if="hasTranslations">
            <div v-for="(language, index) in languages" :key="languageKey(language, index)" class="space-y-1">
                <label v-if="!hideTitle" class="form-label">
                    {{ field.title }} ({{ languageLabel(language) }})
                </label>
                <input
                    v-model="model.translations[ensureTranslationKey(language, index)]"
                    :type="inputType"
                    class="form-input"
                />
            </div>
        </template>
        <div v-else class="space-y-1">
            <label v-if="!hideTitle" class="form-label">{{ field.title }}</label>
            <input v-model="model.default" :type="inputType" class="form-input" />
        </div>
    </div>
</template>
