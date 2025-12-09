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
                        Atlas CMS v1.0.<br>
                        <div class="flex items-end gap-2">
                            Powered by 
                            <a href="https://devcats.co/" target="_blank" class="text-blue-500 hover:text-blue-600">
                                
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 220 68" class="" width="80"><defs><clipPath id="clip_00001"><rect x="-100" y="-40" width="1440" height="1024" clip-rule="evenodd"></rect></clipPath></defs><g clip-path="url(#clip_00001)"><path fill="#999" stroke="none" transform="translate(71 29)" d="M82.0867 22.7733C77.0521 22.7733 73.4058 18.599 73.4058 13.4899C73.4058 8.31051 77.0521 4.20934 82.0867 4.20934C85.0947 4.20934 87.3499 5.51747 89.4559 7.45688L92.4238 4.05942C89.9068 1.67912 86.9757 0 82.125 0C74.1587 0 68.5564 6.07475 68.5564 13.4899C68.5564 21.06 74.2711 26.9845 81.9405 26.9845C86.8601 26.9845 89.8685 25.1963 92.6131 22.3631L89.6418 19.3812C87.3898 21.4693 85.3221 22.7733 82.0867 22.7733ZM0 0.451645L9.80864 0.451645C18.0751 0.451645 23.7866 6.07475 23.7866 13.4899C23.7866 20.831 18.0751 26.5382 9.80864 26.5382L0 26.5382L0 0.451645ZM120.372 0.451645L125.079 0.451645L125.079 6.17121L130.604 6.17121L130.604 10.1813L125.079 10.1813L125.079 20.1738C125.079 21.986 126.011 22.7163 127.606 22.7163C128.659 22.7163 129.592 22.4861 130.525 22.0237L130.525 25.8421C129.358 26.5003 128.035 26.8833 126.287 26.8833C122.824 26.8833 120.372 25.3791 120.372 20.906L120.372 10.1813L117.765 10.1813L117.765 6.17121L120.372 6.17121L120.372 0.451645ZM9.80864 22.3631L4.6227 22.3631L4.6227 4.61987L9.80864 4.61987C15.3302 4.61987 18.9407 8.38389 18.9407 13.4899C18.9407 18.6724 15.3302 22.3631 9.80864 22.3631ZM26.1289 16.3535C26.1289 10.527 30.2925 5.74297 36.1646 5.74297C42.7005 5.74297 46.007 10.8338 46.007 16.6988C46.007 17.0075 45.9691 17.7815 45.9275 18.0101L30.8362 18.0101C31.3398 21.3291 33.7127 23.1835 36.7479 23.1835C39.0449 23.1835 40.68 22.333 42.3112 20.7478L45.0731 23.1835C43.1277 25.4948 40.4437 27 36.6668 27C30.7213 27 26.1289 22.7163 26.1289 16.3535ZM142.618 14.501C142.503 14.4637 142.347 14.4229 142.23 14.3865C139.972 13.6521 137.989 13.0357 137.989 11.646C137.989 10.3723 139.04 9.52281 140.871 9.52281C142.581 9.52281 144.679 10.2575 146.666 11.4534L148.532 8.1353C146.354 6.70952 143.55 5.81919 140.987 5.81919C136.902 5.81919 133.671 8.17483 133.671 12.0334C133.671 16.0037 137.059 17.2422 140.092 18.1303C140.209 18.1641 140.325 18.2034 140.443 18.2454C142.696 18.8989 144.679 19.4365 144.679 20.9439C144.679 22.3681 143.515 23.2205 141.491 23.2205C139.39 23.2205 136.98 22.3681 134.762 20.7099L132.66 23.8777C135.227 25.881 138.456 26.9225 141.372 26.9225C145.657 26.9225 149 24.8012 149 20.5192C149 16.7773 145.613 15.428 142.618 14.501ZM51.5286 6.17121L57.0526 21.1368L62.6121 6.17121L67.5525 6.17121L59.1513 26.691L54.9095 26.691L46.4719 6.17121L51.5286 6.17121ZM114.324 20.9272C114.324 22.2998 114.707 22.8416 115.802 22.8416C116.217 22.8416 116.553 22.754 116.975 22.592L117.143 26.468C116.259 26.7609 115.335 26.8833 114.241 26.8833C111.788 26.8833 110.387 25.8301 109.915 23.5731C108.453 25.4746 106.059 26.9459 102.996 26.9459C98.3367 26.9459 93.789 23.2591 93.789 16.6625C93.789 10.138 98.2607 6.4489 102.996 6.4489C105.975 6.4489 108.294 7.80985 109.743 9.43267L109.743 6.17121L114.324 6.17121L114.324 20.9272ZM30.7973 14.9248C31.2248 11.764 33.2488 9.56171 36.1256 9.56171C39.2342 9.56171 41.0271 11.9154 41.3342 14.9248L30.7973 14.9248ZM98.3731 16.7352C98.3731 20.5381 101.005 23.0339 104.084 23.0339C107.13 23.0339 109.838 20.4999 109.838 16.6625C109.838 12.8583 107.13 10.3625 104.084 10.3625C100.97 10.3625 98.3731 12.746 98.3731 16.7352Z" fill-rule="evenodd"></path></g><defs><clipPath id="clip_10001"><rect x="-100" y="-40" width="1440" height="1024" clip-rule="evenodd"></rect></clipPath></defs><g clip-path="url(#clip_10001)"><path fill="rgb(255,102,0)" stroke="none" d="M53.9803 41.0184C53.5226 28.3462 47.0096 22.1927 45.2943 20.9876C44.6415 20.5335 43.8359 20.6106 43.0458 21.4897C42.5034 22.0926 37.2881 28.6808 37.1474 28.8528C34.6588 28.8659 32.2357 29.0303 30.2775 29.3694C28.3738 29.7055 26.4021 30.1379 23.7478 31.25C22.3276 30.1586 18.1713 26.962 16.7695 25.8573C16.4013 25.5696 15.263 25.3255 14.6586 26.3133C12.3923 30.0315 11.3116 34.1237 10.9795 36.0585C10.2501 40.2853 10.4041 44.1041 11.4137 47.4333C12.3617 50.5464 14.3884 53.6983 17.3192 56.0101C20.2243 58.2972 24.1346 60.051 29.2967 59.935C30.028 59.9207 30.5182 59.5256 30.5182 58.8007C30.5182 58.2281 30.1188 57.6877 29.4068 57.6775C24.0663 57.6061 20.6699 55.4215 18.8424 53.8389C16.3991 51.7212 15.1251 49.4952 14.2654 46.5803C13.1758 42.8955 13.5275 39.0572 14.0804 36.4635C14.5905 34.0702 15.5356 31.7945 16.6834 29.629C17.8271 30.5063 21.5081 33.3941 22.1831 33.9125C22.7941 34.3806 23.4359 34.7977 24.2377 34.3984C26.5415 33.2634 28.3542 32.6743 30.8902 32.2862C32.8967 31.9803 35.5457 31.8646 37.5753 31.8942C38.4362 31.9105 38.7668 31.7107 39.3927 30.9262C41.0785 28.8191 42.8494 26.7756 44.5767 24.7C48.7922 29.0905 50.4233 36.3797 50.2041 42.0553C49.8976 50.0579 46.6813 56.509 40.1913 60.312C36.9443 62.2149 32.7136 63.4745 27.0663 63.2049C20.4602 62.8888 14.6506 60.0007 10.8349 54.9636C7.33013 50.3367 6.09597 44.6178 6.25727 39.119C6.43977 32.896 8.32865 27.9326 11.0013 23.5246C15.1251 16.7207 21.2592 11.647 29.2525 6.83143C30.8915 5.8411 31.9216 3.69603 30.4534 1.62392C28.9865 -0.444358 26.6877 -0.129543 25.7192 0.3704C15.5404 5.65693 8.88659 13.4511 5.04937 20.386C1.86686 26.1444 0.184203 32.3301 0.0105603 38.8262C-0.170673 45.6393 1.98168 52.982 6.4015 58.4409C10.4083 63.3891 17.9695 67.9144 27.3588 67.9982C32.8746 68.0498 37.7534 67.0082 42.7745 63.8693C50.4467 59.0683 54.3124 50.2178 53.9803 41.0184M26.0469 41.3145C27.1725 41.6146 28.5209 40.797 27.9585 39.4715C27.405 38.1701 25.2204 38.3604 24.1396 38.5834C22.8536 38.8492 21.0321 39.676 20.3277 40.8719C19.9751 41.4738 20.4024 42.3131 21.1494 42.1461C21.429 42.0843 21.7118 41.8864 21.961 41.7529C22.3776 41.528 22.8887 41.3355 23.1395 41.2829C23.1092 42.1095 23.7841 42.8621 24.6077 42.8704C25.4415 42.8755 26.1063 42.1534 26.0469 41.3145M40.5332 38.9932C40.642 39.0368 40.7527 39.0677 40.8679 39.0824C42.2842 39.2895 43.0269 37.3857 41.8708 36.5314C40.8498 35.7807 38.8547 36.1334 37.7812 36.49C37.0139 36.741 36.2848 37.1123 35.6292 37.588C35.2354 37.8722 34.5025 38.3272 34.4213 38.8797C34.3235 39.5183 35.0111 40.0221 35.5792 39.7327C36.2696 39.3797 36.8747 38.9986 37.6449 38.8065C37.4083 40.8129 40.5405 41.0184 40.5332 38.9932M26.292 51.5067C27.3304 52.3346 29.3951 52.7118 30.9082 52.1115C31.7192 51.7846 32.428 51.2343 32.9546 50.5288C32.9964 50.4807 33.0312 50.4291 33.0543 50.4259C33.078 50.4189 33.1292 50.4556 33.1836 50.4893C33.9215 50.9797 34.7802 51.263 35.6592 51.2968C37.2865 51.363 39.1008 50.3217 39.7919 49.1976C40.3042 48.3596 40.574 47.3584 40.3805 46.3728C40.303 45.9784 40.1205 45.5278 39.6638 45.4928C39.3013 45.4663 38.9379 45.7333 38.9031 46.2428C38.843 47.0955 38.6042 47.5872 38.3613 47.8826C37.8381 48.5246 37.0724 48.8627 36.1457 48.8697C35.5008 48.8745 34.5554 48.515 33.9993 47.8249C34.2024 47.1927 34.3564 45.7636 33.9747 45.0744C33.7438 44.6398 33.0312 44.4887 32.0263 44.6592C31.0262 44.83 30.4085 45.2076 30.3383 45.697C30.2171 46.4732 30.8567 47.7653 31.2666 48.2936C30.9819 49.1256 30.2171 49.7804 29.607 49.9875C28.7306 50.2867 27.9 50.2255 27.1792 49.7944C26.8537 49.5987 26.4587 49.2145 26.1063 48.4316C25.8954 47.9635 25.4636 47.8341 25.1366 47.9762C24.7137 48.162 24.6998 48.6457 24.7589 49.0462C24.9202 50.0359 25.5149 50.887 26.292 51.5067"></path></g></svg>

                            </a>
                        </div>
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
