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

/** True when the URL is the admin path itself or below it; `/administrator` is not under `/admin`. */
export function isAdminPath(url, prefix, path = '') {
    const current = url.split(/[?#]/, 1)[0];
    const base = buildAdminUrl(prefix, path);
    return base === '/' || current === base || current.startsWith(`${base}/`);
}
