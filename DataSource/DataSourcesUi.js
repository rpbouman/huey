class DataSourcesUi {
  
  #id = undefined;
  #datasources = {};
  
  constructor(id){
    this.#id = id;

    var dom = this.getDom();
    
    dom.addEventListener('dragenter', this.#dragEnterHandler.bind(this));
    dom.addEventListener('dragleave', this.#dragLeaveHandler.bind(this));
    dom.addEventListener('dragover', this.#dragOverHandler.bind(this));
    dom.addEventListener('drop', this.#dropHandler.bind(this));
  }

  #dragEnterHandler(event) {
    var valid = true;
    
    var dataTransfer = event.dataTransfer;
    dataTransfer.dropEffect = 'copy';
    return;
    var files = dataTransfer.files;
    valid = Boolean(files.length);
    var fileTypes = DuckDbDataSource.fileTypes;
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var fileName = file.name;
      var fileNameParts = DuckDbDataSource.getFileNameParts(fileName);
      var fileExtension = fileNameParts.lowerCaseExtension;
      var fileType = fileTypes[fileExtension];
      valid = Boolean(fileType);
      if (!valid){
        break;
      }
    }
    this.getDom().setAttribute('data-drop-allowed', valid);
    event.stopPropagation(); 
    event.preventDefault();
  }

  #dragLeaveHandler(event) {
    event.stopPropagation(); 
    event.preventDefault();
    this.getDom().setAttribute('data-drop-allowed', '');
  }

  #dragOverHandler(event) {
    event.stopPropagation(); 
    event.preventDefault();
    
    var dataTransfer = event.dataTransfer;
    console.log('dragover');
  }

  #dropHandler(event) {
    event.preventDefault();
    event.stopPropagation(); 
    var dataTransfer = event.dataTransfer;
    var files = dataTransfer.files;
    if (files.length) {
      uploadUi.uploadFiles(files);
    }
    console.log('drop');
  }
    
  getDom(){
    return byId(this.#id);
  }
  
  clear(){
    this.getDom().innerHTML = '';
  }
  
  #renderDatasourceActionButton(config){
    var actionButton = createEl('label', {
      "class": 'button' + (config.className ? ' ' + (typeof config.className instanceof Array ? config.className.join(' ') : config.className ) : ''),
      "for": config.id,
    });

    var button = createEl('button',{
      id: config.id
    });
    actionButton.appendChild(button);
    
    var events = config.events; 
    if (events) {
      for (var eventName in events) {
        var handler = events[eventName];
        button.addEventListener(eventName, handler);
      }
    }
    
    return actionButton;
  }
  
  async #getTabularDatasourceTypeSignature(datasource){
    var signature;
    var type  = datasource.getType();
    var fileType = datasource.getFileExtension();
    var columnMetadata = await datasource.getColumnMetadata();
    var columnMetadataSerialized = {};
    for (var i = 0; i < columnMetadata.numRows; i++){
      var row = columnMetadata.get(i);
      columnMetadataSerialized[row.column_name] = row.column_type;
    }
    var columnMetadataSerializedJSON = JSON.stringify(columnMetadataSerialized);
    signature = `${type}:${fileType}:${columnMetadataSerializedJSON}`; 
    return signature;
  }
  
  async renderDatasources(){
    var node, group, potentialGroups = {};
    var datasources = this.#datasources;

    var groupingPromises = Object.keys(datasources).map(async function(datasourceId){
      var datasource = datasources[datasourceId];
      var type = datasource.getType();
      
      var group = undefined;
      switch (type){
        case DuckDbDataSource.types.FILE:
          var signature = await this.#getTabularDatasourceTypeSignature(datasource);
          group = potentialGroups[signature];
          if (!group) {
            potentialGroups[signature] = group = {
              type: DuckDbDataSource.types.FILE,
              filetype: datasource.getFileExtension(),
              datasources: {}
            };
          }
          break;
        case DuckDbDataSource.types.DUCKDB:
        case DuckDbDataSource.types.SQLITE:
        default:
          group = potentialGroups[type];
          if (!group){
            potentialGroups[type] = group = {
              type: type,
              datasources: {}
            };
          }
      }
      group.datasources[datasourceId] = datasource;
      return true;
    }.bind(this));
    await Promise.all(groupingPromises);
    
    this.createDataSourceGroupNode(potentialGroups[DuckDbDataSource.types.DUCKDB]);
    delete potentialGroups[DuckDbDataSource.types.DUCKDB];
    
    this.createDataSourceGroupNode(potentialGroups[DuckDbDataSource.types.SQLITE]);
    delete potentialGroups[DuckDbDataSource.types.SQLITE];
    
    for (var groupId in potentialGroups){
      var group = potentialGroups[groupId];
      var datasources = group.datasources;
      var datasourceKeys = Object.keys(datasources);
      if (datasourceKeys.length === 1) {
        var datasourceKey = datasourceKeys[0]
        var datasource = datasources[datasourceKey];
        var datasourceType = datasource.getType();
        var miscGroup = potentialGroups[datasourceType];
        if (!miscGroup) {
          miscGroup = potentialGroups[datasourceType] = {
            type: datasourceType,
            datasources: {}
          }
        }
        miscGroup.datasources[datasource.getId()] = datasource;
      }
      else {
        this.createDataSourceGroupNode(group);
      }
      delete potentialGroups[groupId];
    }

    this.createDataSourceGroupNode(potentialGroups[DuckDbDataSource.types.FILE], true);
    delete potentialGroups[DuckDbDataSource.types.FILE];

  }
  
  static getCaptionForDatasource(datasource){
    var type = datasource.getType();
    switch (type){ 
      case DuckDbDataSource.types.DUCKDB:
      case DuckDbDataSource.types.SQLITE:
      case DuckDbDataSource.types.FILE:
        return datasource.getFileNameWithoutExtension();
      default:
        return datasource.getId();
    }
  }
  
  createDatasourceNode(datasource){
    var type = datasource.getType();
    var datasourceId = datasource.getId();
    var datasourceNode = createEl('details', {
      id: datasourceId,
      "data-nodetype": 'datasource',
      "data-sourcetype": type,
      open: true
    });

    var extension;
    if (type === DuckDbDataSource.types.FILE) {
      extension = datasource.getFileExtension();
      datasourceNode.setAttribute('data-filetype', extension);
    }
    
    var summary = createEl('summary', {
    });
    var icon = createEl('span', {
      "class": 'icon'
    });
    summary.appendChild(icon);
    
    datasourceNode.appendChild(summary);
    
    var caption = DataSourcesUi.getCaptionForDatasource(datasource);
    var label = createEl('span', {
      class: 'label'
    }, caption);
    summary.appendChild(label);
    
    var analyzeActionButton = this.#renderDatasourceActionButton({
      id: datasourceId + '_analyze',
      "className": "analyzeActionButton",
      events: {
        click: this.#analyzeDatasourceClicked.bind(this)
      }
    });
    summary.appendChild(analyzeActionButton);

    var removeActionButton = this.#renderDatasourceActionButton({
      id: datasourceId + '_remove',
      "className": "removeActionButton",
      events: {
        click: this.#removeDatasourceClicked.bind(this)
      }
    });
    summary.appendChild(removeActionButton);

    return datasourceNode;
  }
  
  #analyzeDatasourceClicked(event){    
    var target = event.target;
    var datasourceNode = getAncestorWithAttributeValue(target, 'data-nodetype', 'datasource', true);
    var dataSourceId = datasourceNode.id;
    var datasource = this.getDatasource(dataSourceId);
    analyzeDatasource(datasource);
  }
  
  #removeDatasourceClicked(event){
  }
  
  getCaptionForDataSourceGroup(datasourceGroup, miscGroup){
    switch (datasourceGroup.type) {
      case DuckDbDataSource.types.DUCKDB:
        return 'DuckDB';
      case DuckDbDataSource.types.SQLITE:
        return 'SQLite';
      case DuckDbDataSource.types.FILE:
        var datasources = datasourceGroup.datasources;
        if (miscGroup) {
          return 'Files';
        }
        return Object.keys(datasources).map(function(datasourceId){
          var datasource = datasources[datasourceId];
          return datasource.getFileNameWithoutExtension();
        }).join(', ');
    }
  }
  
  createDataSourceGroupNode(datasourceGroup, miscGroup){
    if (datasourceGroup === undefined){ 
      return;
    }
    
    var groupNode = createEl('details', {
      "data-nodetype": 'datasourcegroup',
      "data-grouptype": datasourceGroup.type,
      open: true
    });
    if (datasourceGroup.type === DuckDbDataSource.types.FILE) {
      groupNode.setAttribute('data-filetype', datasourceGroup.fileType);
    }
    var summary = createEl('summary', {
    });
    groupNode.appendChild(summary);
    
    var icon = createEl('span', {
      "class": 'icon'
    });
    summary.appendChild(icon);
    
    var caption = this.getCaptionForDataSourceGroup(datasourceGroup, miscGroup);
    var label = createEl('span', {
      class: 'label'
    }, caption);
    summary.appendChild(label);
    
    var datasources = datasourceGroup.datasources;
    Object.keys(datasources).map(function(datasourceId){
      var datasource = datasources[datasourceId];
      var datasourceNode = this.createDatasourceNode(datasource);
      groupNode.appendChild(datasourceNode);
    }.bind(this));
    
    var dom = this.getDom();
    dom.appendChild(groupNode);
    return groupNode;
  }
  
  addDatasources(datasources){
    this.clear();
    datasources.forEach(function(datasource){
      var id = datasource.getId();
      this.#datasources[id] = datasource;
    }.bind(this));
    this.renderDatasources();
  }
  
  getDatasource(id) {
    return this.#datasources[id];
  }
}

var datasourcesUi;
function initDataSourcesUi(){
  datasourcesUi = new DataSourcesUi('datasourcesUi');
}
