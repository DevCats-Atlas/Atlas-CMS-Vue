<script setup>
import { Head, Link } from '@inertiajs/vue3';
import AdminLayout from '@admin/Layouts/AdminLayout.vue';
import { useTranslation } from '@/utils/useTranslation.js';

const { t } = useTranslation();

const props = defineProps({
    title: {
        type: String,
        default: 'Access Denied',
    },
    module: {
        type: String,
        default: null,
    },
});
</script>

<template>
    <AdminLayout>
        <Head :title="title" />
        
        <div class="py-6">
            <div class="mx-auto max-w-4xl sm:px-6 lg:px-8">
                <div class="bg-white dark:bg-gray-800 shadow rounded-xl p-8 text-center">
                    <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/40 mb-4">
                        <svg class="h-8 w-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    
                    <h1 class="heading-1 font-bold mb-2">
                        {{ t('admin.access_denied.title') }}
                    </h1>
                    
                    <p class="text-gray-600 dark:text-gray-400 mb-6">
                        {{ t('admin.access_denied.message') }}
                        <span v-if="module" class="block mt-2 text-sm">
                            {{ t('admin.access_denied.module_label') }} <span class="font-mono font-semibold">{{ module }}</span>
                        </span>
                    </p>
                    
                    <div class="flex items-center justify-center gap-4">
                        <Link href="/admin" class="btn btn-primary">
                            {{ t('admin.access_denied.go_to_dashboard') }}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    </AdminLayout>
</template>

