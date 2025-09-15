const queryParams = document.location.search.substr(1).split('&').reduce(function(acc, nameValue){
  nameValue = nameValue.split('=');
  var name = nameValue[0];
  var value = nameValue[1];
  var existingValue = acc[name];
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
  var loglevel;
  var paramLoglevel = queryParams.loglevel;
  if (paramLoglevel){
    loglevel = duckdb.LogLevel[paramLoglevel];
    if (typeof loglevel !== 'number'){
      loglevel = duckdb.LogLevel[loglevel];
    }
  }
  return typeof loglevel === 'number' ? loglevel : duckdb.LogLevel.INFO;
}

function duckDbRowToJSON(object){
  var pojo;
  if (typeof object.toJSON === 'function'){
    pojo = object.toJSON();
  }
  else {
    pojo = object;
  }
  return JSON.stringify(pojo, function(key, value){
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
  var connection = window.hueyDb.connection;
  var versionColumn = 'version';
  var apiColumn = 'api';
  var reservedWordsColumn = 'reserved_words';
  var columns = {
    "version()": versionColumn,
    "current_setting('duckdb_api')": apiColumn,
    "list( keyword_name )": reservedWordsColumn,
  };
  var selectListSql = Object.keys(columns).map(function(key){
    return `${key} AS ${getQuotedIdentifier(columns[key])}`;
  }).join('\n,');
  var sql = `SELECT ${selectListSql}`;
  sql += `\nFROM duckdb_keywords()\nWHERE keyword_category != 'unreserved'`;
  var result = connection.query(sql)
  .then(function(resultset){
    var row = resultset.get(0);
    var version = row[versionColumn];
    var api = row[apiColumn];
    var reservedWords = row[reservedWordsColumn];
    reservedWords = String(reservedWords).slice(1, -1).split(',');
    window.hueyDb.reservedWords = reservedWords;

    var duckdbVersionLabel = byId('duckdbVersionLabel');
    duckdbVersionLabel.textContent = `DuckDB ${version}, API: ${api}`;
    
    var duckdbAvatar = byId('duckdb-version-specific-avatar');
    var duckdbVersionParts = /v(\d+)\.(\d+).(\d)/.exec(version);
    duckdbAvatar.src = `https://duckdb.org/images/release-icons/${duckdbVersionParts[1]}.${duckdbVersionParts[2]}.0.svg`
  })
  .catch(function(){
    console.error(`Error fetching duckdb version info.`);
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
    var title = `Error reading datasource ${datasource.getId()}`;
    console.error(title);
    var description = error.message;
    console.error(error);
    showErrorDialog({
      title: title,
      description: description
    });
  }
}

function initExecuteQuery(){

  byId('runQueryButton').addEventListener('click', function(event){
    pivotTableUi.updatePivotTableUi();
  });

  var autoRunQuery = byId('autoRunQuery');
  var settingsPath = ['querySettings', 'autoRunQuery'];
  autoRunQuery.checked = Boolean( settings.getSettings(settingsPath) );
  autoRunQuery.addEventListener('change', function(event){
    var target = event.target;
    var checked = target.checked;
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

  var currentRoute = Routing.getCurrentRoute();
  if (currentRoute){
    pageStateManager.setPageState(currentRoute);
  }

  bufferEvents(queryModel, 'change', function(event, count){
    if (count !== undefined) {
      return;
    }

    console.log(`buffered Events, event:`);
    var eventData = event.eventData;
    console.log(eventData);

    var currentDatasourceCaption, datasource = queryModel.getDatasource();
    if (datasource) {
      currentDatasourceCaption = DataSourcesUi.getCaptionForDatasource(datasource);
    }
    else {
      currentDatasourceCaption = '';
    }
    byId('currentDatasource').setAttribute('data-current-datasource', currentDatasourceCaption);
    byId('currentDatasource').firstChild.data = currentDatasourceCaption;

    var title = ExportUi.generateExportTitle(queryModel);
    document.title = 'Huey - ' + title;

    Routing.updateRouteFromQueryModel(queryModel);
  }, null, 50);

  var tupleNumberFormatter = createNumberFormatter(0).format;
  pivotTableUi.addEventListener('updated', async function(e){
    var eventData = e.eventData;
    var status = eventData.status;
    
    var numRowsTuples = '';
    var numColumnsTuples = '';
    
    switch (status) {
      case 'error':
        showErrorDialog(eventData.error);
        break;
      case 'success':
        var tupleCounts = eventData.tupleCounts;

        var cellsInfo = tupleCounts[QueryModel.AXIS_CELLS];

        var numRowsTuples = tupleCounts[QueryModel.AXIS_ROWS];
        numRowsTuples = typeof numRowsTuples === 'number' ? tupleNumberFormatter(numRowsTuples) : '';
        if (cellsInfo.count > 1 && cellsInfo.axis === QueryModel.AXIS_ROWS) {
          numRowsTuples += ` × ${cellsInfo.count}`;
        }
        
        var numColumnsTuples = tupleCounts[QueryModel.AXIS_COLUMNS];
        numColumnsTuples = typeof numColumnsTuples === 'number' ? tupleNumberFormatter(numColumnsTuples) : '';
        if (cellsInfo.count > 1 && cellsInfo.axis === QueryModel.AXIS_COLUMNS) {
          numColumnsTuples += ` × ${cellsInfo.count}`;
        }

        break;
    }
    byId('queryResultRowsInfo').textContent = numRowsTuples;
    byId('queryResultColumnsInfo').textContent = numColumnsTuples;
  });

  bufferEvents(pivotTableUi, 'busy', function(event, count){
    if (count !== undefined) {
      return;
    }
    var busy = event.eventData.busy;
    var busyDialog = byId('visualizationProgressDialog');
    if (busy) {
      busyDialog.showModal();
    }
    else {
      busyDialog.close();
    }
  });

  initPostMessageInterface();
  if (postMessageInterface) {
    postMessageInterface.sendReadyMessage();
  }
}
