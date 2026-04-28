class SecretsDialog {
  
  static #secretsDialogId = 'secretsDialog';

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
      let isMultivalue;
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
          isMultivalue = false;
          value = fieldValue;
          break;
        case 'list':
        case 'map':
          isMultivalue = true;
          value = [];
          break;
      }
      secretDocument.fields.push({
        key: fieldKey,
        type: fieldType,
        value: value
      });
      
      if (isMultivalue) {
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
            break;
          case 'map':
            subKey = SecretsDialog.#getFieldKey(fieldContainer);
            break;
        }
        values.push({
          key: subKey, 
          type: subType,
          value: subValue
        })
      }
    }
    return secretDocument;
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
    this.#setCheckboxState(this.#secretUnsavedChangesCheckbox, false);
  }
  
  #handleSaveCurrentSecretClicked(event){
    try {
      const secretDocument = this.#secretDocument;
      
      this.#setCheckboxState(this.#secretUnsavedChangesCheckbox, false);
    }
    catch (error) {
      alert(error);
      console.log(error.stack);
    }
  }
  
  static #getFieldIndentCheckbox(fieldContainer) {
    return fieldContainer.querySelector('span > menu > label > input[type=checkbox][value=indent]');
  }

  static #isFieldIndented(fieldContainer){
    return SecretsDialog.#getFieldIndentCheckbox(fieldContainer).checked;
  }
  
  static #indentField(fieldContainer, indent) {
    SecretsDialog.#getFieldIndentCheckbox(fieldContainer).checked = Boolean(indent);
  }
  
  static #getFieldType(fieldContainer) {
    return fieldContainer.querySelector('span > select ').value;
  }

  static #getFieldKey(fieldContainer) {
    return fieldContainer.querySelector('span > input[list=secret-keys] ').value;
  }

  static #getFieldValue(fieldContainer) {
    return fieldContainer.querySelector('span > input:not( [list=secret-keys] )').value;
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
        if (
          SecretsDialog.#isFieldIndented( fieldContainer ) || 
          ['list', 'map'].includes( SecretsDialog.#getFieldType( fieldContainer ) ) 
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
  }

  #secretFormTabChanged(event) {
    const target = event.target;
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
  }
  
  constructor(){
    this.#initEvents();
  }
    
}

const secretsDialog = new SecretsDialog();