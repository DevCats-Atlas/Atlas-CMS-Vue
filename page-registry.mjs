import path from 'node:path';
import { existsSync, readdirSync, realpathSync, statSync } from 'node:fs';

const moduleId = 'virtual:atlas-admin-pages';
const resolvedId = `\0${moduleId}`;

function pageFiles(directory, ancestors = new Set()) {
    if (!existsSync(directory)) return [];
    const realDirectory = realpathSync(directory);
    if (ancestors.has(realDirectory)) return [];
    const nextAncestors = new Set([...ancestors, realDirectory]);
    return readdirSync(directory, { withFileTypes: true })
        .sort((a, b) => a.name.localeCompare(b.name, 'en'))
        .flatMap(entry => {
            const file = path.join(directory, entry.name);
            const stats = entry.isSymbolicLink() ? statSync(file) : entry;
            if (stats.isDirectory()) return pageFiles(file, nextAncestors);
            return stats.isFile() && entry.name.endsWith('.vue') ? [file] : [];
        });
}

/** Build lazy page imports from the consumer and selected package directories. */
export function atlasPages({ projectRoot, pageRoots = [] }) {
    const roots = [...new Set([
        path.resolve(projectRoot, 'resources/admin/Pages'),
        ...pageRoots.map(root => path.resolve(projectRoot, root)),
    ])];
    const containsPage = file => file.endsWith('.vue') && roots.some(root => {
        const relative = path.relative(root, file);
        return relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
    });

    return {
        name: 'atlas-admin-pages',
        resolveId(id) {
            if (id === moduleId) return resolvedId;
        },
        load(id) {
            if (id !== resolvedId) return;
            const pages = new Map();
            for (const root of roots) {
                for (const file of pageFiles(root)) {
                    const name = path.relative(root, file).split(path.sep).join('/').slice(0, -4);
                    if (!pages.has(name)) pages.set(name, file);
                }
            }
            const entries = [...pages].map(([name, file]) =>
                `[${JSON.stringify(name)}, () => import(${JSON.stringify(file.split(path.sep).join('/'))})]`
            );
            return `export default Object.fromEntries([${entries.join(',\n')}]);`;
        },
        configureServer(server) {
            // Selected sources can be outside the consumer (environment/file overrides).
            server.config.server.fs.allow.push(...roots);
            server.watcher.add(roots);
            const refresh = file => {
                if (!containsPage(file)) return;
                const graph = server.environments.client.moduleGraph;
                const registry = graph.getModuleById(resolvedId);
                if (registry) graph.invalidateModule(registry);
                server.ws.send({ type: 'full-reload' });
            };
            server.watcher.on('add', refresh);
            server.watcher.on('unlink', refresh);
        },
    };
}
