import { reactive } from 'vue';

// Texts left null are filled with translated defaults by ConfirmDialog.vue

const state = reactive({
    isOpen: false,
    title: null,
    message: null,
    confirmLabel: null,
    cancelLabel: null,
    intent: 'primary',
});

let resolver = null;

const reset = () => {
    state.isOpen = false;
    state.title = null;
    state.message = null;
    state.confirmLabel = null;
    state.cancelLabel = null;
    state.intent = 'primary';
    resolver = null;
};

export function confirmDialog(options = {}) {
    if (resolver) {
        resolver(false);
        reset();
    }

    return new Promise((resolve) => {
        state.title = options.title ?? null;
        state.message = options.message ?? null;
        state.confirmLabel = options.confirmLabel ?? null;
        state.cancelLabel = options.cancelLabel ?? null;
        state.intent = options.intent ?? 'primary';
        state.isOpen = true;
        resolver = resolve;
    });
}

export function confirmDialogAccept() {
    if (!resolver) {
        return;
    }

    const resolve = resolver;
    reset();
    resolve(true);
}

export function confirmDialogCancel() {
    if (!resolver) {
        return;
    }

    const resolve = resolver;
    reset();
    resolve(false);
}

export function useConfirmDialogState() {
    return state;
}
