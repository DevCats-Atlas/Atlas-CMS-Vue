<script setup>
import { Head, Link, router } from '@inertiajs/vue3';
import SystemLayout from '@admin/Layouts/SystemLayout.vue';
import { confirmDialog } from '@/utils/confirmDialog.js';

const props = defineProps({
    title: {
        type: String,
        default: 'Item Types',
    },
    itemTypes: {
        type: Array,
        default: () => [],
    },
});

const deleteType = async (type) => {
    const confirmed = await confirmDialog({
        title: 'Delete item type',
        message: `Deleting "${type.code}" will remove its configuration and cannot be undone.`,
        confirmLabel: 'Delete',
        intent: 'danger',
    });

    if (!confirmed) {
        return;
    }

    router.delete(`/admin/system/item-types/${type.id}`);
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
                            <h1 class="heading-1">Item types</h1>
                            <p class="text-gray-500 dark:text-gray-400 mt-2">
                                View the polymorphic content types that power collections, languages, and CMS entities.
                            </p>
                        </div>
                        <Link href="/admin/system/item-types/create" class="btn btn-outline">
                            Add type
                        </Link>
                    </div>
                </div>

                <div class="bg-white dark:bg-gray-800 shadow rounded-xl overflow-hidden">
                    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead class="bg-gray-50 dark:bg-gray-900/40">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Code
                                </th>
                                <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Bound class
                                </th>
                                <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Slug mode
                                </th>
                                <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Items
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
                                            :href="`/admin/system/item-types/${type.id}/edit`"
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
                                        {{ type.slugIsMultilingual ? 'Localized' : 'Single' }}
                                    </span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ type.itemsCount }}</span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-right text-sm space-x-3">
                                    <button type="button" class="btn-text-danger" @click="deleteType(type)">
                                        Delete
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
