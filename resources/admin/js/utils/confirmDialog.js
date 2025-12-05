import { reactive } from 'vue';

const state = reactive({
    isOpen: false,
    title: 'Confirm action',
    message: 'Are you sure you want to continue?',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    intent: 'primary',
});

let resolver = null;

const reset = () => {
    state.isOpen = false;
    state.title = 'Confirm action';
    state.message = 'Are you sure you want to continue?';
    state.confirmLabel = 'Confirm';
    state.cancelLabel = 'Cancel';
    state.intent = 'primary';
    resolver = null;
};

export function confirmDialog(options = {}) {
    if (resolver) {
        resolver(false);
        reset();
    }

    return new Promise((resolve) => {
        state.title = options.title ?? 'Confirm action';
        state.message = options.message ?? 'Are you sure you want to continue?';
        state.confirmLabel = options.confirmLabel ?? 'Confirm';
        state.cancelLabel = options.cancelLabel ?? 'Cancel';
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
