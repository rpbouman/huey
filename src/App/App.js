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
  var columns = {
    "version()": versionColumn,
    "current_setting('duckdb_api')": apiColumn
  };
  var selectListSql = Object.keys(columns).map(function(key){
    return `${key} AS ${getQuotedIdentifier(columns[key])}`;
  }).join('\n,');
  var sql = `SELECT ${selectListSql}`
  connection.query(sql)
  .then(function(resultset){
    var duckdbVersionLabel = byId('duckdbVersionLabel');
    var row = resultset.get(0);
    var version = row[versionColumn];
    var api = row[apiColumn];
    duckdbVersionLabel.innerText = `DuckDB ${version}, API: ${api}`;

    var spinner = byId('spinner');
    if (spinner){
      spinner.style.display = 'none';
    }
    var layout = byId('layout');
    layout.style.display = '';
  })
  .catch(function(){
    console.error(`Error fetching duckdb version info.`);
  })
}

async function analyzeDatasource(datasource){
  try {
    TabUi.setSelectedTab('#sidebar', '#attributesTab');
    clearSearch();
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
  initErrorDialog();
  initDuckdbVersion();
  initDataSourcesUi();
  initQueryModel();
  initExportUi();
  initAttributeUi();
  initSearch();
  initFilterUi();
  initQueryUi();
  initPivotTableUi();
  initExecuteQuery();
  initPageStateManager();
  initUploadUi();
  initDatasourceSettingsDialog();
 
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
    byId('currentDatasource').innerHTML = currentDatasourceCaption;
    
    Routing.updateRouteFromQueryModel(queryModel);
  }, null, 1000);
  
  pivotTableUi.addEventListener('updated', async function(e){
    var eventData = e.eventData;
    if (eventData.status === 'error'){
      showErrorDialog(eventData.error);      
    }
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
   
}