<script setup>
import { Head, Link } from '@inertiajs/vue3';
import SystemLayout from '@admin/Layouts/SystemLayout.vue';
import { adminUrl } from '@/utils/adminUrl';
import { useTranslation } from '@/utils/useTranslation.js';

const { t } = useTranslation();

/** System overview (AtlasCMS OverviewController): counts with links and the runtime environment. */
defineProps({
    title: { type: String, default: '' },
    // [{ key, label, value, path }]
    stats: { type: Array, default: () => [] },
    // [{ key, label, value }]
    environment: { type: Array, default: () => [] },
});
</script>

<template>
    <SystemLayout>
        <Head :title="title || t('admin.system_overview.title')" />

        <div class="py-6">
            <div class="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                <div class="bg-white dark:bg-gray-800 shadow rounded-xl p-6">
                    <h1 class="heading-1">{{ t('admin.layout.system_overview') }}</h1>
                    <p class="text-gray-500 dark:text-gray-400 mt-2">
                        {{ t('admin.layout.system_overview_hint') }}
                    </p>
                </div>

                <section class="bg-white dark:bg-gray-800 shadow rounded-xl p-6">
                    <h2 class="heading-4 mb-4">{{ t('admin.system_overview.contents') }}</h2>
                    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Link
                            v-for="stat in stats"
                            :key="stat.key"
                            :href="adminUrl(stat.path)"
                            class="block rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
                        >
                            <div class="text-sm text-gray-500 dark:text-gray-400">{{ stat.label }}</div>
                            <div class="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{{ stat.value }}</div>
                        </Link>
                    </div>
                </section>

                <section class="bg-white dark:bg-gray-800 shadow rounded-xl p-6">
                    <h2 class="heading-4 mb-4">{{ t('admin.system_overview.environment') }}</h2>
                    <dl class="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div v-for="fact in environment" :key="fact.key" class="flex justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                            <dt class="text-sm text-gray-500 dark:text-gray-400">{{ fact.label }}</dt>
                            <dd class="text-sm font-mono text-gray-900 dark:text-white" translate="no">{{ fact.value }}</dd>
                        </div>
                    </dl>
                </section>
            </div>
        </div>
    </SystemLayout>
</template>
