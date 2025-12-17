<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { usePage } from '@inertiajs/vue3';
import { useToast } from '@/composables/useToast.js';

const props = defineProps({
    field: {
        type: Object,
        required: true,
    },
    model: {
        type: Object,
        default: () => ({}),
    },
});

const page = usePage();
const { showToast } = useToast();
const categoriesData = ref([]);
const selectedAttributes = ref([]);
const loading = ref(false);
const isMounted = ref(false);
const activeTab = ref(null);
const toggling = ref({}); // Track which attribute is being toggled

// Get current item ID - try from page props first (for users module), then fall back to URL query parameter
const currentItemId = computed(() => {
    // First, try to get item ID from page props (works for users module)
    const pageProps = page.props;
    if (pageProps?.item?.id) {
        return parseInt(pageProps.item.id, 10);
    }
    
    // Fall back to URL query parameter (for regular modules)
    const url = new URL(window.location.href);
    const itemParam = url.searchParams.get('item');
    return itemParam ? parseInt(itemParam, 10) : null;
});

// Get module handle from URL path (e.g., /admin/content/edit -> content)
const moduleHandle = computed(() => {
    const path = page.url;
    const match = path.match(/\/admin\/([^/]+)/);
    return match ? match[1] : '';
});

const baseUrl = computed(() => {
    if (!moduleHandle.value) {
        return '';
    }
    return `/admin/${moduleHandle.value}`;
});

const fetchProductAttributes = async () => {
    if (!isMounted.value || !currentItemId.value || !props.field.id) {
        return;
    }

    loading.value = true;
    try {
        const response = await fetch(
            `${baseUrl.value}/product-attributes?item_id=${currentItemId.value}&field_id=${props.field.id}`,
            {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
            }
        );

        if (!response.ok || !isMounted.value) {
            throw new Error('Failed to fetch product attributes');
        }

        const data = await response.json();
        if (isMounted.value) {
            categoriesData.value = data.categories || [];
            selectedAttributes.value = data.selectedAttributes || [];
            
            // Set active tab to first category if available
            if (categoriesData.value.length > 0 && !activeTab.value) {
                activeTab.value = categoriesData.value[0].id;
            }
        }
    } catch (error) {
        if (isMounted.value) {
            console.error('Error fetching product attributes:', error);
            categoriesData.value = [];
            selectedAttributes.value = [];
        }
    } finally {
        if (isMounted.value) {
            loading.value = false;
        }
    }
};

// Check if an attribute is selected
const isAttributeSelected = (attributeId) => {
    return selectedAttributes.value.includes(attributeId);
};

// Toggle attribute selection
const toggleAttribute = async (attributeId) => {
    if (!currentItemId.value || !props.field.id) {
        return;
    }

    const newSelected = !isAttributeSelected(attributeId);

    // Track toggling state
    toggling.value[attributeId] = true;

    try {
        const response = await fetch(`${baseUrl.value}/product-attributes/toggle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                Accept: 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                item_id: currentItemId.value,
                attribute_id: attributeId,
                field_id: props.field.id,
                selected: newSelected,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to toggle attribute' }));
            throw new Error(errorData.error || 'Failed to toggle attribute');
        }

        const data = await response.json();
        
        // Update local state
        if (newSelected) {
            if (!selectedAttributes.value.includes(attributeId)) {
                selectedAttributes.value.push(attributeId);
            }
        } else {
            selectedAttributes.value = selectedAttributes.value.filter(id => id !== attributeId);
        }

        // Show success toast
        showToast({
            title: 'Success',
            message: `Attribute ${newSelected ? 'selected' : 'deselected'}`,
            intent: 'success',
        });
    } catch (error) {
        console.error('Error toggling attribute:', error);
        showToast({
            title: 'Error',
            message: error.message || 'Failed to toggle attribute',
            intent: 'danger',
        });
    } finally {
        toggling.value[attributeId] = false;
    }
};

onMounted(() => {
    isMounted.value = true;
    fetchProductAttributes();
});

onBeforeUnmount(() => {
    isMounted.value = false;
});
</script>

<template>
    <div class="space-y-4">
        <div>
            <label v-if="!(field.config?.hide_title === true)" class="form-label block mb-1">
                {{ field.title }}
            </label>
        </div>

        <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            Loading product attributes...
        </div>

        <div v-else-if="!currentItemId" class="text-sm text-gray-500 dark:text-gray-400 py-4">
            Item must be saved before managing product attributes.
        </div>

        <div v-else-if="categoriesData.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-4">
            No categories with attributes available. Please assign categories to this product first.
        </div>

        <div v-else class="space-y-4">
            <!-- Category Tabs -->
            <div class="border-divider">
                <nav class="-mb-px flex space-x-4">
                    <button
                        v-for="category in categoriesData"
                        :key="category.id"
                        type="button"
                        class="px-4 py-2 text-sm font-medium border-b-2 transition"
                        :class="activeTab === category.id
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'"
                        @click="activeTab = category.id"
                    >
                        {{ category.title }}
                    </button>
                </nav>
            </div>

            <!-- Category Content -->
            <div v-for="category in categoriesData" :key="category.id">
                <div v-if="activeTab === category.id" class="space-y-6">
                    <div v-if="category.groups.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-4">
                        No attribute groups available for this category.
                    </div>

                    <div v-else v-for="group in category.groups" :key="group.id" class="space-y-3">
                        <h4 class="text-sm font-semibold text-gray-900 dark:text-white">{{ group.title }}</h4>
                        
                        <div v-if="group.attributes.length === 0" class="text-xs text-gray-400 dark:text-gray-500 pl-4">
                            No attributes in this group.
                        </div>
                        
                        <div v-else class="grid grid-cols-1 gap-3 ">
                            <label
                                v-for="attribute in group.attributes"
                                :key="attribute.id"
                                class="inline-flex items-center space-x-2 cursor-pointer p-2 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                                :class="{ 
                                    'opacity-50': toggling[attribute.id],
                                    'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700': isAttributeSelected(attribute.id)
                                }"
                            >
                                <input
                                    type="checkbox"
                                    :checked="isAttributeSelected(attribute.id)"
                                    :disabled="toggling[attribute.id]"
                                    class="form-checkbox"
                                    @change="toggleAttribute(attribute.id)"
                                />
                                <span class="text-sm text-gray-700 dark:text-gray-300 flex-1">
                                    {{ attribute.title }}
                                </span>
                                <span v-if="toggling[attribute.id]" class="text-xs text-gray-400">
                                    ...
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
