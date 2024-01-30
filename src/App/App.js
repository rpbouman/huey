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
  connection.query('SELECT version() as version')
  .then(function(resultset){
    var duckdbVersionLabel = byId('duckdbVersionLabel');
    duckdbVersionLabel.innerText = `DuckDB ${resultset.get(0)['version']}`;

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

function popstateHandler(event){
  var hash = event.target.document.location.hash;
  if (hash.length === 0){
    return;
  }
  
  var currentRoute = Routing.getRouteForView(pivotTableUi);
  if (currentRoute === hash){
    return;
  }
  setPageState(hash);
}

function setPageState(hash){
  if (!hash){
    hash = document.location.hash;
  }
  if (hash.length === 0){
    return;
  }
  if (hash.startsWith('#')) {
    hash = hash.substring(1);
  }

  var autoRunQuery = settings.getSettings('querySettings').autoRunQuery;
  try {
    
    var currentRoute = Routing.getRouteForView(pivotTableUi, false);
    if (currentRoute === hash){
      return;
    }
    
    var state = Routing.getViewstateFromRoute(hash);
    var viewClass = state.viewClass;
    var queryModelState = state.queryModel;
    var datasourceId = queryModelState.datasourceId;
    
    var datasource = datasourcesUi.getDatasource(datasourceId);
    if (!datasource) {
      throw new Error(`datasource ${datasourceId} not found.`);
    }
    var cellsHeadersAxis = queryModelState.cellsHeaders;
    var axes = queryModelState.axes;
    
    if (autoRunQuery) {
      settings.assignSettings(['querySettings', 'autoRunQuery'], false);
    }
    var queryModel = pivotTableUi.getQueryModel();
    queryModel.setDatasource(datasource);
    
    for (var axisId in axes){
      var items = axes[axisId];
      for (var i = 0 ; i < items.length; i++){
        var item = items[i];
        var config = {
          columnName: item.column
        };
        if (item.derivation) {
          for (var derivation in item.derivation){
          }
          config.derivation = derivation;
        }
        if (item.aggregator) {
          for (var aggregator in item.aggregator){
          }
          config.aggregator = aggregator;
        }
        var formatter = QueryAxisItem.createFormatter(config);
        if (formatter){
          config.formatter = formatter;
        }
        
        config.axis = axisId;
        queryModel.addItem(config);
      }
    }
  }
  catch(e){
    showErrorDialog(e);
    event.preventDefault = true;
  }
  finally{
    if (autoRunQuery) {
      settings.assignSettings(['querySettings', 'autoRunQuery'], autoRunQuery);
    }
  }
}

function initPopstateHandler(){
  window.addEventListener('popstate', popstateHandler);
}

function initApplication(){
  initErrorDialog();
  initDuckdbVersion();
  initUploadUi();
  initDataSourcesUi();
  initQueryModel();
  initExportUi();
  initAttributeUi();
  initSearch();
  initFilterUi();
  initQueryUi();
  initPivotTableUi();
  initExecuteQuery();
  
  initPopstateHandler();
  setPageState();
}