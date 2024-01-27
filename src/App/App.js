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
    byId('searchAttributeUi').style.display = '';
    byId('queryUi').style.display = '';

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
}