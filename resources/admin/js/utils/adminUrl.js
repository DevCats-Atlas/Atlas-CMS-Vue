import { usePage } from '@inertiajs/vue3';
import { buildAdminUrl, getAdminModuleHandle, isAdminPath } from './adminPath.js';

export function adminUrl(path = '') {
    return buildAdminUrl(usePage().props.adminPrefix ?? 'admin', path);
}

export function adminModuleHandle() {
    const page = usePage();
    return getAdminModuleHandle(page.url, page.props.adminPrefix ?? 'admin');
}

export function isAdminUrl(path = '') {
    const page = usePage();
    return isAdminPath(page.url, page.props.adminPrefix ?? 'admin', path);
}
