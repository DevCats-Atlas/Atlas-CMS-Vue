<script setup>
import { Link, usePage } from '@inertiajs/vue3';
import { ref, onMounted, onUnmounted, computed } from 'vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import { useTranslation } from '@admin/js/utils/useTranslation';

const { t } = useTranslation();

const isSidebarOpen = ref(false);
const userToggled = ref(false); // Track if user manually toggled
const page = usePage();
const user = computed(() => page.props.auth?.user ?? null);

const fallbackNavigation = [
    {
        id: 'default',
        title: 'Navigation',
        items: [
            { id: 'dashboard', title: 'Dashboard', href: '/admin', exact: true },
            { id: 'websites', title: 'Websites', href: '/admin/websites' },
            { id: 'pages', title: 'Pages', href: '/admin/pages' },
            { id: 'users', title: 'Users', href: '/admin/users' },
            { id: 'settings', title: 'Settings', href: '/admin/settings' },
        ],
    },
];

const props = defineProps({
    navigation: {
        type: Array,
    },
    sidebarTitle: {
        type: String,
        default: 'CMS Admin',
    },
});

const sidebarTitle = computed(() => props.sidebarTitle || t('admin.layout.cms_admin'));
const sharedNavigation = computed(() => page.props.cmsNavigation || []);
const navigationGroups = computed(() => {
    if (props.navigation && props.navigation.length) {
        return props.navigation;
    }

    if (sharedNavigation.value.length) {
        return sharedNavigation.value;
    }

    return fallbackNavigation;
});

// Open sidebar by default on desktop, closed on mobile
const checkScreenSize = () => {
    // Only auto-adjust if user hasn't manually toggled
    if (!userToggled.value) {
        isSidebarOpen.value = window.innerWidth >= 1024;
    }
};

onMounted(() => {
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
});

onUnmounted(() => {
    window.removeEventListener('resize', checkScreenSize);
});

const toggleSidebar = () => {
    isSidebarOpen.value = !isSidebarOpen.value;
    userToggled.value = true;
};

const closeSidebar = () => {
    isSidebarOpen.value = false;
    userToggled.value = true;
};

const openSidebar = () => {
    isSidebarOpen.value = true;
    userToggled.value = true;
};

const isActive = (item) => {
    const currentUrl = page.url;
    const target = item.href;

    if (!target) {
        return false;
    }

    if (item.exact) {
        return currentUrl === target;
    }

    return currentUrl === target || currentUrl.startsWith(`${target}/`);
};

const isSystemSection = computed(() => page.url.startsWith('/admin/system'));
const isAdminSection = computed(() => page.url.startsWith('/admin') && !isSystemSection.value);
</script>

<template>
    <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
        <!-- Sidebar -->
        <div
            :class="[
                'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-transform duration-300 ease-in-out',
                isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
            ]"
        >
            <div class="flex flex-col h-full">
                <!-- Logo -->
                <div class="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
                    <h1 class="text-xl font-bold text-gray-900 dark:text-white">{{ sidebarTitle }}</h1>
                    <button
                        @click="closeSidebar"
                        class="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        :title="t('admin.layout.close_sidebar')"
                    >
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <!-- Navigation -->
                <nav class="flex-1 px-4 py-6 overflow-y-auto">
                    <div v-for="(group, index) in navigationGroups" :key="group.id || group.title" class="mb-6 last:mb-0">
                        <!-- Group separator (not for first group) -->
                        <div v-if="index > 0" class="mb-5 -mx-4 border-t border-gray-200 dark:border-gray-700"></div>
                        
                        <!-- Group container with subtle background -->
                        <div class="space-y-2 rounded-lg bg-gray-50/50 dark:bg-gray-900/30 p-2 -mx-2">
                            <!-- Group header -->
                            <div class="px-3 pb-2 pt-1">
                                <p class="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                                    {{ group.title }}
                                </p>
                            </div>
                            
                            <!-- Group items -->
                            <div class="space-y-1">
                                <Link
                                    v-for="item in group.items"
                                    :key="item.id || item.href || item.title"
                                    :href="item.href || '#'"
                                    class="flex items-center pl-6 pr-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    :class="{
                                        'bg-gray-100 dark:bg-gray-700 font-semibold text-gray-900 dark:text-white': isActive(item),
                                    }"
                                >
                                    <span class="font-medium">{{ item.title }}</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </nav>

                <!-- Footer -->
                <div class="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                        Atlas CMS v1.0
                    </div>
                </div>
            </div>
        </div>

        <!-- Main content -->
        <div :class="['transition-all duration-300', isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0']">
            <!-- Top bar -->
            <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div class="flex items-center justify-between h-16 px-6">
                    <div class="w-10">
                        <button
                            v-if="!isSidebarOpen"
                            @click="toggleSidebar"
                            class="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            :title="t('admin.layout.open_sidebar')"
                        >
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>

                    <div class="flex items-center space-x-4">
                        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {{ user?.name || t('admin.layout.admin') }}
                        </span>
                        <Link
                            href="/admin"
                            class="text-sm px-3 py-1 rounded-md transition-colors"
                            :class="[
                                isAdminSection
                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-semibold'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100',
                            ]"
                        >
                            {{ t('admin.layout.cms') }}
                        </Link>
                        <Link
                            v-if="user?.is_superadmin"
                            href="/admin/system"
                            class="text-sm px-3 py-1 rounded-md transition-colors"
                            :class="[
                                isSystemSection
                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-semibold'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100',
                            ]"
                        >
                            {{ t('admin.layout.system') }}
                        </Link>
                        <Link href="/" class="btn-text">
                            {{ t('admin.layout.view_site') }}
                        </Link>
                        <Link href="/admin/logout" method="post" as="button" class="btn-text-danger">
                            {{ t('admin.layout.sign_out') }}
                        </Link>
                    </div>
                </div>
            </header>

            <!-- Page content -->
            <main>
                <slot />
            </main>
        </div>

        <!-- Overlay for mobile -->
        <div
            v-if="isSidebarOpen"
            @click="toggleSidebar"
            class="fixed inset-0 z-40 bg-gray-600 bg-opacity-50 lg:hidden transition-opacity"
        ></div>

        <ConfirmDialog />
    </div>
</template>
