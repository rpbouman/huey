class DataSourceMenu {
 
  #id = undefined;
  #queryModel = undefined;
  #datasourcesUi = undefined;
  #queryModelStateBeforeChange;
 
  constructor(id, queryModel, datasourcesUi){
    this.#id = id;
    this.#queryModel = queryModel;
    this.#datasourcesUi = datasourcesUi;
    
    bufferEvents(
      queryModel,
      'beforechange',
      this.#queryModelBeforeChangeHandler,
      this,
      500
    );
    bufferEvents(
      queryModel,
      'change',
      this.#queryModelChangeHandler,
      this,
      500
    );
    
    datasourcesUi.addEventListener('change', this.#datasourcesChangedHandler.bind(this));
  }
  
  getDom(){
    return byId(this.#id);
  }

  #datasourcesChangedHandler(event) {
    this.#update();
  }

  #queryModelBeforeChangeHandler(event, count){
    if (count !== 0) {
      return;
    }
    var queryModelState = this.#queryModel.getState({includeItemIndices: true});
    this.#queryModelStateBeforeChange = JSON.stringify(queryModelState);
  }
  
  #queryModelChangeHandler(event, count){
    // check if the events have died out
    if (count !== undefined) {
      return;
    }
    
    // check if we have a datasource
    var datasource = this.#queryModel.getDatasource();
    if (!datasource){
      // no. Call update to empty the menu
      this.#update();
      return;
    }
    
    // We have a datasource!
    // Check if it is the same as the previous one
    var newDatassourceId = datasource.getId();
    if (!this.#queryModelStateBeforeChange){
      this.#update();
      return;
    }
    var oldQueryModelState = JSON.parse(this.#queryModelStateBeforeChange);
    if (!oldQueryModelState){
      this.#update();
      return;
    }
    var oldDatasourceId = oldQueryModelState.datasource;
    if (newDatassourceId === oldDatasourceId) {
      //  it hasn't changed. We shouldn't need to #update the menu
      return;
    }
    
    // datasource has changed. #update the menu
    this.#update();
  }
  
  static #getDatasourceMenuItem(config, instantiate){
    var datasourceMenuItemTemplate = byId('datasource-menu-item');
    var item;
    if (instantiate ) {
      item = datasourceMenuItemTemplate.content.cloneNode(true).children.item(0);
    }
    else {
      item = datasourceMenuItemTemplate.content.children.item(0);
    }
    if (config.datasourceType) {
      item.setAttribute('data-datasourcetype', config.datasourceType);
    }
    else {
      item.removeAttribute('data-datasourcetype');
    }
    if (config.fileType) {
      item.setAttribute('data-filetype', config.fileType);
    }
    else {
      item.removeAttribute('data-filetype');
    }
    if (config.datasourceId) {
      item.setAttribute('data-datasource-id', config.datasourceId);
    }
    else {
      item.removeAttribute('data-datasource-id');
    }
    item.setAttribute('title', config.labelText);
    
    var id = 'datasourceMenu' + (typeof config.index === 'number' ? config.index : '');

    var label = item.getElementsByTagName('LABEL').item(0);
    label.setAttribute('for', id);
    label.textContent = config.labelText;
    
    var radio = item.getElementsByTagName('INPUT').item(0);
    var button = item.getElementsByTagName('BUTTON').item(0);
    if (typeof config.clickHandler === 'function'){
      radio.removeAttribute('id')
      button.setAttribute('id', id);
      button.addEventListener('click', config.clickHandler);
    }
    else {
      button.removeAttribute('id')
      radio.setAttribute('id', id);
      radio.setAttribute('value', config.value);
      var checked = Boolean(config.checked);
      if (checked) {
        radio.setAttribute('checked', checked);
      }
      else {
        radio.removeAttribute('checked');
      }
    }
    
    return item;
  }
  
  static getDatasourceMenuItem(config){
    var item = DataSourceMenu.#getDatasourceMenuItem(config, true);
    return item;
  }

  static getDatasourceMenuItemHTML(config){
    var item = DataSourceMenu.#getDatasourceMenuItem(config);
    return item.outerHTML;
  }
  
  #datasourceMenuItemChangeHandler(event){
    var radio = event.target;
    var menuItem = radio.parentNode;
    var datasourceId = menuItem.getAttribute('data-datasource-id');
    var datasource = this.#datasourcesUi.getDatasource(datasourceId);
    this.#queryModel.setDatasource(datasource, true);
  }
  
  async #update(){
    var dom = this.getDom();
    dom.innerHTML = '';
    
    var datasource = this.#queryModel.getDatasource();
    if (!datasource) {
      return;
    }
    
    var queryModelState = this.#queryModel.getState();
    if (!queryModelState){
      return;
    }
    var currentDatasourceId = queryModelState.datasourceId;
    var referencedColumns = QueryModel.getReferencedColumns(queryModelState);
    
    var compatibleDatasources = await this.#datasourcesUi.findDataSourcesWithColumns(referencedColumns);
    if (!compatibleDatasources) {
      return
    }
    
    Object.keys(compatibleDatasources).forEach(function(datasourceKey, index){
      var datasource = compatibleDatasources[datasourceKey];
      var datasourceId = datasource.getId();
      
      if (currentDatasourceId === datasourceId) {
        return;
      }
      
      var caption = DataSourcesUi.getCaptionForDatasource(datasource);
      var datasourceType = datasource.getType();
      var fileName, fileNameParts;
      if ( datasourceType === DuckDbDataSource.types.FILE) {
        fileName = datasource.getFileName();
        fileNameParts = DuckDbDataSource.getFileNameParts(fileName);
      }
      
      var config = {
        datasourceType: datasourceType,
        datasourceId: datasourceId,
        fileType: fileNameParts ? fileNameParts.lowerCaseExtension : undefined,
        index: index,
        value: index,
        labelText: caption,
        clickHandler: this.#datasourceMenuItemChangeHandler.bind(this)
      };
      var item = DataSourceMenu.getDatasourceMenuItem(config);
      dom.appendChild(item);
    }.bind(this));
  }
  
}


function initDataSourceMenu(){
  var datasourceMenu = new DataSourceMenu('dataSourceMenu', queryModel, datasourcesUi);
}