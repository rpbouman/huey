class SecretsDialog {
  
  static #secretsDialogId = 'secretsDialog';
  #highlited = undefined;
  #hilitedPerhipherals = undefined;
  #resizeObserver = undefined;
  #password = undefined;

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

  get #changePasswordButton(){
    return byId('changePassword');
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
  
  #getDropSecretSQL(name){
    if (!name){
      const secretDocument = this.#secretDocument;
      name = secretDocument.name;
    }
    return `DROP SECRET IF EXISTS ${quoteIdentifierWhenRequired(name)}`;
  }

  #getCreateSecretSQL(){
    const secretDocument = this.#secretDocument;
    const fields = secretDocument.fields.map(field => {
      return `\r\n, ${SecretsDialog.#fieldValuePairAsSQL(field)}`;
    });
    
    return [
      'CREATE OR REPLACE',
      `TEMPORARY SECRET ${quoteIdentifierWhenRequired(secretDocument.name)} (`,
      `  TYPE ${secretDocument.type}${fields.join('')}`,
      ')'
    ].join('\r\n');
  }

  static #setCheckboxState(checkbox, state){
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
  
  async #handleSecretsListChanged(event){
    // there is no selection, clean up the form
    // if there is a selection, then sync the form with the associated document.
    const list = event.target;
    const selectedIndex = list.selectedIndex;
    if (selectedIndex === -1){
      SecretsDialog.#setCheckboxState(this.#secretEditingActiveCheckbox, false);
      SecretsDialog.#setCheckboxState(this.#secretUnsavedChangesCheckbox, false);
    }
    else {
      const option = list.options[selectedIndex];
      const name = option.value;
      const loaded = await this.#loadSecret(name);
      if (!loaded){
        event.preventDefault();
        list.selectedIndex = -1;
      }
    }
  }
  
  #resetForm(){
    this.#secretNameInput.value = '';
    this.#secretTypeInput.value = '';
    const keyValuesFieldset = this.#keyValuesFieldset;
    const secretKeyValueUiTemplate = this.#secretKeyValueUiTemplate;
    while (keyValuesFieldset.lastChild !== secretKeyValueUiTemplate) {
      keyValuesFieldset.removeChild( keyValuesFieldset.lastChild );
    };
  }
  
  async #loadSecret(name){
    const secretsStore = SecretsStore.store;
    const password = await this.#getPassword();
    if (!password){
      return false;
    }
    const secretDocument = await secretsStore.get(name, password);
    this.#resetForm();
    this.#secretNameInput.value = secretDocument.name;
    this.#secretTypeInput.value = secretDocument.type;
    const fields = secretDocument.fields;
    const n = fields.length;
    const keyValuesFieldset = this.#keyValuesFieldset;
    for (let i = 0; i < n; i++){
      const field = fields[i];
      const keyValueUi = this.#newKeyValueUi();
      keyValuesFieldset.appendChild(keyValueUi);
      const keyInput = SecretsDialog.#getFieldKeyEl(keyValueUi);
      keyInput.value = field.key;
      const typeInput = SecretsDialog.#getFieldTypeEl(keyValueUi);
      typeInput.value = field.type;
      const valueInput = SecretsDialog.#getFieldValueEl(keyValueUi);
      switch (field.type) {
        case 'checkbox':
          valueInput.type = field.type;
          valueInput.checked = field.value;
          break;
        case 'text':
        case 'password':
          valueInput.type = field.type;
          valueInput.value = field.value;
          break;
        case 'map': 
        case 'list': {
          for (let j = 0; j < field.value.length; j++){
            const field = field.value[j];
            const keyValueUi = this.#newKeyValueUi();
            keyValuesFieldset.appendChild(keyValueUi);
            const indentCheckbox = SecretsDialog.#getFieldIndentCheckbox(keyValueUi);
            indentCheckbox.checked = true;
            const keyInput = SecretsDialog.#getFieldKeyEl(keyValueUi);
            keyInput.value = field.key;
            const typeInput = SecretsDialog.#getFieldTypeEl(keyValueUi);
            typeInput.value = field.type;
            const valueInput = SecretsDialog.#getFieldValueEl(keyValueUi);
            valueInput = field.value;
          }
          break;
        } 
      }
    }
    this.#syncSecretCode();
    SecretsDialog.#setCheckboxState(this.#secretEditingActiveCheckbox, true);
    SecretsDialog.#setCheckboxState(this.#secretUnsavedChangesCheckbox, false);
    return true;
  }
  
  #handleCreateNewSecretClicked(event){
    if (this.#secretsList.selectedIndex !== -1){
      this.#secretsList.selectedIndex = -1;
    }
    this.#resetForm();
    this.#newKeyValueUi();
    SecretsDialog.#setCheckboxState(this.#secretEditingActiveCheckbox, true);
    SecretsDialog.#setCheckboxState(this.#secretUnsavedChangesCheckbox, true);
  }
  
  async #handlerRemoveCurrentSecretClicked(event){
    const selectedSecretOption = this.#selectedSecretOption;
    if (!Boolean(selectedSecretOption)) {
      return;
    }
    const secretName = selectedSecretOption.value;
    const secretsStore = SecretsStore.store;
    
    const exists = await secretsStore.exists(secretName);
    if (!exists){
      await this.#updateSecretsList();
      return;
    }

    const confirmation = await PromptUi.show({
      title: Internationalization.getText('Confirm remove secret'),
      contents: Internationalization.getText(
        'Are you sure you want to delete secret "{1}"? If you conform, it will be permanently removed. This action cannot be undone.', 
        secretName
      )
    });
    if (confirmation === PromptUi.REJECT) {
      return;
    }
    await secretsStore.remove(secretName);
    await this.#updateSecretsList();
    
    SecretsDialog.#setCheckboxState(this.#secretEditingActiveCheckbox, false);
    SecretsDialog.#setCheckboxState(this.#secretUnsavedChangesCheckbox, true);
  }
  
  async #handleRestoreCurrentSecretClicked(event){
    this.#resetForm();
    const existingItem = this.#selectedSecretOption;
    if (existingItem) {
      const loaded = await this.#loadSecret(existingItem.value);
    }
    this.#syncSecretCode();
    SecretsDialog.#setCheckboxState(this.#secretUnsavedChangesCheckbox, false);
  }
  
  async #promptOverwriteExistingSecret(){
    return await PromptUi.show({
      title: Internationalization.getText('Overwrite Existing Secret'),
      contents: Internationalization.getText('Another secret with that name already exists. Do you want to overwrite it?')
    });
  }
  
  async #promptRenameOrCreateSecret(oldName, newName){
    return await PromptUi.show({
      title: Internationalization.getText('Rename or Create'),
      contents: Internationalization.getText(
        'Secret name changed. Do you want to rename secret "{1}" to "{2}" or create a new one?',
        oldName,
        newName
      )
    });
  }
  
  async #handleChangePasswordClicked(){
    const secretsStore = SecretsStore.store;
    const config = {
      title: Internationalization.getText('Enter Password'),
      contents: passwordHTML
    };
  }
  
  static get #passwordHint(){
    const hint = Internationalization.getText('Password must be at least 12 characters long and include uppercase, lowercase, digit, and special character.');
    return hint;
  }
  
  static #getPasswordHTML(id) {
    const hint = SecretsDialog.#passwordHint;
    const passwordHTML = `<input
      type="password"
      id="${id}"
      minlength="12"
      required
      pattern="(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{12,}"
      title="${hint}"
      autofocus="true"
    />`;
    return passwordHTML;
  }
  
  async #getPassword(changePassword){
    if (this.#password) {
      return this.#password;
    }
    try {
      const secretsStore = SecretsStore.store;
      const id = 'secretsManagerPassword' + Date.now();
      const hint = SecretsDialog.#passwordHint;
      const invalidPassword = Internationalization.getText('Wrong password. Try again');
      const passwordHTML = SecretsDialog.#getPasswordHTML(id);
      const config = {
        title: Internationalization.getText('Enter Password'),
        contents: passwordHTML
      };

      const isInitialized = await secretsStore.isInitialized();
      do {
        if (!isInitialized) {
          const initialPasswordInfo = [
            Internationalization.getText('Enter a password to initialize the Huey secrets manager.'),
            hint,
            Internationalization.getText('This password will be used to encrypt sensitive fields you enter into your duckdb secret.'),
            Internationalization.getText('After initialization of the secrets manager, you can only access your secrets by entering the same password.'),
            Internationalization.getText('You can change your password later on, but doing so also requires you to enter your previous password, so make sure you remember it!')
          ].join('<br/>');
          config.contents = `${initialPasswordInfo}<br/>${passwordHTML}`;
        }
        const result = await PromptUi.show(config);
        if (result === PromptUi.REJECT) {
          return null;
        }

        const password = byId(id).value;
        if (!secretsStore.isValidPassword(password)) {
          config.contents = `${hint}<br/>${passwordHTML}`;
        }
        
        if (isInitialized){
          if (await secretsStore.verifyPassword(password)){
            this.#password = password;
            return password;
          }
          config.contents = `${invalidPassword}<br/>${passwordHTML}`;
        }
        else {
          await secretsStore.init(password);
          this.#password = password;
          return password;
        }
      } while(true);
    } 
    catch(error){
      console.error(error);
    }
    finally {
      PromptUi.clear();
    }
  }
  
  async #createDuckDbSecret(){
    const extensions = [];
    const connection = window.hueyDb.connection;    
    do {
      try {
        const createSecretSql = this.#getCreateSecretSQL();
        await connection.query( createSecretSql ); 
        return true;
      }
      catch(error){
        const message = error.message;
        const regexp = /Secret type '(?<secretType>[^']+)' does not exist, but it exists in the (?<extensionName>[^\s]+) extension/;
        const match = regexp.exec(message);
        
        if (!match) {
          throw error;
        }
        
        const secretType = match.groups['secretType'];
        const extensionName = match.groups['extensionName'];
        
        if (extensions.includes(extensionName)){
          throw error;
        }
        
        extensions.push(extensionName);
        try{
          await ensureDuckDbExtensionLoadedAndInstalled(extensionName);
        }
        catch(e) {
          console.error(e);
          showErrorDialog({
            title: Internationalization.getText('Error loading the ${1} extension', extensionName),
            description: Internationalization.getText('The secret type ${1} requires installation of the ${2} extension, but an attempt to load the extension failed.', secretType, extensionName)
          });
          return false;
        }
      }
    } while(true);
  }
  
  get #selectedSecretOption(){
    const list = this.#secretsList;
    const selectedIndex = list.selectedIndex;
    const existingItem = list.options[selectedIndex];
    return existingItem;
  }
  
  async #handleSaveCurrentSecretClicked(event){
    try {
      const secretsStore = SecretsStore.store;
      const existingItem = this.#selectedSecretOption;
      const secretDocument = this.#secretDocument;
      
      const updating = Boolean(existingItem);
      
      const newName = secretDocument.name;
      const oldName = updating ? existingItem.value : secretDocument.name; 
      
      const nameChanged = newName !== oldName;
      const exists = !updating || nameChanged ? await secretsStore.exists( newName ) : false;

      if (exists){
        const result = await this.#promptOverwriteExistingSecret();
        if (result === PromptUi.REJECT) {
          const secretName = this.#secretNameInput;
          secretName.select();
          secretName.focus();
          return;
        }
      }
      
      let removeOldSecret = false;
      if (nameChanged){
        const result = await this.#promptRenameOrCreateSecret(oldName, newName);
        removeOldSecret = result === PromptUi.ACCEPT;
      }

      const password = await this.#getPassword();
      if (!password) {
        return;
      }
      
      const connection = window.hueyDb.connection;
      
      if (nameChanged && removeOldSecret || exists){
        const dropSecretSql = this.#getDropSecretSQL();
        await connection.query( dropSecretSql ); 
      }

      const success = await this.#createDuckDbSecret();
      if (!success) {
        return;
      }
      
      await secretsStore.store(secretDocument, password);
      if (removeOldSecret === true) {
        try {
          const dropSecretSql = this.#getDropSecretSQL(oldName);
          await connection.query( dropSecretSql ); 
        }
        catch(e) {
        }
        await secretsStore.remove(oldName);
      }
      await this.#updateSecretsList(newName);
      
      SecretsDialog.#setCheckboxState(this.#secretUnsavedChangesCheckbox, false);
    }
    catch (error) {
      console.error(error);
      console.error(error.stack);
      showErrorDialog(error);
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
  
  static #getFieldTypeEl(fieldContainer){
    return fieldContainer.querySelector('span > select[name=type] ')
  }
  
  static #getFieldType(fieldContainer) {
    return this.#getFieldTypeEl(fieldContainer).value;
  }

  static #getFieldKeyEl(fieldContainer){
    return fieldContainer.querySelector('span > input[name=key] ')
  }

  static #getFieldKey(fieldContainer) {
    return this.#getFieldKeyEl(fieldContainer).value;
  }

  static #getFieldValueEl(fieldContainer){
    return fieldContainer.querySelector('span > input[name=value] ')
  }

  static #getFieldValue(fieldContainer) {
    const element = this.#getFieldValueEl(fieldContainer);
    return element.type === 'checkbox' ? element.checked : element.value;
  }

  static #setFieldKey(fieldContainer, value) {
    return this.#getFieldKeyEl(fieldContainer).value = value;
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
    // TODO: 
    // woudld be really nice if we could focus the value control if the user selected a value from the list.
    // unfortunately thee does not appear to be a reliable way (either through change events or input events) 
    // to detect this.
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
    if (this.#secretUnsavedChangesCheckbox.checked){
      return;
    }
    SecretsDialog.#setCheckboxState(this.#secretUnsavedChangesCheckbox, true);
  }
  
  #handleFieldInput(event){
    if (this.#secretUnsavedChangesCheckbox.checked){
      return;
    }
    SecretsDialog.#setCheckboxState(this.#secretUnsavedChangesCheckbox, true);
  }
  
  #handleSecretTypeChanged(event){
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
  
  #handleSecretNameInput(event){
    const secretNameInput = event.target;
    const selectedSecretOption = this.#selectedSecretOption;
    if (!this.#secretUnsavedChangesCheckbox.checked ){
      SecretsDialog.#setCheckboxState(this.#secretUnsavedChangesCheckbox, true);
    }
  }
  
  #secretCodeTabChanged(event) {
    const target = event.target;
    if (!target.checked) {
      return;
    }
    if (!this.#secretEditingActiveCheckbox.checked) {
      return;
    }
    this.#syncSecretCode();
  }
  
  #secretCodeInput(event){
    const enteredText = event.target.textContent;
    const sqlText = this.#getCreateSecretSQL();
    // TODO: simple naive case: 
    //  - check if enteredText matches sqlText; 
    //  - if it doesn't, parse entered text to a document 
    //  - compare it to the document extracted from the form.
    //  - if there's a difference, parse the code
  }

  #secretFormTabChanged(event) {
    const target = event.target;
    if (target.checked) {
      this.#syncSecretCode();
    }
  }
  
  #syncCodeInterval = undefined;
  #syncCodeIntervalFrequency = 100;

  #syncSecretCode(){
    const sql = this.#getCreateSecretSQL();
    this.#highlited.setText(sql);
  }
    
  #handleResize(entries){
    this.#hilitedPerhipherals.resetGutter();
  }
    
  #handleDialogClose(event) {
    this.#password = undefined;
    this.#resetForm();
  }
  
  #initEvents(){
    const dialog = this.dialog;
    dialog.addEventListener('close', event => this.#handleDialogClose(event) );
    this.#secretNameInput.addEventListener('input', event => this.#handleSecretNameInput(event) );
    this.#secretTypeInput.addEventListener('change', event => this.#handleSecretTypeChanged(event) );
    this.#changePasswordButton.addEventListener('click', event => this.#handleChangePasswordClicked(event) );
    this.#createNewSecretButton.addEventListener('click', event => this.#handleCreateNewSecretClicked(event) );
    this.#removeCurrentSecretButton.addEventListener('click', event => this.#handlerRemoveCurrentSecretClicked(event) );
    this.#saveCurrentSecretButton.addEventListener('click', event => this.#handleSaveCurrentSecretClicked(event) );
    this.#restoreCurrentSecretButton.addEventListener('click', event => this.#handleRestoreCurrentSecretClicked(event) );
    this.#secretsList.addEventListener('change', event => this.#handleSecretsListChanged(event) );
    this.#keyValuesFieldset.addEventListener('click', event => this.#handleFieldClicked(event) ); 
    this.#keyValuesFieldset.addEventListener('change', event => this.#handleFieldChanged(event) ); 
    this.#keyValuesFieldset.addEventListener('input', event => this.#handleFieldInput(event) ); 
    this.#secretCodeTab.addEventListener('change', event => this.#secretCodeTabChanged(event) );
    this.#secretFormTab.addEventListener('change', event => this.#secretFormTabChanged(event) );
    this.#secretCode.addEventListener('input', event => this.#secretCodeInput(event));
    
    this.#resizeObserver = new ResizeObserver(this.#handleResize.bind(this));
    this.#resizeObserver.observe(dialog);
    
  }
  
  async #getDuckDbSecrets(){
    const obj = {};
    const connection = window.hueyDb.connection;
    const result = connection.query('SELECT * FROM duckdb_secrets()');
    const n = result.numRows;
    for (let i = 0; i < n; i++){
      const row = result.get(i);
      const name = row['name'];
      const type = row['type'];
      obj[name] = type;
    }
    return obj;
  }
  
  async #updateSecretsList(selectedSecret){
    const duckdbSecrets = await this.#getDuckDbSecrets();
    await SecretsStore.store
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
        const loaded = duckdbSecrets[doc.name] !== undefined;
        const selected = doc.name === selectedSecret ? ' selected="true"' : '';
        items.push(`<option data-loaded="${loaded}" ${selected}>${doc.name}</option>`);
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
    this.#updateSecretsList();
  }
    
}

let secretsDialog;

function initSecretsDialog(){
  secretsDialog = new SecretsDialog();
}