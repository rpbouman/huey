class UploadUi {

  #id = undefined;
  #pendingUploads = undefined;
  #cancelPendingUploads = false;
  static #uploadItemTemplateId = 'uploadItemTemplate';

  constructor(id){
    this.#id = id;
    this.init();
  }

  init(){
    this.#getCancelButton().addEventListener('click', async event => {
      await this.#cancelUploads();
      this.getDialog().close();
    });
    this.#getOkButton().addEventListener('click', event => this.getDialog().close() );
  }

  async #cancelUploads(){
    this.#cancelPendingUploads = true;
  }

  static #handleHueyFileContents(contents, extension){
    let queryModelState;
    switch (extension) {
      case 'hueyqh':
        if (!contents.startsWith('#')){
          throw new Error(`No hash found!`);
        }
        const route = contents.slice(1);
        queryModelState = Routing.getQueryModelStateFromRoute(route);
        break;
      case 'hueyq':
        queryModelState = JSON.parse(contents);
        break;
    }
    return queryModelState;
  }

  static async #handleHueyFile(file, uploadItem){
    const fileName = file.name;
    const extension = fileName.split('.').pop().toLowerCase();
    const fileContents = await file.text();
    return UploadUi.#handleHueyFileContents(fileContents, extension);
  }

  static async #handleHueyFileUrl(url, uploadItem){
    const extension = url.split('.').pop().toLowerCase();
    const contents = await fetch(url);
    return UploadUi.#handleHueyFileContents(contents, extension);
  }

  async #uploadFile(file, uploadItem){

    const progressBar = uploadItem.getElementsByTagName('progress').item(0);

    const hueyDb = window.hueyDb;
    const duckdb = hueyDb.duckdb;
    const instance = hueyDb.instance;

    let duckDbDataSource;
    let destroyDatasource = false;
    
    const hueyFileRegex = /\.hueyqh?$/i;
    let hueyQueryState;
    try {
      
      if (typeof file === 'string'){
        
        if (hueyFileRegex.test(file)){
          hueyQueryState = await UploadUi.#handleHueyFileUrl(file, uploadItem);
        }
        else {
          duckDbDataSource = await DuckDbDataSource.createFromUrl(duckdb, instance, file);
          progressBar.value = parseInt(progressBar.value, 10) + 20;

          await duckDbDataSource.registerFile();
          progressBar.value = parseInt(progressBar.value, 10) + 40;
        }
      }
      else
      if (file instanceof File){
        
        if (hueyFileRegex.test(file.name)){
          hueyQueryState = await UploadUi.#handleHueyFile(file, uploadItem);
        }
        else {
          duckDbDataSource = await DuckDbDataSource.createFromFile(duckdb, instance, file);
          progressBar.value = parseInt(progressBar.value, 10) + 20;

          await duckDbDataSource.registerFile();
          progressBar.value = parseInt(progressBar.value, 10) + 40;
        }
      }

      var tryResult, isAccessible;
      if (duckDbDataSource) {
        tryResult = await duckDbDataSource.tryAccess(100);
        isAccessible = tryResult.success;
      }
      else 
      if (hueyQueryState){
        isAccessible = true;
      }
      progressBar.value = parseInt(progressBar.value, 10) + 30;

      if (isAccessible !== true) {
        destroyDatasource = true;
        var errorMessage = tryResult.lastAttempt.message;
        throw new Error(`Error uploading file ${file.name}: ${errorMessage}.`);
      }

      if (duckDbDataSource) {
        switch (duckDbDataSource.getType()){
          case DuckDbDataSource.types.FILE:
            var columnMetadata = await duckDbDataSource.getColumnMetadata();
            break;
          case DuckDbDataSource.types.DUCKDB:
          case DuckDbDataSource.types.SQLITE:
        }
        return duckDbDataSource;
      }
      else
      if (hueyQueryState){
        return hueyQueryState;
      }
    }
    catch (error){
      destroyDatasource = true;
      return error;
    }
    finally {
      progressBar.value = 100;
      if (destroyDatasource && (duckDbDataSource instanceof DuckDbDataSource)){
        duckDbDataSource.destroy();
      }
    }
  }

  #createLoadExtensionItem(extensionId){
    const loadExtensionItem = instantiateTemplate(UploadUi.#uploadItemTemplateId, extensionId);
    loadExtensionItem.getElementsByTagName('p').item(0).setAttribute('id', extensionId + '_message');
    return loadExtensionItem;
  }

  #createUploadItem(file){
    let fileName, fileSize;
    if (typeof file === 'string'){
      fileName = file;
    }
    else
    if (file instanceof File) {
      fileName = file.name;
      fileSize = FileUtils.formatFileSize(file);
    }
    else {
      throw new Error(`Don't know how to handle item of type ${typeof file}`);
    }

    const uploadItem = instantiateTemplate(UploadUi.#uploadItemTemplateId, fileName);
    uploadItem.getElementsByTagName('p').item(0).setAttribute('id', fileName + '_message');
    const labelSpan = uploadItem.getElementsByTagName('span').item(0);
    labelSpan.textContent = fileName;
    labelSpan.setAttribute('title', fileName);
    if (fileSize){
      labelSpan.setAttribute('data-file-size', fileSize);
    }
    
    return uploadItem;
  }

  #createInstallExtensionItem(extensionName, extensionRepository){
    const extensionItemId = `duckdb_extension:${extensionName}`;
    const uploadItem = this.#createLoadExtensionItem(extensionItemId);
    const label = uploadItem.getElementsByTagName('span').item(0);
    label.textContent = `Extension: ${extensionName}`;
    return uploadItem;
  }

  getRequiredDuckDbExtensions(files){
    const requiredExtensions = []
    for (let i = 0; i < files.length; i++){
      const file = files[i];

      let fileName;
      if (typeof file === 'string') {
        fileName = file;
      }
      else
      if (file instanceof File) {
        fileName = file.name;
      }
      else {
        const typeOfFile = typeof file;
        throw new Error(`Don't know how to handle item of type ${typeOfFile === 'object' ? file.constructor.name : typeOfFile}.`);
      }

      const fileNameParts = FileUtils.getFileNameParts(fileName);
      const fileExtension = fileNameParts.lowerCaseExtension;

      const fileType = DuckDbDataSource.getFileTypeInfo(fileExtension);
      if (!fileType){
        continue;
      }

      const requiredDuckDbExtension = fileType.duckdb_extension;
      if (!requiredDuckDbExtension){
        continue;
      }

      if (requiredExtensions.indexOf(requiredDuckDbExtension) === -1) {
        var extensionRepository = fileType.duckdb_extension_repository;
        requiredExtensions.push({
          extensionName: requiredDuckDbExtension,
          extensionRepository: extensionRepository
        });
      }
    }
    return requiredExtensions;
  }

  async loadDuckDbExtension(extensionName){
    
    let extensionRepository;
    switch (typeof extensionName){
      case 'string':
        break;
      case 'object':
        extensionRepository = extensionName.extensionRepository;
        extensionName = extensionName.extensionName;
    }
    
    let invalid = true;
    const body = this.#getBody();
    const installExtensionItem = this.#createInstallExtensionItem(extensionName);
    body.appendChild(installExtensionItem);

    try {

      const progressbar = installExtensionItem.getElementsByTagName('progress').item(0);
      const message = installExtensionItem.getElementsByTagName('p').item(0);

      const connection = hueyDb.connection;

      message.innerHTML += Internationalization.getText('Preparing extension check') + '<br/>';
      const sql = `SELECT * FROM duckdb_extensions() WHERE extension_name = ?`;
      const statement = await connection.prepare(sql);
      progressbar.value = parseInt(progressbar.value, 10) + 20;

      message.innerHTML += Internationalization.getText('Checking extension {1}', extensionName) + '<br/>';
      let result = await statement.query(extensionName);
      statement.close();
      progressbar.value = parseInt(progressbar.value, 10) + 20;

      if (result.numRows === 0) {
        message.innerHTML += Internationalization.getText('Extension {1} not found', extensionName) + '<br/>';
        throw new Error(`Extension not found`);
      }
      else {
        message.innerHTML += Internationalization.getText('Extension {1} exists', extensionName) + '<br/>';
      }

      const row = result.get(0);
      if (row['installed']){
        message.innerHTML += Internationalization.getText('Extension {1} already installed', extensionName) + '<br/>';
      }
      else {
        message.innerHTML += Internationalization.getText('Extension {1} not installed', extensionName) + '<br/>';

        const installSql = `INSTALL ${extensionName}`;
        if (extensionRepository){
          message.innerHTML += Internationalization.getText('Extension {1} comes from non-standard location {2}', extensionName, extensionRepository) + '<br/>';          
          installSql += ` FROM ${extensionRepository}`;
        }
        message.innerHTML += Internationalization.getText('Installing extension {1}', extensionName) + '<br/>';
        result = await connection.query(installSql);
        message.innerHTML += Internationalization.getText('Extension {1} is now installed', extensionName) + '<br/>';
        progressbar.value = parseInt(progressbar.value, 10) + 20;
      }

      if (!row['loaded']){
        message.innerHTML += Internationalization.getText('Extension {1} not loaded', extensionName) + '<br/>';
        message.innerHTML += Internationalization.getText('Loading extension {1}', extensionName) + '<br/>';
        await connection.query(`LOAD ${extensionName}`);
      }
      
      message.innerHTML += Internationalization.getText('Extension {1} is loaded', extensionName) + '<br/>';
      progressbar.value = parseInt(progressbar.value, 10) + 20;
      invalid = false;
      if (invalid === false) {
        progressbar.value = 100;
      }
      return !invalid;
    }
    catch (e){
      message.innerHTML += e.message + '<br/>';
      message.innerHTML += e.stack.split('\n').map(function(stackItem){
        return `<pre>${stackItem}</pre>`
      }).join('\n');
      installExtensionItem.setAttribute('open', true);
      return e;
    }
    finally{
      installExtensionItem.setAttribute('aria-invalid', invalid);
    }
  }

  loadRequiredDuckDbExtensions(requiredDuckDbExtensions){
    const extensionInstallationItems = requiredDuckDbExtensions.map(extensionName => this.loadDuckDbExtension(extensionName) );
    return extensionInstallationItems;
  }

  #updateUploadItem(uploadItem, uploadResult){
    const summary = uploadItem.getElementsByTagName('summary').item(0);

    let messageText;
    const message = uploadItem.getElementsByTagName('p').item(0);
    if (uploadResult instanceof Error){
      messageText = uploadResult.message;
      uploadItem.setAttribute('open', true);
      uploadItem.setAttribute('aria-invalid', String(true));
      uploadItem.setAttribute('aria-errormessage', message.id);
      
      // TODO: see if we can translate
      uploadItem.textContent = messageText;
    }
    else
    if (uploadResult instanceof DuckDbDataSource) {
      const datasourceId = uploadResult.getId();
      const type = uploadResult.getType();
      switch (type){
        case DuckDbDataSource.types.FILE:
        case DuckDbDataSource.types.URL:
          const menu = summary.getElementsByTagName('menu').item(0);
          const objectName = uploadResult.getObjectName();
          const analyzeButton = createEl('label', {
            "class": 'analyzeActionButton',
            "for": `${datasourceId}_analyze`,
          });
          Internationalization.setAttributes(analyzeButton, 'title', 'Start exploring data from {1}', objectName);
          menu.appendChild(analyzeButton);

          const settingsButton = createEl('label', {
            "class": 'editActionButton',
            "for": `${datasourceId}_edit`,
          });
          Internationalization.setAttributes(settingsButton, 'title', 'Configure {1}', objectName);
          menu.appendChild(settingsButton);
          break;
      }
      
      uploadItem.setAttribute('aria-invalid', String(false));
      Internationalization.setTextContent(message, 'Succesfully loaded.');
    }
    else
    if (typeof uploadResult === 'object') {
      const route = Routing.getRouteForQueryModel(uploadResult);
      const menu = summary.getElementsByTagName('menu').item(0);
      const objectName = 'the query';
      
      const id = `link_to_route_${route}`;
      const analyzeButton = createEl('button', {
        id: id,
        'data-route': route
      });
      analyzeButton.addEventListener('click', async function(event){
        await pageStateManager.setPageState(route);
      });
      const analyzeButtonLabel = createEl('label', {
        "class": 'analyzeActionButton',
        "for": id
      });
      Internationalization.setAttributes(analyzeButtonLabel, 'title', 'Start exploring data from {1}', objectName);
      analyzeButtonLabel.appendChild(analyzeButton);
      
      menu.appendChild(analyzeButtonLabel);
      uploadItem.setAttribute('aria-invalid', String(false));
      Internationalization.setTextContent(message, 'Succesfully loaded.');
    }
  }

  async uploadFiles(files){
    this.#cancelPendingUploads = false;
    const dom = this.getDialog();
    dom.setAttribute('aria-busy', true);

    const numFiles = files.length;
    const header = this.#getHeader();
    Internationalization.setTextContent(header, `Uploading {1} file${numFiles === 1 ? '' : 's'}.`, numFiles);
    let description = this.#getDescription();
    Internationalization.setTextContent(description, 'Upload in progress. This will take a few moments...');

    const body = this.#getBody();
    body.innerHTML = '';

    dom.showModal();

    const requiredDuckDbExtensions = this.getRequiredDuckDbExtensions(files);
    const loadExtensionsPromises = this.loadRequiredDuckDbExtensions(requiredDuckDbExtensions);
    const loadExtensionsPromiseResults = await Promise.all(loadExtensionsPromises);

    this.#pendingUploads = [];
    for (let i = 0; i < numFiles; i++){
      const file = files[i];
      const uploadItem = this.#createUploadItem(file);
      body.appendChild(uploadItem);
      const uploadPromise = this.#uploadFile(file, uploadItem);
      this.#pendingUploads.push( uploadPromise );
    }
    const uploadResults = await Promise.all(this.#pendingUploads);

    let countFail = 0;
    let datasourceTypes = {}
    const datasources = [];
    for (let i = 0; i < uploadResults.length; i++){
      const uploadResult = uploadResults[i];
      const uploadItem = body.childNodes.item(i + requiredDuckDbExtensions.length);
      this.#updateUploadItem(uploadItem, uploadResult);
      if (uploadResult instanceof Error) {
        countFail += 1;
      }
      else 
      if (uploadResult instanceof DuckDbDataSource ) {
        datasources.push(uploadResult);
        var type = uploadResult.getType();
        var ofTypeCount = datasourceTypes[type];
        if (ofTypeCount === undefined) {
          ofTypeCount = 0;
        }
        ofTypeCount += 1;
        datasourceTypes[type] = ofTypeCount;
      }
      else 
      if (typeof uploadResult === 'object'){
       
      }
    }

    dom.setAttribute('aria-busy', false);
    if (datasources.length) {
      datasourcesUi.addDatasources(datasources);
    }
    
    let message, datasourcesTab;
    const countSuccess = uploadResults.length - countFail;
    if (countFail) {
      if (countSuccess){
        message = Internationalization.getText(`{1} file${countSuccess > 1 ? 's' : ''} succesfully uploaded, {2} failed.`, countSuccess, countFail);
        datasourcesTab = '<label for="datasourcesTab">' + Internationalization.getText('Datasources tab') + '</label>';
        description = Internationalization.getText('Some uploads failed. Successful uploads are available in the {1}.', datasourcesTab);
      }
      else {
        message = Internationalization.getText(`{1} file${countFail > 1 ? 's' : ''} failed.`, countFail);
        description = Internationalization.getText('All uploads failed. You can review the errors below:');
      }
    }
    else {
      message = `${uploadResults.length} file${uploadResults.length > 1 ? 's' : ''} succesfully uploaded.`
      datasourcesTab = '<label for="datasourcesTab">' + Internationalization.getText('Datasources tab') + '</label>';
      description = Internationalization.getText('Your uploads are available in the {1}.', datasourcesTab);
    }

    if (countSuccess !== 0){
      if (datasourceTypes[DuckDbDataSource.types.FILE]) {
        description = [
          description,
          '<br/>',
          '<br/>' + Internationalization.getText('Click the {1} button to configure the datasource.', '<span class="editActionButton"></span>'),
         '<br/>' + Internationalization.getText('Click the {1} button to start exploring.', '<span class="analyzeActionButton"></span>')
        ].join('\n');
      }
      
      if (datasourceTypes[DuckDbDataSource.types.DUCKDB] || datasourceTypes[DuckDbDataSource.types.SQLITE]){
        datasourcesTab = '<label for="datasourcesTab">' + Internationalization.getText('Datasources tab') + '</label>';
        description = [
          description,
          '<br/>',
          '<br/>' + Internationalization.getText('For database files, use the {1} to browse for tables or views to analyze.', datasourcesTab)
        ].join('\n');
      }
    }

    this.#getHeader().textContent = message;
    this.#getDescription().innerHTML = description;
    
    return {
      success: countSuccess,
      fail: countFail,
      datasources: datasources
    };
  }

  getDialog(){
    return byId(this.#id);
  }

  close(){
    this.getDialog().close();
  }

  #getHeader(){
    const dom = this.getDialog();
    return byId(dom.getAttribute('aria-labelledby'));
  }

  #getDescription(){
    const dom = this.getDialog();
    return byId(dom.getAttribute('aria-describedby'));
  }

  #getBody(){
    const dom = this.getDialog();
    const article = dom.getElementsByTagName('section').item(0);
    return article;
  }

  #getFooter(){
    const dom = this.getDialog();
    const footer = dom.getElementsByTagName('footer').item(0);
    return footer;
  }

  #getOkButton(){
    const footer = this.#getFooter();
    const okButton = footer.getElementsByTagName('button').item(0);
    return okButton;
  }

  #getCancelButton(){
    const footer = this.#getFooter();
    const okButton = footer.getElementsByTagName('button').item(1);
    return okButton;
  }
}

var uploadUi;

function afterUploaded(uploadResults){
  const currentRoute = Routing.getCurrentRoute();
  if (!Routing.isSynced(queryModel)) {
    pageStateManager.setPageState(currentRoute, uploadResults);
    return;
  }
  
  if ( uploadResults.fail !== 0 ){
    // failed: keep the dialog open so the user can inspect the details
    return;
  }
  
  if ( uploadResults.success !== 1 ) {
    // multiple results: we can't choose so keep the dialog open so the user can.
    return;
  }
  
  if (currentRoute){
    // there is already a query active, so we won't start analyzing the new datasource.
    // Possible TODO: check if the new datasource is compatible with the current query.
    // if it is, prompt the user to apply it to the new datasource.
    return;
  }
  
  // try to start analyzing the new datasource.
  const datasources = uploadResults.datasources.filter(function(datasource){
    return datasource instanceof DuckDbDataSource;
  });
  if (datasources.length === 0) {
    return;
  }
  const datasource = datasources[0];
  switch (datasource.getType()){
    case DuckDbDataSource.types.FILE:
    case DuckDbDataSource.types.FILES:
    case DuckDbDataSource.types.URL:
      analyzeDatasource(datasource);
      return;
    default:
  }
}

function initUploadUi(){
  uploadUi = new UploadUi('uploadUi');

  const uploader = byId('uploader');
  let acceptFileTypes = Object.keys(DuckDbDataSource.fileTypes).sort().map(function(fileType){
    return `.${fileType}`;
  }).join(', ');
  acceptFileTypes = [].concat(acceptFileTypes, [
    '.hueyq',
    '.hueyqh'
  ]);
  uploader.setAttribute('accept', acceptFileTypes);
  
  uploader
  .addEventListener('change', async function(event){
    const fileControl = event.target;
    const files = fileControl.files;
    const uploadResults = await uploadUi.uploadFiles(files);
    fileControl.value = '';
    afterUploaded(uploadResults);
  }, false);  // third arg is 'useCapture'


  byId('loadFromUrl')
  .addEventListener('click', async function(event){
    const url = prompt('Enter URL');
    if (!url || !url.length){
      return;
    }
    const uploadResults = await uploadUi.uploadFiles([url]);
    afterUploaded(uploadResults);
  });

}