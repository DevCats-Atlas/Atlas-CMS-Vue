<script setup>
import { adminUrl } from '@/utils/adminUrl';
import AdminLayout from '@admin/Layouts/AdminLayout.vue';

const systemNavigation = [
    {
        id: 'system',
        title: 'System',
        items: [
            { id: 'overview', title: 'Overview', href: adminUrl('system'), exact: true },
            { id: 'cms-menu', title: 'CMS Menu', href: adminUrl('system/cms-menu') },
            { id: 'modules', title: 'Modules', href: adminUrl('system/modules') },
            { id: 'access-roles', title: 'Access Roles', href: adminUrl('system/access-roles') },
            { id: 'item-types', title: 'Item Types', href: adminUrl('system/item-types') },
        ],
    },
];
</script>

<template>
    <AdminLayout :navigation="systemNavigation" sidebar-title="System Console">
        <slot />
    </AdminLayout>
</template>
