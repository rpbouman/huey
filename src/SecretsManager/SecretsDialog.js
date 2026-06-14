class SecretsDialog extends DocumentsDialog {
  
  get changePasswordButton(){
    return this.getMainToolbarControl( 'button[name=changePassword]' );
  }

  get resetSecretsStoreButton(){
    return this.getMainToolbarControl( 'button[name=resetSecretsStore]' );
  }
    
  parseDocumentSQL(sql){
    return CreateSecretParser.parse(sql);
  }
     
  getDropDocumentSQL(name){
    if (!name){
      const documentObject = this.documentObject;
      name = documentObject.name;
    }
    return `DROP SECRET IF EXISTS ${quoteIdentifierWhenRequired(name)}`;
  }

  getCreateDocumentSQL(documentObject){
    documentObject = documentObject || this.documentObject;
    const fields = documentObject.fields.map(field => {
      return `\r\n, ${this.fieldValuePairAsSQL(field)}`;
    });
    
    return [
      'CREATE OR REPLACE',
      `TEMPORARY SECRET ${quoteIdentifierWhenRequired(documentObject.name)} (`,
      `  TYPE ${documentObject.type}${fields.join('')}`,
      ')'
    ].join('\r\n');
  }
  
  async handleCreateDuckDbDocumentError(error){
    const message = error.message;
    const regexp = /Secret type '(?<secretType>[^']+)' does not exist, but it exists in the (?<extensionName>[^\s]+) extension/;
    const match = regexp.exec(message);
    
    if (!match) {
      throw error;
    }
    
    const secretType = match.groups['secretType'];
    const extensionName = match.groups['extensionName'];
        
    try{
      await ensureDuckDbExtensionLoadedAndInstalled(extensionName);
    }
    catch(e) {
      console.error(e);
      showErrorDialog({
        title: Internationalization.getText('Error loading the "{1}" extension', extensionName),
        description: Internationalization.getText(
          'The secret type "{1}" requires installation of the "{2}" extension, but an attempt to load the extension failed.', 
          secretType, 
          extensionName
        )
      });
      return false;
    }
    return true;
  }

  async getDuckDbSecrets(){
    const obj = {};
    const connection = window.hueyDb.connection;
    const result = await connection.query('SELECT * FROM duckdb_secrets()');
    const n = result.numRows;
    for (let i = 0; i < n; i++){
      const row = result.get(i);
      const name = row['name'];
      const type = row['type'];
      obj[name] = type;
    }
    return obj;
  }
   
  async updateDocumentsList(selectedDocument){
    const duckdbSecrets = await this.getDuckDbSecrets();
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
      const loaded = duckdbSecrets[documentObject.name] !== undefined;
      const selected = documentObject.name === selectedDocument ? ' selected="true"' : '';
      items.push(`<option data-loaded="${loaded}" ${selected}>${documentObject.name}</option>`);
    });
    if (items.length) {
      items.push('</optgroup>');
    }
    
    this.#updateSecretsDataList(docs);
    
    this.documentsList.innerHTML = items.join('\n');
  }
  
  #updateSecretsDataList(docs){
    const secretsList = byId('secrets-list');
    secretsList.innerHTML = docs.sort((a,b) => {
      a = a.name
      const A = a.toUpperCase();
      b = b.name;
      const B = b.toUpperCase();
      if (A > B){
        return 1;
      }
      else 
      if (A < B) {
        return -1;
      }
      else 
      if (a > b){
        return 1;
      }
      else 
      if (a < b) {
        return -1;
      }
      return 0;
    }).map(doc => createEl('option', {label: doc.name, value: doc.name}, doc.name).outerHTML).join('');
  }

  initEvents(){
    super.initEvents();
    this.changePasswordButton.addEventListener('click', event => this.handleChangePasswordClicked(event) );
    this.resetSecretsStoreButton.addEventListener('click', event => this.handleResetSecretsStoreClicked(event) );
  }

  constructor(config){
    config = Object.assign({}, config, {
      dialogId: 'secretsDialog',
      objectStoreName: AppDocumentStore.STORE_SECRETS,
      title: 'Secrets Manager',
      toolsTemplateId: 'secretsDialogToolsTemplate',
      headerTemplateId: 'secretHeaderTemplate',
      keysDataListId: 'secret-keys',
      keyValuePairsRequired: true
    });
    super(config);
  }
    
}

let secretsDialog;

function initSecretsDialog(){
  secretsDialog = new SecretsDialog();
}