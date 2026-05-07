/**
 * @typedef {Object} SecretField
 * @property {string} name   - Field name.
 * @property {string} type   - Field type. Use `'password'` to mark a value for encryption.
 * @property {string} value  - Field value. Encrypted at rest when type is `'password'`.
 */

/**
 * @typedef {Object} SecretDocument
 * @property {string}        name   - Unique document name (used as the primary key).
 * @property {string}        type   - Document type / category (e.g. `'login'`, `'note'`).
 * @property {SecretField[]} fields - Ordered list of fields belonging to this document.
 */

/**
 * @typedef {Object} DocumentSummary
 * @property {string} name - Document name.
 * @property {string} type - Document type.
 */

/**
 * Persistent, encrypted secrets store backed by IndexedDB and the Web Crypto API.
 *
 * All `'password'`-typed field values are encrypted with AES-GCM-256. The
 * encryption key is derived from the store password using PBKDF2-SHA-256
 * (310 000 iterations). A random 32-byte salt and an encrypted sentinel value
 * are persisted in a `meta` object store so that the password can be verified
 * without storing it or the derived key anywhere.
 *
 * @example
 * const store = new SecretsStore();
 * if (!await store.isInitialized()) await store.init('MyP@ssw0rd!1');
 *
 * await store.store({
 *   name: 'github',
 *   type: 'login',
 *   fields: [
 *     { name: 'username', type: 'text',     value: 'alice' },
 *     { name: 'password', type: 'password', value: 's3cr3t' },
 *   ]
 * }, 'MyP@ssw0rd!1');
 *
 * const doc = await store.get('github', 'MyP@ssw0rd!1');
 * // doc.fields[1].value === 's3cr3t'  (decrypted)
 */
class SecretsStore {
  static DB_NAME    = 'secrets-store';
  static DB_VERSION = 1;
  static STORE_DOCS = 'documents';
  static STORE_META = 'meta';
  static SENTINEL   = 'SECRETS_STORE_V1_VALID';
  static KDF_ITERS  = 310_000;

  /** @type {IDBDatabase|null} */
  #db = null;

  static #instance = undefined;
  static get store(){
    if (SecretsStore.#instance === undefined) {
      SecretsStore.#instance = new SecretsStore();
    }
    return SecretsStore.#instance;
  }
  // ── IndexedDB plumbing ────────────────────────────────────────────────────

  /**
   * Opens (and if necessary creates) the IndexedDB database.
   * The result is cached; subsequent calls return the same connection.
   * @returns {Promise<IDBDatabase>}
   */
  async #openDB() {
    if (this.#db) return this.#db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(SecretsStore.DB_NAME, SecretsStore.DB_VERSION);
      req.onupgradeneeded = ({ target: { result: db } }) => {
        if (!db.objectStoreNames.contains(SecretsStore.STORE_META))
          db.createObjectStore(SecretsStore.STORE_META);
        if (!db.objectStoreNames.contains(SecretsStore.STORE_DOCS))
          db.createObjectStore(SecretsStore.STORE_DOCS, { keyPath: 'name' });
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
   * @param {string|string[]}                          stores - One or more object store names.
   * @param {IDBTransactionMode}                       mode   - `'readonly'` or `'readwrite'`.
   * @param {function(IDBTransaction): void}           fn     - Synchronous setup function that
   *   queues all requests against the transaction before it auto-commits.
   * @returns {Promise<void>} Resolves on commit, rejects on error or abort.
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

  // ── Encoding helpers ──────────────────────────────────────────────────────

  /**
   * @param {string} str
   * @returns {Uint8Array}
   */
  #encode(str) { return new TextEncoder().encode(str); }

  /**
   * @param {ArrayBuffer} buf
   * @returns {string}
   */
  #decode(buf) { return new TextDecoder().decode(buf); }

  /**
   * @param {ArrayBuffer|Uint8Array} buf
   * @returns {string} Base64-encoded string.
   */
  #toB64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  }

  /**
   * @param {string} str - Base64-encoded string.
   * @returns {Uint8Array}
   */
  #fromB64(str) {
    return Uint8Array.from(atob(str), c => c.charCodeAt(0));
  }

  // ── Crypto helpers ────────────────────────────────────────────────────────

  /**
   * Derives a non-extractable AES-GCM-256 key from a password and salt
   * using PBKDF2-SHA-256.
   * @param {string}     password
   * @param {Uint8Array} salt - Random 32-byte salt.
   * @returns {Promise<CryptoKey>}
   */
  async #deriveKey(password, salt) {
    const raw = await crypto.subtle.importKey(
      'raw', this.#encode(password), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: SecretsStore.KDF_ITERS, hash: 'SHA-256' },
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
  async #encrypt(key, plaintext) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      this.#encode(plaintext)
    );
    return `${this.#toB64(iv)}:${this.#toB64(ct)}`;
  }

  /**
   * Decrypts a token produced by {@link #encrypt}.
   * AES-GCM authentication guarantees that a wrong key or tampered ciphertext
   * throws rather than returning corrupt data.
   * @param {CryptoKey} key
   * @param {string}    token - A `"<iv>:<ciphertext>"` token.
   * @returns {Promise<string>} The original plaintext.
   * @throws {DOMException} If the key is incorrect or the ciphertext is tampered.
   */
  async #decrypt(key, token) {
    const [ivB64, ctB64] = token.split(':');
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: this.#fromB64(ivB64) },
      key,
      this.#fromB64(ctB64)
    );
    return this.#decode(plain);
  }

  // ── Meta store helpers ────────────────────────────────────────────────────

  /**
   * Reads a value from the `meta` object store.
   * @param {string} key
   * @returns {Promise<string|undefined>}
   */
  async #getMeta(key) {
    const db = await this.#openDB();
    return this.#idb(
      db.transaction(SecretsStore.STORE_META, 'readonly')
        .objectStore(SecretsStore.STORE_META).get(key)
    );
  }

  /**
   * Writes a value to the `meta` object store.
   * @param {string} key
   * @param {string} value
   * @returns {Promise<void>}
   */
  async #setMeta(key, value) {
    const db = await this.#openDB();
    return this.#idb(
      db.transaction(SecretsStore.STORE_META, 'readwrite')
        .objectStore(SecretsStore.STORE_META).put(value, key)
    );
  }

  // ── Internal key retrieval ────────────────────────────────────────────────

  /**
   * Retrieves the stored salt and derives the AES key for the given password.
   * @param {string} password
   * @returns {Promise<CryptoKey>}
   * @throws {Error} If the store has not been initialized.
   */
  async #getKey(password) {
    const saltB64 = await this.#getMeta('salt');
    if (!saltB64) throw new Error('Store not initialized — call init() first');
    return this.#deriveKey(password, this.#fromB64(saltB64));
  }

  /**
   * Verifies a derived key against the stored sentinel without re-running PBKDF2.
   * Prefer this over {@link verifyPassword} when the key is already in hand.
   * @param {CryptoKey} key
   * @returns {Promise<boolean>}
   */
  async #verifySentinel(key) {
    try {
      const sentinel = await this.#getMeta('sentinel');
      const decoded  = await this.#decrypt(key, sentinel);
      return decoded === SecretsStore.SENTINEL;
    } catch {
      return false;
    }
  }

  /**
   * Fetches all documents from the store without decrypting any fields.
   * @returns {Promise<SecretDocument[]>}
   */
  async #getAllRaw() {
    const db = await this.#openDB();
    return this.#idb(
      db.transaction(SecretsStore.STORE_DOCS, 'readonly')
        .objectStore(SecretsStore.STORE_DOCS).getAll()
    );
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Returns `true` if {@link init} has been called and the store is ready to use.
   * @returns {Promise<boolean>}
   */
  async isInitialized() {
    return (await this.#getMeta('salt')) !== undefined;
  }

  /**
   * One-time setup. Generates a random salt, derives the encryption key from
   * `password`, and persists the salt plus an encrypted sentinel used by
   * {@link verifyPassword} for all future password checks.
   *
   * Must be called exactly once before any other method that requires a password.
   * @param {string} password - Must satisfy {@link isValidPassword}.
   * @returns {Promise<void>}
   * @throws {Error} If the store is already initialized or the password is invalid.
   */
  async init(password) {
    if (await this.isInitialized()) throw new Error('Store already initialized');
    if (!this.isValidPassword(password)) throw new Error('Password does not meet requirements');

    const salt     = crypto.getRandomValues(new Uint8Array(32));
    const key      = await this.#deriveKey(password, salt);
    const sentinel = await this.#encrypt(key, SecretsStore.SENTINEL);

    await this.#setMeta('salt',     this.#toB64(salt));
    await this.#setMeta('sentinel', sentinel);
  }

  /**
   * Lexical password strength check. A valid password must be at least 12
   * characters and contain at least one uppercase letter, one lowercase letter,
   * one digit, and one non-alphanumeric character.
   * @param {string} password
   * @returns {boolean}
   */
  isValidPassword(password) {
    if (typeof password !== 'string') return false;
    if (password.length < 12)        return false;
    if (!/[A-Z]/.test(password))     return false;
    if (!/[a-z]/.test(password))     return false;
    if (!/[0-9]/.test(password))     return false;
    if (!/[^A-Za-z0-9]/.test(password)) return false;
    return true;
  }

  /**
   * Returns `true` if `password` is the password currently used to encrypt
   * the store. Verification is performed by re-deriving the key and attempting
   * to decrypt the stored sentinel; a wrong key causes an AES-GCM authentication
   * failure, which is caught and returned as `false`.
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
   * Re-encrypts every `'password'`-typed field from `oldPassword` to `newPassword`
   * and updates the stored salt and sentinel. All crypto runs in memory first;
   * a single IndexedDB transaction then atomically commits the new state so there
   * is no window where documents are partially migrated.
   * @param {string} oldPassword - The current store password.
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

    const oldKey  = await this.#getKey(oldPassword);
    const newSalt = crypto.getRandomValues(new Uint8Array(32));
    const newKey  = await this.#deriveKey(newPassword, newSalt);

    const allDocs  = await this.#getAllRaw();
    const migrated = await Promise.all(allDocs.map(async doc => {
      const fields = await Promise.all(doc.fields.map(async field => {
        if (field.type !== 'password') return field;
        const plain = await this.#decrypt(oldKey, field.value);
        const enc   = await this.#encrypt(newKey, plain);
        return { ...field, value: enc };
      }));
      return { ...doc, fields };
    }));

    const newSentinel = await this.#encrypt(newKey, SecretsStore.SENTINEL);

    await this.#tx(
      [SecretsStore.STORE_META, SecretsStore.STORE_DOCS],
      'readwrite',
      tx => {
        const meta = tx.objectStore(SecretsStore.STORE_META);
        meta.put(this.#toB64(newSalt), 'salt');
        meta.put(newSentinel,          'sentinel');

        const docs = tx.objectStore(SecretsStore.STORE_DOCS);
        for (const doc of migrated) docs.put(doc);
      }
    );
  }

  /**
   * Returns `true` if a document with the given name exists in the store.
   * @param {string} name
   * @returns {Promise<boolean>}
   */
  async exists(name) {
    const db  = await this.#openDB();
    const key = await this.#idb(
      db.transaction(SecretsStore.STORE_DOCS, 'readonly')
        .objectStore(SecretsStore.STORE_DOCS).getKey(name)
    );
    return key !== undefined;
  }

  /**
   * Retrieves a document by name, decrypting all `'password'`-typed field values.
   * @param {string} name
   * @param {string} password
   * @returns {Promise<SecretDocument|null>} The decrypted document, or `null` if not found.
   * @throws {Error} If `password` is incorrect.
   */
  async get(name, password) {
    const key = await this.#getKey(password);
    if (!await this.#verifySentinel(key)) throw new Error('Incorrect password');

    const db  = await this.#openDB();
    const doc = await this.#idb(
      db.transaction(SecretsStore.STORE_DOCS, 'readonly')
        .objectStore(SecretsStore.STORE_DOCS).get(name)
    );
    if (!doc) return null;

    const fields = await Promise.all(doc.fields.map(async field => {
      if (field.type !== 'password') return field;
      return { ...field, value: await this.#decrypt(key, field.value) };
    }));
    return { ...doc, fields };
  }

  /**
   * Deletes a document by name. Does nothing if the document does not exist.
   * No password is required; the caller is responsible for any authorization checks.
   * @param {string} name
   * @returns {Promise<void>}
   */
  async remove(name) {
    const db = await this.#openDB();
    return this.#idb(
      db.transaction(SecretsStore.STORE_DOCS, 'readwrite')
        .objectStore(SecretsStore.STORE_DOCS).delete(name)
    );
  }

  /**
   * Persists a document, overwriting any existing document with the same name.
   * Field values with `type === 'password'` are encrypted before storage;
   * all other field values are stored as-is.
   * @param {SecretDocument} secretDocument
   * @param {string}         password
   * @returns {Promise<void>}
   * @throws {Error} If `password` is incorrect.
   */
  async store(secretDocument, password) {
    const key = await this.#getKey(password);
    if (!await this.#verifySentinel(key)) throw new Error('Incorrect password');

    const fields = await Promise.all(secretDocument.fields.map(async field => {
      if (field.type !== 'password') return field;
      return { ...field, value: await this.#encrypt(key, field.value) };
    }));

    const db = await this.#openDB();
    return this.#idb(
      db.transaction(SecretsStore.STORE_DOCS, 'readwrite')
        .objectStore(SecretsStore.STORE_DOCS).put({ ...secretDocument, fields })
    );
  }

  /**
   * Returns a summary of all stored documents — name and type only.
   * No password is required; no sensitive data is included.
   * @returns {Promise<DocumentSummary[]>}
   */
  async list() {
    const docs = await this.#getAllRaw();
    return docs.map(({ name, type, autoload }) => ({ name, type, autoload }));
  }

  /**
   * Wipes the entire store — all documents, the salt, and the sentinel.
   * The store will be uninitialized afterwards; call {@link init} to reuse it.
   * @returns {Promise<void>}
   */
  async reset() {
    await this.#tx(
      [SecretsStore.STORE_META, SecretsStore.STORE_DOCS],
      'readwrite',
      tx => {
        tx.objectStore(SecretsStore.STORE_META).clear();
        tx.objectStore(SecretsStore.STORE_DOCS).clear();
      }
    );
  }
}
