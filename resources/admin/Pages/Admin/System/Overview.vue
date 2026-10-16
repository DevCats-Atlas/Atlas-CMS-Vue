<script setup>
import { Head } from '@inertiajs/vue3';
import SystemLayout from '@admin/Layouts/SystemLayout.vue';
import { useTranslation } from '@/utils/useTranslation.js';

const { t } = useTranslation();

defineProps({
    title: {
        type: String,
        default: 'System Overview',
    },
    stats: {
        type: Array,
        default: () => [],
    },
    healthChecks: {
        type: Array,
        default: () => [],
    },
    recentActivity: {
        type: Array,
        default: () => [],
    },
});
</script>

<template>
    <SystemLayout>
        <Head :title="title" />

        <div class="py-6">
            <div class="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                <div class="bg-white dark:bg-gray-800 shadow rounded-xl p-6">
                    <h1 class="heading-1">{{ t('admin.layout.system_overview') }}</h1>
                    <p class="text-gray-500 dark:text-gray-400 mt-2">
                        {{ t('admin.layout.system_overview_hint') }}
                    </p>
                </div>

              
            </div>
        </div>
    </SystemLayout>
</template>
