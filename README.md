# @ceedcv-maya/shared-sidebar-react

Sidebar primitives + shared favorites for React: useSharedFavorites hook (cross-app), favorite-button widget, configurable backend endpoint.

Part of the [ceedcv-maya/maya_platform](https://github.com/Maya-AQSS/maya_platform) mono-repo. Distributed independently for reuse outside the Maya ecosystem.

## Installation

```bash
npm install @ceedcv-maya/shared-sidebar-react @ceedcv-maya/shared-auth-react @ceedcv-maya/shared-layout-react
```

```tsx
import { useSharedFavorites, FavoriteButton } from '@ceedcv-maya/shared-sidebar-react'

function Item({ id }) {
  return <FavoriteButton entityType="document" entityId={id} backendUrl="https://api.example.org" />
}
```


## Peer dependencies

This package expects the following sibling packages to be installed by the consumer:

- `@ceedcv-maya/shared-auth-react`
- `@ceedcv-maya/shared-layout-react`

## TypeScript / build notes
This package ships TypeScript source (`src/index.ts` as entry). Consumers using Vite or Webpack with `ts-loader` work out of the box. Next.js consumers must add this package to `transpilePackages` in `next.config.js`.

## License

MIT — see [LICENSE](LICENSE).

## Reporting issues

The canonical source lives in [Maya-AQSS/maya_platform](https://github.com/Maya-AQSS/maya_platform). File issues there; this read-only split repo is only the published artifact.
