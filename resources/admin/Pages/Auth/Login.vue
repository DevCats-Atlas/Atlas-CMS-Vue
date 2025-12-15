<script setup>
import { Head, useForm } from '@inertiajs/vue3';
import { useTranslation } from '@admin/js/utils/useTranslation';
import { onMounted, onUnmounted, ref } from 'vue';

const { t } = useTranslation();

const props = defineProps({
    title: {
        type: String,
        default: 'Sign in',
    },
    recaptcha: {
        type: Object,
        default: () => ({
            enabled: false,
            siteKey: '',
        }),
    },
});

const form = useForm({
    email: '',
    password: '',
    remember: false,
    recaptcha_token: '',
});

const recaptchaLoaded = ref(false);
let recaptchaWidgetId = null;

// Load reCAPTCHA v3 script
onMounted(() => {
    if (props.recaptcha?.enabled && props.recaptcha?.siteKey) {
        const script = document.createElement('script');
        script.src = `https://www.google.com/recaptcha/api.js?render=${props.recaptcha.siteKey}`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            recaptchaLoaded.value = true;
        };
        document.head.appendChild(script);
    }
});

// Cleanup script on unmount
onUnmounted(() => {
    if (recaptchaWidgetId !== null && window.grecaptcha) {
        window.grecaptcha.reset(recaptchaWidgetId);
    }
});

const submit = async () => {
    // Execute reCAPTCHA if enabled
    if (props.recaptcha?.enabled && props.recaptcha?.siteKey && window.grecaptcha) {
        try {
            const token = await window.grecaptcha.execute(props.recaptcha.siteKey, {
                action: 'login',
            });
            form.recaptcha_token = token;
        } catch (error) {
            console.error('reCAPTCHA error:', error);
            // Continue with form submission even if reCAPTCHA fails
            // Backend will handle validation
        }
    }

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
                {{ t('admin.auth.welcome_back') }}
            </h2>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {{ t('admin.auth.sign_in_description') }}
            </p>
        </div>

        <div class="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
            <div class="bg-white dark:bg-gray-800 py-8 px-6 shadow sm:rounded-lg sm:px-10">
                <form class="space-y-6" @submit.prevent="submit">
                    <div>
                        <label for="email" class="form-label">
                            {{ t('admin.auth.email') }}
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
                            {{ t('admin.auth.password') }}
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
                            <span class="ml-2">{{ t('admin.auth.remember_me') }}</span>
                        </label>
                    </div>

                    <div>
                        <p v-if="form.errors.recaptcha" class="mb-4 text-sm text-red-600 dark:text-red-400">
                            {{ form.errors.recaptcha }}
                        </p>
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
                            {{ t('admin.auth.sign_in') }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>
