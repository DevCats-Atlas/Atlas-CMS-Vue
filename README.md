# AtlasCMS-Vue

Admin Inertia pages, layouts, field interfaces and Vite utilities. [AtlasCMS](https://github.com/DevCats-Atlas/Atlas-CMS/blob/main/README.md) supplies controllers and props; the Laravel host builds this package.

## Requirements

The AtlasCMS backend of the same release. The consumer's Vite toolchain builds the pages: declare `vite`, `laravel-vite-plugin`, `@vitejs/plugin-vue`, `tailwindcss` and `@tailwindcss/vite` in the consumer (versions: [host package.json](https://github.com/DevCats-Atlas/Development-Atlas-CMS-Full/blob/main/package.json)). `vue`, `@inertiajs/vue3` and CKEditor are this package's own dependencies. There is no package-local build or test script.

## Installation

The manifest is `private`, so there is no registry release. Declare one source in the consumer `package.json` and run `npm install`:

| Source | `dependencies` entry | Use |
| --- | --- | --- |
| Git tag | `"@devcats-atlas/atlas-cms-vue": "git+https://github.com/DevCats-Atlas/Atlas-CMS-Vue.git#v1.3.4"` | Projects on a release; use the tag of the installed Composer packages |
| Local checkout | `"@devcats-atlas/atlas-cms-vue": "file:./packages/AtlasCMS-Vue"` | Package development; this host uses the submodule |
| Archive | `"@devcats-atlas/atlas-cms-vue": "file:./devcats-atlas-atlas-cms-vue-1.3.4.tgz"` from `npm pack` | Offline installs |

A Git tag is not a semver range: change it together with `composer update 'devcats-atlas/*' -W` and rebuild. In this host a missing `file:` source falls back to the Git tag pinned in `scripts/install-packages-fallback.js`; initialize submodules first. Then add the Vite plugins ([Vite integration](docs/vite-integration.md)) and run `npm run build`.

## Guides

| Guide | Contents |
| --- | --- |
| [Vite integration](docs/vite-integration.md) | `loadAllPackages()`, `atlasPages()`, aliases, package discovery and path overrides, development and production builds |
| [Pages](docs/pages.md) | Page resolution, writing a page, shared props, every built-in page with its props, overriding a built-in page |
| [Components](docs/components.md) | Layouts, dialogs, toasts, toggles, the editor; list and DbTable helpers; the column settings editor |
| [Field interfaces](docs/field-interfaces.md) | Built-in interfaces, the interface contract, writing and registering a custom interface |

The [admin screen recipe](https://github.com/DevCats-Atlas/Development-Atlas-CMS-Full/blob/main/docs/recipes/admin-screen.md) builds a page with a form end to end.

## Verification

[Host verification](https://github.com/DevCats-Atlas/Development-Atlas-CMS-Full/blob/main/README.md#testing): `node --test tests/Frontend/*.test.mjs` and `npm run build`. Screen interaction, dragging and dark mode need browser checks.
