<script setup>
import { computed } from 'vue';
import { Head, Link, router, useForm } from '@inertiajs/vue3';
import AdminLayout from '@admin/Layouts/AdminLayout.vue';
import { confirmDialog } from '@admin/js/utils/confirmDialog.js';

const props = defineProps({
    title: {
        type: String,
        default: 'Module View',
    },
    moduleHandle: {
        type: String,
        required: true,
    },
    module: {
        type: Object,
        required: true,
    },
    tableName: {
        type: String,
        required: true,
    },
    columns: {
        type: Array,
        default: () => [],
    },
    items: {
        type: Array,
        default: () => [],
    },
    pagination: {
        type: Object,
        default: null,
    },
    search: {
        type: String,
        default: '',
    },
    uiConfig: {
        type: Object,
        default: () => ({}),
    },
    primaryKeyColumn: {
        type: String,
        default: 'id',
    },
});

const baseUrl = computed(() => `/admin/${props.moduleHandle}`);

// Search form
const searchForm = useForm({
    search: props.search || '',
});

const performSearch = () => {
    router.get(baseUrl.value, 
        { search: searchForm.search },
        {
            preserveState: true,
            preserveScroll: true,
            only: ['items', 'search', 'pagination'],
        }
    );
};

const clearSearch = () => {
    searchForm.search = '';
    router.get(baseUrl.value, {}, {
        preserveState: true,
        preserveScroll: true,
        only: ['items', 'search', 'pagination'],
    });
};

const formatValue = (value, column) => {
    if (value === null || value === undefined) {
        return '-';
    }
    
    if (column.interface === 'checkbox') {
        return value ? 'Yes' : 'No';
    }
    
    if (column.interface === 'datetime') {
        // Try to parse as date
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            return date.toLocaleString();
        }
    }
    
    return String(value);
};


const confirmDelete = async (item) => {
    // Use the primary key column passed from backend
    const recordId = item[props.primaryKeyColumn];
    
    // Try to find a meaningful label for the record
    let recordLabel = `Record #${recordId}`;
    const titleFields = ['title', 'name', 'label', 'email'];
    for (const field of titleFields) {
        if (item[field]) {
            recordLabel = item[field];
            break;
        }
    }
    
    const confirmed = await confirmDialog({
        title: 'Delete record',
        message: `Delete "${recordLabel}"?`,
        confirmLabel: 'Delete',
        intent: 'danger',
    });
    
    if (!confirmed) {
        return;
    }
    
    router.delete(`${baseUrl.value}/delete`, {
        data: {
            item_id: recordId,
        },
        preserveScroll: true,
        onSuccess: () => {
            router.reload({ preserveScroll: true });
        },
    });
};
</script>

<template>
    <AdminLayout>
        <Head :title="title" />

        <div class="py-6">
            <div class="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                <div class="bg-white dark:bg-gray-800 shadow rounded-xl p-6">
                    <div class="flex items-start justify-between gap-4 mb-6">
                        <div>
                            <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">{{ title }}</h1>
                            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Table: <code class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">{{ tableName }}</code>
                            </p>
                        </div>
                        <button type="button" class="btn btn-primary" @click="router.visit(baseUrl + '/create')">
                            Create New
                        </button>
                    </div>

                    <!-- Search Form -->
                    <div class="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                        <form @submit.prevent="performSearch" class="space-y-4">
                            <div>
                                <label class="form-label">Search</label>
                                <div class="flex items-center gap-2">
                                    <div class="flex-1">
                                        <input
                                            v-model="searchForm.search"
                                            type="text"
                                            class="form-input"
                                            placeholder="Search across all columns"
                                        />
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <button type="submit" class="btn btn-primary" :disabled="searchForm.processing">
                                            {{ searchForm.processing ? 'Searching...' : 'Search' }}
                                        </button>
                                        <button
                                            v-if="search"
                                            type="button"
                                            class="btn btn-outline"
                                            @click="clearSearch"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>
                                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Search across all columns in the table
                                </p>
                            </div>
                        </form>
                    </div>

                    <div v-if="items.length === 0" class="text-center py-12">
                        <p class="text-gray-500 dark:text-gray-400">
                            {{ search ? 'No records found matching your search.' : 'No records found in the table.' }}
                        </p>
                    </div>

                    <div v-else class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead class="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th
                                        v-for="column in columns"
                                        :key="column.name"
                                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                                    >
                                        {{ column.title }}
                                    </th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                <tr
                                    v-for="item in items"
                                    :key="item[props.primaryKeyColumn]"
                                    class="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                >
                                    <td
                                        v-for="column in columns"
                                        :key="column.name"
                                        class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                                    >
                                        {{ formatValue(item[column.name], column) }}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div class="btn-group" role="group">
                                            <Link
                                                :href="`${baseUrl}/edit?id=${item[props.primaryKeyColumn]}`"
                                                class="btn-group-item-edit"
                                                preserve-scroll
                                                @click.stop
                                                title="Edit"
                                            >
                                                <svg
                                                    class="w-4 h-4"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        stroke-width="2"
                                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                    />
                                                </svg>
                                            </Link>
                                            <button
                                                type="button"
                                                class="btn-group-item-delete"
                                                @click.stop="confirmDelete(item)"
                                                title="Delete"
                                            >
                                                <svg
                                                    class="w-4 h-4"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        stroke-width="2"
                                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                    />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <!-- Pagination -->
                        <div v-if="pagination && pagination.last_page > 1" class="mt-4 flex items-center justify-between">
                            <div class="text-sm text-gray-700 dark:text-gray-300">
                                Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} results
                            </div>
                            <div class="flex gap-2">
                                <Link
                                    v-for="link in pagination.links"
                                    :key="link.label"
                                    :href="link.url || '#'"
                                    class="relative inline-flex items-center px-4 py-2 text-sm font-semibold"
                                    :class="{
                                        'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-700': link.url && !link.active,
                                        'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600': link.active,
                                        'text-gray-300 cursor-not-allowed dark:text-gray-600': !link.url
                                    }"
                                    v-html="link.label"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </AdminLayout>
</template>

