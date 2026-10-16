<script setup>
import { resolveInterfaceComponent } from '@admin/Pages/Admin/Modules/Default/components/interfaces';
import { useTranslation } from '@/utils/useTranslation.js';

/**
 * Main module fields: title, data source, item type and collection (items modules), visibility and the remaining
 * settings custom fields. Data source specific settings go in the default slot, under the first row.
 */
defineProps({
    // Returned by useModuleDataSourceForm()
    moduleForm: { type: Object, required: true },
    itemTypes: { type: Array, default: () => [] },
    collections: { type: Array, default: () => [] },
});

const { t } = useTranslation();
</script>

<template>
    <div class="grid gap-4 md:grid-cols-3">
        <div>
            <label class="form-label">{{ t('admin.common.title_label') }}</label>
            <input v-model="moduleForm.form.title" type="text" class="form-input" required />
            <p v-if="moduleForm.form.errors.title" class="mt-1 text-sm text-red-600">{{ moduleForm.form.errors.title }}</p>
        </div>
        <div>
            <label class="form-label">{{ t('admin.module_settings.data_source') }}</label>
            <select v-model="moduleForm.form.data_source" class="form-select" required>
                <option value="items">{{ t('admin.module_settings.source_items') }}</option>
                <option value="db_table">{{ t('admin.module_settings.source_db_table') }}</option>
                <option value="custom">{{ t('admin.module_settings.source_custom') }}</option>
            </select>
            <p v-if="moduleForm.form.errors.data_source" class="mt-1 text-sm text-red-600">{{ moduleForm.form.errors.data_source }}</p>
        </div>
        <div v-if="!moduleForm.isDbTable.value && !moduleForm.isCustom.value">
            <label class="form-label">{{ t('admin.items.item_type') }}</label>
            <select v-model="moduleForm.form.item_type_id" class="form-select" required>
                <option value="" disabled>{{ t('admin.module_settings.select_type') }}</option>
                <option v-for="type in itemTypes" :key="type.id" :value="String(type.id)">{{ type.label }}</option>
            </select>
            <p v-if="moduleForm.form.errors.item_type_id" class="mt-1 text-sm text-red-600">{{ moduleForm.form.errors.item_type_id }}</p>
        </div>
    </div>

    <slot />

    <div v-if="moduleForm.isCustom.value" class="pt-4 border-t border-gray-200 dark:border-gray-700">
        <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ t('admin.module_settings.custom_source_hint') }}
            <code class="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">ModuleBaseController</code>
        </p>
    </div>

    <template v-if="!moduleForm.isDbTable.value && !moduleForm.isCustom.value">
        <div class="pt-2 grid gap-4 md:grid-cols-2">
            <div>
                <label class="form-label">{{ t('admin.module_settings.collection') }}</label>
                <select v-model="moduleForm.form.collection_choice" class="form-select" required>
                    <option value="" disabled>{{ t('admin.module_settings.select_collection') }}</option>
                    <option v-for="collection in collections" :key="collection.id" :value="String(collection.id)">
                        {{ collection.title }} (#{{ collection.id }})
                    </option>
                    <option :value="moduleForm.createOption">{{ t('admin.module_settings.create_collection') }}</option>
                </select>
                <p v-if="moduleForm.form.errors.collection_choice" class="mt-1 text-sm text-red-600">{{ moduleForm.form.errors.collection_choice }}</p>
            </div>
        </div>
        <div v-if="moduleForm.form.collection_choice === moduleForm.createOption" class="pt-2">
            <label class="form-label">{{ t('admin.module_settings.new_collection_title') }}</label>
            <input v-model="moduleForm.form.collection_title" type="text" class="form-input" required />
            <p v-if="moduleForm.form.errors.collection_title" class="mt-1 text-sm text-red-600">{{ moduleForm.form.errors.collection_title }}</p>
        </div>
    </template>

    <div class="pt-4">
        <label class="inline-flex items-center text-sm text-gray-700 dark:text-gray-300">
            <input v-model="moduleForm.form.visible" type="checkbox" class="form-checkbox" />
            <span class="ml-2">{{ t('admin.items.visible') }}</span>
        </label>
    </div>

    <div v-if="moduleForm.otherSettingsFields.value.length > 0" class="pt-6 border-t border-gray-200 dark:border-gray-700">
        <label class="form-label mb-3">{{ t('admin.module_settings.settings') }}</label>
        <div class="space-y-3">
            <div v-for="field in moduleForm.otherSettingsFields.value" :key="field.id">
                <component :is="resolveInterfaceComponent(field.type)" :field="field" :model="moduleForm.fieldModel(field)" />
            </div>
        </div>
    </div>
</template>
