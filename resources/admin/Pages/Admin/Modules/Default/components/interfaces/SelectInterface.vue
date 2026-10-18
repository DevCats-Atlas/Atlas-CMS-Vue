<script setup>
import { computed } from 'vue';
import { usePage } from '@inertiajs/vue3';
import { useTranslation } from '@/utils/useTranslation.js';
import SelectControl from './SelectControl.vue';

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

const { t } = useTranslation();

const listType = computed(() => props.field.config?.list_type || 'static');
const options = computed(() => props.field.options ?? props.field.config?.options ?? []);
const hideTitle = computed(() => props.field.config?.hide_title === true);
const languages = computed(() => usePage().props.languages || []);

// One select per content language for a multilanguage field (model.translations[slug]), else one for model.default
const editors = computed(() => (props.field.multilanguage && languages.value.length
    ? languages.value.map((language) => ({
        key: language.slug,
        label: `${props.field.title} (${language.title || language.slug})`,
    }))
    : [{ key: null, label: props.field.title }]));

const valueOf = (key) => (key === null ? props.model.default : props.model.translations?.[key]) ?? '';

function update(key, value) {
    if (key === null) {
        props.model.default = value;
    } else {
        props.model.translations = { ...props.model.translations, [key]: value };
    }
}
</script>

<template>
    <div class="space-y-4">
        <div v-for="editor in editors" :key="editor.key ?? 'default'" class="space-y-1">
            <label v-if="!hideTitle" class="form-label">{{ editor.label }}</label>
            <SelectControl
                :options="options"
                :model-value="valueOf(editor.key)"
                @update:model-value="update(editor.key, $event)"
            />
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400" v-if="listType === 'dynamic' && options.length === 0">
            {{ t('admin.interfaces.no_root_items') }}
        </p>
    </div>
</template>
