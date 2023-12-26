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
  if (!window.kwikDb) {
    return;
  }
  var connection = window.kwikDb.connection;
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
    layout.disabled = '';
    
  })
  .catch(function(){
    console.error(`Error fetching duckdb version info.`);
  })
}

function initUploader(){
  byId("uploader").addEventListener("change", handleUpload, false);
}

function initRegisteredFiles(){
  byId("registeredFiles").addEventListener("input", handleFileSelected, false);
}

function registerFile(file){
  var kwikDb = window.kwikDb;
  var registeredFiles = byId('registeredFiles');
  var fileName = file.name;
  kwikDb.instance.registerFileHandle(
    fileName, 
    file, 
    kwikDb.duckdb.DuckDBDataProtocol.BROWSER_FILEREADER
  )
  .then(function(){
    var option = document.createElement('option');
    option.label = option.value = fileName;
    registeredFiles.appendChild(option);
    registeredFiles.selectedIndex = registeredFiles.options.length - 1;
    handleFileSelected();
  })
  .catch(function(){
    console.error(`Error registering file: ${fileName}`);
  });
}

function handleUpload(event){
  var files = event.target.files;
  for (var i = 0; i < files.length; i++){ 
    var file = files[i];
    registerFile(file);
  }
}



function handleFileSelected(event){
  var registeredFiles = byId('registeredFiles');
  var fileName = registeredFiles.value;
  if (fileName === ''){
    return;
  }
  
  var datasource = {
    type: 'file',
    fileName: fileName
  };
  
  var sql = getSQLForDataProfile(datasource, 1000);
  kwikDb.connection.query(sql)
  .then(function(resultset){
    queryModel.clear();
    var metadata = 
    queryModel.setDatasource({
      type: 'file',
      fileName: fileName,
      metadata: metadata
    });
    renderAttributeUi(resultset);
  })
  .catch(function(err){
    console.error(`Error reading file ${fileName}`);
    console.error(err);
  });
}


function initApplication(){
  initDuckdbVersion();
  initUploader();
  initRegisteredFiles();
  initQueryModel();
  initAttributeUi();
  initQueryUi();
  initPivotTableUi();
}