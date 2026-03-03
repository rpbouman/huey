# Feature flags and fallbacks (remote datasource)

## Feature flags

- **Remote mode** is enabled per datasource: when the app uses a datasource created with `RemoteDatasourceConfig` (type `remote`, `baseUrl`, `datasetId`), all schema/tuple/cell/picklist requests go to QueryService.
- Optional: a deployment can gate availability of remote by only exposing the "Add remote datasource" flow when a flag is set (e.g. URL param `?remote=1` or app config). The current code does not require a global flag; adding a remote datasource is sufficient to use it.

## Fallbacks

- **Errors**: When a remote request fails (network, 4xx/5xx), the existing error handling applies (e.g. `showErrorDialog`). The user sees a clear message.
- **Fallback to local**: If QueryService is unavailable, the user can switch to a local/WASM datasource by choosing another datasource in the UI. A future enhancement could detect remote failure and prompt to open a local file instead.
