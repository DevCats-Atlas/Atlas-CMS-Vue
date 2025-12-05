<script setup>
import AdminLayout from '@admin/Layouts/AdminLayout.vue';

const systemNavigation = [
    {
        id: 'system',
        title: 'System',
        items: [
            { id: 'overview', title: 'Overview', href: '/admin/system', exact: true },
            { id: 'cms-menu', title: 'CMS Menu', href: '/admin/system/cms-menu' },
            { id: 'modules', title: 'Modules', href: '/admin/system/modules' },
            { id: 'access-roles', title: 'Access Roles', href: '/admin/system/access-roles' },
            { id: 'item-types', title: 'Item Types', href: '/admin/system/item-types' },
        ],
    },
];
</script>

<template>
    <AdminLayout :navigation="systemNavigation" sidebar-title="System Console">
        <slot />
    </AdminLayout>
</template>
