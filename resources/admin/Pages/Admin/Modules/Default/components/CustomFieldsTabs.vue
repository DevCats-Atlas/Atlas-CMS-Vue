<script setup>
import { computed, ref, watch } from 'vue';
import CustomFieldsTab from './CustomFieldsTab.vue';
import DefaultFieldsTab from './DefaultFieldsTab.vue';

const props = defineProps({
    fields: {
        type: Array,
        default: () => [],
    },
    form: {
        type: Object,
        required: true,
    },
    customTabs: {
        type: Array,
        default: () => [],
    },
    initialValues: {
        type: Object,
        default: () => ({}),
    },
    systemFields: {
        type: Array,
        default: () => [],
    },
    parentItemId: {
        type: Number,
        default: null,
    },
});

const activeTabId = ref('default');

const tabItems = computed(() => {
    const base = [{ id: 'default', title: 'Default', kind: 'default', payload: null }];

    const custom = (props.customTabs || []).map((tab) => ({
        id: tab.id,
        title: tab.title,
        kind: 'custom',
        payload: tab,
    }));

    return [...base, ...custom];
});

watch(
    tabItems,
    (items) => {
        if (!items.length) {
            activeTabId.value = null;
            return;
        }

        if (!items.some((tab) => tab.id === activeTabId.value)) {
            activeTabId.value = items[0]?.id ?? null;
        }
    },
    { immediate: true }
);

const activeTab = computed(() => tabItems.value.find((tab) => tab.id === activeTabId.value) || null);

const selectTab = (tabId) => {
    activeTabId.value = tabId;
};
</script>

<template>
    <div class="relative">
        <!-- Sticky tabs at the top -->
        <div class="sticky top-0 z-20 bg-white dark:bg-gray-800 pt-2 pb-3 mb-6 border-divider">
            <div class="flex flex-wrap gap-2">
                <button
                    v-for="tab in tabItems"
                    :key="tab.id"
                    type="button"
                    class="px-3 py-1.5 text-sm font-medium rounded-md transition"
                    :class="tab.id === activeTabId
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
                    @click="selectTab(tab.id)"
                >
                    {{ tab.title }}
                </button>
            </div>
        </div>

        <!-- Tab content with padding for bottom toolbar -->
        <div v-if="activeTab" class="pb-24">
            <DefaultFieldsTab
                v-if="activeTab.kind === 'default'"
                :fields="fields"
                :form="form"
                :initial-values="initialValues"
                :custom-field-tabs="customTabs"
                :system-fields="systemFields"
            />
            <CustomFieldsTab v-else-if="activeTab.kind === 'custom'" :tab="activeTab.payload" :form="form" :parent-item-id="parentItemId" />
        </div>
    </div>
</template>
