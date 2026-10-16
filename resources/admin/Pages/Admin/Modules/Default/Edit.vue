<script setup>
import { watch } from 'vue';
import { Head, Link, usePage } from '@inertiajs/vue3';
import AdminLayout from '@admin/Layouts/AdminLayout.vue';
import EditForm from './components/EditForm.vue';
import CustomButtons from '../components/CustomButtons.vue';
import { useToast } from '@/composables/useToast.js';
import { useTranslation } from '@/utils/useTranslation.js';

const { showToast } = useToast();
const page = usePage();

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
    breadcrumbs: {
        type: Array,
        default: () => [],
    },
    customButtons: {
        type: Array,
        default: () => [],
    },
    dataSource: {
        type: String,
        default: 'items',
    },
});

const { t } = useTranslation();

// Watch for flash messages and show them as toasts
watch(() => page.props.flash, (flash) => {
    if (flash?.error) {
        showToast({
            title: t('admin.common.error'),
            message: flash.error,
            intent: 'danger',
            duration: 6000,
        });
    }
    if (flash?.success) {
        showToast({
            title: t('admin.common.success'),
            message: flash.success,
            intent: 'success',
            duration: 4000,
        });
    }
}, { immediate: true, deep: true });
</script>

<template>
    <AdminLayout>
        <Head :title="title" />
        <div class="py-6">
            <div class="mx-auto max-w-8xl sm:px-6 lg:px-8 space-y-6">
                <section class="bg-white dark:bg-gray-800 shadow rounded-xl p-6 space-y-4 relative overflow-visible">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('admin.items.module') }}</p>
                            <h1 class="heading-1">
                                {{ t('admin.items.edit_entry', { module: module.title }) }}
                            </h1>
                            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                {{ t('admin.items.editing', { type: itemType.label, id: item.id }) }}
                            </p>
                            <!-- Breadcrumbs for nested items -->
                            <nav v-if="breadcrumbs.length > 0" class="mt-2 flex items-center gap-2 text-sm">
                                <Link :href="indexUrl" class="text-indigo-600 dark:text-indigo-300 hover:underline" preserve-scroll>
                                    {{ t('admin.items.list') }}
                                </Link>
                                <span class="text-gray-400">/</span>
                                <template v-for="(crumb, index) in breadcrumbs" :key="crumb.id">
                                    <Link
                                        :href="crumb.url"
                                        class="text-indigo-600 dark:text-indigo-300 hover:underline"
                                        preserve-scroll
                                    >
                                        {{ crumb.title }}
                                    </Link>
                                    <span v-if="index < breadcrumbs.length - 1" class="text-gray-400">/</span>
                                </template>
                                <span class="text-gray-400">/</span>
                                <span class="text-gray-600 dark:text-gray-300 font-medium">{{ item.title || t('admin.items.untitled') }}</span>
                            </nav>
                        </div>
                        <div class="flex items-center gap-3">
                            <CustomButtons
                                v-if="customButtons && customButtons.length > 0"
                                :buttons="customButtons"
                                :module-handle="moduleHandle"
                                :record-id="item.id"
                                :data-source="dataSource"
                            />
                            <Link :href="indexUrl" class="btn btn-outline" preserve-scroll>
                                {{ t('admin.users.back_to_list') }}
                            </Link>
                        </div>
                    </div>
                    <EditForm
                        :title="title"
                        :module-handle="moduleHandle"
                        :module="module"
                        :item-type="itemType"
                        :fields="fields"
                        :custom-field-tabs="customFieldTabs"
                        :system-fields="systemFields"
                        :item="item"
                        :update-url="updateUrl"
                        :index-url="indexUrl"
                        :inline="false"
                    />
                </section>
            </div>
        </div>
    </AdminLayout>
</template>
