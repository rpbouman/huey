class DocumentsDialog {

  #password = undefined;

  objectStoreName = undefined;
  dialogId = undefined;
  headerTemplateId = undefined;
  toolsTemplateId = undefined;
  keyValueTemplateId = 'keyValueUiTemplate';
  keyValuePairsRequired = false;
  keysDataListId = undefined;
  hilited = undefined;
  hilitedPerhipherals = undefined;
  resizeObserver = undefined;

  get dialog(){
    return byId( this.dialogId );
  }
  
  setBusy(busy){
    if (Boolean(busy)){
      this.dialog.setAttribute('aria-busy', true);
    }
    else {
      this.dialog.removeAttribute('aria-busy');
    }
  }
   
  constructor(config){
    const dialogId = config.dialogId;
    const titleId = `${dialogId}-title`;
    this.dialogId = dialogId;
    this.objectStoreName = config.objectStoreName;
    this.keyValueTemplateId = config.keyValueTemplateId || this.keyValueTemplateId;
    this.keyValuePairsRequired = config.keyValuePairsRequired || this.keyValuePairsRequired;
    this.keysDataListId = config.keysDataListId;
    this.toolsTemplateId = config.toolsTemplateId;
    this.headerTemplateId = config.headerTemplateId;

    const dom = instantiateTemplate('documentDialogTemplate', {
      id: dialogId,
      "aria-labelledby": titleId
    });
    document.body.append(dom);
    
    if (this.toolsTemplateId) {
      const tools = instantiateTemplate(this.toolsTemplateId);
      this.mainToolbar.appendChild(tools);
    }
    
    if (this.headerTemplateId) {
      const header = instantiateTemplate(this.headerTemplateId);
      this.headerFieldset.appendChild(header);
    }
    
    dom.querySelector('footer > button[name=ok]').setAttribute('popovertarget', dialogId);
    dom.querySelector('footer > button[name=cancel]').setAttribute('popovertarget', dialogId);

    const titleElement = dom.querySelector('header > h3');
    titleElement.setAttribute('id', titleId);
    Internationalization.setTextContent(titleElement , config.title);
    
    this.hilited = new Hilited({
      element: this.codeEl,
      text: '',
      hardTabs: false,
      highlighterPrefix: 'hilited-duckdb',
      regexp: window.hueyDb.duckdbTokenizer
    });
    this.hilited.editingEnabled = false;
    this.hilitedPerhipherals = new HilitedPeripherals({
      hilited: this.hilited
    });
    
    this.initEvents();
    this.activateAutoloadedDocuments()
    .then(() => {
      this.updateDocumentsList();
    });
  }
  
  get storeConfig(){
    const store = AppDocumentStore.store;
    return store.getStoreConfig(this.objectStoreName);
  }

  get fieldsPath(){
    return this.storeConfig.fieldsPath;
  }

  get headerFields(){
    return this.storeConfig.headerFields;
  }

  get keyPath(){
    return this.storeConfig.keyPath;
  }
  
  async getDocumentFromStore(key, password){
    const store = AppDocumentStore.store;
    return await store.get(this.objectStoreName, key, password);
  }
  
  isPasswordSet(){
    return Boolean(this.#password);
  }
  
  clearPassword(){
    this.#password = null;
  }
  
  async getAndDecryptDocument(key){
    const store = AppDocumentStore.store;
    const needToClearPassword = !this.isPasswordSet();
    let documentObject;
    try {
      documentObject = await this.getDocumentFromStore(key);
    }
    catch(error){
      if (DocumentStore.isPasswordRequiredError(error)){
        const password = await this.#getPassword();
        if (!password){
          return null;
        }
        documentObject = await this.getDocumentFromStore(key, password);
      }
      else {
        throw error;
      }
    }
    if (needToClearPassword){
      this.clearPassword();
    }
    return documentObject;
  }
  
  get mainToolbar(){
    return this.dialog.querySelector('menu[role=toolbar]');
  }
  
  getMainToolbarControl(selector){
    return this.mainToolbar.querySelector( selector );
  }
  
  get editingActiveCheckbox(){
    return this.getMainToolbarControl( 'input[type=checkbox][name=editingActive]' );
  }
  
  get unsavedChangesCheckbox(){
    return this.getMainToolbarControl( 'input[type=checkbox][name=unsavedChanges]' );
  }

  get createNewButton(){
    return this.getMainToolbarControl( 'button[name=createNew]' );
  }

  get removeCurrentButton(){
    return this.getMainToolbarControl( 'button[name=removeCurrent]' );
  }

  get saveCurrentButton(){
    return this.getMainToolbarControl( 'button[name=saveCurrent]' );
  }

  get restoreCurrentButton(){
    return this.getMainToolbarControl( 'button[name=restoreCurrent]' );
  }

  get activateCurrentRadio(){
    return this.getMainToolbarControl( 'input[type=radio][name=activation][value=activate]' );
  }

  get deactivateCurrentRadio(){
    return this.getMainToolbarControl( 'input[type=radio][name=activation][value=deactivate]' );
  }
  
  get documentsList(){
    return this.dialog.querySelector('select[name=documentsList]');
  }

  get headerFieldset(){
    return this.dialog.querySelector('fieldset[name=headerFieldset]')
  }  
    
  get nameEl(){
    return this.dialog.querySelector('input[type=text][name=name]');
  }

  get typeEl(){
    return this.dialog.querySelector('input[type=text][name=type]');
  }

  get autoloadEl(){
    return this.dialog.querySelector('input[type=checkbox][name=autoload]');
  }
  
  get codeEl(){
    return this.dialog.querySelector('code.hilited-editor');
  }
  
  get codeTab(){
    return this.dialog.querySelector('input[type=radio][name=tabs][value=codeTab]');
  }

  get formTab(){
    return this.dialog.querySelector('input[type=radio][name=tabs][value=formTab]');
  }
  
  get keyValuesTemplate(){
    return byId(this.keyValueTemplateId);
  }

  instantiateKeyValueUi(){
    return instantiateTemplate( this.keyValueTemplateId );
  }
  
  get keyValuesFieldset(){
    return this.dialog.querySelector('fieldset[name=keyValuesFieldset]')
  }  
  
  get keysDatalist(){
    if (!this.keysDataListId) {
      const keyValuesTemplate = this.keyValuesTemplate;
      const keyEl = keyValuesTemplate.content.querySelector('input[name=key]');
      this.keysDataListId = keyEl.getAttribute('list');
    }
    return byId( this.keysDataListId );
  }
  
  getOptionFromKeysDatalist(key){
    const listElement = this.keysDatalist;
    for (let option of listElement.options) {
      const optionValue = option.value;
      if (optionValue !== key){
        continue;
      }
      return option;
    }
    return undefined;
  }

  getDefaultDataypeForKey(key){
    const option = this.getOptionFromKeysDatalist(key);
    if (!option) {
      return undefined;
    }
    const defaultType = option.getAttribute('data-default-type');
    return defaultType;
  }

  getValuesListIdForKey(key){
    const option = this.getOptionFromKeysDatalist(key);
    if (!option) {
      return undefined;
    }
    const valuesListId = option.getAttribute('data-values-list');
    return valuesListId;
  }

  keyValueNeedsQuotes(key){
    const option = this.getOptionFromKeysDatalist(key);
    if (!option) {
      return false;
    }
    const valueNnedsQuotes = option.getAttribute('data-value-needs-quotes');
    return valueNnedsQuotes === 'false' ? false : true ;
  }
  
  selectOption(selectElement, value) {
    const options = selectElement.options;
    for (let i = 0; i < options.length; i++ ){
      const option = options[i];
      if (option.value === value){
        selectElement.selectedIndex = i;
        return;
      }
    }
  }

  setCheckboxState(checkbox, state){
    if (checkbox.checked !== Boolean(state)){
      checkbox.click();
    }
  }

  get documentObject(){
    const headerFieldset = this.headerFieldset;
    const inputs = headerFieldset.querySelectorAll('input, select');
    const fieldsPath = this.fieldsPath;
    const fields = [];
    const documentObject = {
      [fieldsPath]: fields
    }
    this.forEachHeaderInput(input => {
      let value = input.value;
      switch (input.type) {
        case 'checkbox':
          value = input.checked;
          break;
        case 'number':
          value = parseFloat(value);
          break;
        default:
      }
      documentObject[input.name] = value;
    });
    const fieldSet = this.keyValuesFieldset;
    const fieldContainers = fieldSet.querySelectorAll('div');
    const n = fieldContainers.length;
    for (let i = 0; i < n; i++){
      let fieldContainer = fieldContainers[i];
      let indented = this.isFieldIndented(fieldContainer);
      if (indented) {
        throw new Error(`unexpected`);
      }
      let fieldType = this.getFieldType(fieldContainer);
      let fieldKey = this.getFieldKey(fieldContainer);
      let fieldValue = this.getFieldValue(fieldContainer);
      let value;
      if (!fieldKey && !fieldValue) {
        continue;
      }
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
      fields.push({
        key: fieldKey,
        type: fieldType,
        value: value
      });
      
      if (typeof value !== 'object') {
        continue;
      }
      
      for (let j = i+1; j < n; j++){
        fieldContainer = fieldContainers[j];
        indented = this.isFieldIndented(fieldContainer);
        if (!indented) {
          continue;
        }
        i = j;
        const subValue = this.getFieldValue(fieldContainer);
        const subType = this.getFieldType(fieldContainer);
        let subKey;
        switch(fieldType){
          case 'list':
            subKey = value.length;
            this.setFieldKey(fieldContainer,  String.fromCharCode( 65 + subKey ) );
            break;
          case 'map':
            subKey = this.getFieldKey(fieldContainer);
            break;
        }
        value.push({
          key: subKey, 
          type: subType,
          value: subValue
        })
      }
    }
    return documentObject;
  }
  
  fieldValueAsSQL(field){
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
          subField => this.fieldValueAsSQL(subField)
        ).join(', ')
        value = `[${arrayValue}]`;
        break;
      case 'map':
        const objectValue = field.value.map(
          subField => this.fieldValuePairAsSQL(subField)
        ).filter( pair => pair && pair.length ).join('\n, ');
        value = `MAP { 
          ${objectValue} 
        }`;
        break;
    }
    return value;
  }

  fieldValuePairAsSQL(field){
    let key = field.key;
    let value = field.value;
    if ( (key || '').length === 0 && ( value || '' ).length === 0 ){
      return '';
    }
    const needsQuotes = this.keyValueNeedsQuotes(key);
    key = field.key;
    if (needsQuotes){
      value = this.fieldValueAsSQL(field);
    }
    return `${key} ${value}`;
  }

  newKeyValueUi(beforeElement){
    const newKeyValueUi = this.instantiateKeyValueUi();
    const keyEl = this.getFieldKeyEl(newKeyValueUi);
    if ( keyEl.getAttribute('list') === null ) {
      keyEl.setAttribute('list', this.keysDataListId);
    }
    const container = this.keyValuesFieldset;
    if (beforeElement){
      container.insertBefore(newKeyValueUi, beforeElement);
    }
    else {
      container.appendChild(newKeyValueUi);
    }
    const valueEl = this.getFieldValueEl(newKeyValueUi);
    if (this.keyValuePairsRequired){
      keyEl.setAttribute('required', true);
      valueEl.setAttribute('required', true);
    }
    else {
      keyEl.removeAttribute('required');
      valueEl.removeAttribute('required');
    }
    return newKeyValueUi;
  }
  
  async handleDocumentsListChanged(event){
    // there is no selection, clean up the form
    // if there is a selection, then sync the form with the associated document.
    const list = event.target;
    const selectedIndex = list.selectedIndex;
    if (selectedIndex === -1){
      this.activateCurrentRadio.checked = true;
      this.setCheckboxState(this.editingActiveCheckbox, false);
      this.setCheckboxState(this.unsavedChangesCheckbox, false);
    }
    else {
      const option = list.options[selectedIndex];
      if (option.getAttribute('data-loaded') === 'true') {
        this.activateCurrentRadio.checked = true;
      }
      else {
        this.deactivateCurrentRadio.checked = true;
      }
      const name = option.value;
      const loaded = await this.load(name);
      if (!loaded){
        event.preventDefault();
        list.selectedIndex = -1;
      }
    }
  }

  forEachHeaderInput(callback){
    const headerFieldset = this.headerFieldset;
    const inputs = headerFieldset.querySelectorAll('input, select');
    for (let i = 0; i < inputs.length; i++){
      const input = inputs[i];
      callback(input);
    }
  }
  
  resetForm(){
    const headerFieldset = this.headerFieldset;
    this.forEachHeaderInput(input => {
      switch (input.type) {
        case 'checkbox':
          input.checked = false;
          break;
        default:
          input.value = '';
      }
    });
    const keyValuesFieldset = this.keyValuesFieldset;
    while (keyValuesFieldset.lastChild && keyValuesFieldset.lastChild.tagName !== 'LEGEND') {
      keyValuesFieldset.removeChild( keyValuesFieldset.lastChild );
    };
  }
  
  loadDocument(documentObject){
    this.resetForm();
    this.syncDocumentCode();
    if (!documentObject) {
      return false;
    }
    this.forEachHeaderInput(input => {
      const name = input.name;
      const value = documentObject[name];
      switch (input.type) {
        case 'checkbox':
          input.checked = value;
          break;
        default:
          input.value = String(value);
      }
    });
    const fieldsPath = this.fieldsPath;
    const fields = documentObject[fieldsPath];
    const n = fields.length;
    if (n === 0){
      this.newKeyValueUi();
    }
    else{
      const keyValuesFieldset = this.keyValuesFieldset;
      for (let i = 0; i < n; i++){
        const field = fields[i];
        const keyValueUi = this.newKeyValueUi();
        keyValuesFieldset.appendChild(keyValueUi);
        const keyInput = this.getFieldKeyEl(keyValueUi);
        keyInput.value = field.key;
        const typeInput = this.getFieldTypeEl(keyValueUi);
        typeInput.value = field.type;
        const valueInput = this.getFieldValueEl(keyValueUi);
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
              const entry = field.value[j];
              const subKeyValueUi = this.newKeyValueUi();
              keyValuesFieldset.appendChild(subKeyValueUi);
              const indentCheckbox = this.getFieldIndentCheckbox(subKeyValueUi);
              indentCheckbox.checked = true;
              const keyInput = this.getFieldKeyEl(subKeyValueUi);
              keyInput.value = entry.key;
              const typeInput = this.getFieldTypeEl(subKeyValueUi);
              typeInput.value = entry.type;
              const valueInput = this.getFieldValueEl(subKeyValueUi);
              valueInput.value = entry.value;
            }
            break;
          } 
        }
      }
    }
    this.syncDocumentCode();
    this.setCheckboxState(this.editingActiveCheckbox, true);
    this.setCheckboxState(this.unsavedChangesCheckbox, false);
    this.nameEl.focus();
    return true;
  }
    
  handleCreateNewClicked(event){
    if (this.documentsList.selectedIndex !== -1){
      this.documentsList.selectedIndex = -1;
    }
    this.resetForm();
    this.newKeyValueUi();
    this.setCheckboxState(this.editingActiveCheckbox, true);
    this.setCheckboxState(this.unsavedChangesCheckbox, true);
  }
  
  async handlerRemoveCurrentClicked(event){
    const selectedDocumentOption = this.selectedDocumentOption;
    if (!Boolean(selectedDocumentOption)) {
      return;
    }
    const documentName = selectedDocumentOption.value;
    const store = AppDocumentStore.store;
    
    const exists = await store.exists(this.objectStoreName, documentName);
    if (!exists){
      await this.updateDocumentsList();
      return;
    }

    const confirmation = await PromptUi.show({
      title: Internationalization.getText('Confirm remove'),
      contents: Internationalization.getText(
        'Are you sure you want to delete "{1}"? If you confirm, it will be permanently removed. This action cannot be undone!', 
        documentName
      )
    });
    if (confirmation === PromptUi.REJECT) {
      return;
    }
    await store.remove(this.objectStoreName, documentName);
    await this.updateDocumentsList();
    this.resetForm();
    this.setCheckboxState(this.editingActiveCheckbox, false);
    this.setCheckboxState(this.unsavedChangesCheckbox, false);
  }
  
  async handleRestoreCurrentClicked(event){
    this.resetForm();
    const existingItem = this.selectedDocumentOption;
    if (existingItem) {
      const loaded = await this.loadDocument(existingItem.value);
    }
    else {
      this.setCheckboxState(this.editingActiveCheckbox, false);
    }
    this.syncDocumentCode();
    
    this.setCheckboxState(this.unsavedChangesCheckbox, false);
  }
  
  async promptOverwriteExistingDocument(name){
    return await PromptUi.show({
      title: Internationalization.getText('Overwrite Existing'),
      contents: Internationalization.getText('"{1}" already exists. Do you want to overwrite it?', name)
    });
  }
  
  async promptRenameOrCreateDocument(oldName, newName){
    return await PromptUi.show({
      title: Internationalization.getText('Rename or Create'),
      contents: Internationalization.getText(
        'Name changed. Choose yes to rename "{1}" to "{2}" or no to create a new one?',
        oldName,
        newName
      )
    });
  }
  
  get selectedDocumentOption(){
    const list = this.documentsList;
    const selectedIndex = list.selectedIndex;
    const existingItem = list.options[selectedIndex];
    return existingItem;
  }
  
  getFieldContainer(descendantEl) {
    return descendantEl.closest('div');
  }
  
  getFieldIndentCheckbox(fieldContainer) {
    return fieldContainer.querySelector('span > menu > label > input[name=indent]');
  }

  isFieldIndented(fieldContainer){
    return this.getFieldIndentCheckbox(fieldContainer).checked;
  }
  
  indentField(fieldContainer, indent) {
    this.getFieldIndentCheckbox(fieldContainer).checked = Boolean(indent);
  }
  
  getFieldTypeEl(fieldContainer){
    return fieldContainer.querySelector('span > select[name=type] ')
  }
  
  getFieldType(fieldContainer) {
    return this.getFieldTypeEl(fieldContainer).value;
  }

  getFieldKeyEl(fieldContainer){
    return fieldContainer.querySelector('span > input[name=key] ')
  }

  getFieldKey(fieldContainer) {
    return this.getFieldKeyEl(fieldContainer).value;
  }

  getFieldValueEl(fieldContainer){
    return fieldContainer.querySelector('span > input[name=value] ')
  }

  getFieldValue(fieldContainer) {
    const element = this.getFieldValueEl(fieldContainer);
    return element.type === 'checkbox' ? element.checked : element.value;
  }

  setFieldKey(fieldContainer, value) {
    return this.getFieldKeyEl(fieldContainer).value = value;
  }
  
  getParentFieldContainer(fieldContainer){
    if ( !this.isFieldIndented(fieldContainer) ) {
      throw new Error(`Getting parent field container requires an indented field.`);
    }
    
    do {
      let prev = fieldContainer.previousSibling;
      if (!prev) {
        throw new Error('Expected a previous sibling for an indented field.');
      }
      if ( this.isFieldIndented(fieldContainer) ) {
        fieldContainer = prev;
        continue;
      }
      break;
    } while (true);
    return fieldContainer;
  }

  getParentFieldContainerType(fieldContainer){
    const parentFieldContainer = this.getParentFieldContainer(fieldContainer);
    return this.getFieldType( parentFieldContainer );
  }

  handleFieldClicked(event) {
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
        const newKeyValueId = this.newKeyValueUi( fieldContainer.nextSibling );
        const fieldType = this.getFieldType( fieldContainer );
        
        // if the field from where we're creating the new field is indented, or is a composite, 
        // then the new field is automatically indented (i.e. it becomes an item of the previous composite)
        if (
          this.isFieldIndented( fieldContainer ) || 
          ['list', 'map'].includes( fieldType ) 
        ) {
          this.indentField( newKeyValueId, true );
          
          // if the new field is a subfield of a list, special logic applies.
          if ( fieldType === 'list' || this.getParentFieldContainerType( fieldContainer ) === 'list') {
            const subKeyField = this.getFieldKeyEl( newKeyValueId );
            // the key is not required (and the css will hide it)
            // handleIndentChanged will re-add the attribute if a field below a list is un-indented (= becomes a normal field not owned by the list)
            subKeyField.removeAttribute('required');
            this.getFieldValueEl( newKeyValueId ).focus();
          }
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
  
  handleFieldTypeChanged(event){
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
    
  handleKeyFieldChanged(event){
    const keyField = event.target;
    const fieldContainer = this.getFieldContainer(keyField);
    
    const key = keyField.value;
    const valueListId = this.getValuesListIdForKey(key);

    const valueEl = this.getFieldValueEl(fieldContainer);
    if (valueListId) {
      valueEl.setAttribute('list', valueListId);
    }
    else {
      valueEl.removeAttribute('list');
    }

    const dataType = this.getDefaultDataypeForKey(key);
    if (dataType) {
      const fieldTypeSelect = this.getFieldTypeEl(fieldContainer);
      this.selectOption(fieldTypeSelect, dataType);
      this.handleFieldTypeChanged({target: fieldTypeSelect});
    }
  }
  
  handleFieldChanged(event) {
    // TODO: 
    // woudld be really nice if we could focus the value control if the user selected a value from the list.
    // unfortunately thee does not appear to be a reliable way (either through change events or input events) 
    // to detect this.
    const target = event.target;
    switch (target.tagName){
      case 'INPUT':
        switch (target.name) {
          case 'indent':
            this.handleIndentChanged(event);
            break;
          case 'key':
            this.handleKeyFieldChanged(event);
            break;
        }
        break;
      case 'SELECT':
        this.handleFieldTypeChanged(event);
        break;
    }
    if (this.unsavedChangesCheckbox.checked){
      return;
    }
    this.setCheckboxState(this.unsavedChangesCheckbox, true);
  }
  
  handleIndentChanged(event){
    const target = event.target;
    if (target.checked) {
      return;
    }
    const fieldContainer = target.parentNode.parentNode.parentNode.parentNode;
    const previousFieldContainer = fieldContainer.previousSibling;
    if (
      this.getFieldType( previousFieldContainer ) === 'map' || 
      this.getParentFieldContainerType( previousFieldContainer ) !== 'list'
    ) {
      return;
    }
    const subKeyField = this.getFieldKeyEl( fieldContainer );
    subKeyField.setAttribute('required', true);
    subKeyField.focus();
  }
  
  
  
  handleFieldInput(event){
    const target = event.target;
    if (this.unsavedChangesCheckbox.checked){
      return;
    }
    this.setCheckboxState(this.unsavedChangesCheckbox, true);
  }
  
  handleDocumentTypeChanged(event){
    const documentTypeInput = event.target;
    const documentType = documentTypeInput.value;
    const keysDatalist = this.keysDatalist;
    const options = keysDatalist.options;
    for (let i = 0; i < options.length; i++){
      const option  = options[i];
      const attribute = option.getAttribute('data-associated-document-types') || '';
      const associatedTypes = attribute.split(',');
      if (associatedTypes.length === 0 || associatedTypes.includes(documentType)){
        option.removeAttribute('disabled');
      }
      else {
        option.setAttribute('disabled', true);
      }
    }
    if (!this.unsavedChangesCheckbox.checked ){
      this.setCheckboxState(this.unsavedChangesCheckbox, true);
    }
  }
  
  handleDocumentNameInput(event){
    const documentNameEl = event.target;
    const selectedDocumentOption = this.selectedDocumentOption;
    const changed = !selectedDocumentOption && documentNameEl.value.trim().length ||
                    documentNameEl.value !== (selectedDocumentOption ? selectedDocumentOption.value : '');
    if ( changed && !this.unsavedChangesCheckbox.checked ){
      this.setCheckboxState(this.unsavedChangesCheckbox, true);
    }
  }
  
  handleAutoloadChanged(event){
    if (!this.unsavedChangesCheckbox.checked ){
      this.setCheckboxState(this.unsavedChangesCheckbox, true);
    }
  }
      
  async createDuckDbDocument(documentObject){
    this.setBusy(true);
    const connection = window.hueyDb.connection;
    documentObject = documentObject || this.documentObject;
    do {
      try {
        const createDocumentSql = this.getCreateDocumentSQL(documentObject);
        await connection.query( createDocumentSql ); 
        break;
      }
      catch(error){
        this.setBusy(false);
        try {
          const errorHandlingResult = await this.handleCreateDuckDbDocumentError(error);
          if (errorHandlingResult === false) {
            showErrorDialog(error);
            return false;
          }
        }
        catch(error){
          showErrorDialog(error);
          return false;
        }
      }
      this.setBusy(true);
    } while(true);
    this.setBusy(false);
    return true;
  }

  async dropDuckDbDocument(name){
    const dropDocumentSql = this.getDropDocumentSQL(name);
    try {
      const connection = window.hueyDb.connection;
      await connection.query( dropDocumentSql ); 
      return true;
    }
    catch(e){
      console.error(e);
      showErrorDialog(e);
      return false;
    }
  }

  #compareDocuments(documentObject1, documentObject2) {
    return this.getCreateDocumentSQL(documentObject1) === this.getCreateDocumentSQL(documentObject2);
  }
  
  handleCodeInput(event, count){
    if (count !== undefined){
      return;
    }
    const target = event.target;
    const enteredText = target.textContent;
    const selection = SelectionHelper.get(target);
    let error;
    try {
      const parsedDocument = this.parseDocumentSQL(enteredText);
      parsedDocument.fields.forEach(field => {
        const key = field.key;
        const type = field.type;
        if (!type || type === 'text') {
          field.type = this.getDefaultDataypeForKey(key) || type;
        }
      });
      const documentObject = this.documentObject;
      if (!this.#compareDocuments(parsedDocument, documentObject)){
        this.loadDocument(parsedDocument);
        this.setCheckboxState(this.unsavedChangesCheckbox, true);
        SelectionHelper.create(target, selection.start, selection.end, selection.direction);
      }
      
    }
    catch(error) {
      console.error(error);
      return;
    }
  }

  handleFormTabChanged(event) {
    const target = event.target;
    if (target.checked) {
      this.syncDocumentCode();
    }
  }
  
  handleCodeTabChanged(event) {
    const target = event.target;
    if (!target.checked) {
      return;
    }
    if (!this.editingActiveCheckbox.checked) {
      return;
    }
    this.syncDocumentCode();
  }
  
  syncDocumentCode(){
    const sql = this.getCreateDocumentSQL();
    this.hilited.setText(sql);
  }
    
  handleResize(entries){
    this.hilitedPerhipherals.resetGutter();
  }

  async handleBeforeToggle(event){
    if (event.newState === 'open') {
      return;
    }
    this.cleanupDialog();
  }
    
  cleanupDialog(){
    this.hilited.setText('');
    this.resetForm();
    this.setCheckboxState(this.editingActiveCheckbox, false);
    this.setCheckboxState(this.unsavedChangesCheckbox, false);
    this.documentsList.selectedIndex = -1;
    this.clearPassword();
  }
  
  async handleActivateCurrentChanged(event){
    const documentObject = this.documentObject;
    const documentCreated = await this.createDuckDbDocument(documentObject);
    if (!documentCreated){
      event.preventDefault();
      return;
    }
    const existingItem = this.selectedDocumentOption;
    if (existingItem) {
      existingItem.setAttribute('data-loaded', true);
    }
  }

  async handleDeactivateCurrentChanged(event){
    const documentDropped = await this.dropDuckDbDocument();
    if (!documentDropped){
      event.preventDefault();
      return;
    }
    const existingItem = this.selectedDocumentOption;
    if (existingItem) {
      existingItem.setAttribute('data-loaded', false);
    }
  }
  
  handleEditingActiveCheckboxChanged(event){
    const target = event.target;
    this.hilited.editingEnabled = target.checked;
  }
  
  async handleResetStoreClicked(event){
    const config = {
      title: Internationalization.getText('Reset Secrets Store'),
      contents: [
        Internationalization.getText('This action will completely reset the Secrets Store.'),
        Internationalization.getText('All your stored secrets will be lost, and the passowrd will be reset.'),
        Internationalization.getText('If you confirm, this action cannot be undone. Proceed?'),
      ].join('<br/>')
    }
    const result = await PromptUi.show(config);
    if (result === PromptUi.REJECT) {
      return;
    }
    const store = AppDocumentStore.store;
    await store.resetCrypto();
    this.updateDocumentsList();
  }
  
  async handleChangePasswordClicked(event){
    try{ 
      const now = Date.now();
      const oldPasswordId = `old_password_${now}`;
      const newPasswordId = `new_password_${now}`;
      
      const hint = DocumentsDialog.#passwordHint;
      const invalidPassword = '<div>'  + DocumentsDialog.#wrongPasswordHint + '</div>';
      
      const passwordForm = `
        <form>
          <label for="${oldPasswordId}">${Internationalization.getText('Old Password')}</label>
          ${DocumentsDialog.#getPasswordHTML(oldPasswordId, 'password')}
          <label for="${newPasswordId}">${Internationalization.getText('New Password')}</label>
          ${DocumentsDialog.#getPasswordHTML(newPasswordId, 'new-password')}
        </form>
      `;
      const store = AppDocumentStore.store;
      const config = {
        title: Internationalization.getText('Change Password'),
        contents: passwordForm
      };
      while (true) {
        let result = await PromptUi.show(config);
        if (result === PromptUi.REJECT) {
          return;
        }
        const oldPasswordInput = byId(oldPasswordId);
        const oldPassword = oldPasswordInput.value;

        const newPasswordInput = byId(newPasswordId);
        const newPassword = newPasswordInput.value;

        const oldPasswordVerified = await store.verifyPassword(oldPassword);
        if (!oldPasswordVerified) {
          result = false;
          config.contents = invalidPassword + passwordForm
        }
        if (result){
          const newPasswordValid = store.isValidPassword(newPassword);
          if (!newPasswordValid){
            config.contents = hint + passwordForm
            result = false;
          }
        }

        if (!result){
          oldPasswordInput.value = '';
          newPasswordInput.value = '';
          continue;
        }
        await store.changePassword(oldPassword, newPassword);
        this.#password = newPassword;
        break;
      }
    }
    catch(error){
      console.error(error);
    }
    finally {
      PromptUi.clear();
    }
  }
  
  static get #passwordHint(){
    const hint = Internationalization.getText('Password must be at least 12 characters long and include uppercase, lowercase, digit, and special character.');
    return hint;
  }
  
  static get #wrongPasswordHint(){
    const invalidPassword = Internationalization.getText('Wrong password. Try again');
    return invalidPassword;
  }
  
  static #getPasswordHTML(id, name) {
    const hint = DocumentsDialog.#passwordHint;
    const passwordHTML = `<input
      type="password"
      name="${name || 'password'}"
      id="${id}"
      minlength="12"
      required
      pattern="(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{12,}"
      title="${hint}"
      autofocus="true"
    />`;
    return passwordHTML;
  }
  
  async #getPassword(){
    if (this.#password) {
      return this.#password;
    }
    try {
      const store = AppDocumentStore.store;
      const id = 'secretsManagerPassword' + Date.now();
      const hint = DocumentsDialog.#passwordHint;
      const invalidPassword = DocumentsDialog.#wrongPasswordHint;
      const passwordHTML = DocumentsDialog.#getPasswordHTML(id);
      const config = {
        title: Internationalization.getText('Enter Password'),
        contents: passwordHTML
      };

      const isInitialized = await store.isInitialized();
      do {
        if (!isInitialized) {
          const initialPasswordInfo = [
            Internationalization.getText('Enter a password to initialize the Huey secrets manager.'),
            hint,
            Internationalization.getText('This password will be used to encrypt sensitive fields you enter into your duckdb secret.'),
            '',
            passwordHTML,
            '',
            Internationalization.getText('After initialization of the secrets manager, you can only access your secrets by entering the same password.'),
            Internationalization.getText('You can change your password later on but also requires you to enter your previous password, so make sure you remember it!')
          ].join('<br/>');
          config.contents = initialPasswordInfo;
        }
        const result = await PromptUi.show(config);
        if (result === PromptUi.REJECT) {
          return null;
        }

        const password = byId(id).value;
        if (!store.isValidPassword(password)) {
          config.contents = `${hint}<br/>${passwordHTML}`;
        }
        
        if (isInitialized){
          if (await store.verifyPassword(password)){
            this.#password = password;
            return password;
          }
          config.contents = `${invalidPassword}<br/>${passwordHTML}`;
        }
        else {
          await store.init(password);
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
  
  initEvents(){
    const dialog = this.dialog;
    dialog.addEventListener('beforetoggle', event => this.handleBeforeToggle(event) );

    // toolbar buttons
    this.createNewButton.addEventListener('click', event => this.handleCreateNewClicked(event) );
    this.removeCurrentButton.addEventListener('click', event => this.handlerRemoveCurrentClicked(event) );
    this.saveCurrentButton.addEventListener('click', event => this.handleSaveCurrentClicked(event) );
    this.restoreCurrentButton.addEventListener('click', event => this.handleRestoreCurrentClicked(event) );
    this.activateCurrentRadio.addEventListener('change', event => this.handleActivateCurrentChanged(event) );
    this.deactivateCurrentRadio.addEventListener('change', event => this.handleDeactivateCurrentChanged(event) );

    // list (left sidebar)
    this.documentsList.addEventListener('change', event => this.handleDocumentsListChanged(event) );

    // header fields
    this.nameEl.addEventListener('input', event => this.handleDocumentNameInput(event) );
    this.typeEl.addEventListener('change', event => this.handleDocumentTypeChanged(event) );
    this.autoloadEl.addEventListener('change', event => this.handleAutoloadChanged(event) );

    // header key/value collection
    this.keyValuesFieldset.addEventListener('click', event => this.handleFieldClicked(event) ); 
    this.keyValuesFieldset.addEventListener('change', event => this.handleFieldChanged(event) ); 
    this.keyValuesFieldset.addEventListener('input', event => this.handleFieldInput(event) ); 
    this.codeTab.addEventListener('change', event => this.handleCodeTabChanged(event) );
    this.formTab.addEventListener('change', event => this.handleFormTabChanged(event) );
    
    bufferEvents(this.codeEl, 'input', this.handleCodeInput, this, 250);
    
    this.editingActiveCheckbox.addEventListener('change', event => this.handleEditingActiveCheckboxChanged(event));
    this.resizeObserver = new ResizeObserver(this.handleResize.bind(this));
    this.resizeObserver.observe(dialog);
  }
  
  async load(name){
    const documentObject = await this.getAndDecryptDocument(name);
    return this.loadDocument(documentObject);
  }

  parseDocumentSQL(sql){
    throw new Error(`Should be implemented in subclass`);
  }

  getDropDocumentSQL(){
    throw new Error(`Should be implemented in subclass`);
  }

  getCreateDocumentSQL(){
    throw new Error(`Should be implemented in subclass`);
  }
  
  handleCreateDuckDbDocumentError(){
    throw new Error(`Should be implemented in subclass`);
  }
  
  async activateAutoloadedDocuments(){
    try {
      const store = AppDocumentStore.store;
      const list = await store.list(this.objectStoreName);
      const autoloadEntries = list.filter(documentObject => documentObject.autoload);
      const n = autoloadEntries.length;
      if (!n) {
        return;
      }
      for (let i = 0; i < n; i++){
        const docEntry = list[i];
        const name = docEntry.name;
        const documentObject = await this.getAndDecryptDocument(name);
        if (documentObject === null) {
          break;
        }
        const loaded = await this.createDuckDbDocument(documentObject);
        if (loaded) {
          continue;
        }
        console.warn(`Secret "${name}" failed to autoload.`);
      }
    }
    catch(error){
      console.log(error);
    }
    finally {
      this.cleanupDialog();
    }
  }
  
  async handleSaveCurrentClicked(event){
    try {
      const store = AppDocumentStore.store;
      const existingItem = this.selectedDocumentOption;
      const documentObject = this.documentObject;
      
      const updating = Boolean(existingItem);
      
      const newName = documentObject.name;
      const oldName = updating ? existingItem.value : documentObject.name; 
      
      const nameChanged = newName !== oldName;
      const exists = !updating || nameChanged ? await store.exists( this.objectStoreName, newName ) : false;

      if (exists){
        const result = await this.promptOverwriteExistingDocument(newName);
        if (result === PromptUi.REJECT) {
          const nameEl = this.nameEl;
          nameEl.select();
          nameEl.focus();
          return;
        }
      }
      
      let removeOld = false;
      if (nameChanged){
        const result = await this.promptRenameOrCreateDocument(oldName, newName);
        removeOld = result === PromptUi.ACCEPT;
      }
      
      const connection = window.hueyDb.connection;
      
      if (nameChanged && removeOld || exists){
        await this.dropDuckDbDocument();
      }

      const success = await this.createDuckDbDocument(documentObject);
      if (!success) {
        return;
      }
      try {
        await store.store(this.objectStoreName, documentObject);
      }
      catch( error ) {
        if (DocumentStore.isPasswordRequiredError(error)) {
          const password = await this.#getPassword();
          if (!password) {
            return;
          }
          await store.store(this.objectStoreName, documentObject, password);
        }
        else {
          throw error;
        }
      }
      
      if (removeOld === true) {
        await store.remove(this.objectStoreName, oldName);
        await this.dropDuckDbDocument(oldName);
      }
      await this.updateDocumentsList(newName);
      
      this.setCheckboxState(this.unsavedChangesCheckbox, false);
    }
    catch (error) {
      console.error(error);
      console.error(error.stack);
      showErrorDialog(error);
    }
  }  
  
}
