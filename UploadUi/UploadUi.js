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
    var dom = this.getDom();
    
    this.#getOkButton().addEventListener('click', async function(){
      this.getDom().close();
    }.bind(this));
    
    this.#getCancelButton().addEventListener('click', async function(){
      await this.#cancelUploads();
      this.getDom().close();
    }.bind(this));    
  }  
  
  #cancelUploads(){
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
      progressBar.value = parseInt(progressBar.value, 10) + 10;
      
      await duckDbDataSource.registerFile();
      progressBar.value = parseInt(progressBar.value, 10) + 10;
        
      var canAccess = await duckDbDataSource.validateAccess();
      progressBar.value = parseInt(progressBar.value, 10) + 10;

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
      for: fileName
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
  
  async loadRequiredDuckDbExtensions(files){
    var requiredDuckDbExtensions = this.getRequiredDuckDbExtensions(files);
    var loadExtensionPromises = requiredDuckDbExtensions.map(ensureDuckDbExtensionLoadedAndInstalled);
    var loadExtensionPromiseResults = await Promise.all(loadExtensionPromises);
    var result = loadExtensionPromiseResults.reduce(function(acc, curr, index){
      var extension = requiredDuckDbExtensions[index];
      acc[extension] = curr;
      return acc;
    }, {});
  }
  
  async uploadFiles(files){
    this.#cancelPendingUploads = false;
    var dom = this.getDom();
    dom.setAttribute('aria-busy', true);
    
    var numFiles = files.length;
    var header = this.#getHeader();
    header.innerHTML = `Uploading ${numFiles} file${numFiles === 1 ? '' : 's'}.`;

    var body = this.#getBody();
    body.innerHTML = '';
    
    //var loadExtensionsResult = await this.loadRequiredDuckDbExtensions(files);    
            
    dom.showModal();
    this.#pendingUploads = [];
    for (var i = 0; i < numFiles; i++){
      var file = files[i];
      var uploadItem = this.#createUploadItem(file);
      body.appendChild(uploadItem);
      this.#pendingUploads.push( this.#uploadFile(file, uploadItem) );
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

      var uploadItem = body.childNodes.item(i);
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
    var files = event.target.files;
    uploadUi.uploadFiles(files);
    return;  
  }, false);
}

