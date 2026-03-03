# Loading states and progress (remote datasource)

When using a **remote datasource**, loading is indicated by the same mechanism as local queries:

- **Pivot table**: The pivot container uses `aria-busy` (see `PivotTableUi.#setBusy`). When tuple or cell data is fetched (including via remote `fetchTuples` / `fetchCells`), the caller sets busy before the async fetch and clears it when done, so the pivot shows a loading state.
- **Filter dialog**: FilterUi uses `#setBusy(true)` while loading picklist values (local or remote) and clears it when the result set is ready.

No separate progress indicator is required for remote; the existing busy state covers it.
