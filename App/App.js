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
    byId('attributesTab').checked = true;
    attributeUi.clear(true);
    clearSearch();
    var columnMetadata = await datasource.getColumnMetadata();
    queryModel.clear();
    queryModel.setDatasource(datasource);
    attributeUi.render(columnMetadata);
    byId('searchAttributeUi').style.display = '';
    byId('queryUi').style.display = '';

    byId('currentDatasource').innerHTML = DataSourcesUi.getCaptionForDatasource(datasource);
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

function initApplication(){
  initDuckdbVersion();
  initAbout();
  initUploadUi();
  initExportUi();
  initDataSourcesUi();
  initErrorDialog();
  initQueryModel();
  initAttributeUi();
  initSearch();
  initQueryUi();
  initPivotTableUi();
}