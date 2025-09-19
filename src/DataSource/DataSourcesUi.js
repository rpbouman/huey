class DataSourcesUi extends EventEmitter {

  static #datasourceExportMenuId = 'datasourceExportMenu';

  #id = undefined;
  #datasources = {};

  constructor(id){
    super(['change']);
    this.#id = id;

    var dom = this.getDom();
    var domParent = dom.parentNode;
    domParent.addEventListener('dragenter', this.#dragEnterHandler.bind(this));
    domParent.addEventListener('dragleave', this.#dragLeaveHandler.bind(this));
    domParent.addEventListener('dragover', this.#dragOverHandler.bind(this));
    domParent.addEventListener('drop', this.#dropHandler.bind(this));
  }

  #dragEnterHandler(event) {
    var valid = true;

    var dataTransfer = event.dataTransfer;
    dataTransfer.dropEffect = 'copy';
    return;

    // unfortunately, we see that the files list is always emtpy.
    // instead, when dragging files, we see a list of items of type file, but for some reason we do not see the names of the files.
    // so this is pretty much useless, we cannot figure out in advance if the dragged items could be successfully loaded.

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
  }

  async #dropHandler(event) {
    event.preventDefault();
    event.stopPropagation();
    var dataTransfer = event.dataTransfer;
    var files = dataTransfer.files;
    var items = dataTransfer.items;
    var uploadResults;
    if (files.length) {
      uploadResults = await uploadUi.uploadFiles(files);
      afterUploaded(uploadResults);
    }
    else
    if (items.length){
      for (var i = 0 ; i < items.length; i++) {
        var item = items[i];
        if (item.kind !== 'string') {
          continue;
        }
        if (item.type !== 'text/uri-list'){
          continue;
        }

        // TODO: we should do something here to makr these data sources as URLs, not "files"
        item.getAsString(async function(uri){
          uploadResults = await uploadUi.uploadFiles([uri]);
          afterUploaded(uploadResults);
        });

        // support only 1 url at a time.
        return;
      }
    }
  }

  getDom(){
    return byId(this.#id);
  }

  clear(content){
    if (!content){
      content = '';
    }
    this.getDom().innerHTML = content;
  }

  #getLooseColumnType(columnType){
    var datasourceSettings = settings.getSettings('datasourceSettings');
    var looseColumnTypes = datasourceSettings.looseColumnTypes;
    var comparisonColumnType = undefined;
    for (var looseType in looseColumnTypes){
      var columnTypes = looseColumnTypes[looseType];
      if (columnTypes.indexOf(columnType) === -1) {
        continue;
      }
      comparisonColumnType = looseType;
    }
    if (comparisonColumnType === undefined) {
      comparisonColumnType = columnType;
    }
    return comparisonColumnType;
  }

  async #getTabularDatasourceTypeSignature(datasource){
    var typeSignature;
    var type  = datasource.getType();
    var fileType = datasource.getFileExtension();
    var columnMetadata = await datasource.getColumnMetadata();
    var columnMetadataSerialized = {};
    var datasourceSettings = settings.getSettings('datasourceSettings');
    var useLooseColumnComparisonType = datasourceSettings.useLooseColumnTypeComparison;
    var looseColumnTypes = datasourceSettings.looseColumnTypes;
    for (var i = 0; i < columnMetadata.numRows; i++){
      var row = columnMetadata.get(i);

      var columnType = row.column_type;
      var comparisonColumnType = useLooseColumnComparisonType ? this.#getLooseColumnType(columnType) : columnType;
      columnMetadataSerialized[row.column_name] = comparisonColumnType;
    }
    var columnMetadataSerializedJSON = JSON.stringify(columnMetadataSerialized);
    typeSignature = `${type}:${fileType}:${columnMetadataSerializedJSON}`;
    return typeSignature;
  }

  async #renderDatasources(){
    this.clear();
    var node, group, potentialGroups = {};
    var datasources = this.#datasources;

    var groupingPromises = Object.keys(datasources).map(async function(datasourceId){
      var datasource = datasources[datasourceId];
      var type = datasource.getType();

      var group = undefined;
      switch (type){
        case DuckDbDataSource.types.FILE:
          var typeSignature = await this.#getTabularDatasourceTypeSignature(datasource);
          group = potentialGroups[typeSignature];
          if (!group) {
            potentialGroups[typeSignature] = group = {
              type: DuckDbDataSource.types.FILE,
              fileType: datasource.getFileExtension(),
              typeSignature: typeSignature,
              datasources: {}
            };
          }
          break;
        case DuckDbDataSource.types.TABLE:
        case DuckDbDataSource.types.VIEW:
          // noop. these are rendered by the respective database datasource node.
          return;
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

    this.#createDataSourceGroupNode(potentialGroups[DuckDbDataSource.types.DUCKDB]);
    delete potentialGroups[DuckDbDataSource.types.DUCKDB];

    this.#createDataSourceGroupNode(potentialGroups[DuckDbDataSource.types.SQLITE]);
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
        this.#createDataSourceGroupNode(group);
      }
      delete potentialGroups[groupId];
    }

    this.#createDataSourceGroupNode(potentialGroups[DuckDbDataSource.types.FILE], true);
    delete potentialGroups[DuckDbDataSource.types.FILE];
    
    // TODO: pass some data that tells listeners why we rerendered
    this.fireEvent('change', {});
  }

  static getCaptionForDatasource(datasource){
    var type = datasource.getType();
    switch (type){
      case DuckDbDataSource.types.DUCKDB:
      case DuckDbDataSource.types.SQLITE:
      case DuckDbDataSource.types.FILE:
        return datasource.getFileNameWithoutExtension();
      case DuckDbDataSource.types.TABLE:
      case DuckDbDataSource.types.TABLEFUNCTION:
      case DuckDbDataSource.types.VIEW:
        return datasource.getObjectName();
      default:
        return datasource.getId();
    }
  }

  #renderDatasourceActionButton(config){
    var actionButton = instantiateTemplate('dataSourceGroupNodeActionButton');
    actionButton.setAttribute('class', config.className ? (typeof config.className instanceof Array ? config.className.join(' ') : config.className ) : '');
    actionButton.setAttribute('for', config.id);
    actionButton.setAttribute('title', config.title);
    
    var button = actionButton.querySelector('button');
    button.setAttribute('id', config.id);
    
    var events = config.events;
    if (events) {
      for (var eventName in events) {
        var handler = events[eventName];
        button.addEventListener(eventName, handler);
      }
    }
    return actionButton;
  }

  #createDatasourceNodeAnalyzeActionButton(datasourceId, summaryElement){
    var actionButton = this.#renderDatasourceActionButton({
      id: datasourceId + '_analyze',
      "className": "analyzeActionButton",
      popovertarget: 'uploadUi',
      popovertargetaction: 'hide',
      title: Internationalization.getText('Open {1} in the Query editor', datasourceId),
      events: {
        click: this.#analyzeDatasourceClicked.bind(this)
      }
    });
    if (summaryElement) {
      summaryElement.appendChild(actionButton);
    }
    return actionButton;
  }
  
  #createDatasourceNodeRemoveActionButton(datasourceId, summaryElement){
    var actionButton = this.#renderDatasourceActionButton({
      id: datasourceId + '_remove',
      "className": "removeActionButton",
      popovertarget: 'uploadUi',
      popovertargetaction: 'hide',
      title: Internationalization.getText('Remove datasource {1}', datasourceId),
      events: {
        click: this.#removeDatasourceClicked.bind(this)
      }
    });
    if (summaryElement) {
      summaryElement.appendChild(actionButton);
    }
    return actionButton;
  }

  #createDatasourceNodeEditActionButton(datasourceId, summaryElement){
    var actionButton = this.#renderDatasourceActionButton({
      id: datasourceId + '_edit',
      "className": "editActionButton",
      popovertarget: 'uploadUi',
      popovertargetaction: 'hide',
      title: Internationalization.getText('Configure datasource details of {1}', datasourceId),
      events: {
        click: this.#configureDatasourceClicked.bind(this)
      }
    });
    if (summaryElement) {
      summaryElement.appendChild(actionButton);
    }
    return actionButton;
  }

  #createDatasourceNodeDownloadActionButton(datasourceId, summaryElement){
    var actionButton = this.#renderDatasourceActionButton({
      id: datasourceId + '_download',
      "className": "downloadActionButton",
      popovertarget: 'uploadUi',
      popovertargetaction: 'hide',
      title: Internationalization.getText('Download the contents of datasource {1} to a file.', datasourceId),
      events: {
        click: this.#downloadDatasourceClicked.bind(this)
      }
    });
    if (summaryElement) {
      summaryElement.appendChild(actionButton);
    }
    return actionButton;
  }

  #createDatasourceNodeActionButtons(datasourceId, summaryElement) {
    this.#createDatasourceNodeAnalyzeActionButton(datasourceId, summaryElement)
    this.#createDatasourceNodeRemoveActionButton(datasourceId, summaryElement);
    this.#createDatasourceNodeEditActionButton(datasourceId, summaryElement);
    this.#createDatasourceNodeDownloadActionButton(datasourceId, summaryElement);
  }

  async #loadDatabaseDatasource(databaseDatasource){
    var catalogName = databaseDatasource.getFileNameWithoutExtension();
    var connection = window.hueyDb.connection;
    var sql = `
      SELECT table_schema, table_name, table_type
      FROM information_schema.tables
      WHERE table_catalog = ?
      AND   table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY table_schema, table_name
    `;
    var statement = await connection.prepare(sql);
    var result = await statement.query(catalogName);
    statement.close();

    var datasourceId = databaseDatasource.getId();
    var datasourceTreeNode = byId(datasourceId);

    var schemaNodes = {};
    for (var i = 0; i < result.numRows; i++){
      var summary, label;

      var row = result.get(i);
      var schemaName = row.table_schema;
      var schemaNode = schemaNodes[schemaName];
      if (schemaNode === undefined) {
        schemaNode = instantiateTemplate('dataSourceSchemaNode', datasourceId + ':' + schemaName);
        schemaNode.setAttribute('title', schemaName);
        schemaNode.setAttribute('data-catalog-name', catalogName);
        schemaNode.setAttribute('data-schema-name', catalogName);
        schemaNode.querySelector('span.label').textContent = schemaName;
        schemaNodes[schemaName] = schemaNode;
        datasourceTreeNode.appendChild(schemaNode);
      }
      var tableName = row.table_name;
      var tableType = row.table_type;
      var datasourcetype;
      switch (tableType){
        case 'BASE TABLE':
          datasourcetype = DuckDbDataSource.types.TABLE;
          break;
        case 'VIEW':
          datasourcetype = DuckDbDataSource.types.VIEW;
          break;
      }

      var tableDatasourceId = `${datasourceId}:${getQuotedIdentifier(schemaName)}:${getQuotedIdentifier(tableName)}`;
      var datasource = this.getDatasource(tableDatasourceId);
      if (!datasource) {
        var hueyDb = window.hueyDb;
        datasource = new DuckDbDataSource(hueyDb.duckdb, hueyDb.instance, {
          type: datasourcetype,
          catalogName: catalogName,
          schemaName: schemaName,
          objectName: tableName
        });
        this.#addDatasource(datasource);
      }

      var tableNode = this.#createDatasourceNode(datasource);
      schemaNode.appendChild(tableNode);
    }
  }

  async #loadDatasource(datasource) {
    switch (datasource.getType()){
      case DuckDbDataSource.types.FILE:
        // noop, files can't be expanded.
        break;
      case DuckDbDataSource.types.DUCKDB:
      case DuckDbDataSource.types.SQLITE:
        this.#loadDatabaseDatasource(datasource);
        break;
      default:
        console.error(`Don't know how to load datasource ${datasource.getId()} of type ${datasource.getType()}`);
    }
  }

  #toggleDataSource(event){
    var target = event.target;

    var oldState = event.oldState;
    var newState = event.newState;

    if (oldState !== 'closed' || newState !== 'open' || target.getElementsByTagName('details').length !== 0) {
      return;
    }

    var datasource = this.#getDatasourceForTreeNode(target);
    this.#loadDatasource(datasource);
  }

  #createDatasourceNode(datasource, attributes){
    var caption = DataSourcesUi.getCaptionForDatasource(datasource);

    var type = datasource.getType();
    var datasourceId = datasource.getId();
    
    var datasourceNode = instantiateTemplate('dataSourceNode', datasourceId);
    datasourceNode.setAttribute('data-datasourcetype', type);
    datasourceNode.setAttribute('title', caption);
    
    var summary = datasourceNode.querySelector('summary');
    var label = summary.querySelector('span.label');
    label.textContent = caption;
    
    if (attributes){
      for (var attributeName in attributes){
        datasourceNode.setAttribute(attributeName, attributes[attributeName]);
      }
    }

    switch (type) {
      case DuckDbDataSource.types.DUCKDB:
      case DuckDbDataSource.types.SQLITE:
        datasourceNode.addEventListener('toggle', this.#toggleDataSource.bind(this));
        break;
      default:
        // noop.
    }

    var extension;
    if (type === DuckDbDataSource.types.FILE) {
      extension = datasource.getFileExtension();
      datasourceNode.setAttribute('data-filetype', extension);
    }

    
    switch (type) {
      case DuckDbDataSource.types.DUCKDB:
        this.#createDatasourceNodeRemoveActionButton(datasourceId, summary);
        break;
      case DuckDbDataSource.types.TABLE:
      case DuckDbDataSource.types.VIEW:
        this.#createDatasourceNodeAnalyzeActionButton(datasourceId, summary);
        this.#createDatasourceNodeDownloadActionButton(datasourceId, summary);
        break;
      default:
        this.#createDatasourceNodeActionButtons(datasourceId, summary);
    }
    return datasourceNode;
  }

  #getTreeNodeFromClickEvent(event){
    var button = event.target;
    var label = button.parentNode;
    var summary = label.parentNode;
    var node = summary.parentNode;
    return node;
  }

  #getDatasourceForTreeNode(datasourceTreeNode) {
    var dataSourceId = datasourceTreeNode.id;
    var datasource = this.getDatasource(dataSourceId);
    return datasource;
  }

  #rejectsDetectedHandler(event){
    var eventData = event.eventData;
    var datasource = event.currentTarget;
    var id = datasource.getId();
    var datasourceNode = document.getElementById(id);
    var new_reject_balance = eventData.new_reject_balance;
    var old_reject_balance = eventData.old_reject_balance;
    var balanceAttribute;
    if (new_reject_balance >= 0){
      balanceAttribute = new_reject_balance;
      datasourceNode.setAttribute('data-reject_count', balanceAttribute);
    }
    else {
      balanceAttribute = 0;
      datasourceNode.removeAttribute('data-reject_count');
    }
    if (new_reject_balance > old_reject_balance){
      var diff = new_reject_balance - old_reject_balance;
      var title, description;
      if (old_reject_balance === 0n){
        title = 'Errors found in Data file';
        description = [
          'Errors were encountered while executing the previous query.',
          `${new_reject_balance} offending records were excluded from the results.`
        ];
      }
      else {
        title = 'New errors found in Data file';
        description = [
          `${diff} new errors were encountered while executing the previous query and skipped from the results.`,
          `The total number of skipped records so far is ${new_reject_balance}.`
        ];
      }
      description.push('Review datasource settings to inspect and fix the errors.');
      showErrorDialog({
        title: title,
        description: description.join('<br/>\n')
      });
    }
  }

  #attachRejectsDetection(duckdbDataSource) {
    if(!duckdbDataSource.supportsRejectsDetection()) {
      return;
    }
    duckdbDataSource.addEventListener('rejectsdetected', this.#rejectsDetectedHandler.bind(this));
  }

  #getDatasourceFromClickEvent(event){
    var node = this.#getTreeNodeFromClickEvent(event);
    var nodeType = node.getAttribute('data-nodetype');

    var hueyDb = window.hueyDb;
    var duckdb = hueyDb.duckdb;
    var instance = hueyDb.instance;

    var datasource;
    switch (nodeType) {
      case 'datasource':
        var datasource = this.#getDatasourceForTreeNode(node);
        break;
      case 'datasourcegroup':
        var groupType = node.getAttribute('data-grouptype');
        switch (groupType){
          case DuckDbDataSource.types.FILE:
            var datasourceIdsListJSON = node.getAttribute('data-datasourceids');
            var datasourceIdsList = JSON.parse(datasourceIdsListJSON);
            var fileNames = datasourceIdsList.map(function(datasourceId){
              var datasource = this.#datasources[datasourceId];
              var fileName = datasource.getFileName();
              return fileName;
            }.bind(this));
            var fileType = node.getAttribute('data-filetype');

            datasource = new DuckDbDataSource(duckdb, instance, {
              type: DuckDbDataSource.types.FILES,
              fileNames: fileNames,
              fileType: fileType
            });
            this.#attachRejectsDetection(datasource);
            break;
          default:
            throw new Error(`Don't know how to get a datasource from a datasourcegroup of type ${groupType}`);
        }
        break;
      default:
        throw new Error(`Don't know how to get a datasource for node of type ${nodeType}.`);
    }
    return datasource;
  }

  #analyzeDatasourceClicked(event){
    var datasource = this.#getDatasourceFromClickEvent(event);
    // todo: replace direct call to global analyze with fireEvent
    analyzeDatasource(datasource);
  }

  #removeDatasourceClicked(event){
    var node = this.#getTreeNodeFromClickEvent(event);
    var nodeType = node.getAttribute('data-nodetype');
    var datasourceIdsList;
    switch (nodeType) {
      case 'datasource':
        var dataSourceId = node.id;
        datasourceIdsList = [dataSourceId];
        break;
      case 'datasourcegroup':
        var groupType = node.getAttribute('data-grouptype');
        switch (groupType){
          case DuckDbDataSource.types.FILE:
            var datasourceIdsListJSON = node.getAttribute('data-datasourceids');
            datasourceIdsList = JSON.parse(datasourceIdsListJSON);
            break;
          default:
            throw new Error(`Don't know how to get a datasource from a datasourcegroup of type ${groupType}`);
        }
        break;
    }
    this.destroyDatasources(datasourceIdsList);
  }

  #configureDatasourceClicked(event){
    var datasource = this.#getDatasourceFromClickEvent(event);
    datasourceSettingsDialog.open(datasource);
  }
  
  static #getDownloadMenuHTML(fromFileType){
    var fileTypes = Object.keys(DuckDbDataSource.fileTypes)
    .filter(function(fileType){
      if (Boolean(fromFileType)) { 
        switch (fileType){
          case fromFileType:
          case 'duckdb':
          case 'sqlite':
            return false;
        }
      }
      return true;
    });
    var menuItems = fileTypes.sort().map(function(fileType){
      var id = `fileType-${fileType}`;
      return `
        <li role="menuitem">
          <input 
            type="radio" 
            name="fileTypes" 
            value="${fileType}" 
            id="${id}"
          />
          <label for="${id}">${fileType}</label>
        </li>
      `;
    });
    var menu = `
      <menu class="fileTypes" id="${DataSourcesUi.#datasourceExportMenuId}">
        ${menuItems.join('\n')}
      </menu>
    `;
    return menu;
  }
  
  static async #promptExportDataFormat(fromFileType){
    var menu = DataSourcesUi.#getDownloadMenuHTML(fromFileType);
    var result = await PromptUi.show({
      title: 'Export Datasource',
      contents: menu
    });

    if (result !== 'accept'){
      return undefined;
    }
    var selectedItemCss = `menu#${DataSourcesUi.#datasourceExportMenuId} > li > input[type=radio]:checked`;
    var selected = document.querySelector(selectedItemCss);
    if (!selected) {
      return undefined;
    }
    var fileType = selected.value;
    return fileType;
  }
  
  static #getDatasourceExportSettings(targetFileType){
    var fileTypeInfo = DuckDbDataSource.getFileTypeInfo(targetFileType);
    var exportType = null;
    var exportDelimited = false;
    var exportJson = false;
    var exportParquet = false;
    var exportXlsx = false;
    
    switch (fileTypeInfo.duckdb_reader){
      case 'read_csv':
        exportType = 'exportDelimited';
        exportDelimited = true;
        break;
      case 'read_json':
        exportType = 'exportJson';
        exportJson = true;
        break;
      case 'read_parquet':
        exportType = 'exportParquet';
        exportParquet = true;
        break;
      case 'read_xlsx':
        exportType = 'exportXlsx';
        exportXlsx = true;
        break;
    }
    var exportSettings = Object.assign(
      {}, settings.getSettings('exportUi'), {
      exportDestinationFile: true,
      exportDestinationClipboard: false,
      exportType: exportType,
      exportDelimited: exportDelimited,
      exportJson: exportJson,
      exportParquet: exportParquet,
      exportXlsx: exportXlsx,
    });
    return exportSettings;
  }
  
  async #downloadDatasourceClicked(event) {
    var button = event.target;
    if (button.getAttribute('aria-busy') === 'true'){
      return;
    }
    
    var datasource = this.#getDatasourceFromClickEvent(event);
    var datasourceFileType;
    switch (datasource.getType()){
      case DuckDbDataSource.types.FILE:
      case DuckDbDataSource.types.FILES:
        datasourceFileType = datasource.getFileType();
    }

    var targetFileType = await DataSourcesUi.#promptExportDataFormat(datasourceFileType);
    if (!targetFileType) {
      return;
    }
    button.setAttribute('aria-busy', 'true');
    
    var exportSettings = DataSourcesUi.#getDatasourceExportSettings(targetFileType);
    var exportTitle = DataSourcesUi.getCaptionForDatasource(datasource);
    exportSettings.exportTitle = exportTitle;
    
    var sql = `SELECT * ${datasource.getFromClauseSql()}`;
    await ExportUi.exportData(datasource, sql, exportSettings);
    button.setAttribute('aria-busy', 'false');
  }

  #getCaptionForDataSourceGroup(datasourceGroup, miscGroup){
    switch (datasourceGroup.type) {
      case DuckDbDataSource.types.DUCKDB:
        return 'DuckDB';
      case DuckDbDataSource.types.SQLITE:
        return 'SQLite';
      case DuckDbDataSource.types.FILE:
        var datasources = datasourceGroup.datasources;
        if (miscGroup) {
          return Internationalization.getText('Files');
        }
        return Object.keys(datasources).map(function(datasourceId){
          var datasource = datasources[datasourceId];
          return datasource.getFileNameWithoutExtension();
        }).join(', ');
    }
  }

  #createDataSourceGroupNode(datasourceGroup, miscGroup){
    if (datasourceGroup === undefined){
      return;
    }
    var groupNode = instantiateTemplate('dataSourceGroupNode');
    var groupType = datasourceGroup.type;
    groupNode.setAttribute('data-grouptype', groupType)

    var groupTitle;
    switch (groupType) {
      case DuckDbDataSource.types.FILE:
        if (miscGroup === true) {
          groupTitle = 'Miscellanous files';
        }
        else {
          groupNode.setAttribute('data-filetype', datasourceGroup.fileType);
        }

        if (datasourceGroup.typeSignature) {
          groupTitle = 'Bucket of similarly typed files.';
        }
        break;
      default:
        groupTitle = `${groupType}`;
    }
    Internationalization.setAttributes(groupNode, 'title', groupTitle)

    var summary = groupNode.querySelector('summary');
    var label = summary.querySelector('span.label');
    // TODO: some group titels are translateable, some aren't
    var caption = this.#getCaptionForDataSourceGroup(datasourceGroup, miscGroup);
    label.textContent = caption;

    if (datasourceGroup.typeSignature) {
      this.#createDatasourceNodeActionButtons(
        datasourceGroup.typeSignature, 
        summary
      );
    }

    var datasources = datasourceGroup.datasources;
    datasources = DataSourcesUi.sortDatasources(datasources);
    var datasourceKeys = Object.keys(datasources);
    groupNode.setAttribute('data-datasourceids', JSON.stringify(datasourceKeys));

    datasourceKeys.forEach(function(datasourceId){
      var datasource = datasources[datasourceId];
      var datasourceNode = this.#createDatasourceNode(datasource);
      groupNode.appendChild(datasourceNode);
    }.bind(this));

    var dom = this.getDom();
    dom.appendChild(groupNode);
    return groupNode;
  }
  
  static sortDatasources(datasources){
    var datasourceKeys = Object.keys(datasources);
    datasourceKeys
    .sort(function(a, b){
      var datasourceA = DataSourcesUi.getCaptionForDatasource( datasources[a] );
      var datasourceB = DataSourcesUi.getCaptionForDatasource( datasources[b] );
      if (datasourceA > datasourceB) {
        return 1;
      }
      else
      if (datasourceA < datasourceB) {
        return -1;
      }
      return 0;
    });
    return datasourceKeys.reduce(function(sortedDatasources, datasourceKey){
      sortedDatasources[datasourceKey] = datasources[datasourceKey];
      return sortedDatasources;
    }, {});
  }

  #addDatasource(datasource) {
    var id = datasource.getId();
    this.#attachRejectsDetection(datasource);
    this.#datasources[id] = datasource;
  }

  async addDatasources(datasources){
    datasources.forEach(function(datasource){
      this.#addDatasource(datasource);
    }.bind(this));
    await this.#renderDatasources();
  }

  addDatasource(datasource){
    this.addDatasources([datasource]);
  }

  async destroyDatasources(datasourceIds) {
    for (var i = 0; i < datasourceIds.length; i++){
      var datasourceId = datasourceIds[i];
      var datasource = this.getDatasource(datasourceId);
      if (!datasource) {
        continue;
      }
      datasource.destroy();
      delete this.#datasources[datasourceId];
    }
    await this.#renderDatasources();
  }

  getDatasource(id) {
    return this.#datasources[id];
  }

  getDatasourceIds(){
    return Object.keys(this.#datasources);
  }

  async isDatasourceCompatibleWithColumnsSpec(datasourceId, columnsSpec, useLooseColumnComparisonType){
    var columnNames = Object.keys(columnsSpec || {});
    if (columnNames.length === 0){
      return true;
    }

    var columnName, columnSpec, columnType, searchColumnsSpec;
    if (useLooseColumnComparisonType) {
      searchColumnsSpec = {};
      for (columnName in columnsSpec) {
        columnSpec = columnsSpec[columnName];
        columnType = columnSpec.columnType;
        searchColumnsSpec[columnName] = {
          columnType: this.#getLooseColumnType(columnType)
        };
      }
    }
    else {
      searchColumnsSpec = columnsSpec;
    }

    var datasources = this.#datasources;
    var datasource = datasources[datasourceId];
    if (!datasource){
      return false;
    }

    var columnMetadata;
    var datasourceType = datasource.getType();
    switch (datasourceType) {
      case DuckDbDataSource.types.FILE:
      case DuckDbDataSource.types.FILES:
        columnMetadata = await datasource.getColumnMetadata();
      case DuckDbDataSource.types.DUCKDB:
      case DuckDbDataSource.types.SQLITE:
        // TODO: look for objects in the database that could be a datasource.
        break;
      default:
    }

    if (!columnMetadata){
      return false;
    }

    _columns: for (var i = 0; i < columnMetadata.numRows; i++){
      var row = columnMetadata.get(i);
      var columnName = row.column_name;
      columnSpec = searchColumnsSpec[columnName];
      if (!columnSpec) {
        continue _columns;
      }

      columnType = row.column_type;
      var comparisonColumnType = useLooseColumnComparisonType ? this.#getLooseColumnType(columnType) : columnType;
      if (columnSpec.columnType !== comparisonColumnType) {
        return false;
      }
      columnNames.splice(columnNames.indexOf(columnName), 1);
      if (!columnNames.length){
        return true;
      }
    }
    return columnNames;
  }

  async findDataSourcesWithColumns(columnsSpec, useLooseColumnComparisonType){
    var foundDatasources = {};

    var datasources = this.#datasources;
    _datasources: for (var datasourceId in datasources){
      var datasource = datasources[datasourceId];
      var isCompatible = await this.isDatasourceCompatibleWithColumnsSpec(datasourceId, columnsSpec, useLooseColumnComparisonType);
      if (isCompatible === true){
        foundDatasources[datasourceId] = datasource;
      }
    }

    if (Object.keys(foundDatasources).length) {
      foundDatasources = DataSourcesUi.sortDatasources(foundDatasources);
      return foundDatasources;
    }
    return undefined;
  }
}

var datasourcesUi;
function initDataSourcesUi(){
  datasourcesUi = new DataSourcesUi('datasourcesUi');
}
