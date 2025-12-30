<script setup>
import { ref, computed } from 'vue';
import { router } from '@inertiajs/vue3';
import { confirmDialog } from '@/utils/confirmDialog.js';

const props = defineProps({
    buttons: {
        type: Array,
        default: () => [],
    },
    moduleHandle: {
        type: String,
        required: true,
    },
    recordId: {
        type: [Number, String],
        required: true,
    },
    dataSource: {
        type: String,
        default: 'items',
    },
});

const loadingButtons = ref(new Set());

const handleButtonClick = async (button) => {
    // Show confirmation if required
    if (button.confirm_message) {
        const confirmed = await confirmDialog({
            title: button.title || 'Confirm Action',
            message: button.confirm_message,
            confirmLabel: 'Continue',
            intent: button.variant === 'danger' ? 'danger' : 'primary',
        });

        if (!confirmed) {
            return;
        }
    }

    // Execute button action
    await executeButtonAction(button);
};

const executeButtonAction = async (button) => {
    const buttonId = button.id;
    if (!buttonId) {
        console.error('Button ID is required');
        return;
    }

    loadingButtons.value.add(buttonId);

    try {
        const method = (button.method || 'post').toLowerCase();
        // Use route helper to generate URL, or construct it manually
        const url = `/admin/${props.moduleHandle}/button/${buttonId}`;
        
        const payload = {
            [props.dataSource === 'items' ? 'item' : 'id']: props.recordId,
        };

        // Use router based on method
        if (method === 'get') {
            router.get(url, payload, {
                preserveScroll: true,
                onError: (errors) => {
                    console.error('Button action failed:', errors);
                },
            });
        } else if (method === 'post') {
            router.post(url, payload, {
                preserveScroll: true,
                onError: (errors) => {
                    console.error('Button action failed:', errors);
                },
            });
        } else if (method === 'put') {
            router.put(url, payload, {
                preserveScroll: true,
                onError: (errors) => {
                    console.error('Button action failed:', errors);
                },
            });
        } else if (method === 'patch') {
            router.patch(url, payload, {
                preserveScroll: true,
                onError: (errors) => {
                    console.error('Button action failed:', errors);
                },
            });
        } else if (method === 'delete') {
            router.delete(url, {
                data: payload,
                preserveScroll: true,
                onError: (errors) => {
                    console.error('Button action failed:', errors);
                },
            });
        }
    } catch (error) {
        console.error('Error executing button action:', error);
    } finally {
        // Remove loading state after a short delay to show feedback
        setTimeout(() => {
            loadingButtons.value.delete(buttonId);
        }, 500);
    }
};

const getButtonClasses = (button) => {
    const baseClasses = 'btn';
    const variant = button.variant || 'primary';
    const variantClasses = {
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        success: 'btn-success',
        danger: 'btn-danger',
        warning: 'btn-warning',
        info: 'btn-info',
        outline: 'btn-outline',
    };
    
    return `${baseClasses} ${variantClasses[variant] || variantClasses.primary}`;
};

const isLoading = (button) => {
    return loadingButtons.value.has(button.id);
};

const hasIcon = (iconName) => {
    const supportedIcons = ['check-circle', 'trash', 'edit', 'x', 'plus'];
    return supportedIcons.includes(iconName);
};
</script>

<template>
    <div v-if="buttons && buttons.length > 0" class="flex items-center gap-2 flex-wrap">
        <button
            v-for="button in buttons"
            :key="button.id"
            :class="getButtonClasses(button)"
            :disabled="isLoading(button)"
            @click="handleButtonClick(button)"
            class="relative"
        >
            <span v-if="isLoading(button)" class="inline-flex items-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
            </span>
            <span v-else class="inline-flex items-center">
                <svg
                    v-if="button.icon && hasIcon(button.icon)"
                    class="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        v-if="button.icon === 'check-circle'"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                    <path
                        v-else-if="button.icon === 'trash'"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                    <path
                        v-else-if="button.icon === 'edit'"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                    <path
                        v-else-if="button.icon === 'x'"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                    />
                    <path
                        v-else-if="button.icon === 'plus'"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 4v16m8-8H4"
                    />
                </svg>
                {{ button.title }}
            </span>
        </button>
    </div>
</template>

