// ── Example subclass ──────────────────────────────────────────────────────────

/**
 * Concrete store for the app, managing DuckDB Secrets and Remote Catalog entries.
 *
 * @example
 * const store = AppStore.store;
 * if (!await store.isInitialized()) await store.init('MyP@ssw0rd!1');
 *
 * await store.store(
 *   { name: 'github', type: 'login', fields: [
 *       { name: 'username', type: 'text',     value: 'alice' },
 *       { name: 'password', type: 'password', value: 's3cr3t' },
 *   ]},
 *   AppStore.STORE_SECRETS,
 *   'MyP@ssw0rd!1'
 * );
 *
 * const doc = await store.get('github', AppStore.STORE_SECRETS, 'MyP@ssw0rd!1');
 */
class AppDocumentStore extends DocumentStore {
  static DB_NAME    = 'huey-document-store';
  static DB_VERSION = 1;

  static STORE_SECRETS  = 'secrets';
  static STORE_CATALOGS = 'catalogs';

  _defineStores() {
    return [
      {
        name:         AppDocumentStore.STORE_SECRETS,
        keyPath:      'name',
        encrypted:    true,
        headerFields: ['name', 'type', 'autoload'],
      },
      {
        name:         AppDocumentStore.STORE_CATALOGS,
        keyPath:      'name',
        encrypted:    false,
        headerFields: ['name', 'url', 'type', 'autoload'],
      },
    ];
  }

  static #instance;
  static get store() {
    if (!AppDocumentStore.#instance) AppDocumentStore.#instance = new AppDocumentStore();
    return AppDocumentStore.#instance;
  }
}
