<script setup>
const props = defineProps({
    open: {
        type: Boolean,
        default: false,
    },
    title: {
        type: String,
        default: '',
    },
    size: {
        type: String,
        default: 'md',
        validator: (value) => ['sm', 'md', 'lg', 'xl', 'full'].includes(value),
    },
});

const emit = defineEmits(['close']);

const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-full mx-4',
};

const close = () => emit('close');
</script>

<template>
    <transition name="fade">
        <div
            v-if="open"
            class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4"
            @click.self="close"
        >
            <div :class="['w-full rounded-2xl bg-white dark:bg-gray-800 shadow-xl flex flex-col max-h-[90vh]', sizeClasses[size]]">
                <div class="modal-header">
                    <h3 class="section-heading">{{ title }}</h3>
                    <button
                        type="button"
                        class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        @click="close"
                    >
                        ✕
                    </button>
                </div>
                <div class="modal-body">
                    <slot />
                </div>
            </div>
        </div>
    </transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.15s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
