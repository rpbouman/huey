class UploadUi {

  static #fileSizeFormatter = new Intl.NumberFormat(
    navigator.language, {
      style: 'unit',
      notation: 'compact',
      unit: 'byte',
      unitDisplay: 'narrow'
    }
  );

  #id = undefined;
  #pendingUploads = undefined;
  #cancelPendingUploads = false;
  static #uploadItemTemplateId = 'uploadItemTemplate';

  constructor(id){
    this.#id = id;
    this.init();
  }

  init(){
    this.#getCancelButton().addEventListener('click', async function(){
      await this.#cancelUploads();
      this.getDialog().close();
    }.bind(this));

    this.#getOkButton().addEventListener('click', function(){
      this.getDialog().close();
    }.bind(this));
  }

  async #cancelUploads(){
    this.#cancelPendingUploads = true;
  }

  static #handleHueyFileContents(contents, extension){
    var queryModelState;
    switch (extension) {
      case 'hueyqh':
        if (!contents.startsWith('#')){
          throw new Error(`No hash found!`);
        }
        var route = contents.slice(1);
        queryModelState = Routing.getQueryModelStateFromRoute(route);
        break;
      case 'hueyq':
        queryModelState = JSON.parse(contents);
        break;
    }
    return queryModelState;
  }

  static async #handleHueyFile(file, uploadItem){
    var fileName = file.name;
    var extension = fileName.split('.').pop().toLowerCase();
    var fileContents = await file.text();
    return UploadUi.#handleHueyFileContents(fileContents, extension);
  }

  static async #handleHueyFileUrl(url, uploadItem){
    var extension = url.split('.').pop().toLowerCase();
    var contents = await fetch(url);
    return UploadUi.#handleHueyFileContents(contents, extension);
  }

  async #uploadFile(file, uploadItem){

    var progressBar = uploadItem.getElementsByTagName('progress').item(0);

    var hueyDb = window.hueyDb;
    var duckdb = hueyDb.duckdb;
    var instance = hueyDb.instance;

    var duckDbDataSource;
    var destroyDatasource = false;
    
    var hueyFileRegex = /\.hueyqh?$/i;
    var hueyQueryState;
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
          duckDbDataSource = DuckDbDataSource.createFromFile(duckdb, instance, file);
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
    var loadExtensionItem = instantiateTemplate(UploadUi.#uploadItemTemplateId, extensionId);
    loadExtensionItem.getElementsByTagName('p').item(0).setAttribute('id', extensionId + '_message');
    return loadExtensionItem;
  }

  #createUploadItem(file){
    var fileName, fileSize;
    if (typeof file === 'string'){
      fileName = file;
    }
    else
    if (file instanceof File) {
      fileName = file.name;
      fileSize = UploadUi.#fileSizeFormatter.format(file.size);
      if (fileSize.endsWith('BB')){
        fileSize = fileSize.replace(/BB/, 'GB');
      }
    }
    else {
      throw new Error(`Don't know how to handle item of type ${typeof file}`);
    }

    var uploadItem = instantiateTemplate(UploadUi.#uploadItemTemplateId, fileName);
    uploadItem.getElementsByTagName('p').item(0).setAttribute('id', fileName + '_message');
    var labelSpan = uploadItem.getElementsByTagName('span').item(0);
    labelSpan.textContent = fileName;
    labelSpan.setAttribute('title', fileName);
    if (fileSize){
      labelSpan.setAttribute('data-file-size', fileSize);
    }
    
    return uploadItem;
  }

  #createInstallExtensionItem(extensionName, extensionRepository){
    var extensionItemId = `duckdb_extension:${extensionName}`;
    var uploadItem = this.#createLoadExtensionItem(extensionItemId);
    var label = uploadItem.getElementsByTagName('span').item(0);
    label.textContent = `Extension: ${extensionName}`;
    return uploadItem;
  }

  getRequiredDuckDbExtensions(files){
    var requiredExtensions = []
    for (var i = 0; i < files.length; i++){
      var file = files[i];

      var fileName;
      if (typeof file === 'string') {
        fileName = file;
      }
      else
      if (file instanceof File) {
        fileName = file.name;
      }
      else {
        throw new Error(`Don't know how to handle item of type ${typeof file}.`);
      }

      var fileNameParts = DuckDbDataSource.getFileNameParts(fileName);
      var fileExtension = fileNameParts.lowerCaseExtension;

      var fileType = DuckDbDataSource.getFileTypeInfo(fileExtension);
      if (!fileType){
        continue;
      }

      var requiredDuckDbExtension = fileType.duckdb_extension;
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
    
    var extensionRepository;
    switch (typeof extensionName){
      case 'string':
        break;
      case 'object':
        extensionRepository = extensionName.extensionRepository;
        extensionName = extensionName.extensionName;
    }
    
    var invalid = true;
    var body = this.#getBody();
    var installExtensionItem = this.#createInstallExtensionItem(extensionName);
    body.appendChild(installExtensionItem);

    try {

      var progressbar = installExtensionItem.getElementsByTagName('progress').item(0);
      var message = installExtensionItem.getElementsByTagName('p').item(0);

      var connection = hueyDb.connection;

      message.innerHTML += Internationalization.getText('Preparing extension check') + '<br/>';
      var sql = `SELECT * FROM duckdb_extensions() WHERE extension_name = ?`;
      var statement = await connection.prepare(sql);
      progressbar.value = parseInt(progressbar.value, 10) + 20;

      message.innerHTML += Internationalization.getText('Checking extension {1}', extensionName) + '<br/>';
      var result = await statement.query(extensionName);
      statement.close();
      progressbar.value = parseInt(progressbar.value, 10) + 20;

      if (result.numRows === 0) {
        message.innerHTML += Internationalization.getText('Extension {1} not found', extensionName) + '<br/>';
        throw new Error(`Extension not found`);
      }
      else {
        message.innerHTML += Internationalization.getText('Extension {1} exists', extensionName) + '<br/>';
      }

      var row = result.get(0);
      if (row['installed']){
        message.innerHTML += Internationalization.getText('Extension {1} already installed', extensionName) + '<br/>';
      }
      else {
        message.innerHTML += Internationalization.getText('Extension {1} not installed', extensionName) + '<br/>';

        var installSql = `INSTALL ${extensionName}`;
        if (extensionRepository){
          message.innerHTML += Internationalization.getText('Extension {1} comes from non-standard location {2}', extensionName, extensionRepository) + '<br/>';          
          installSql += ` FROM ${extensionRepository}`;
        }
        message.innerHTML += Internationalization.getText('Installing extension {1}', extensionName) + '<br/>';
        var result = await connection.query(installSql);
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
    var extensionInstallationItems = requiredDuckDbExtensions.map(this.loadDuckDbExtension.bind(this));
    return extensionInstallationItems;
  }

  #updateUploadItem(uploadItem, uploadResult){
    var summary = uploadItem.getElementsByTagName('summary').item(0);

    var messageText;
    var message = uploadItem.getElementsByTagName('p').item(0);
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
      var datasourceId = uploadResult.getId();
      var type = uploadResult.getType();
      switch (type){
        case DuckDbDataSource.types.FILE:
        case DuckDbDataSource.types.URL:
          var menu = summary.getElementsByTagName('menu').item(0);
          var objectName = uploadResult.getObjectName();
          var analyzeButton = createEl('label', {
            "class": 'analyzeActionButton',
            "for": `${datasourceId}_analyze`,
          });
          Internationalization.setAttributes(analyzeButton, 'title', 'Start exploring data from {1}', objectName);
          menu.appendChild(analyzeButton);

          var settingsButton = createEl('label', {
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
      var route = Routing.getRouteForQueryModel(uploadResult);
      var menu = summary.getElementsByTagName('menu').item(0);
      var objectName = 'the query';
      
      var id = `link_to_route_${route}`;
      var analyzeButton = createEl('button', {
        id: id,
        'data-route': route
      });
      analyzeButton.addEventListener('click', async function(event){
        await pageStateManager.setPageState(route);
      });
      var analyzeButtonLabel = createEl('label', {
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
    var dom = this.getDialog();
    dom.setAttribute('aria-busy', true);

    var numFiles = files.length;
    var header = this.#getHeader();
    Internationalization.setTextContent(header, `Uploading {1} file${numFiles === 1 ? '' : 's'}.`, numFiles);
    var description = this.#getDescription();
    Internationalization.setTextContent(description, 'Upload in progress. This will take a few moments...');

    var body = this.#getBody();
    body.innerHTML = '';

    dom.showModal();

    var requiredDuckDbExtensions = this.getRequiredDuckDbExtensions(files);
    var loadExtensionsPromises = this.loadRequiredDuckDbExtensions(requiredDuckDbExtensions);
    var loadExtensionsPromiseResults = await Promise.all(loadExtensionsPromises);

    this.#pendingUploads = [];
    for (var i = 0; i < numFiles; i++){
      var file = files[i];
      var uploadItem = this.#createUploadItem(file);
      body.appendChild(uploadItem);
      var uploadPromise = this.#uploadFile(file, uploadItem);
      this.#pendingUploads.push( uploadPromise );
    }
    var uploadResults = await Promise.all(this.#pendingUploads);

    var countFail = 0;
    var datasourceTypes = {}
    var datasources = [];
    for (var i = 0; i < uploadResults.length; i++){
      var uploadResult = uploadResults[i];
      var uploadItem = body.childNodes.item(i + requiredDuckDbExtensions.length);
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
    
    var message, description;
    var countSuccess = uploadResults.length - countFail;
    if (countFail) {
      if (countSuccess){
        message = Internationalization.getText(`{1} file${countSuccess > 1 ? 's' : ''} succesfully uploaded, {2} failed.`, countSuccess, countFail);
        var datasourcesTab = '<label for="datasourcesTab">' + Internationalization.getText('Datasources tab') + '</label>';
        description = Internationalization.getText('Some uploads failed. Successful uploads are available in the {1}.', datasourcesTab);
      }
      else {
        message = Internationalization.getText(`{1} file${countFail > 1 ? 's' : ''} failed.`, countFail);
        description = Internationalization.getText('All uploads failed. You can review the errors below:');
      }
    }
    else {
      message = `${uploadResults.length} file${uploadResults.length > 1 ? 's' : ''} succesfully uploaded.`
      var datasourcesTab = '<label for="datasourcesTab">' + Internationalization.getText('Datasources tab') + '</label>';
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
        var datasourcesTab = '<label for="datasourcesTab">' + Internationalization.getText('Datasources tab') + '</label>';
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
    var dom = this.getDialog();
    return byId(dom.getAttribute('aria-labelledby'));
  }

  #getDescription(){
    var dom = this.getDialog();
    return byId(dom.getAttribute('aria-describedby'));
  }

  #getBody(){
    var dom = this.getDialog();
    var article = dom.getElementsByTagName('section').item(0);
    return article;
  }

  #getFooter(){
    var dom = this.getDialog();
    var footer = dom.getElementsByTagName('footer').item(0);
    return footer;
  }

  #getOkButton(){
    var footer = this.#getFooter();
    var okButton = footer.getElementsByTagName('button').item(0);
    return okButton;
  }

  #getCancelButton(){
    var footer = this.#getFooter();
    var okButton = footer.getElementsByTagName('button').item(1);
    return okButton;
  }
}

var uploadUi;

function afterUploaded(uploadResults){
  var currentRoute = Routing.getCurrentRoute();
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
  var datasources = uploadResults.datasources.filter(function(datasource){
    return datasource instanceof DuckDbDataSource;
  });
  if (datasources.length === 0) {
    return;
  }
  var datasource = datasources[0];
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

  var uploader = byId('uploader');
  var acceptFileTypes = Object.keys(DuckDbDataSource.fileTypes).sort().map(function(fileType){
    return `.${fileType}`;
  }).join(', ');
  acceptFileTypes = [].concat(acceptFileTypes, [
    '.hueyq',
    '.hueyqh'
  ]);
  uploader.setAttribute('accept', acceptFileTypes);
  
  uploader
  .addEventListener('change', async function(event){
    var fileControl = event.target;
    var files = fileControl.files;
    var uploadResults = await uploadUi.uploadFiles(files);
    fileControl.value = '';
    afterUploaded(uploadResults);
  }, false);  // third arg is 'useCapture'


  byId('loadFromUrl')
  .addEventListener('click', async function(event){
    var url = prompt('Enter URL');
    if (!url || !url.length){
      return;
    }
    var uploadResults = await uploadUi.uploadFiles([url]);
    afterUploaded(uploadResults);
  });

}