class DataSourcesUi extends EventEmitter {

  static #datasourceExportMenuId = 'datasourceExportMenu';

  #id = undefined;
  #datasources = {};

  constructor(id){
    super(['change']);
    this.#id = id;

    const dom = this.getDom();
    const domParent = dom.parentNode;
    domParent.addEventListener('dragenter', event => this.#dragEnterHandler( event ) );
    domParent.addEventListener('dragleave', event => this.#dragLeaveHandler( event ) );
    domParent.addEventListener('dragover', event => this.#dragOverHandler( event ) );
    domParent.addEventListener('drop', event => this.#dropHandler( event ) );
  }

  #dragEnterHandler(event) {
    let valid = true;

    const dataTransfer = event.dataTransfer;
    dataTransfer.dropEffect = 'copy';
    return;

    // unfortunately, we see that the files list is always emtpy.
    // instead, when dragging files, we see a list of items of type file, but for some reason we do not see the names of the files.
    // so this is pretty much useless, we cannot figure out in advance if the dragged items could be successfully loaded.

    const files = dataTransfer.files;
    valid = Boolean(files.length);
    const fileTypes = DuckDbDataSource.fileTypes;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.name;
      const fileNameParts = DuckDbDataSource.getFileNameParts(fileName);
      const fileExtension = fileNameParts.lowerCaseExtension;
      const fileType = fileTypes[fileExtension];
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
  }

  async #dropHandler(event) {
    event.preventDefault();
    event.stopPropagation();
    const dataTransfer = event.dataTransfer;
    const files = dataTransfer.files;
    const items = dataTransfer.items;
    let uploadResults;
    if (files.length) {
      uploadResults = await uploadUi.uploadFiles(files);
      afterUploaded(uploadResults);
    }
    else
    if (items.length){
      for (let i = 0 ; i < items.length; i++) {
        const item = items[i];
        if (item.kind !== 'string' || item.type !== 'text/uri-list') {
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

  #freeEventHandlers(node) {
    node.querySelectorAll('button').forEach( button => {
      let handler;
      if (button.id.endsWith('_analyze')){
        handler = this.#analyzeDatasourceClicked;
      }
      else 
      if (button.id.endsWith('_remove')){
        handler = this.#removeDatasourceClicked;
      }
      else 
      if (button.id.endsWith('_edit')){
        handler = this.#configureDatasourceClicked;
      }
      else 
      if (button.id.endsWith('_download')){
        handler = this.#downloadDatasourceClicked;
      }
      if (handler){
        button.removeEventListener('click', handler);
      }
    });
    node.removeEventListener('toggle', this.#toggleDataSource);
  }

  clear(content){
    const dom = this.getDom();
    dom.querySelectorAll('details').forEach(node => this.#freeEventHandlers(node) );
    if (!content){
      content = '';
    }
    dom.innerHTML = content;
  }

  #getLooseColumnType(columnType){
    const datasourceSettings = settings.getSettings('datasourceSettings');
    const looseColumnTypes = datasourceSettings.looseColumnTypes;
    let comparisonColumnType = undefined;
    for (let looseType in looseColumnTypes){
      const columnTypes = looseColumnTypes[looseType];
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
    const columnMetadata = await datasource.getColumnMetadata();
    const columnMetadataSerialized = {};
    const datasourceSettings = settings.getSettings('datasourceSettings');
    const useLooseColumnComparisonType = datasourceSettings.useLooseColumnTypeComparison;
    for (let i = 0; i < columnMetadata.numRows; i++){
      const row = columnMetadata.get(i);
      const columnType = row.column_type;
      const comparisonColumnType = useLooseColumnComparisonType ? this.#getLooseColumnType(columnType) : columnType;
      columnMetadataSerialized[row.column_name] = comparisonColumnType;
    }
    const type  = datasource.getType();
    const fileType = datasource.getFileExtension();
    const columnMetadataSerializedJSON = JSON.stringify(columnMetadataSerialized);
    const typeSignature = `${type}:${fileType}:${columnMetadataSerializedJSON}`;
    return typeSignature;
  }

  async #renderDatasources(){
    this.clear();
    const potentialGroups = {};
    const datasources = this.#datasources;

    const groupingPromises = Object.keys(datasources).map(async datasourceId => {
      const datasource = datasources[datasourceId];
      const datasourceType = datasource.getType();

      let group = undefined;
      switch (datasourceType){
        case DuckDbDataSource.types.FILE:
          const typeSignature = await this.#getTabularDatasourceTypeSignature(datasource);
          group = potentialGroups[typeSignature];
          if (!group) {
            group = {
              type: DuckDbDataSource.types.FILE,
              fileType: datasource.getFileExtension(),
              typeSignature: typeSignature,
              datasources: {}
            };
            potentialGroups[typeSignature] = group;
          }
          break;
        case DuckDbDataSource.types.TABLE:
        case DuckDbDataSource.types.VIEW:
          // noop. these are rendered by the respective database datasource node.
          return;
        case DuckDbDataSource.types.DUCKDB:
        case DuckDbDataSource.types.SQLITE:
        default:
          group = potentialGroups[datasourceType];
          if (!group){
            potentialGroups[datasourceType] = group = {
              type: datasourceType,
              datasources: {}
            };
          }
      }
      group.datasources[datasourceId] = datasource;
      return true;
    });
    const results = await Promise.all(groupingPromises);

    this.#createDataSourceGroupNode(potentialGroups[DuckDbDataSource.types.DUCKDB]);
    delete potentialGroups[DuckDbDataSource.types.DUCKDB];

    this.#createDataSourceGroupNode(potentialGroups[DuckDbDataSource.types.SQLITE]);
    delete potentialGroups[DuckDbDataSource.types.SQLITE];

    for (let groupId in potentialGroups){
      const group = potentialGroups[groupId];
      const groupDatasources = group.datasources;
      const datasourceKeys = Object.keys(groupDatasources);
      if (datasourceKeys.length === 1) {
        const datasourceKey = datasourceKeys[0]
        const datasource = groupDatasources[datasourceKey];
        const datasourceType = datasource.getType();
        let miscGroup = potentialGroups[datasourceType];
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
    const type = datasource.getType();
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
    const actionButton = instantiateTemplate('dataSourceGroupNodeActionButton');
    
    const className = config.className instanceof Array ? config.className.join(' ') : config.className || '';
    actionButton.setAttribute('class', className);
    actionButton.setAttribute('for', config.id);
    actionButton.setAttribute('title', config.title);
    
    const button = actionButton.querySelector('button');
    button.setAttribute('id', config.id);
    
    const events = config.events;
    if (events) {
      for (let eventName in events) {
        const handler = events[eventName].bind(this);
        button.addEventListener(eventName, event => handler(event) );
      }
    }
    return actionButton;
  }

  #createDatasourceNodeAnalyzeActionButton(datasourceId, summaryElement){
    const actionButton = this.#renderDatasourceActionButton({
      id: datasourceId + '_analyze',
      "className": "analyzeActionButton",
      popovertarget: 'uploadUi',
      popovertargetaction: 'hide',
      title: Internationalization.getText('Open {1} in the Query editor', datasourceId),
      events: {
        click: this.#analyzeDatasourceClicked
      }
    });
    if (summaryElement) {
      summaryElement.appendChild(actionButton);
    }
    return actionButton;
  }
  
  #createDatasourceNodeRemoveActionButton(datasourceId, summaryElement){
    const actionButton = this.#renderDatasourceActionButton({
      id: datasourceId + '_remove',
      "className": "removeActionButton",
      popovertarget: 'uploadUi',
      popovertargetaction: 'hide',
      title: Internationalization.getText('Remove datasource {1}', datasourceId),
      events: {
        click: this.#removeDatasourceClicked
      }
    });
    if (summaryElement) {
      summaryElement.appendChild(actionButton);
    }
    return actionButton;
  }

  #createDatasourceNodeEditActionButton(datasourceId, summaryElement){
    const actionButton = this.#renderDatasourceActionButton({
      id: datasourceId + '_edit',
      "className": "editActionButton",
      popovertarget: 'uploadUi',
      popovertargetaction: 'hide',
      title: Internationalization.getText('Configure datasource details of {1}', datasourceId),
      events: {
        click: this.#configureDatasourceClicked
      }
    });
    if (summaryElement) {
      summaryElement.appendChild(actionButton);
    }
    return actionButton;
  }

  #createDatasourceNodeDownloadActionButton(datasourceId, summaryElement){
    const actionButton = this.#renderDatasourceActionButton({
      id: datasourceId + '_download',
      "className": "downloadActionButton",
      popovertarget: 'uploadUi',
      popovertargetaction: 'hide',
      title: Internationalization.getText('Download the contents of datasource {1} to a file.', datasourceId),
      events: {
        click: this.#downloadDatasourceClicked
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
    const catalogName = databaseDatasource.getFileNameWithoutExtension();
    const connection = window.hueyDb.connection;
    const sql = `
      SELECT table_schema, table_name, table_type
      FROM information_schema.tables
      WHERE table_catalog = ?
      AND   table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY table_schema, table_name
    `;
    const statement = await connection.prepare(sql);
    const result = await statement.query(catalogName);
    statement.close();

    const datasourceId = databaseDatasource.getId();
    const datasourceTreeNode = byId(datasourceId);

    const schemaNodes = {};
    for (let i = 0; i < result.numRows; i++){
      const row = result.get(i);
      const schemaName = row.table_schema;
      let schemaNode = schemaNodes[schemaName];
      if (schemaNode === undefined) {
        schemaNode = instantiateTemplate('dataSourceSchemaNode', datasourceId + ':' + schemaName);
        schemaNode.setAttribute('title', schemaName);
        schemaNode.setAttribute('data-catalog-name', catalogName);
        schemaNode.setAttribute('data-schema-name', schemaName);
        schemaNode.querySelector('span.label').textContent = schemaName;
        schemaNodes[schemaName] = schemaNode;
        datasourceTreeNode.appendChild(schemaNode);
      }
      const tableName = row.table_name;
      const tableType = row.table_type;
      let datasourcetype;
      switch (tableType){
        case 'BASE TABLE':
          datasourcetype = DuckDbDataSource.types.TABLE;
          break;
        case 'VIEW':
          datasourcetype = DuckDbDataSource.types.VIEW;
          break;
      }

      const tableDatasourceId = `${datasourceId}:${getQuotedIdentifier(schemaName)}:${getQuotedIdentifier(tableName)}`;
      let datasource = this.getDatasource(tableDatasourceId);
      if (!datasource) {
        const hueyDb = window.hueyDb;
        datasource = new DuckDbDataSource(hueyDb.duckdb, hueyDb.instance, {
          type: datasourcetype,
          catalogName: catalogName,
          schemaName: schemaName,
          objectName: tableName
        });
        this.#addDatasource(datasource);
      }

      const tableNode = this.#createDatasourceNode(datasource);
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
    const target = event.target;

    if (event.oldState !== 'closed' || event.newState !== 'open' || target.getElementsByTagName('details').length !== 0) {
      return;
    }

    const datasource = this.#getDatasourceForTreeNode(target);
    this.#loadDatasource(datasource);
  }

  #createDatasourceNode(datasource, attributes){
    const caption = DataSourcesUi.getCaptionForDatasource(datasource);

    const type = datasource.getType();
    const datasourceId = datasource.getId();
    
    const datasourceNode = instantiateTemplate('dataSourceNode', datasourceId);
    datasourceNode.setAttribute('data-datasourcetype', type);
    datasourceNode.setAttribute('title', caption);
    
    const summary = datasourceNode.querySelector('summary');
    const label = summary.querySelector('span.label');
    label.textContent = caption;
    
    if (attributes){
      for (let attributeName in attributes){
        datasourceNode.setAttribute(attributeName, attributes[attributeName]);
      }
    }

    switch (type) {
      case DuckDbDataSource.types.DUCKDB:
      case DuckDbDataSource.types.SQLITE:
        this.#createDatasourceNodeRemoveActionButton(datasourceId, summary);
        datasourceNode.addEventListener('toggle', event => this.#toggleDataSource( event ) );
        break;
      case DuckDbDataSource.types.TABLE:
      case DuckDbDataSource.types.VIEW:
        this.#createDatasourceNodeAnalyzeActionButton(datasourceId, summary);
        this.#createDatasourceNodeDownloadActionButton(datasourceId, summary);
        break;
      case DuckDbDataSource.types.FILE:
        const extension = datasource.getFileExtension();
        datasourceNode.setAttribute('data-filetype', extension);
      default:
        this.#createDatasourceNodeActionButtons(datasourceId, summary);
    }

    return datasourceNode;
  }

  #getTreeNodeFromClickEvent(event){
    const button = event.target;
    const label = button.parentNode;
    const summary = label.parentNode;
    const node = summary.parentNode;
    return node;
  }

  #getDatasourceForTreeNode(datasourceTreeNode) {
    const dataSourceId = datasourceTreeNode.id;
    const datasource = this.getDatasource(dataSourceId);
    return datasource;
  }

  #rejectsDetectedHandler(event){
    let balanceAttribute;
    const datasource = event.currentTarget;
    const id = datasource.getId();
    const datasourceNode = document.getElementById(id);
    const eventData = event.eventData;
    const new_reject_balance = eventData.new_reject_balance;
    const old_reject_balance = eventData.old_reject_balance;
    if (new_reject_balance >= 0){
      balanceAttribute = new_reject_balance;
      datasourceNode.setAttribute('data-reject_count', balanceAttribute);
    }
    else {
      balanceAttribute = 0;
      datasourceNode.removeAttribute('data-reject_count');
    }
    //TODO: I18N
    if (new_reject_balance > old_reject_balance){
      let title, description;
      if (old_reject_balance === 0n){
        title = 'Errors found in Data file';
        description = [
          'Errors were encountered while executing the previous query.',
          `${new_reject_balance} offending records were excluded from the results.`
        ];
      }
      else {
        title = 'New errors found in Data file';
        const diff = new_reject_balance - old_reject_balance;
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
    duckdbDataSource.addEventListener('rejectsdetected', event => this.#rejectsDetectedHandler( event ) );
  }

  #getDatasourceFromClickEvent(event){
    let datasource;
    const node = this.#getTreeNodeFromClickEvent(event);
    const nodeType = node.getAttribute('data-nodetype');
    switch (nodeType) {
      case 'datasource':
        datasource = this.#getDatasourceForTreeNode(node);
        break;
      case 'datasourcegroup':
        const groupType = node.getAttribute('data-grouptype');
        switch (groupType){
          case DuckDbDataSource.types.FILE:
            const datasourceIdsListJSON = node.getAttribute('data-datasourceids');
            const datasourceIdsList = JSON.parse(datasourceIdsListJSON);
            const fileNames = datasourceIdsList.map(datasourceId => this.#datasources[datasourceId].getFileName());
            
            const hueyDb = window.hueyDb;
            const duckdb = hueyDb.duckdb;
            const instance = hueyDb.instance;
            datasource = new DuckDbDataSource(duckdb, instance, {
              type: DuckDbDataSource.types.FILES,
              fileNames: fileNames,
              fileType: node.getAttribute('data-filetype')
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
    const datasource = this.#getDatasourceFromClickEvent(event);
    // todo: replace direct call to global analyze with fireEvent
    analyzeDatasource(datasource);
  }

  #removeDatasourceClicked(event){
    const node = this.#getTreeNodeFromClickEvent(event);
    const nodeType = node.getAttribute('data-nodetype');
    let datasourceIdsList;
    switch (nodeType) {
      case 'datasource':
        const dataSourceId = node.id;
        datasourceIdsList = [dataSourceId];
        break;
      case 'datasourcegroup':
        const groupType = node.getAttribute('data-grouptype');
        switch (groupType){
          case DuckDbDataSource.types.FILE:
            const datasourceIdsListJSON = node.getAttribute('data-datasourceids');
            datasourceIdsList = JSON.parse(datasourceIdsListJSON);
            break;
          default:
            throw new Error(`Don't know how to get a datasource from a datasourcegroup of type ${groupType}`);
        }
        break;
    }
    this.#freeEventHandlers(node);
    this.destroyDatasources(datasourceIdsList);
  }

  #configureDatasourceClicked(event){
    const datasource = this.#getDatasourceFromClickEvent(event);
    datasourceSettingsDialog.open(datasource);
  }
  
  static #getDownloadMenuHTML(fromFileType, includeFromFileType){
    const fileTypes = Object.keys(DuckDbDataSource.fileTypes)
    .filter(fileType => {
      if (Boolean(fromFileType)) { 
        switch (fileType){
          case fromFileType:
            return includeFromFileType !== false;
          case 'duckdb':
          case 'sqlite':
            return false;
        }
      }
      return true;
    });
    const menuItems = fileTypes.sort().map(fileType => {
      const id = `fileType-${fileType}`;
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
    const menu = `
      <menu class="fileTypes" id="${DataSourcesUi.#datasourceExportMenuId}">
        ${menuItems.join('\n')}
      </menu>
    `;
    return menu;
  }
  
  static async #promptExportDataFormat(fromFileType, includeFromFileType){
    const menu = DataSourcesUi.#getDownloadMenuHTML(fromFileType, includeFromFileType);
    const result = await PromptUi.show({
      title: 'Export Datasource',
      contents: menu
    });

    if (result !== 'accept'){
      return undefined;
    }
    const selectedItemCss = `menu#${DataSourcesUi.#datasourceExportMenuId} > li > input[type=radio]:checked`;
    const selected = document.querySelector(selectedItemCss);
    if (!selected) {
      return undefined;
    }
    const fileType = selected.value;
    return fileType;
  }
  
  static #getDatasourceExportSettings(targetFileType){
    let exportType = null;
    let exportDelimited = false;
    let exportJson = false;
    let exportParquet = false;
    let exportXlsx = false;
    
    const fileTypeInfo = DuckDbDataSource.getFileTypeInfo(targetFileType);
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
    const exportSettings = Object.assign(
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
    const button = event.target;
    if (button.getAttribute('aria-busy') === 'true'){
      return;
    }
    
    const datasource = this.#getDatasourceFromClickEvent(event);
    let datasourceFileType, includeFromFileType = false;
    switch (datasource.getType()){
      case DuckDbDataSource.types.FILES:
        includeFromFileType = true;
      case DuckDbDataSource.types.FILE:
        datasourceFileType = datasource.getFileType();
    }

    const targetFileType = await DataSourcesUi.#promptExportDataFormat(datasourceFileType, includeFromFileType);
    if (!targetFileType) {
      return;
    }
    button.setAttribute('aria-busy', 'true');
    
    const exportSettings = DataSourcesUi.#getDatasourceExportSettings(targetFileType);
    const exportTitle = DataSourcesUi.getCaptionForDatasource(datasource);
    exportSettings.exportTitle = exportTitle;
    
    const sql = `SELECT * ${datasource.getFromClauseSql()}`;
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
        const datasources = datasourceGroup.datasources;
        if (miscGroup) {
          return Internationalization.getText('Files');
        }
        return Object.keys(datasources).map(datasourceId => {
          const datasource = datasources[datasourceId];
          return datasource.getFileNameWithoutExtension();
        }).join(', ');
    }
  }

  #createDataSourceGroupNode(datasourceGroup, miscGroup){
    if (datasourceGroup === undefined){
      return;
    }
    const groupNode = instantiateTemplate('dataSourceGroupNode');
    const groupType = datasourceGroup.type;
    groupNode.setAttribute('data-grouptype', groupType)

    let groupTitle;
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

    const summary = groupNode.querySelector('summary');
    const label = summary.querySelector('span.label');
    // TODO: some group titels are translateable, some aren't
    const caption = this.#getCaptionForDataSourceGroup(datasourceGroup, miscGroup);
    label.textContent = caption;

    if (datasourceGroup.typeSignature) {
      this.#createDatasourceNodeActionButtons(
        datasourceGroup.typeSignature, 
        summary
      );
    }

    const datasources = DataSourcesUi.sortDatasources( datasourceGroup.datasources );
    const datasourceKeys = Object.keys(datasources);
    groupNode.setAttribute('data-datasourceids', JSON.stringify(datasourceKeys));

    datasourceKeys.forEach(datasourceId => {
      const datasource = datasources[datasourceId];
      const datasourceNode = this.#createDatasourceNode(datasource);
      groupNode.appendChild(datasourceNode);
    });

    const dom = this.getDom();
    dom.appendChild(groupNode);
    return groupNode;
  }
  
  static sortDatasources(datasources){
    const datasourceKeys = Object.keys(datasources);
    datasourceKeys
    .sort((a, b) => {
      const datasourceA = DataSourcesUi.getCaptionForDatasource( datasources[a] );
      const datasourceB = DataSourcesUi.getCaptionForDatasource( datasources[b] );
      if (datasourceA > datasourceB) {
        return 1;
      }
      else
      if (datasourceA < datasourceB) {
        return -1;
      }
      return 0;
    });
    return datasourceKeys.reduce((sortedDatasources, datasourceKey) => {
      sortedDatasources[datasourceKey] = datasources[datasourceKey];
      return sortedDatasources;
    }, {});
  }

  #addDatasource(datasource) {
    this.#attachRejectsDetection(datasource);
    const id = datasource.getId();
    this.#datasources[id] = datasource;
  }

  async addDatasources(datasources){
    datasources.forEach( datasource => this.#addDatasource(datasource) );
    await this.#renderDatasources();
  }

  addDatasource(datasource){
    this.addDatasources([datasource]);
  }

  async destroyDatasources(datasourceIds) {
    for (let i = 0; i < datasourceIds.length; i++){
      const datasourceId = datasourceIds[i];
      const datasource = this.getDatasource(datasourceId);
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
    if (!columnsSpec) {
      return;
    }
    const columnNames = Object.keys(columnsSpec);
    if (columnNames.length === 0){
      return true;
    }

    let columnName, columnSpec, columnType, searchColumnsSpec;
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

    const datasources = this.#datasources;
    const datasource = datasources[datasourceId];
    if (!datasource){
      return false;
    }

    let columnMetadata;
    const datasourceType = datasource.getType();
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

    _columns: for (let i = 0; i < columnMetadata.numRows; i++){
      const row = columnMetadata.get(i);
      const columnName = row.column_name;
      columnSpec = searchColumnsSpec[columnName];
      if (!columnSpec) {
        continue _columns;
      }

      columnType = row.column_type;
      const comparisonColumnType = useLooseColumnComparisonType ? this.#getLooseColumnType(columnType) : columnType;
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
    let foundDatasources = {};

    const datasources = this.#datasources;
    _datasources: for (let datasourceId in datasources){
      const datasource = datasources[datasourceId];
      const isCompatible = await this.isDatasourceCompatibleWithColumnsSpec(datasourceId, columnsSpec, useLooseColumnComparisonType);
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

let datasourcesUi;
function initDataSourcesUi(){
  datasourcesUi = new DataSourcesUi('datasourcesUi');
}
