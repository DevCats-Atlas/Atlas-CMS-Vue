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
const ensureTranslationKey = (language, index) => {
    const key = language?.slug ?? language?.code ?? language?.id ?? index;

    if (!props.model.translations) {
        props.model.translations = {};
    }

    if (props.model.translations[key] === undefined) {
        props.model.translations[key] = false;
    }

    return key;
};

// Ensure boolean values are properly set
const getBooleanValue = (value) => {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        return value === '1' || value === 'true' || value === 'on';
    }
    return !!value;
};
</script>

<template>
    <div class="space-y-4">
        <template v-if="hasTranslations">
            <div v-for="(language, index) in languages" :key="languageKey(language, index)" class="space-y-1">
                <label class="inline-flex items-center">
                    <input
                        v-model="model.translations[ensureTranslationKey(language, index)]"
                        type="checkbox"
                        class="form-checkbox"
                        :true-value="true"
                        :false-value="false"
                    />
                    <span v-if="!hideTitle" class="ml-2 form-label">
                        {{ field.title }} ({{ languageLabel(language) }})
                    </span>
                </label>
            </div>
        </template>
        <div v-else class="space-y-1">
            <label class="inline-flex items-center">
                <input
                    v-model="model.default"
                    type="checkbox"
                    class="form-checkbox"
                    :true-value="true"
                    :false-value="false"
                />
                <span v-if="!hideTitle" class="ml-2 form-label">{{ field.title }}</span>
            </label>
        </div>
    </div>
</template>

