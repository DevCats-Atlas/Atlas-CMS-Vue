<script setup>
import { Head, useForm } from '@inertiajs/vue3';

defineProps({
    title: {
        type: String,
        default: 'Sign in',
    },
});

const form = useForm({
    email: '',
    password: '',
    remember: false,
});

const submit = () => {
    form.post('/admin/login', {
        onFinish: () => form.reset('password'),
    });
};
</script>

<template>
    <div class="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
        <Head :title="title" />

        <div class="sm:mx-auto sm:w-full sm:max-w-md text-center">
            <h2 class="mt-6 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                Welcome back
            </h2>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Sign in to manage your sites and content.
            </p>
        </div>

        <div class="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
            <div class="bg-white dark:bg-gray-800 py-8 px-6 shadow sm:rounded-lg sm:px-10">
                <form class="space-y-6" @submit.prevent="submit">
                    <div>
                        <label for="email" class="form-label">
                            Email
                        </label>
                        <input
                            id="email"
                            v-model="form.email"
                            name="email"
                            type="email"
                            autocomplete="email"
                            required
                            class="form-input"
                        />
                        <p v-if="form.errors.email" class="mt-1 text-sm text-red-600">
                            {{ form.errors.email }}
                        </p>
                    </div>

                    <div>
                        <label for="password" class="form-label">
                            Password
                        </label>
                        <input
                            id="password"
                            v-model="form.password"
                            name="password"
                            type="password"
                            autocomplete="current-password"
                            required
                            class="form-input"
                        />
                        <p v-if="form.errors.password" class="mt-1 text-sm text-red-600">
                            {{ form.errors.password }}
                        </p>
                    </div>

                    <div class="flex items-center justify-between">
                        <label class="flex items-center text-sm text-gray-700 dark:text-gray-300">
                            <input
                                v-model="form.remember"
                                type="checkbox"
                                class="form-checkbox"
                            />
                            <span class="ml-2">Remember me</span>
                        </label>
                    </div>

                    <div>
                        <button type="submit" class="btn btn-primary w-full" :disabled="form.processing">
                            <svg
                                v-if="form.processing"
                                class="mr-2 h-5 w-5 animate-spin text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    class="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    stroke-width="4"
                                />
                                <path
                                    class="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                />
                            </svg>
                            Sign in
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>
