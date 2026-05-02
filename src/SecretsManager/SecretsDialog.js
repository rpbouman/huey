class SecretsDialog {
  
  static #secretsDialogId = 'secretsDialog';
  #highlited = undefined;
  #hilitedPerhipherals = undefined;
  #resizeObserver = undefined;

  get dialog(){
    return byId( SecretsDialog.#secretsDialogId );
  }
  
  get #secretKeyValueUiTemplate(){
    return byId('secretKeyValueUi');
  }

  get #secretEditingActiveCheckbox(){
    return byId('secretEditingActive');
  }
  
  get #secretUnsavedChangesCheckbox(){
    return byId('secretUnsavedChanges');
  }

  get #createNewSecretButton(){
    return byId('createNewSecret');
  }

  get #removeCurrentSecretButton(){
    return byId('removeCurrentSecret');
  }

  get #saveCurrentSecretButton(){
    return byId('saveCurrentSecret');
  }

  get #restoreCurrentSecretButton(){
    return byId('restoreCurrentSecret');
  }

  get #secretsList(){
    return byId('secretsList');
  }

  get #keyValuesFieldset(){
    return byId('secretKeyValueFieldset');
  }  
  
  get #secretNameInput(){
    return byId('secretName');
  }

  get #secretTypeInput(){
    return byId('secretType');
  }

  get #formElement(){
    return byId( 'secretForm' );
  }
  
  get #secretCode(){
    return byId('secretCode');
  }
  
  get #secretCodeTab(){
    return byId('secretCodeTab');
  }

  get #secretFormTab(){
    return byId('secretFormTab');
  }
  
  static get #secretTypesDatalist(){
    return byId('secret-types');
  }

  static get #secretKeysDatalist(){
    return byId('secret-keys');
  }
    
  #getDefaultDataypeForSecretKey(secretKey){
    const listElement = SecretsDialog.#secretKeysDatalist;
    for (let option of listElement.options) {
      const optionValue = option.value;
      if (optionValue !== secretKey){
        continue;
      }
      const defaultType = option.getAttribute('data-default-type');
      return defaultType;
    }
    return undefined;
  }
  
  static #selectOption(selectElement, value) {
    const options = selectElement.options;
    for (let i = 0; i < options.length; i++ ){
      const option = options[i];
      if (option.value === value){
        selectElement.selectedIndex = i;
        return;
      }
    }
  }

  get #secretDocument(){
    const secretName = this.#secretNameInput.value;
    const secretType = this.#secretTypeInput.value;
    const secretDocument = {
      name: secretName,
      type: secretType,
      fields: []
    };
    const fieldSet = this.#keyValuesFieldset;
    const fieldContainers = fieldSet.querySelectorAll('div');
    const n = fieldContainers.length;
    for (let i = 0; i < n; i++){
      let fieldContainer = fieldContainers[i];
      let indented = SecretsDialog.#isFieldIndented(fieldContainer);
      if (indented) {
        throw new Error(`unexpected`);
      }
      let fieldType = SecretsDialog.#getFieldType(fieldContainer);
      let fieldKey = SecretsDialog.#getFieldKey(fieldContainer);
      let fieldValue = SecretsDialog.#getFieldValue(fieldContainer);
      let value;
      switch (fieldType) {
        case 'checkbox':
        case 'password':
        case 'text':
          value = fieldValue;
          break;
        case 'list':
        case 'map':
          value = [];
          break;
      }
      secretDocument.fields.push({
        key: fieldKey,
        type: fieldType,
        value: value
      });
      
      if (typeof value !== 'object') {
        continue;
      }
      
      for (let j = i+1; j < n; j++){
        fieldContainer = fieldContainers[j];
        indented = SecretsDialog.#isFieldIndented(fieldContainer);
        if (!indented) {
          continue;
        }
        i = j;
        const subValue = SecretsDialog.#getFieldValue(fieldContainer);
        const subType = SecretsDialog.#getFieldType(fieldContainer);
        let subKey;
        switch(fieldType){
          case 'list':
            subKey = value.length;
            SecretsDialog.#setFieldKey(fieldContainer,  String.fromCharCode( 65 + subKey ) );
            break;
          case 'map':
            subKey = SecretsDialog.#getFieldKey(fieldContainer);
            break;
        }
        value.push({
          key: subKey, 
          type: subType,
          value: subValue
        })
      }
    }
    return secretDocument;
  }
  
  static #fieldValueAsSQL(field){
    let value;
    switch (field.type) {
      case 'checkbox':
        value = field.value;
        break;
      case 'text':
      case 'password':
        value = quoteStringLiteral(field.value);
        break;
      case 'list':
        const arrayValue = field.value.map(
          subField => SecretsDialog.#fieldValueAsSQL(subField)
        ).join(', ')
        value = `[${arrayValue}]`;
        break;
      case 'map':
        const objectValue = field.value.map(
          subField => SecretsDialog.#fieldValuePairAsSQL(subField)
        ).join('\n, ');
        value = `MAP { 
          ${objectValue} 
        }`;
        break;
    }
    return value;
  }
  
  static #fieldValuePairAsSQL(field){
    return `${quoteIdentifierWhenRequired(field.key)} ${SecretsDialog.#fieldValueAsSQL(field)}`
  }
  
  #getDropSecretSQL(){
    const secretDocument = this.#secretDocument;
    return `DROP SECRET  EXISTS ${quoteIdentifierWhenRequired(secretDocument.name)}`;
  }

  #getCreateSecretSQL(){
    const secretDocument = this.#secretDocument;
    const fields = secretDocument.fields.map(field => {
      const key = field.key;
      const value = SecretsDialog.#fieldValueAsSQL(field);
      return `\r\n, ${SecretsDialog.#fieldValuePairAsSQL(field)}`;
    });
    
    return [
      'CREATE OR REPLACE',
      'TEMPORARY SECRET',
      `IF NOT EXISTS ${quoteIdentifierWhenRequired(secretDocument.name)}(`,
      `  TYPE ${secretDocument.type}${fields.join('')}`,
      ')'
    ].join('\r\n');
  }

  #setCheckboxState(checkbox, state){
    if (checkbox.checked !== Boolean(state)){
      checkbox.click();
    }
  }
  
  #instantiateKeyValueUi(){
    return instantiateTemplate( this.#secretKeyValueUiTemplate.id );
  }
  
  #newKeyValueUi(beforeElement){
    const newKeyValueUi = this.#instantiateKeyValueUi();
    const container = this.#secretKeyValueUiTemplate.parentNode;
    if (beforeElement){
      container.insertBefore(newKeyValueUi, beforeElement);
    }
    else {
      container.appendChild(newKeyValueUi);
    }
    return newKeyValueUi;
  }
  
  #handleSecretsListChanged(event){
    // there is no selection, clean up the form
    // if there is a selection, then sync the form with the associated document.
  }
  
  #handleCreateNewSecretClicked(event){
    this.#newKeyValueUi();
    this.#setCheckboxState(this.#secretEditingActiveCheckbox, true);
    this.#setCheckboxState(this.#secretUnsavedChangesCheckbox, true);
  }
  
  #handlerRemoveCurrentSecretClicked(event){
    this.#setCheckboxState(this.#secretEditingActiveCheckbox, false);
    this.#setCheckboxState(this.#secretUnsavedChangesCheckbox, true);
  }
  
  #handleRestoreCurrentSecretClicked(event){
    // todo: 
    // - if there is a secret selected in the list, then retrieve it and sync the form with the (old) stored version
    // - if there is no selection in the list, then clean up the form
    // (after changing the form, update the code.)
    this.#setCheckboxState(this.#secretUnsavedChangesCheckbox, false);
  }
  
  async #handleSaveCurrentSecretClicked(event){
    try {
      const connection = window.hueyDb.connection;

      const dropSql = this.#getDropSecretSQL();
      await connection.query( dropSql ); 

      const createSql = this.#getCreateSecretSQL();
      await connection.query( createSql ); 
      
      
      
      this.#setCheckboxState(this.#secretUnsavedChangesCheckbox, false);
    }
    catch (error) {
      alert(error);
      console.log(error.stack);
    }
  }
  
  static #getFieldIndentCheckbox(fieldContainer) {
    return fieldContainer.querySelector('span > menu > label > input[name=indent]');
  }

  static #isFieldIndented(fieldContainer){
    return SecretsDialog.#getFieldIndentCheckbox(fieldContainer).checked;
  }
  
  static #indentField(fieldContainer, indent) {
    SecretsDialog.#getFieldIndentCheckbox(fieldContainer).checked = Boolean(indent);
  }
  
  static #getFieldType(fieldContainer) {
    return fieldContainer.querySelector('span > select[name=type] ').value;
  }

  static #getFieldKey(fieldContainer) {
    return fieldContainer.querySelector('span > input[name=key] ').value;
  }

  static #getFieldValue(fieldContainer) {
    const element = fieldContainer.querySelector('span > input[name=value]');
    return element.type === 'checkbox' ? element.checked : element.value;
  }

  static #setFieldKey(fieldContainer, value) {
    const element = fieldContainer.querySelector('span > input[name=key]');
    element.value = value;
  }

  #handleFieldClicked(event) {
    const target = event.target;
    if (target.tagName !== 'BUTTON'){
      return;
    }
    //                      button  label     menubar   span        div
    const fieldContainer = target.parentNode.parentNode.parentNode.parentNode;
    const fieldsContainer = fieldContainer.parentNode;

    let referenceFieldContainer;
    switch (target.value) {
      case 'up':
        referenceFieldContainer = fieldContainer.previousSibling;
        break;
      case 'down':
        referenceFieldContainer = fieldContainer.nextSibling;
        if (referenceFieldContainer ) {
          referenceFieldContainer = referenceFieldContainer.nextSibling;
        }
        break;
    }
    
    if (referenceFieldContainer && referenceFieldContainer.tagName !== 'DIV'){
      referenceFieldContainer = null;
    }

    let move;
    switch (target.value) {
      case 'add':
        const newKeyValueId = this.#newKeyValueUi( fieldContainer.nextSibling );
        const fieldType = SecretsDialog.#getFieldType( fieldContainer );
        
        // if the field from where we're creating the new field is indented, or is a composite, 
        // then the new field is automatically indented (i.e. it becomes an item of the previous composite)
        if (
          SecretsDialog.#isFieldIndented( fieldContainer ) || 
          ['list', 'map'].includes( fieldType ) 
        ) {
          SecretsDialog.#indentField( newKeyValueId, true );
        }
        break;
      case 'up':
      case 'down':
        move = true;
      case 'remove':
        fieldsContainer.removeChild(fieldContainer);
    }
    
    if (move) {
      // TODO: keep items of composites together when moving
      if (referenceFieldContainer) {
        fieldsContainer.insertBefore(fieldContainer, referenceFieldContainer);
      }
      else {
        fieldsContainer.appendChild(fieldContainer);
      }
    }
  }
  
  #handleFieldTypeChanged(event){
    const target = event.target;
    let inputType;
    switch (target.value) {
      case 'checkbox':
      case 'text':
      case 'password':
        inputType = target.value;
        break;
      case 'list':
      case 'map':
        inputType = 'hidden';
        break;
    }
    target.parentNode.nextElementSibling.firstElementChild.type = inputType;
  }
  
  #handleKeyFieldChanged(event){
    const keyField = event.target;
    const key = keyField.value;
    const dataType = this.#getDefaultDataypeForSecretKey(key);
    if (!dataType) {
      return;
    }
    const fieldDiv = keyField.parentNode.parentNode;
    const fieldTypeSelect = fieldDiv.querySelector('SELECT');
    SecretsDialog.#selectOption(fieldTypeSelect, dataType);
    this.#handleFieldTypeChanged({target: fieldTypeSelect});
  }
  
  #handleFieldChanged(event) {
    const target = event.target;
    switch (target.tagName){
      case 'INPUT':
        if (target.list && target.list.id === 'secret-keys'){
          this.#handleKeyFieldChanged(event);
        }
        break;
      case 'SELECT':
        this.#handleFieldTypeChanged(event);
        break;
    }
  }
  
  #secretTypeInputChanged(event){
    const secretTypeInput = event.target;
    const secretType = secretTypeInput.value;
    const secretKeysDatalist = SecretsDialog.#secretKeysDatalist;
    const options = secretKeysDatalist.options;
    for (let i = 0; i < options.length; i++){
      const option  = options[i];
      const attribute = option.getAttribute('data-associated-secret-types');
      const associatedSecretTypes = attribute.split(',');
      if (associatedSecretTypes.includes(secretType)){
        option.removeAttribute('disabled');
      }
      else {
        option.setAttribute('disabled', true);
      }
    }
  }
  
  #secretCodeTabChanged(event) {
    const target = event.target;
    if (target.checked) {
      this.#syncSecretCode();
    }
  }

  #secretFormTabChanged(event) {
    const target = event.target;
  }
  
  #syncCodeInterval = undefined;
  #syncCodeIntervalFrequency = 100;

  #syncSecretCode(){
    const sql = this.#getCreateSecretSQL();
    //this.#secretCode.textContent = sql;
    this.#highlited.setText(sql);
  }
    
  #handleResize(entries){
    this.#hilitedPerhipherals.resetGutter();
  }
    
  #initEvents(){
    const dialog = this.dialog;
    this.#secretTypeInput.addEventListener('change', event => this.#secretTypeInputChanged(event) );
    this.#createNewSecretButton.addEventListener('click', event => this.#handleCreateNewSecretClicked(event) );
    this.#removeCurrentSecretButton.addEventListener('click', event => this.#handlerRemoveCurrentSecretClicked(event) );
    this.#saveCurrentSecretButton.addEventListener('click', event => this.#handleSaveCurrentSecretClicked(event) );
    this.#restoreCurrentSecretButton.addEventListener('click', event => this.#handleRestoreCurrentSecretClicked(event) );
    this.#secretsList.addEventListener('change', event => this.#handleSecretsListChanged(event) );
    this.#keyValuesFieldset.addEventListener('click', event => this.#handleFieldClicked(event) ); 
    this.#keyValuesFieldset.addEventListener('change', event => this.#handleFieldChanged(event) ); 
    this.#secretCodeTab.addEventListener('change', event => this.#secretCodeTabChanged(event) );
    this.#secretFormTab.addEventListener('change', event => this.#secretFormTabChanged(event) );
    
    this.#resizeObserver = new ResizeObserver(this.#handleResize.bind(this));
    this.#resizeObserver.observe(dialog);
    
  }
  
  constructor(){
    this.#highlited = new Hilited({
      element: '#secretCode',
      text: '',
      hardTabs: false,
      highlighterPrefix: 'hilited-duckdb',
      regexp: window.hueyDb.duckdbTokenizer
    });
    this.#hilitedPerhipherals = new HilitedPeripherals({
      hilited: this.#highlited
    });
    
    this.#initEvents();
    SecretsStore.store
    .list()
    .then(documents => {
      const items = [];
      let type;
      documents.sort( (a,b) => {
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
      }).map( doc => {
        if (doc.type !== type) {
          if (items.length) {
            items.push('</optgroup>');
          }
          type = doc.type;
          items.push(`<optgroup label="${type}">`);
        }
        items.push(`<option>${doc.name}</option>`);
      });
      if (items.length) {
        items.push('</optgroup>');
      }
      this.#secretsList.innerHTML = items.join('\n');
    })
    .catch(err => {
      showErrorDialog(err);
    });
  }
    
}

let secretsDialog;

function initSecretsDialog(){
  secretsDialog = new SecretsDialog();
}