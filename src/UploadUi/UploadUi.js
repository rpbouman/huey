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

  async #uploadFile(file, uploadItem){

    var progressBar = uploadItem.getElementsByTagName('progress').item(0);

    var hueyDb = window.hueyDb;
    var duckdb = hueyDb.duckdb;
    var instance = hueyDb.instance;

    var duckDbDataSource;
    var destroyDatasource = false;
    try {
      if (typeof file === 'string'){
        duckDbDataSource = await DuckDbDataSource.createFromUrl(duckdb, instance, file);
        progressBar.value = parseInt(progressBar.value, 10) + 20;

        await duckDbDataSource.registerFile();
        progressBar.value = parseInt(progressBar.value, 10) + 40;
      }
      else
      if (file instanceof File){
        duckDbDataSource = DuckDbDataSource.createFromFile(duckdb, instance, file);
        progressBar.value = parseInt(progressBar.value, 10) + 20;

        await duckDbDataSource.registerFile();
        progressBar.value = parseInt(progressBar.value, 10) + 40;
      }

      var canAccess = await duckDbDataSource.validateAccess();
      progressBar.value = parseInt(progressBar.value, 10) + 30;

      if (canAccess !== true) {
        destroyDatasource = true;
        throw new Error(`Error uploading file ${file.name}: ${canAccess.message}.`);
      }

      if (duckDbDataSource.getType() === DuckDbDataSource.types.FILE) {
        var columnMetadata = await duckDbDataSource.getColumnMetadata();
      }
      progressBar.value = 100;
      return duckDbDataSource;
    }
    catch (error){
      destroyDatasource = true;
      return error;
    }
    finally {
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
    if (fileSize){
      labelSpan.setAttribute('data-file-size', fileSize);
    }
    
    return uploadItem;
  }

  #createInstallExtensionItem(extensionName){
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
        requiredExtensions.push(requiredDuckDbExtension);
      }
    }
    return requiredExtensions;
  }

  async loadDuckDbExtension(extensionName){
    var invalid = true;
    var body = this.#getBody();
    var installExtensionItem = this.#createInstallExtensionItem(extensionName);
    body.appendChild(installExtensionItem);

    try {

      var progressbar = installExtensionItem.getElementsByTagName('progress').item(0);
      var message = installExtensionItem.getElementsByTagName('p').item(0);

      var connection = hueyDb.connection;

      message.innerHTML += 'Preparing extension check<br/>';
      var sql = `SELECT * FROM duckdb_extensions() WHERE extension_name = ?`;
      var statement = await connection.prepare(sql);
      progressbar.value = parseInt(progressbar.value, 10) + 20;

      message.innerHTML += `Checking extension ${extensionName}<br/>`;
      var result = await statement.query(extensionName);
      statement.close();
      progressbar.value = parseInt(progressbar.value, 10) + 20;

      if (result.numRows === 0) {
        message.innerHTML += `Extension ${extensionName} not found<br/>`;
        throw new Error(`Extension not found`);
      }
      else {
        message.innerHTML += `Extension ${extensionName} exists<br/>`;
      }

      var row = result.get(0);
      if (row['installed']){
        message.innerHTML += `Extension ${extensionName} already installed<br/>`;
      }
      else {
        message.innerHTML += `Extension ${extensionName} not installed<br/>`;

        message.innerHTML += `Installing extension ${extensionName}<br/>`;
        var result = await connection.query(`INSTALL ${extensionName}`);
        message.innerHTML += `Extension ${extensionName} installed<br/>`;
        progressbar.value = parseInt(progressbar.value, 10) + 20;
      }

      if (row['loaded']){
        message.innerHTML += `Extension ${extensionName} is loaded<br/>`;
        invalid = false;
      }
      else {
        message.innerHTML += `Extension ${extensionName} not loaded<br/>`;

        message.innerHTML += `Loading extension ${extensionName}<br/>`;
        await connection.query(`LOAD ${extensionName}`);
        message.innerHTML += `Extension ${extensionName} is loaded<br/>`;
        progressbar.value = parseInt(progressbar.value, 10) + 20;
        invalid = false;
      }
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
            "title": `Start exploring data from ${objectName}`
          });
          menu.appendChild(analyzeButton);

          var settingsButton = createEl('label', {
            "class": 'editActionButton',
            "for": `${datasourceId}_edit`,
            "title": `Configure ${objectName}`
          });
          menu.appendChild(settingsButton);
          break;
      }
      
      uploadItem.setAttribute('aria-invalid', String(false));
      messageText = 'Succesfully loaded.';
    }
    else {
      messageText = uploadResult.message;
      uploadItem.setAttribute('open', true);
      uploadItem.setAttribute('aria-invalid', String(true));
      uploadItem.setAttribute('aria-errormessage', message.id);
    }
    message.innerText = messageText;

  }

  async uploadFiles(files){
    this.#cancelPendingUploads = false;
    var dom = this.getDialog();
    dom.setAttribute('aria-busy', true);

    var numFiles = files.length;
    var header = this.#getHeader();
    header.innerText = `Uploading ${numFiles} file${numFiles === 1 ? '' : 's'}.`;
    var description = this.#getDescription();
    description.innerText = 'Upload in progress. This will take a few moments...';

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
      else {
        countFail += 1;
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
        message = `${countSuccess} file${countSuccess > 1 ? 's' : ''} succesfully uploaded, ${countFail} failed.`;
        description = 'Some uploads failed. Successfull uploads are available in the <label for="datasourcesTab">Datasources tab</label>.';
      }
      else {
        message = `${countFail} file${countFail > 1 ? 's' : ''} failed.`;
        description = 'All uploads failed. You can review the errors below:';
      }
    }
    else {
      message = `${uploadResults.length} file${uploadResults.length > 1 ? 's' : ''} succesfully uploaded.`
      description = 'Your uploads are available in the <label for="datasourcesTab">Datasources tab</label>.';
    }

    if (countSuccess !== 0){
      if (datasourceTypes[DuckDbDataSource.types.FILE]) {
        description = [
          description,
          '<br/>',
          '<br/>Click the <span class="editActionButton"></span> button to configure the datasource.',
         '<br/>Click the <span class="analyzeActionButton"></span> button to start exploring.'
        ].join('\n');
      }
      
      if (datasourceTypes[DuckDbDataSource.types.DUCKDB] || datasourceTypes[DuckDbDataSource.types.SQLITE]){
        description = [
          description,
          '<br/>',
          '<br/>For database files, use the datasources tab to browse the database for tables or views to analyze.'
        ].join('\n');
      }
    }

    this.#getHeader().innerText = message;
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
function initUploadUi(){
  uploadUi = new UploadUi('uploadUi');

  function afterUploaded(uploadResults){
    var currentRoute = Routing.getCurrentRoute();
    if (!Routing.isSynced(queryModel)) {
      pageStateManager.setPageState(currentRoute);
      return;
    }
    
    if (uploadResults.fail === 0 && uploadResults.success === 1){

      // TODO: check if there is already a query active.
      // if not, we can just start analyzing the newly uploaded datasource.
      // But if there is a query active, then we'd be losing it if we just switch to the new datasource.
      // in these cases we could do two things:
      // - do nothing, don't even close the upload ui. 
      //   The user will have a choice anyway, as they can either hit the analyze button, or cancel.
      // - prompt the user and ask them what to do.
      //   - if the current query could be satisfied by the new datasource then we could offer that in the prompt
      //   - we can always offer the option to start analyzing the new datasource (losing the current query)
      //   - we can always offer to do nothing
      
      if (!currentRoute || !currentRoute.length) {
        var datasources = uploadResults.datasources;
        for (var i = 0; i < datasources.length; i++){
          var datasource = datasources[i];
          switch (datasource.getType()){
            case DuckDbDataSource.types.FILE:
            case DuckDbDataSource.types.FILES:
            case DuckDbDataSource.types.URL:
              analyzeDatasource(datasource);
              return;
            default:
          }
        }
      }
    }
  }

  byId('uploader')
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

