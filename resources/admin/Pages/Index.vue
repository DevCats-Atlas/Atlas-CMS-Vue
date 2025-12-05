<script setup>
import { Head, usePage } from '@inertiajs/vue3';
import { computed } from 'vue';

defineOptions({
    layout: null,
});

const page = usePage();
const laravelVersion = computed(() => page.props.laravelVersion);
</script>

<template>
    <Head title="Welcome" />

    <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
        <div class="flex flex-col items-center justify-center min-h-screen px-4 py-12 sm:px-6 lg:px-8">
            <div class="max-w-4xl w-full">
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                    <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Welcome to Your CMS
                    </h1>
                    <p class="text-lg text-gray-600 dark:text-gray-300 mb-6">
                        Your Laravel + Inertia + Vue 3 + Tailwind CSS application is ready!
                    </p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                        <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                            <h2 class="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                Laravel {{ laravelVersion }}
                            </h2>
                            <p class="text-blue-700 dark:text-blue-300">
                                Powerful PHP framework for web artisans
                            </p>
                        </div>
                        <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                            <h2 class="text-xl font-semibold text-green-900 dark:text-green-100 mb-2">
                                Vue 3
                            </h2>
                            <p class="text-green-700 dark:text-green-300">
                                Progressive JavaScript framework
                            </p>
                        </div>
                        <div class="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                            <h2 class="text-xl font-semibold text-purple-900 dark:text-purple-100 mb-2">
                                Inertia.js
                            </h2>
                            <p class="text-purple-700 dark:text-purple-300">
                                Modern monolith approach
                            </p>
                        </div>
                        <div class="bg-cyan-50 dark:bg-cyan-900/20 p-4 rounded-lg">
                            <h2 class="text-xl font-semibold text-cyan-900 dark:text-cyan-100 mb-2">
                                Tailwind CSS
                            </h2>
                            <p class="text-cyan-700 dark:text-cyan-300">
                                Utility-first CSS framework
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

