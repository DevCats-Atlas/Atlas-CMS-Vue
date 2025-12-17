<script setup>
import { computed, onMounted, onUnmounted } from 'vue';
import { confirmDialogAccept, confirmDialogCancel, useConfirmDialogState } from '@/utils/confirmDialog.js';

const state = useConfirmDialogState();

const confirmClass = computed(() =>
    state.intent === 'danger'
        ? 'bg-red-600 hover:bg-red-500 focus:ring-red-500'
        : 'bg-indigo-600 hover:bg-indigo-500 focus:ring-indigo-500',
);

const handleKeydown = (event) => {
    if (!state.isOpen) {
        return;
    }

    if (event.key === 'Escape') {
        event.preventDefault();
        confirmDialogCancel();
    }
};

onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
    <transition name="fade">
        <div
            v-if="state.isOpen"
            class="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 px-4"
            @click.self="confirmDialogCancel"
        >
            <div class="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-xl">
                <div class="p-6 space-y-4">
                    <div class="space-y-1">
                        <h2 class="heading-2">
                            {{ state.title }}
                        </h2>
                        <p class="text-sm text-gray-600 dark:text-gray-300" v-if="state.message">
                            {{ state.message }}
                        </p>
                    </div>

                    <div class="flex items-center justify-end gap-3">
                        <button
                            type="button"
                            class="inline-flex items-center rounded-md border border-transparent bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                            @click="confirmDialogCancel"
                        >
                            {{ state.cancelLabel }}
                        </button>
                        <button
                            type="button"
                            class="inline-flex items-center rounded-md border border-transparent px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2"
                            :class="confirmClass"
                            @click="confirmDialogAccept"
                        >
                            {{ state.confirmLabel }}
                        </button>
                    </div>
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
