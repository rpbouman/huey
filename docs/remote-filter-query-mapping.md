# Filter application and query mapping (remote datasource)

When using a **remote datasource** (QueryService), filters are applied by sending them in every query request.

## Mapping

- **Filter axis** (QueryModel) → **API `filters`** array: each filter axis item with `filter` set is mapped to `{ field, operator, values }` (operator `"in"` for include/exclude lists).
- **Tuple requests** (`/query/tuples`): `#buildRemoteTuplesQuery()` in `TupleSet.js` includes `filters` from the filter axis.
- **Cell requests** (`/query/cells`): `#buildRemoteCellsQuery()` in `CellSet.js` includes `filters`.
- **Picklist requests** (`/query/picklist`): FilterUi `#getPicklistValues()` sends other filter axis items as `filters` so the picklist is constrained.

The backend accepts `filters` in the request envelope and will apply them when the engine is fully wired (partition pruning and predicate pushdown).
