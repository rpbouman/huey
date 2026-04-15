const queryParams = document
  .location
  .search
  .substr(1)
  .split('&')
  .reduce((acc, nameValue) => {
    nameValue = nameValue.split('=');
    const name = nameValue[0];
    let value = nameValue[1];
    const existingValue = acc[name];
    switch (typeof existingValue){
      case 'undefined':
        break;
      case 'object':
        existingValue.push(value);
        value = existingValue;
        break;
      default:
        value = [existingValue, value];
    }
    acc[name] = value;
    return acc;
  }, {});

function getDuckDbLogLevel(duckdb){
  let loglevel;
  const paramLoglevel = queryParams.loglevel;
  if (paramLoglevel){
    loglevel = duckdb.LogLevel[paramLoglevel];
    if (typeof loglevel !== 'number'){
      loglevel = duckdb.LogLevel[loglevel];
    }
  }
  return typeof loglevel === 'number' ? loglevel : duckdb.LogLevel.INFO;
}

// unused. for convenience/debugging
function duckDbRowToJSON(object){
  let pojo;
  if (typeof object.toJSON === 'function'){
    pojo = object.toJSON();
  }
  else {
    pojo = object;
  }
  return JSON.stringify(pojo, (key, value) => {
    if (value && value.constructor === BigInt){
      return parseFloat(value.toString());
    }
    else {
      return value;
    }
  }, 2);
}

function initDuckdbVersion(){
  if (!window.hueyDb) {
    return;
  }
  const connection = window.hueyDb.connection;
  const versionColumn = 'version';
  const apiColumn = 'api';
  const reservedWordsColumn = 'reserved_words';
  const columns = {
    "version()": versionColumn,
    "current_setting('duckdb_api')": apiColumn,
    "list( keyword_name )": reservedWordsColumn,
  };
  const selectListSql = Object.keys(columns).map(key => {
    return `${key} AS ${getQuotedIdentifier(columns[key])}`;
  }).join('\n,');
  let sql = `SELECT ${selectListSql}`;
  sql += `\nFROM duckdb_keywords()\nWHERE keyword_category != 'unreserved'`;
  const result = connection.query(sql)
  .then(resultset => {
    const row = resultset.get(0);
    const version = row[versionColumn];
    const api = row[apiColumn];
    const reservedWords = String( row[reservedWordsColumn] ).slice(1, -1).split(',');
    window.hueyDb.reservedWords = reservedWords;

    const duckdbVersionLabel = byId('duckdbVersionLabel');
    duckdbVersionLabel.textContent = `DuckDB ${version}, API: ${api}`;
    
    const duckdbAvatar = byId('duckdb-version-specific-avatar');
    const duckdbVersionParts = /v(\d+)\.(\d+).(\d)/.exec(version);
    duckdbAvatar.src = `https://duckdb.org/images/release-icons/${duckdbVersionParts[1]}.${duckdbVersionParts[2]}.0.svg`
  })
  .catch(error => {
    console.error(`Error fetching duckdb version info.`);
    console.error(error);
  })
}

async function analyzeDatasource(datasource){
  try {
    TabUi.setSelectedTab('#sidebar', '#attributesTab');
    clearSearch();
    uploadUi.getDialog().close();
    queryModel.setDatasource(datasource);
  }
  catch (error) {
    attributeUi.clear(false);
    const title = `Error reading datasource ${datasource.getId()}`;
    console.error(title);
    const description = error.message;
    console.error(error);
    showErrorDialog({
      title: title,
      description: description
    });
  }
}

function initExecuteQuery(){

  byId('runQueryButton').addEventListener('click', event => {
    pivotTableUi.updatePivotTableUi();
  });

  const autoRunQuery = byId('autoRunQuery');
  const settingsPath = ['querySettings', 'autoRunQuery'];
  autoRunQuery.checked = Boolean( settings.getSettings(settingsPath) );
  autoRunQuery.addEventListener('change', event => {
    const target = event.target;
    const checked = target.checked;
    settings.assignSettings('querySettings', {
      'autoRunQuery': checked
    });
    if (checked) {
      pivotTableUi.updatePivotTableUi();
    }
  });
}

function initApplication(){
  initDragableDialogs();
  initDuckdbVersion();
  initDataSourcesUi();
  initQueryModel();
  initExportDialog();
  initAttributeUi();
  initSearch();
  initFilterUi();
  initQueryUi();
  initPivotTableUi();
  initExecuteQuery();
  initPageStateManager();
  initUploadUi();
  initDatasourceSettingsDialog();
  initSessionCloner();
  initQuickQueryMenu();
  initDataSourceMenu();
  initPwa();

  const currentRoute = Routing.getCurrentRoute();
  if (currentRoute){
    pageStateManager.setPageState(currentRoute);
  }

  bufferEvents(queryModel, 'change', (event, count) => {
    if (count !== undefined) {
      return;
    }

    console.log(`buffered Events, event:`);
    const eventData = event.eventData;
    console.log(eventData);

    let currentDatasourceCaption, datasource = queryModel.getDatasource();
    if (datasource) {
      currentDatasourceCaption = DataSourcesUi.getCaptionForDatasource(datasource);
    }
    else {
      currentDatasourceCaption = '';
    }
    const currentDatasource = byId('currentDatasource');
    currentDatasource.setAttribute('data-current-datasource', currentDatasourceCaption);
    currentDatasource.firstChild.data = currentDatasourceCaption;

    const title = ExportUi.generateExportTitle(queryModel);
    document.title = 'Huey - ' + title;

    Routing.updateRouteFromQueryModel(queryModel);
  }, null, 50);

  const tupleNumberFormatter = createNumberFormatter(0).format;
  pivotTableUi.addEventListener('updated', async event => {
    const eventData = event.eventData;
    const status = eventData.status;
    
    let numRowsTuples = '';
    let numColumnsTuples = '';
    
    switch (status) {
      case 'error':
        showErrorDialog(eventData.error);
        break;
      case 'success':
        const tupleCounts = eventData.tupleCounts;
        const cellsInfo = tupleCounts[QueryModel.AXIS_CELLS];

        numRowsTuples = tupleCounts[QueryModel.AXIS_ROWS];
        numRowsTuples = typeof numRowsTuples === 'number' ? tupleNumberFormatter(numRowsTuples) : '';
        if (cellsInfo.count > 1 && cellsInfo.axis === QueryModel.AXIS_ROWS) {
          numRowsTuples += ` × ${cellsInfo.count}`;
        }
        
        numColumnsTuples = tupleCounts[QueryModel.AXIS_COLUMNS];
        numColumnsTuples = typeof numColumnsTuples === 'number' ? tupleNumberFormatter(numColumnsTuples) : '';
        if (cellsInfo.count > 1 && cellsInfo.axis === QueryModel.AXIS_COLUMNS) {
          numColumnsTuples += ` × ${cellsInfo.count}`;
        }

        break;
    }
    byId('queryResultRowsInfo').textContent = numRowsTuples;
    byId('queryResultColumnsInfo').textContent = numColumnsTuples;
  });

  bufferEvents(pivotTableUi, 'busy', (event, count) => {
    if (count !== undefined) {
      return;
    }
    const busy = event.eventData.busy;
    const busyDialog = byId('visualizationProgressDialog');
    busyDialog[busy ? 'showModal' : 'close']();
  });

  initPostMessageInterface();
  if (postMessageInterface) {
    postMessageInterface.sendReadyMessage();
  }
}
