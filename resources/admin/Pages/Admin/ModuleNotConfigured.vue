<script setup>
import { adminUrl } from '@/utils/adminUrl';
import { Head, Link } from '@inertiajs/vue3';
import AdminLayout from '@admin/Layouts/AdminLayout.vue';
import { useTranslation } from '@/utils/useTranslation.js';

/** A module whose settings are incomplete (AtlasCMS ModuleNotConfigured): the reason and where to fix it. */
defineProps({
    title: { type: String, default: '' },
    module: { type: Object, required: true },
    reason: { type: String, required: true },
    message: { type: String, required: true },
    // Superadmins can open the module settings
    canConfigure: { type: Boolean, default: false },
});

const { t } = useTranslation();
</script>

<template>
    <AdminLayout>
        <Head :title="title || t('admin.module_errors.title')" />

        <div class="py-6">
            <div class="mx-auto max-w-4xl sm:px-6 lg:px-8">
                <div class="bg-white dark:bg-gray-800 shadow rounded-xl p-8 text-center">
                    <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/40 mb-4">
                        <svg class="h-8 w-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>

                    <h1 class="heading-1 font-bold mb-2">{{ t('admin.module_errors.title') }}</h1>

                    <p class="text-gray-600 dark:text-gray-400 mb-2">{{ message }}</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        {{ t('admin.module_errors.module_label') }}
                        <span class="font-mono font-semibold" translate="no">{{ module.title }}</span>
                    </p>
                    <p v-if="!canConfigure" class="text-sm text-gray-600 dark:text-gray-400 mb-6">{{ t('admin.module_errors.ask_admin') }}</p>

                    <div class="flex flex-wrap items-center justify-center gap-4">
                        <Link v-if="canConfigure" :href="adminUrl(`system/modules/${module.id}`)" class="btn btn-primary">
                            {{ t('admin.module_errors.open_settings') }}
                        </Link>
                        <Link :href="adminUrl('')" :class="canConfigure ? 'btn btn-outline' : 'btn btn-primary'">
                            {{ t('admin.module_errors.go_to_dashboard') }}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    </AdminLayout>
</template>
