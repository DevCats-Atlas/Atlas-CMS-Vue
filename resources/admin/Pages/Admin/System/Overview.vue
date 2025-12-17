<script setup>
import { Head } from '@inertiajs/vue3';
import SystemLayout from '@admin/Layouts/SystemLayout.vue';

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
                    <h1 class="heading-1">System Overview</h1>
                    <p class="text-gray-500 dark:text-gray-400 mt-2">
                        Monitor the health of background services, queues, and infrastructure integrations.
                    </p>
                </div>

              
            </div>
        </div>
    </SystemLayout>
</template>
