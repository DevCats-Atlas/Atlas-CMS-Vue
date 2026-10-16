<script setup>
import { computed } from 'vue';
import { resolveInterfaceComponent } from '@admin/Pages/Admin/Modules/Default/components/interfaces';
import { fieldConfig, firstError, formatReadOnlyValue, groupFields, parentLabel } from '@/dbTable/formModel.js';
import { useTranslation } from '@/utils/useTranslation.js';

// Renders DbTable record fields: optional parent selector, configured field groups and remaining fields.
const props = defineProps({
    fields: { type: Array, required: true },
    models: { type: Object, required: true },
    errors: { type: Object, default: () => ({}) },
    uiConfig: { type: Object, default: () => ({}) },
    availableParents: { type: Array, default: () => [] },
    parentColumn: { type: String, default: 'parent_id' },
    showParent: { type: Boolean, default: false },
    compact: { type: Boolean, default: false },
});

const { t } = useTranslation();

const parent = defineModel('parent', { default: null });

const layout = computed(() => groupFields(props.fields, props.compact ? {} : props.uiConfig));
const sections = computed(() => [
    ...layout.value.groups.map((group) => ({ key: `group-${group.id ?? group.title}`, title: group.title, fields: group.fieldObjects })),
    ...(layout.value.ungrouped.length > 0
        ? [{ key: 'ungrouped', title: layout.value.groups.length > 0 ? 'Other Fields' : null, fields: layout.value.ungrouped }]
        : []),
]);

const wide = (field) => !props.compact && (field.interface === 'textarea' || field.interface === 'wysiwyg');
</script>

<template>
    <div :class="compact ? 'space-y-4' : 'space-y-6'">
        <div v-if="showParent && availableParents.length > 0" class="mb-6 pb-6 border-divider">
            <label class="form-label">{{ t('admin.db_table.parent') }}</label>
            <select v-model="parent" class="form-input">
                <option :value="null">{{ t('admin.db_table.root_item') }}</option>
                <option v-for="item in availableParents" :key="item.id" :value="item.id">
                    {{ parentLabel(item) }}
                </option>
            </select>
            <p v-if="firstError(errors, parentColumn)" class="mt-1 text-sm text-red-600">
                {{ firstError(errors, parentColumn) }}
            </p>
        </div>

        <div v-for="section in sections" :key="section.key" class="space-y-4">
            <h3
                v-if="section.title"
                class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700 pb-2"
            >
                {{ section.title }}
            </h3>
            <div :class="compact ? 'space-y-4' : 'grid gap-6 md:grid-cols-2'">
                <div v-for="field in section.fields" :key="field.name" :class="{ 'md:col-span-2': wide(field) }">
                    <div v-if="field.editable === false" class="space-y-1">
                        <label class="form-label">{{ field.title || field.name }}</label>
                        <div class="form-input bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 cursor-not-allowed">
                            {{ formatReadOnlyValue(field) }}
                        </div>
                    </div>
                    <component
                        :is="resolveInterfaceComponent(fieldConfig(field).type)"
                        v-else
                        :field="fieldConfig(field)"
                        :model="models[field.name]"
                    />

                    <slot name="after-field" :field="field" />

                    <p v-if="firstError(errors, field.name)" class="mt-1 text-sm text-red-600 dark:text-red-400">
                        {{ firstError(errors, field.name) }}
                    </p>
                </div>
            </div>
        </div>

        <slot />
    </div>
</template>
