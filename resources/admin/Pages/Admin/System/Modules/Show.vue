<script setup>
import { adminUrl } from '@/utils/adminUrl';
import { Head, Link, router } from '@inertiajs/vue3';
import SystemLayout from '@admin/Layouts/SystemLayout.vue';
import ToastStack from '@/components/ToastStack.vue';
import { useToast } from '@/composables/useToast.js';
import { confirmDialog } from '@/utils/confirmDialog.js';
import { useTranslation } from '@/utils/useTranslation.js';
import { useModuleDataSourceForm } from '@/modules/useModuleDataSourceForm.js';
import FilterBuilder from './components/FilterBuilder.vue';
import ButtonBuilder from './components/ButtonBuilder.vue';
import ModuleSettingsSection from './sections/ModuleSettingsSection.vue';
import DbTableSourceSection from './sections/DbTableSourceSection.vue';
import RelationshipsSection from './sections/RelationshipsSection.vue';
import ModuleActionsSection from './sections/ModuleActionsSection.vue';

const props = defineProps({
    title: { type: String, default: 'Module' },
    module: { type: Object, required: true },
    actions: { type: Array, default: () => [] },
    itemTypes: { type: Array, default: () => [] },
    collections: { type: Array, default: () => [] },
    collectionCreateValue: { type: String, default: '__create_collection__' },
    customFieldTabs: { type: Array, default: () => [] },
    dbConnections: { type: Array, default: () => [] },
});

const { t } = useTranslation();
const { toasts, showToast, dismissToast } = useToast();

const moduleForm = useModuleDataSourceForm(props);
const { form, source, isDbTable } = moduleForm;

const submitModule = () => moduleForm.submit({
    onSuccess: () => showToast({
        title: t('admin.modules.module_saved'),
        message: t('admin.modules.module_settings_updated'),
        intent: 'success',
    }),
});

const deleteModule = async () => {
    const confirmed = await confirmDialog({
        title: t('admin.modules.delete_module'),
        message: t('admin.modules.delete_module_confirm'),
        confirmLabel: t('admin.common.delete'),
        intent: 'danger',
    });
    if (confirmed) {
        router.delete(adminUrl(`system/modules/${props.module.id}`));
    }
};

const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
</script>

<template>
    <SystemLayout>
        <Head :title="title" />

        <div class="py-6 pb-24">
            <div class="mx-auto max-w-5xl sm:px-6 lg:px-8 space-y-6">
                <div class="section">
                    <div class="flex items-center justify-between">
                        <div>
                            <h1 class="heading-1">{{ module.title }}</h1>
                            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('admin.module_settings.subtitle') }}</p>
                        </div>
                        <Link :href="adminUrl('system/modules')" class="btn-text">{{ t('admin.users.back_to_list') }}</Link>
                    </div>

                    <form @submit.prevent="submitModule">
                        <ModuleSettingsSection :module-form="moduleForm" :item-types="itemTypes" :collections="collections">
                            <DbTableSourceSection v-if="isDbTable" :module-form="moduleForm" :module-id="module.id" :db-connections="dbConnections">
                                <RelationshipsSection :config="source.relationships" :module-id="module.id" :connection="source.connection" />
                            </DbTableSourceSection>
                        </ModuleSettingsSection>
                    </form>
                </div>

                <div v-if="isDbTable" class="section">
                    <div>
                        <h2 class="section-heading">{{ t('admin.module_settings.filters') }}</h2>
                        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ t('admin.module_settings.filters_hint') }}</p>
                    </div>
                    <FilterBuilder
                        v-if="form.data_source_table && form.data_source_table.trim() !== ''"
                        :filters="source.filters.filters"
                        :default-search="source.filters.default_search"
                        :table-name="form.data_source_table"
                        :module-id="module.id"
                        :ui-config="moduleForm.uiConfig.value"
                        :relationships="source.relationships.relationships"
                        @update:filters="(filters) => source.filters.filters.splice(0, source.filters.filters.length, ...filters)"
                        @update:default-search="(defaultSearch) => Object.assign(source.filters.default_search, defaultSearch)"
                    />
                    <div v-else class="text-sm text-gray-500 dark:text-gray-400 py-4 text-center border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                        {{ t('admin.module_settings.filters_need_table') }}
                    </div>
                </div>

                <div class="section">
                    <div>
                        <h2 class="section-heading">{{ t('admin.module_settings.buttons') }}</h2>
                        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ t('admin.module_settings.buttons_hint') }}</p>
                    </div>
                    <ButtonBuilder
                        :buttons="source.buttons.buttons"
                        @update:buttons="(buttons) => source.buttons.buttons.splice(0, source.buttons.buttons.length, ...buttons)"
                    />
                </div>

                <ModuleActionsSection :module-id="module.id" :actions="actions" />
            </div>
        </div>

        <div class="sticky bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
            <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-3">
                <div class="flex items-center justify-between gap-4">
                    <button type="button" class="btn-text-danger" @click="deleteModule">{{ t('admin.modules.delete_module') }}</button>
                    <div class="flex items-center gap-3">
                        <Link :href="adminUrl('system/modules')" class="btn-text">{{ t('admin.common.cancel') }}</Link>
                        <button type="button" class="btn btn-primary" :disabled="form.processing" @click="submitModule">
                            {{ form.processing ? t('admin.users.saving') : t('admin.module_settings.save_module') }}
                        </button>
                        <button type="button" class="btn-icon" :title="t('admin.module_settings.scroll_top')" @click="scrollToTop">
                            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <ToastStack :toasts="toasts" @dismiss="dismissToast" />
    </SystemLayout>
</template>
