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

function initUploader(){
  byId("uploader").addEventListener("change", handleUpload, false);
}

function initRegisteredFiles(){
  byId("registeredFiles").addEventListener("input", handleFileSelected, false);
}

async function registerFile(file){
  var hueyDb = window.hueyDb;
  var datasource = new DuckDbDataSource(hueyDb.duckdb, hueyDb.instance, {
    type: DuckDbDataSource.types.FILE,
    file: file
  });
  await datasource.registerFile();
  var result = await datasource.validateAccess();
  
  if (result === true){
    return datasource;
  }
  else {
    return result;
  }
}

async function registerFiles(files){
  var registerFilePromises = [];
  for (var i = 0; i < files.length; i++){ 
    var file = files[i];
    var registerFilePromise = registerFile(file);
    registerFilePromises.push(registerFilePromise);
  }
  return Promise.all(registerFilePromises);
}

function getFileOptionsGroup(){
  var fileOptionsGroupId = 'fileOptionsGroup'; 
  var fileOptionsGroup = byId(fileOptionsGroupId);
  if (!fileOptionsGroup){
    fileOptionsGroup = createEl('optgroup', {
      id: fileOptionsGroupId,
      label: 'Files:'
    });
    registeredFiles.appendChild(fileOptionsGroup);
  }
  return fileOptionsGroup;
}

function addItemToFileOptionsGroup(item){
  var fileOptionsGroup = getFileOptionsGroup();
  var option = createEl('option', {
    label: item,
    value: item
  });
  fileOptionsGroup.appendChild(option);
  return option;
}

async function handleUpload(event){
  var files = event.target.files;
  var registerFilePromiseResults = await registerFiles(files);
  var errors = [];
  var registeredFiles = byId('registeredFiles');
  var fileOptionsGroup;
  for (var i = 0; i < registerFilePromiseResults.length; i++){
    var registerFilePromiseResult = registerFilePromiseResults[i];
    var file = files[i];
    if (registerFilePromiseResult instanceof Error) {
      errors.push(`${file.name}: ${registerFilePromiseResult.message}`);
    }
    else {
      addItemToFileOptionsGroup(file.name);
    }
  }
  
  if (errors.length) {
    showErrorDialog({
      title: 'Error registering files:',
      description: errors.join('<br/>')
    });
  }
}


function registerFileNamePattern(){
  var pattern = prompt('Enter a file pattern:');
  addItemToFileOptionsGroup(pattern);
}

async function handleFileSelected(event){
  var registeredFiles = byId('registeredFiles');
  var fileName = registeredFiles.value;
  if (fileName === ''){
    return;
  }
  
  var selectedOption = registeredFiles.options[registeredFiles.selectedIndex];
  switch (selectedOption.id) {
    case 'registerNew':
      byId("uploader").click();
      registeredFiles.value = '';
      return;
    case 'registerPattern':
      registerFileNamePattern();
      registeredFiles.value = '';
      return;
    case 'multiSelect':
      return;
    case 'unregister':
      return;
    default:
  }
    
  var datasource;
  if (event instanceof DuckDbDataSource) {
    datasource = event;
  }
  else {
    var hueyDb = window.hueyDb;
    datasource = new DuckDbDataSource(hueyDb.duckdb, hueyDb.instance,  {
      type: DuckDbDataSource.types.FILE,
      fileName: fileName
    });
  }
  
  attributeUi.clear(true);
  clearSearch();
  
  try {
    var tableSchemaResultSet = await datasource.getTableSchema();
    queryModel.clear();
    queryModel.setDatasource(datasource);
    attributeUi.render(tableSchemaResultSet);
    byId('searchAttributeUi').style.display = '';
    byId('queryUi').style.display = '';
  }
  catch (error) {
    attributeUi.clear(false);
    var title = `Error reading file ${fileName}`;
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
  initErrorDialog();
  initUploader();
  initRegisteredFiles();
  initQueryModel();
  initAttributeUi();
  initSearch();
  initQueryUi();
  initPivotTableUi();
}