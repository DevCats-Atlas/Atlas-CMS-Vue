export function buildAdminUrl(prefix, path = '') {
    const base = String(prefix).replace(/^\/+|\/+$/g, '');
    const relativePath = path.replace(/^\/+/, '');
    return `/${[base, relativePath].filter(Boolean).join('/')}`;
}

export function getAdminModuleHandle(url, prefix) {
    const path = url.split(/[?#]/, 1)[0];
    const root = buildAdminUrl(prefix);
    const base = root === '/' ? root : `${root}/`;
    return path.startsWith(base) ? path.slice(base.length).split('/')[0] : '';
}
