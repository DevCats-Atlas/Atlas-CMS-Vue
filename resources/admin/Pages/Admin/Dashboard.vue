<script setup>
import { Head } from '@inertiajs/vue3';
import AdminLayout from '@admin/Layouts/AdminLayout.vue';

defineProps({
    title: {
        type: String,
        default: 'Dashboard',
    },
});
</script>

<template>
    <AdminLayout>
        <Head :title="title" />

        <div class="py-6">
            <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
                <div class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                    <div class="p-6 text-gray-900 dark:text-gray-100">
                        <h1 class="text-3xl font-bold mb-4">Admin Dashboard</h1>
                        <p class="text-lg mb-6">Welcome to the Atlas CMS Admin Panel</p>
                        
                        
                    </div>
                </div>
            </div>
        </div>
    </AdminLayout>
</template>

