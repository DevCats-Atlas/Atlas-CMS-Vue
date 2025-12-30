<script setup>
import { ref, computed } from 'vue';
import axios from 'axios';
import { confirmDialog } from '@/utils/confirmDialog.js';
import { useToast } from '@/composables/useToast.js';

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
const { showToast } = useToast();

const handleButtonClick = async (button) => {
    console.log('Button clicked:', button);
    
    // Show confirmation if required
    if (button.confirm_message) {
        const confirmed = await confirmDialog({
            title: button.title || 'Confirm Action',
            message: button.confirm_message,
            confirmLabel: 'Continue',
            intent: button.variant === 'danger' ? 'danger' : 'primary',
        });

        if (!confirmed) {
            console.log('Action cancelled by user');
            return;
        }
    }

    // Execute button action
    await executeButtonAction(button);
};

const executeButtonAction = async (button) => {
    const buttonId = button.id;
    if (!buttonId) {
        console.error('Button ID is required', button);
        return;
    }

    console.log('Executing button action:', {
        buttonId,
        moduleHandle: props.moduleHandle,
        recordId: props.recordId,
        dataSource: props.dataSource,
        button,
    });

    loadingButtons.value.add(buttonId);

    try {
        // For Action-based buttons, always use POST (Action method name is handled on backend)
        // For backward compatibility with route-based buttons, check if method is a valid HTTP method
        const method = (button.method || 'post').toLowerCase();
        const isHttpMethod = ['get', 'post', 'put', 'patch', 'delete'].includes(method);
        const httpMethod = isHttpMethod ? method : 'post'; // Default to POST for Action methods like '__invoke'
        
        const url = `/admin/${props.moduleHandle}/button/${buttonId}`;
        
        const payload = {
            [props.dataSource === 'items' ? 'item' : 'id']: props.recordId,
        };

        // Use axios to make the request and handle JSON responses
        let response;
        const config = {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
            },
        };

        if (httpMethod === 'get') {
            response = await axios.get(url, { ...config, params: payload });
        } else if (httpMethod === 'post') {
            response = await axios.post(url, payload, config);
        } else if (httpMethod === 'put') {
            response = await axios.put(url, payload, config);
        } else if (httpMethod === 'patch') {
            response = await axios.patch(url, payload, config);
        } else if (httpMethod === 'delete') {
            response = await axios.delete(url, { ...config, data: payload });
        }

        // Handle response - check if it's JSON or redirect
        if (response && response.data) {
            // JSON response - axios automatically parses JSON, so response.data is the parsed object
            const data = response.data;
            
            // Check for success (explicitly check for true, or if success is not false)
            const isSuccess = data.success === true || (data.success !== false && !data.error);
            
            if (isSuccess) {
                // Success response - use the message from the controller
                // The message should be directly in data.message from the JSON response
                const message = data.message || 'Action completed successfully';
                
                showToast({
                    title: 'Success',
                    message: message,
                    intent: 'success',
                    duration: 4000,
                });
            } else {
                // Error in JSON response
                const errorMessage = data.message || data.error || 'Action failed';
                showToast({
                    title: 'Error',
                    message: errorMessage,
                    intent: 'danger',
                    duration: 6000,
                });
            }
        }
    } catch (error) {
        console.error('Error executing button action:', error);
        
        // Extract error message
        let errorMessage = 'An error occurred while executing the action';
        
        if (error.response) {
            // Server responded with error
            const data = error.response.data;
            if (data?.message) {
                errorMessage = data.message;
            } else if (data?.error) {
                errorMessage = data.error;
            } else if (typeof data === 'string') {
                errorMessage = data;
            } else {
                errorMessage = error.response.statusText || `Server error (${error.response.status})`;
            }
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showToast({
            title: 'Error',
            message: errorMessage,
            intent: 'danger',
            duration: 6000,
        });
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

