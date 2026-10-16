<script setup>
import { adminUrl } from '@/utils/adminUrl';
import { computed } from 'vue';
import AdminLayout from '@admin/Layouts/AdminLayout.vue';
import { useTranslation } from '@/utils/useTranslation.js';

const { t } = useTranslation();

const systemNavigation = computed(() => [
    {
        id: 'system',
        title: t('admin.layout.system'),
        items: [
            { id: 'overview', title: t('admin.layout.nav_overview'), href: adminUrl('system'), exact: true },
            { id: 'cms-menu', title: t('admin.layout.nav_cms_menu'), href: adminUrl('system/cms-menu') },
            { id: 'modules', title: t('admin.layout.nav_modules'), href: adminUrl('system/modules') },
            { id: 'access-roles', title: t('admin.layout.nav_access_roles'), href: adminUrl('system/access-roles') },
            { id: 'item-types', title: t('admin.layout.nav_item_types'), href: adminUrl('system/item-types') },
        ],
    },
]);
</script>

<template>
    <AdminLayout :navigation="systemNavigation" :sidebar-title="t('admin.layout.system_console')">
        <slot />
    </AdminLayout>
</template>
