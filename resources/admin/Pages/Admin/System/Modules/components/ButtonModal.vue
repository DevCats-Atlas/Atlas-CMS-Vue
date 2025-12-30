<script setup>
import { ref, watch, computed } from 'vue';

const props = defineProps({
    open: {
        type: Boolean,
        default: false,
    },
    button: {
        type: Object,
        default: null,
    },
});

const emit = defineEmits(['close', 'save']);

const formData = ref({
    id: '',
    title: '',
    action: '',
    method: '__invoke',
    enabled: true,
    order_index: 0,
    icon: '',
    variant: 'primary',
    confirm_message: '',
    requires_permission: false,
    permission: '',
});

// Track if we've initialized to prevent unnecessary resets
let isInitialized = false;
let lastButtonId = null;

// Initialize form only when modal opens
watch(() => props.open, (isOpen, wasOpen) => {
    // Only initialize when modal is opening (was closed, now open)
    if (isOpen && !wasOpen) {
        const button = props.button;
        
        if (button) {
            // Edit mode - populate with existing data
            const buttonId = button.id || JSON.stringify(button);
            // Only reset if it's a different button
            if (buttonId !== lastButtonId) {
                formData.value = {
                    id: button.id || generateButtonId(),
                    title: button.title || '',
                    action: button.action || button.route || '', // Support both for migration
                    method: button.method || '__invoke',
                    enabled: button.enabled !== undefined ? button.enabled : true,
                    order_index: button.order_index ?? 0,
                    icon: button.icon || '',
                    variant: button.variant || 'primary',
                    confirm_message: button.confirm_message || '',
                    requires_permission: button.requires_permission || false,
                    permission: button.permission || '',
                };
                lastButtonId = buttonId;
            }
        } else {
            // Create mode - reset to defaults
            formData.value = {
                id: generateButtonId(),
                title: '',
                action: '',
                method: '__invoke',
                enabled: true,
                order_index: 0,
                icon: '',
                variant: 'primary',
                confirm_message: '',
                requires_permission: false,
                permission: '',
            };
            lastButtonId = null;
        }
        isInitialized = true;
    } else if (!isOpen && wasOpen) {
        // Reset flag when modal closes
        isInitialized = false;
        lastButtonId = null;
    }
}, { immediate: true });

const generateButtonId = () => {
    return 'button_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

const isEditMode = computed(() => !!props.button);

// Note: HTTP method is no longer used for Action-based buttons
// Keeping for backward compatibility if route-based buttons are still supported
const methods = [
    { value: 'get', label: 'GET' },
    { value: 'post', label: 'POST' },
    { value: 'put', label: 'PUT' },
    { value: 'patch', label: 'PATCH' },
    { value: 'delete', label: 'DELETE' },
];

const variants = [
    { value: 'primary', label: 'Primary' },
    { value: 'secondary', label: 'Secondary' },
    { value: 'success', label: 'Success' },
    { value: 'danger', label: 'Danger' },
    { value: 'warning', label: 'Warning' },
    { value: 'info', label: 'Info' },
    { value: 'outline', label: 'Outline' },
];

const validateForm = () => {
    if (!formData.value.title || !formData.value.title.trim()) {
        return { valid: false, error: 'Title is required' };
    }
    if (!formData.value.action || !formData.value.action.trim()) {
        return { valid: false, error: 'Action class is required' };
    }
    return { valid: true };
};

const handleSave = () => {
    const validation = validateForm();
    if (!validation.valid) {
        alert(validation.error);
        return;
    }
    
    emit('save', { ...formData.value });
};

const handleClose = () => {
    emit('close');
};
</script>

<template>
    <div
        v-if="open"
        class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4"
        @click.self="handleClose"
    >
        <div class="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-800 shadow-xl flex flex-col max-h-[90vh] overflow-hidden" @click.stop>
            <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    {{ isEditMode ? 'Edit Button' : 'Add Button' }}
                </h3>
                <button
                    type="button"
                    @click="handleClose"
                    class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    ✕
                </button>
            </div>

            <div class="overflow-y-auto p-6">
                <form @submit.prevent="handleSave" class="space-y-4">
                        <!-- Title -->
                        <div>
                            <label class="form-label">Title <span class="text-red-500">*</span></label>
                            <input
                                v-model="formData.title"
                                type="text"
                                class="form-input"
                                placeholder="Approve Record"
                                required
                            />
                        </div>

                        <!-- Action Class -->
                        <div>
                            <label class="form-label">Action Class <span class="text-red-500">*</span></label>
                            <input
                                v-model="formData.action"
                                type="text"
                                class="form-input"
                                placeholder="App\Actions\Admin\Venues\ApproveVenueAction"
                                required
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Fully qualified class name of the Action class (e.g., App\Actions\Admin\Venues\ApproveVenueAction)
                            </p>
                        </div>

                        <!-- Method -->
                        <div>
                            <label class="form-label">Method Name</label>
                            <input
                                v-model="formData.method"
                                type="text"
                                class="form-input"
                                placeholder="__invoke"
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Method name to call on the Action class (default: __invoke for single-action classes)
                            </p>
                        </div>

                        <!-- Variant -->
                        <div>
                            <label class="form-label">Button Variant</label>
                            <select v-model="formData.variant" class="form-select">
                                <option v-for="variant in variants" :key="variant.value" :value="variant.value">
                                    {{ variant.label }}
                                </option>
                            </select>
                        </div>

                        <!-- Icon -->
                        <div>
                            <label class="form-label">Icon (optional)</label>
                            <input
                                v-model="formData.icon"
                                type="text"
                                class="form-input"
                                placeholder="check-circle"
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Icon name (e.g., check-circle, trash, edit)
                            </p>
                        </div>

                        <!-- Confirm Message -->
                        <div>
                            <label class="form-label">Confirmation Message (optional)</label>
                            <textarea
                                v-model="formData.confirm_message"
                                class="form-textarea"
                                rows="2"
                                placeholder="Are you sure you want to perform this action?"
                            ></textarea>
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                If provided, a confirmation dialog will be shown before executing the action
                            </p>
                        </div>

                        <!-- Permission -->
                        <div class="space-y-2">
                            <label class="inline-flex items-center">
                                <input
                                    v-model="formData.requires_permission"
                                    type="checkbox"
                                    class="form-checkbox"
                                />
                                <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Requires Permission</span>
                            </label>
                            
                            <div v-if="formData.requires_permission">
                                <label class="form-label">Permission Name</label>
                                <input
                                    v-model="formData.permission"
                                    type="text"
                                    class="form-input"
                                    placeholder="orders.approve"
                                />
                                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Permission name to check (e.g., orders.approve)
                                </p>
                            </div>
                        </div>

                        <!-- Enabled -->
                        <div>
                            <label class="inline-flex items-center">
                                <input
                                    v-model="formData.enabled"
                                    type="checkbox"
                                    class="form-checkbox"
                                />
                                <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Enabled</span>
                            </label>
                        </div>

                        <!-- Actions -->
                        <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                type="button"
                                @click="handleClose"
                                class="btn btn-outline"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                class="btn btn-primary"
                            >
                                {{ isEditMode ? 'Save Changes' : 'Create Button' }}
                            </button>
                        </div>
                </form>
            </div>
        </div>
    </div>
</template>

