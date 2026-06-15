class CatalogsDialog extends DocumentsDialog {

  parseDocumentSQL(sql){
    return AttachParser.parse(sql);
  }

  getDropDocumentSQL(name){
    if (!name){
      const documentObject = this.documentObject;
      name = documentObject.name;
    }
    return `DETACH DATABASE IF EXISTS ${quoteIdentifierWhenRequired(name)}`;
  }

  async createDuckDbDocument(documentObject){
    const fieldsPath = this.fieldsPath;
    const fields = documentObject[fieldsPath];
    const secretField = fields.filter(field => field.key === 'SECRET');
    if (secretField.length) {
      // TODO: make this nice. Should probably be a service performed by the secret dialog
      // should handle cases where the secret already EXISTS
      // should detect whether the secret cannot be found at all and prompt whether to continue
      const secretName = secretField[0].value;
      const secretDocument = await secretsDialog.getAndDecryptDocument(secretName);
      await secretsDialog.createDuckDbDocument(secretDocument);
      secretsDialog.clearPassword();
    }
    const result = await super.createDuckDbDocument(documentObject);
    if (!result) {
      return result;
    }
    const dsConfig = {
      type: DuckDbDataSource.types.CATALOG,
      definition: documentObject 
    };
    const hueyDb = window.hueyDb;
    const datasource = new DuckDbDataSource(hueyDb.duckdb, hueyDb.instance, dsConfig);
    datasource.addEventListener('destroy', this.updateDocumentsList.bind(this));
    await datasourcesUi.addDatasource(datasource);
    return result;
  }

  getCreateDocumentSQL(documentObject){
    documentObject = documentObject || this.documentObject;
    const fieldsPath = this.fieldsPath;
    const fields = documentObject[fieldsPath].map(field => {
      const pair = this.fieldValuePairAsSQL(field)
      if (!pair || !pair.length) return '';
      return `\r\n, ${pair}`;
    });

    return [
      `ATTACH ${quoteStringLiteral(documentObject.url)}`,
      `AS ${quoteIdentifierWhenRequired(documentObject.name)} (`,
      `  TYPE ${documentObject.type}${fields.join('')}`,
      ')'
    ].join('\r\n');
  }

  async handleCreateDuckDbDocumentError(error){
    const message = error.message;
    const regexp = /Invalid Configuration Error: Could not find a valid storage secret ([^)]+)/;
    const match = regexp.exec(message);
    
    return false;
  }

  async getDuckDbDatabases(){
    const obj = {};
    const connection = window.hueyDb.connection;
    const result = await connection.query(`SELECT * FROM duckdb_databases() WHERE database_name != 'memory' AND internal != TRUE`);
    const n = result.numRows;
    for (let i = 0; i < n; i++){
      const row = result.get(i);
      const name = row['database_name'];
      const type = row['type'];
      obj[name] = type;
    }
    return obj;
  }

  async updateDocumentsList(selectedDocument){
    const documentsList = this.documentsList;
    if (!selectedDocument) {
      const selectedIndex = documentsList.selectedIndex;
      selectedDocument = selectedIndex === -1 ? undefined : documentsList.options[selectedIndex].value;
    }
    const duckdbDatabases = await this.getDuckDbDatabases();
    const store = AppDocumentStore.store;

    let docs = await store.list( this.objectStoreName );
    docs = docs.sort((a,b) => {
      if (a.type > b.type) {
        return 1;
      }
      if (a.type < b.type) {
        return -1;
      }
      if (a.name > b.name) {
        return 1;
      }
      if (a.name < b.name) {
        return -1;
      }
      return 0;
    });

    const items = [];
    let type;
    docs.forEach( documentObject => {
      if (documentObject.type !== type) {
        if (items.length) {
          items.push('</optgroup>');
        }
        type = documentObject.type;
        items.push(`<optgroup label="${type}">`);
      }
      const loaded = duckdbDatabases[documentObject.name] !== undefined;
      const selected = documentObject.name === selectedDocument ? ' selected="true"' : '';
      items.push(`<option data-loaded="${loaded}" ${selected}>${documentObject.name}</option>`);
    });
    if (items.length) {
      items.push('</optgroup>');
    }
    documentsList.innerHTML = items.join('\n');
  }

  constructor(config){
    config = Object.assign({}, config, {
      dialogId: 'catalogsDialog',
      objectStoreName: AppDocumentStore.STORE_CATALOGS,
      title: 'Catalogs Manager',
      toolsTemplateId: 'catalogsDialogToolsTemplate',
      headerTemplateId: 'catalogHeaderTemplate',
      keysDataListId: 'catalog-keys'
    });
    super(config);
  }

}

let catalogsDialog;

function initCatalogsDialog(){
  catalogsDialog = new CatalogsDialog();
}