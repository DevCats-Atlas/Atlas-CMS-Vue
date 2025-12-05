<script setup>
import { computed } from 'vue';
import { usePage } from '@inertiajs/vue3';
import WysiwigEditor from '@/components/WysiwigEditor.vue';

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
        props.model.translations[key] = '';
    }

    return key;
};
</script>

<template>
    <div class="space-y-4">
        <template v-if="hasTranslations">
            <div v-for="(language, index) in languages" :key="languageKey(language, index)" class="space-y-1">
                <label v-if="!hideTitle" class="form-label">
                    {{ field.title }} ({{ languageLabel(language) }})
                </label>
                <WysiwigEditor 
                    :model-value="model.translations[ensureTranslationKey(language, index)] || ''"
                    @update:model-value="(value) => {
                        const key = ensureTranslationKey(language, index);
                        model.translations[key] = value;
                    }"
                />
            </div>
        </template>
        <div v-else class="space-y-1">
            <label v-if="!hideTitle" class="form-label">{{ field.title }}</label>
            <WysiwigEditor 
                :model-value="model.default || ''"
                @update:model-value="(value) => {
                    model.default = value;
                }"
            />
        </div>
    </div>
</template>
