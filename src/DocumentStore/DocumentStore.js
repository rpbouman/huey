// ── Utility ───────────────────────────────────────────────────────────────────

/**
 * Encoding and crypto utilities shared across the module.
 * All methods are static; this class is never instantiated.
 */
class DocumentStoreUtils {
  static encode(str)  { return new TextEncoder().encode(str); }
  static decode(buf)  { return new TextDecoder().decode(buf); }

  static toB64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  }

  static fromB64(str) {
    return Uint8Array.from(atob(str), c => c.charCodeAt(0));
  }

  /**
   * Derives a non-extractable AES-GCM-256 key from a password and salt
   * using PBKDF2-SHA-256.
   * @param {string}     password
   * @param {Uint8Array} salt
   * @returns {Promise<CryptoKey>}
   */
  static async deriveKey(password, salt) {
    const raw = await crypto.subtle.importKey(
      'raw', DocumentStoreUtils.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 310_000, hash: 'SHA-256' },
      raw,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts a plaintext string with AES-GCM using a fresh random 12-byte IV.
   * @param {CryptoKey} key
   * @param {string}    plaintext
   * @returns {Promise<string>} A `"<iv>:<ciphertext>"` token, both parts Base64-encoded.
   */
  static async encrypt(key, plaintext) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      DocumentStoreUtils.encode(plaintext)
    );
    return `${DocumentStoreUtils.toB64(iv)}:${DocumentStoreUtils.toB64(ct)}`;
  }

  /**
   * Decrypts a token produced by {@link encrypt}.
   * @param {CryptoKey} key
   * @param {string}    token - A `"<iv>:<ciphertext>"` token.
   * @returns {Promise<string>}
   * @throws {DOMException} If the key is incorrect or the ciphertext is tampered.
   */
  static async decrypt(key, token) {
    const [ivB64, ctB64] = token.split(':');
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: DocumentStoreUtils.fromB64(ivB64) },
      key,
      DocumentStoreUtils.fromB64(ctB64)
    );
    return DocumentStoreUtils.decode(plain);
  }
  
  static hasPasswordFields(doc, fieldsPath){
    const fields = doc[fieldsPath];
    if (!fields) {
      return false;
    }
    return fields.some(field => field.type === 'password');
  }
  
}


// ── Base class ────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} StoreDefinition
 * @property {string}          name        - Object store name; expose as a static constant on the subclass.
 * @property {string|string[]} keyPath     - Field name(s) that form the primary key.
 * @property {string}          [fieldsPath] - Property name that holds the fields array. Defaults to `'fields'`.
 * @property {string[]}        [headerFields] - Field names to include in {@link DocumentStore#list} summaries.
 *                                              Defaults to `['name', 'type']`.
 */

/**
 * @typedef {Object} DocumentField
 * @property {string} name  - Field name.
 * @property {string} type  - Field type. Use `'password'` to mark a value for encryption.
 * @property {string} value - Field value. Encrypted at rest when `type === 'password'`
 */

/**
 * @typedef {Object} StoreDocument
 * @property {string}          name   - Unique document name (primary key, unless keyPath differs).
 * @property {string}          type   - Document type / category.
 * @property {DocumentField[]} fields - Ordered list of fields.
 */

/**
 * Abstract base class for IndexedDB-backed document stores with optional
 * per-store field-level encryption.
 *
 * Subclasses must implement {@link _defineStores} to declare their object stores.
 * Encryption (AES-GCM-256, key derived via PBKDF2-SHA-256) is applied for fields with type=password
 *
 * A private `meta` object store is always created alongside the user-defined
 * stores; it holds the PBKDF2 salt and an encrypted sentinel used for password
 * verification.
 *
 * @abstract
 */
class DocumentStore {
  /** @type {string} Name of the internal metadata object store. */
  static STORE_META = 'meta';

  /** @type {string} Sentinel plaintext used to verify the encryption password. */
  static #SENTINEL = 'DOCUMENT_STORE_V1_VALID';

  static PASSWORD_REQUIRED_ERROR = 'PasswordRequired';
  static INCORRECT_PASSWORD_ERROR = 'IncorrectPassword';

  /** @type {IDBDatabase|null} */
  #db = null;

  /**
   * Lazily-resolved store config map, keyed by store name.
   * @type {Map<string, StoreDefinition>|null}
   */
  #storeConfig = null;

  // ── Abstract interface ────────────────────────────────────────────────────

  /**
   * Declares the object stores managed by this instance.
   * Called once; the result is cached.
   *
   * @abstract
   * @returns {StoreDefinition[]}
   *
   * @example
   * _defineStores() {
   *   return [
   *     { name: MyStore.STORE_SECRETS,  keyPath: 'name'},
   *     { name: MyStore.STORE_CATALOGS, keyPath: 'name'},
   *   ];
   * }
   */
  _defineStores() {
    throw new Error(`${this.constructor.name} must implement _defineStores()`);
  }

  // ── Config helpers ────────────────────────────────────────────────────────

  /**
   * Returns the resolved config map, building it on first call.
   * @returns {Map<string, Required<StoreDefinition>>}
   */
  #config() {
    if (this.#storeConfig) return this.#storeConfig;
    this.#storeConfig = new Map(
      this._defineStores().map(def => [def.name, {
        fieldsPath:   'fields',
        headerFields: ['name', 'type'],
        ...def,
        keyPath: def.keyPath,   // keep as-is (string or string[])
      }])
    );
    return this.#storeConfig;
  }

  /**
   * Returns the resolved config for a named store.
   * @param {string} storeName
   * @returns {Required<StoreDefinition>}
   * @throws {Error} If the store name is not declared in {@link _defineStores}.
   */
  getStoreConfig(storeName) {
    const conf = this.#config().get(storeName);
    if (!conf) throw new Error(`Unknown store: '${storeName}'`);
    return conf;
  }

  // ── Key extraction and validation ─────────────────────────────────────────

  /**
   * Validates that `id` is appropriate for the given `keyPath`, then
   * normalises it to the form IndexedDB expects.
   *
   * Accepted forms for a **compound** key (`keyPath` is an array):
   *   - positional array  → `['s3', 'eu-west-1']`
   *   - named object      → `{ provider: 's3', region: 'eu-west-1' }`
   *
   * For a **single-field** key (`keyPath` is a string) a scalar is required.
   *
   * @param {*}              id
   * @param {string|string[]} keyPath
   * @returns {*} The normalised key value ready to pass to IDB.
   * @throws {Error} If `id` is structurally incompatible with `keyPath`.
   */
  #normaliseKey(id, keyPath) {
    if (!Array.isArray(keyPath)) {
      // single-field key
      if (id !== null && typeof id === 'object')
        throw new Error(`Store key is '${keyPath}' — expected a scalar, got ${JSON.stringify(id)}`);
      return id;
    }

    // compound key
    if (id === null || (typeof id !== 'object' && !Array.isArray(id)))
      throw new Error(`Store has compound key [${keyPath}] — expected an object or array, got scalar '${id}'`);

    if (Array.isArray(id)) {
      if (id.length !== keyPath.length)
        throw new Error(`Store has compound key [${keyPath}] — expected ${keyPath.length} values, got ${id.length}`);
      // convert positional array → named object
      return Object.fromEntries(keyPath.map((k, i) => [k, id[i]]));
    }

    // named object — verify all key fields are present
    const missing = keyPath.filter(k => !(k in id));
    if (missing.length)
      throw new Error(`Store has compound key [${keyPath}] — missing fields: ${missing.join(', ')}`);
    return id;
  }

  /**
   * Extracts and validates the key from a full document object.
   * @param {object}          doc
   * @param {string|string[]} keyPath
   * @returns {*}
   */
  #keyFromDoc(doc, keyPath) {
    if (!Array.isArray(keyPath)) return doc[keyPath];
    return this.#normaliseKey(
      Object.fromEntries(keyPath.map(k => [k, doc[k]])),
      keyPath
    );
  }

  // ── IndexedDB plumbing ────────────────────────────────────────────────────

  /**
   * Opens (and if necessary creates/upgrades) the IndexedDB database.
   * The result is cached; subsequent calls return the same connection.
   * @returns {Promise<IDBDatabase>}
   */
  async #openDB() {
    if (this.#db) return this.#db;

    const dbName    = this.constructor.DB_NAME;
    const dbVersion = this.constructor.DB_VERSION;
    if (!dbName)    throw new Error(`${this.constructor.name} must define a static DB_NAME`);
    if (!dbVersion) throw new Error(`${this.constructor.name} must define a static DB_VERSION`);

    const stores = this.#config();

    return new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, dbVersion);

      req.onupgradeneeded = ({ target: { result: db } }) => {
        if (!db.objectStoreNames.contains(DocumentStore.STORE_META))
          db.createObjectStore(DocumentStore.STORE_META);

        for (const [, conf] of stores) {
          if (!db.objectStoreNames.contains(conf.name))
            db.createObjectStore(conf.name, { keyPath: conf.keyPath });
        }
      };

      req.onsuccess = ({ target: { result: db } }) => { this.#db = db; resolve(db); };
      req.onerror   = ({ target: { error } })      => reject(error);
    });
  }

  /**
   * Wraps an {@link IDBRequest} in a Promise.
   * @template T
   * @param {IDBRequest<T>} req
   * @returns {Promise<T>}
   */
  #idb(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  /**
   * Opens a multi-store transaction and resolves when it commits.
   * @param {string|string[]}              stores
   * @param {IDBTransactionMode}           mode
   * @param {function(IDBTransaction):void} fn
   * @returns {Promise<void>}
   */
  async #tx(stores, mode, fn) {
    const db = await this.#openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(stores, mode);
      tx.oncomplete = () => resolve();
      tx.onerror    = ({ target: { error } }) => reject(error);
      tx.onabort    = () => reject(new Error('Transaction aborted'));
      fn(tx);
    });
  }

  // ── Meta store helpers ────────────────────────────────────────────────────

  async #getMeta(key) {
    const db = await this.#openDB();
    return this.#idb(
      db.transaction(DocumentStore.STORE_META, 'readonly')
        .objectStore(DocumentStore.STORE_META).get(key)
    );
  }

  async #setMeta(key, value) {
    const db = await this.#openDB();
    return this.#idb(
      db.transaction(DocumentStore.STORE_META, 'readwrite')
        .objectStore(DocumentStore.STORE_META).put(value, key)
    );
  }

  // ── Crypto helpers ────────────────────────────────────────────────────────

  /**
   * Retrieves the stored salt and derives the AES key for the given password.
   * @param {string} password
   * @returns {Promise<CryptoKey>}
   * @throws {Error} If the store has not been initialised.
   */
  async #getKey(password) {
    const saltB64 = await this.#getMeta('salt');
    if (!saltB64) throw new Error('Store not initialised — call init() first');
    return DocumentStoreUtils.deriveKey(password, DocumentStoreUtils.fromB64(saltB64));
  }

  /**
   * Verifies a derived key against the stored sentinel.
   * @param {CryptoKey} key
   * @returns {Promise<boolean>}
   */
  async #verifySentinel(key) {
    try {
      const sentinel = await this.#getMeta('sentinel');
      return (await DocumentStoreUtils.decrypt(key, sentinel)) === DocumentStore.#SENTINEL;
    } catch {
      return false;
    }
  }

  // ── Internal document helpers ─────────────────────────────────────────────

  /**
   * Fetches all raw (un-decrypted) documents from a store.
   * @param {string} storeName
   * @returns {Promise<object[]>}
   */
  async #getAllRaw(storeName) {
    const db = await this.#openDB();
    return this.#idb(
      db.transaction(storeName, 'readonly')
        .objectStore(storeName).getAll()
    );
  }

  /**
   * Encrypts the password-typed fields of a document.
   * @param {object}    doc
   * @param {string}    fieldsPath
   * @param {CryptoKey} key
   * @returns {Promise<object>}
   */
  async #encryptDoc(doc, fieldsPath, key) {
    const fields = await Promise.all((doc[fieldsPath] ?? []).map(async field => {
      if (field.type !== 'password') return field;
      return { ...field, value: await DocumentStoreUtils.encrypt(key, field.value) };
    }));
    return { ...doc, [fieldsPath]: fields };
  }

  /**
   * Decrypts the password-typed fields of a document.
   * @param {object}    doc
   * @param {string}    fieldsPath
   * @param {CryptoKey} key
   * @returns {Promise<object>}
   */
  async #decryptDoc(doc, fieldsPath, key) {
    const fields = await Promise.all((doc[fieldsPath] ?? []).map(async field => {
      if (field.type !== 'password') return field;
      return { ...field, value: await DocumentStoreUtils.decrypt(key, field.value) };
    }));
    return { ...doc, [fieldsPath]: fields };
  }

  // ── Password management (public) ──────────────────────────────────────────

  /**
   * Returns `true` if {@link init} has been called and the store is ready to use.
   * @returns {Promise<boolean>}
   */
  async isInitialized() {
    return (await this.#getMeta('salt')) !== undefined;
  }

  /**
   * One-time setup. Generates a random salt, derives the encryption key, and
   * persists the salt plus an encrypted sentinel for future password verification.
   *
   * Must be called exactly once before using any method that requires a password.
   * @param {string} password - Must satisfy {@link isValidPassword}.
   * @returns {Promise<void>}
   * @throws {Error} If already initialised or the password is invalid.
   */
  async init(password) {
    if (await this.isInitialized()) throw new Error('Store already initialized');
    if (!this.isValidPassword(password)) throw new Error('Password does not meet requirements');

    const salt     = crypto.getRandomValues(new Uint8Array(32));
    const key      = await DocumentStoreUtils.deriveKey(password, salt);
    const sentinel = await DocumentStoreUtils.encrypt(key, DocumentStore.#SENTINEL);

    await this.#setMeta('salt',     DocumentStoreUtils.toB64(salt));
    await this.#setMeta('sentinel', sentinel);
  }

  /**
   * Lexical password strength check. A valid password must be ≥ 12 characters
   * and contain at least one uppercase letter, one lowercase letter, one digit,
   * and one non-alphanumeric character.
   * @param {string} password
   * @returns {boolean}
   */
  isValidPassword(password) {
    if (typeof password !== 'string') return false;
    if (password.length < 12)         return false;
    if (!/[A-Z]/.test(password))      return false;
    if (!/[a-z]/.test(password))      return false;
    if (!/[0-9]/.test(password))      return false;
    if (!/[^A-Za-z0-9]/.test(password)) return false;
    return true;
  }

  /**
   * Returns `true` if `password` matches the one used to initialise the store.
   * @param {string} password
   * @returns {Promise<boolean>}
   */
  async verifyPassword(password) {
    try {
      const key = await this.#getKey(password);
      return await this.#verifySentinel(key);
    } catch {
      return false;
    }
  }

  /**
   * Re-encrypts every `'password'`-typed field from
   * `oldPassword` to `newPassword`. All crypto runs in memory first; a single
   * IndexedDB transaction then atomically commits the new state.
   * @param {string} oldPassword
   * @param {string} newPassword - Must satisfy {@link isValidPassword} and differ from `oldPassword`.
   * @returns {Promise<void>}
   * @throws {Error} If `oldPassword` is incorrect, `newPassword` is invalid, or both are equal.
   */
  async changePassword(oldPassword, newPassword) {
    if (!await this.verifyPassword(oldPassword))
      throw new Error('Incorrect current password');
    if (!this.isValidPassword(newPassword))
      throw new Error('New password does not meet requirements');
    if (oldPassword === newPassword)
      throw new Error('New password must differ from the current password');

    const oldKey     = await this.#getKey(oldPassword);
    const newSalt    = crypto.getRandomValues(new Uint8Array(32));
    const newKey     = await DocumentStoreUtils.deriveKey(newPassword, newSalt);
    const newSentinel = await DocumentStoreUtils.encrypt(newKey, DocumentStore.#SENTINEL);

    const stores = [...this.#config().values()];

    // Re-encrypt all docs in memory before touching IndexedDB
    const migratedByStore = await Promise.all(
      stores.map(async conf => {
        const raw = await this.#getAllRaw(conf.name);
        if (DocumentStoreUtils.hasPasswordFields(raw, conf.fieldsPath)){
          const migrated = await Promise.all(raw.map(async doc => {
            const decrypted = await this.#decryptDoc(doc, conf.fieldsPath, oldKey);
            return this.#encryptDoc(decrypted, conf.fieldsPath, newKey);
          }));
          return { conf, migrated };
        }
        else {
          return { conf, conf };
        }
      })
    );

    await this.#tx(
      [DocumentStore.STORE_META, ...stores.map(c => c.name)],
      'readwrite',
      tx => {
        const meta = tx.objectStore(DocumentStore.STORE_META);
        meta.put(DocumentStoreUtils.toB64(newSalt), 'salt');
        meta.put(newSentinel,               'sentinel');

        for (const { conf, migrated } of migratedByStore) {
          const store = tx.objectStore(conf.name);
          for (const doc of migrated) store.put(doc);
        }
      }
    );
  }

  // ── CRUD (public) ─────────────────────────────────────────────────────────

  /**
   * Returns `true` if a document with the given key exists in `storeName`.
   * @param {string} storeName
   * @param {*}      id        - Scalar, positional array, or named object (see key rules).
   * @returns {Promise<boolean>}
   */
  async exists(storeName, id) {
    const conf       = this.getStoreConfig(storeName);
    const normalisedId = this.#normaliseKey(id, conf.keyPath);
    const db         = await this.#openDB();
    const result     = await this.#idb(
      db.transaction(storeName, 'readonly')
        .objectStore(storeName).getKey(normalisedId)
    );
    return result !== undefined;
  }
  
  static #throwNewPasswordRequiredError(message){
    const error = new Error(message);
    error.name = DocumentStore.PASSWORD_REQUIRED_ERROR;
    throw error;
  }
  
  static isPasswordRequiredError(error){
    return error instanceof Error && error.name === DocumentStore.PASSWORD_REQUIRED_ERROR;
  }

  static #throwNewIncorrectPasswordError(message){
    const error = new Error(message);
    error.name = DocumentStore.INCORRECT_PASSWORD_ERROR;
    throw error;
  }

  static isIncorrectPasswordError(error){
    return error instanceof Error && error.name === DocumentStore.INCORRECT_PASSWORD_ERROR;
  }
  
  async getDocKey(doc, objectStoreConf, password){
    const fieldsPath = objectStoreConf.fieldsPath;
    const hasPasswordFields = DocumentStoreUtils.hasPasswordFields(doc, fieldsPath);
    if (hasPasswordFields) {
      if (!password) {
        DocumentStore.#throwNewPasswordRequiredError(`Document for store "${objectStoreConf.name}" has encrypted fields — password required.`);
      }
      const key = await this.#getKey(password);
      if (!await this.#verifySentinel(key)) {
        DocumentStore.#throwNewIncorrectPasswordError('Incorrect password');
      }
      return key;
    }
    return null;
  }

  /**
   * Retrieves a document by key, decrypting `'password'`-typed fields 
   * @param {string} storeName
   * @param {*}      id        - Scalar, positional array, or named object.
   * @param {string} [password] - Required for encrypted stores.
   * @returns {Promise<object|null>} The document, or `null` if not found.
   * @throws {Error} If the store is encrypted and `password` is incorrect or missing.
   */
  async get(storeName, id, password) {
    const objectStoreConf = this.getStoreConfig(storeName);
    const normalisedId = this.#normaliseKey(id, objectStoreConf.keyPath);

    const db  = await this.#openDB();
    let doc = await this.#idb(
      db.transaction(storeName, 'readonly')
        .objectStore(storeName).get(normalisedId)
    );
    if (!doc) {
      return null;
    }
    const key = await this.getDocKey(doc, objectStoreConf, password);
    if (key) {
      doc = this.#decryptDoc(doc, objectStoreConf.fieldsPath, key);
    }
    return doc;
  }

  /**
   * Persists a document, overwriting any existing document with the same key.
   * `'password'`-typed field values are encrypted 
   * @param {string} storeName
   * @param {object} doc
   * @param {string} [password] - Required for encrypted stores.
   * @returns {Promise<void>}
   * @throws {Error} If the store is encrypted and `password` is incorrect or missing.
   */
  async store(storeName, doc, password) {
    const objectStoreConf = this.getStoreConfig(storeName);
    const key = await this.getDocKey(doc, objectStoreConf, password);
    if (key) {
      doc = await this.#encryptDoc(doc, objectStoreConf.fieldsPath, key);
    }
    const db = await this.#openDB();
    return this.#idb(
      db.transaction(storeName, 'readwrite')
        .objectStore(storeName).put(doc)
    );
  }

  /**
   * Deletes a document by key. Does nothing if the document does not exist.
   * @param {string} storeName
   * @param {*}      id        - Scalar, positional array, or named object.
   * @returns {Promise<void>}
   */
  async remove(storeName, id) {
    const conf       = this.getStoreConfig(storeName);
    const normalisedId = this.#normaliseKey(id, conf.keyPath);
    const db         = await this.#openDB();
    return this.#idb(
      db.transaction(storeName, 'readwrite')
        .objectStore(storeName).delete(normalisedId)
    );
  }

  /**
   * Returns header summaries of all documents in `storeName`.
   * The fields included in each summary are determined by the store's
   * `headerFields` config (defaults to `['name', 'type']`).
   * No password is required; no encrypted values are included.
   * @param {string} storeName
   * @returns {Promise<object[]>}
   */
  async list(storeName) {
    const conf = this.getStoreConfig(storeName);
    const docs = await this.#getAllRaw(storeName);
    return docs.map(doc =>
      Object.fromEntries(conf.headerFields.map(f => [f, doc[f]]))
    );
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  /**
   * Clears all encrypted stores and the `meta` store (salt + sentinel),
   * effectively losing all secrets and requiring a fresh {@link init}.
   * Plain stores are left untouched.
   * @returns {Promise<void>}
   */
  async resetCrypto() {
    const encryptedStoreNames = [...this.#config().values()]
      .filter(c => {
        const docs = this.#getAllRaw(c.name);
        return docs.some( doc => DocumentStoreUtils.hasPasswordFields(doc, c.fieldsPath) )
      })
      .map(c => c.name);

    // TODO: only remove the encryptd docs.
    await this.#tx(
      [DocumentStore.STORE_META, ...encryptedStoreNames],
      'readwrite',
      tx => {
        tx.objectStore(DocumentStore.STORE_META).clear();
        for (const name of encryptedStoreNames)
          tx.objectStore(name).clear();
      }
    );
  }

  /**
   * Wipes every store, including plain ones, and clears `meta`.
   * The instance will be fully uninitialised afterwards.
   * @returns {Promise<void>}
   */
  async reset() {
    const allStoreNames = [...this.#config().keys()];
    await this.#tx(
      [DocumentStore.STORE_META, ...allStoreNames],
      'readwrite',
      tx => {
        tx.objectStore(DocumentStore.STORE_META).clear();
        for (const name of allStoreNames)
          tx.objectStore(name).clear();
      }
    );
  }
}


