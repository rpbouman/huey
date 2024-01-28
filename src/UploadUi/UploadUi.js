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
  
  constructor(id){
    this.#id = id;
    this.init();
  }
  
  init(){        
    this.#getCancelButton().addEventListener('click', async function(){
      await this.#cancelUploads();
      this.getDom().close();
    }.bind(this));
    
    this.#getOkButton().addEventListener('click', function(){
      this.getDom().close();
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
      duckDbDataSource = DuckDbDataSource.createFromFile(duckdb, instance, file);
      progressBar.value = parseInt(progressBar.value, 10) + 20;
      
      await duckDbDataSource.registerFile();
      progressBar.value = parseInt(progressBar.value, 10) + 40;
        
      var canAccess = await duckDbDataSource.validateAccess();
      progressBar.value = parseInt(progressBar.value, 10) + 30;

      if (canAccess === true) {
        if (duckDbDataSource.getType() === DuckDbDataSource.types.FILE) {
          var columnMetadata = await duckDbDataSource.getColumnMetadata();
        }
        progressBar.value = 100;
      }
      else {
        destroyDatasource = true;
        return new Error(`Error uploading file ${file.name}: ${canAccess.message}.`);
      }
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
  
  #createUploadItem(file){
    var fileName = file.name;
    var uploadItem = createEl('details', {
      id: fileName
    });
    
    var summary = createEl('summary', {
    });
    uploadItem.appendChild(summary);

    var label = createEl('label', {
    }, fileName);
    summary.appendChild(label);
    var progressBar = createEl('progress', {
      id: fileName,
      max: 100,
      value: 10
    })
    summary.appendChild(progressBar)
    return uploadItem;
  }
  
  #createInstallExtensionItem(extensionName){
    var extensionItemId = `duckdb_extension:${extensionName}`;
    var uploadItem = createEl('details', {
      id: extensionItemId
    });
    
    var summary = createEl('summary', {
    });
    uploadItem.appendChild(summary);

    var label = createEl('label', {
      for: extensionItemId
    }, `Extension: ${extensionName}`);
    summary.appendChild(label);
    var progressBar = createEl('progress', {
      id: extensionItemId,
      max: 100,
      value: 10
    })
    summary.appendChild(progressBar);
    var message = createEl('p');
    uploadItem.appendChild(message);
    return uploadItem;
  }  
  
  getRequiredDuckDbExtensions(files){
    var requiredExtensions = []
    for (var i = 0; i < files.length; i++){
      var file = files[i];
      var fileName = file.name;
      var fileNameParts = DuckDbDataSource.getFileNameParts(fileName);
      var fileExtension = fileNameParts.lowerCaseExtension;
      
      var fileType = DuckDbDataSource.fileTypes[fileExtension];
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
  
  loadRequiredDuckDbExtensions(requiredDuckDbExtensions){
    var extensionInstallationItems = requiredDuckDbExtensions.map(async function(extensionName){
      var body = this.#getBody();
      var installExtensionItem = this.#createInstallExtensionItem(extensionName);
      body.appendChild(installExtensionItem);
      
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
        await connection.query(`INSTALL ${extensionName}`);
        message.innerHTML += `Extension ${extensionName} installed<br/>`;
        progressbar.value = parseInt(progressbar.value, 10) + 20;
      }

      if (row['loaded']){
        message.innerHTML += `Extension ${extensionName} is loaded<br/>`;
      }
      else {
        message.innerHTML += `Extension ${extensionName} not loaded<br/>`;
        
        message.innerHTML += `Loading extension ${extensionName}<br/>`;
        await connection.query(`LOAD ${extensionName}`);
        message.innerHTML += `Extension ${extensionName} is loaded<br/>`;
        progressbar.value = parseInt(progressbar.value, 10) + 20;
      }
      progressbar.value = 100;
      return true;
    }.bind(this));
    return extensionInstallationItems;
  }
  
  async uploadFiles(files){
    this.#cancelPendingUploads = false;
    var dom = this.getDom();
    dom.setAttribute('aria-busy', true);
    
    var numFiles = files.length;
    var header = this.#getHeader();
    header.innerHTML = `Uploading ${numFiles} file${numFiles === 1 ? '' : 's'}.`;

    dom.showModal();

    var body = this.#getBody();
    body.innerHTML = '';
    
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
    var datasources = [];
    for (var i = 0; i < uploadResults.length; i++){
      var uploadResult = uploadResults[i];
      var messageText;

      var message = createEl('p', {
        id: uploadItem.id + '_message'
      });

      var uploadItem = body.childNodes.item(i + requiredDuckDbExtensions.length);
      uploadItem.appendChild(message);

      if (uploadResult instanceof DuckDbDataSource) {
        uploadItem.setAttribute('aria-invalid', String(false));
        messageText = 'Succesfully loaded.';
        datasources.push(uploadResult);
      }
      else {
        countFail += 1;
        messageText = uploadResult.message;
        uploadItem.setAttribute('open', true);
        uploadItem.setAttribute('aria-invalid', String(true));
        uploadItem.setAttribute('aria-errormessage', message.id);
      }
      message.innerText = messageText;
      
      uploadItem
      .getElementsByTagName('summary').item(0)
      .getElementsByTagName('label').item(0)
      .innerHTML += ' ' + UploadUi.#fileSizeFormatter.format(files[i].size)
      ;      
    }
    
    dom.setAttribute('aria-busy', false);    
    if (!countFail) {
      dom.close();
    }
    if (datasources.length) {
      datasourcesUi.addDatasources(datasources);
    }
  }
  
  getDom(){
    return byId(this.#id);
  }
  
  #getHeader(){
    var dom = this.getDom();
    var header = dom.getElementsByTagName('header').item(0);
    var h3 = header.getElementsByTagName('h3').item(0);
    return h3;
  }
  
  #getBody(){
    var dom = this.getDom();
    var article = dom.getElementsByTagName('section').item(0);
    return article;
  }

  #getFooter(){
    var dom = this.getDom();
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
  
  byId("uploader")
  .addEventListener("change", async function(event){
    var fileControl = event.target;
    var files = fileControl.files;
    await uploadUi.uploadFiles(files);
    fileControl.value = '';
    return;  
  }, false);
}

