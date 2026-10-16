<script setup>
import { adminUrl } from '@/utils/adminUrl';
import { Head, Link, router } from '@inertiajs/vue3';
import SystemLayout from '@admin/Layouts/SystemLayout.vue';
import { confirmDialog } from '@/utils/confirmDialog.js';
import { useTranslation } from '@/utils/useTranslation.js';

const props = defineProps({
    title: {
        type: String,
        default: '',
    },
    itemTypes: {
        type: Array,
        default: () => [],
    },
});

const { t } = useTranslation();

const deleteType = async (type) => {
    const confirmed = await confirmDialog({
        title: t('admin.item_types.delete_title'),
        message: t('admin.item_types.delete_index_confirm', { code: type.code }),
        confirmLabel: t('admin.common.delete'),
        intent: 'danger',
    });

    if (!confirmed) {
        return;
    }

    router.delete(adminUrl(`system/item-types/${type.id}`));
};
</script>

<template>
    <SystemLayout>
        <Head :title="title" />

        <div class="py-6">
            <div class="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                <div class="bg-white dark:bg-gray-800 shadow rounded-xl p-6">
                    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 class="heading-1">{{ t('admin.item_types.title') }}</h1>
                            <p class="text-gray-500 dark:text-gray-400 mt-2">
                                {{ t('admin.item_types.index_hint') }}
                            </p>
                        </div>
                        <Link :href="adminUrl('system/item-types/create')" class="btn btn-outline">
                            {{ t('admin.item_types.add_type') }}
                        </Link>
                    </div>
                </div>

                <div class="bg-white dark:bg-gray-800 shadow rounded-xl overflow-hidden">
                    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead class="bg-gray-50 dark:bg-gray-900/40">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    {{ t('admin.item_types.code') }}
                                </th>
                                <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    {{ t('admin.item_types.bound_class') }}
                                </th>
                                <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    {{ t('admin.item_types.slug_mode') }}
                                </th>
                                <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    {{ t('admin.item_types.items_count') }}
                                </th>
                                <th class="px-6 py-3" />
                            </tr>
                        </thead>
                        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                            <tr
                                v-for="type in itemTypes"
                                :key="type.id"
                                class="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition"
                            >
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="flex flex-col">
                                        <Link
                                            :href="adminUrl(`system/item-types/${type.id}/edit`)"
                                            class="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:underline"
                                        >
                                            {{ type.code }}
                                        </Link>
                                        <span class="text-xs text-gray-500 dark:text-gray-400">#{{ type.id }}</span>
                                    </div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="text-sm text-gray-700 dark:text-gray-200">
                                        {{ type.className || '—' }}
                                    </span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span
                                        class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                                        :class="type.slugIsMultilingual
                                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200'
                                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'"
                                    >
                                        {{ type.slugIsMultilingual ? t('admin.item_types.slug_localized') : t('admin.item_types.slug_single') }}
                                    </span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ type.itemsCount }}</span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-right text-sm space-x-3">
                                    <button type="button" class="btn-text-danger" @click="deleteType(type)">
                                        {{ t('admin.common.delete') }}
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </SystemLayout>
</template>
