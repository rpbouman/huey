function downloadBlob(data, fileName, mimeType) {
  var blob, url;
  blob = new Blob([data], {
    type: mimeType
  });
  url = window.URL.createObjectURL(blob);
  downloadURL(url, fileName);
  setTimeout(function() {
    return window.URL.revokeObjectURL(url);
  }, 1000);
};

function downloadURL(data, fileName) {
  var a;
  a = document.createElement('a');
  a.href = data;
  a.download = fileName;
  document.body.appendChild(a);
  a.style = 'display: none';
  a.click();
  a.remove();
};

async function copyPivotStatementToClipboard(){
  try {
    var sql = getDuckDbPivotSqlStatementForQueryModel(queryModel);
    await copyToClipboard(sql, 'text/plain');
  }
  catch (e){
    showErrorDialog(e);
  }
}

async function downloadPivotStatementToSqlFile(){
  // todo: make the filename configurable through settings
  // todo: generate a reasonable filename based on the query
  var fileName = 'pivot.sql';
  var sql = getDuckDbPivotSqlStatementForQueryModel(queryModel);
  downloadBlob(sql, fileName, 'text/plain');
}

async function downloadQueryResultToCsvFile(){
  // todo: generate a reasonable default filename based on the query
  // todo: make the filename configurable through settings
  // todo: make the default csv options configurable through settings
  // todo: make the currenmt csv options configurable in the dialog
  var fileName = 'huey-results.csv';
  var sql = getDuckDbPivotSqlStatementForQueryModel(queryModel);
  //see: https://github.com/holdenmatt/duckdb-wasm-kit/blob/main/src/files/exportFile.ts#L31-L49
  await window.hueyDb.connection.query(`copy (${sql}) to \'${fileName}\' WITH (HEADER 1, DELIMITER \';\')`);
  var buffer = await window.hueyDb.instance.copyFileToBuffer(fileName);
  window.hueyDb.instance.dropFile(fileName);
  var results = new TextDecoder('utf-8').decode(buffer);
  downloadBlob(results, fileName, 'text/csv');
}

async function downloadQueryResultToParquetFile(){
  // todo: generate a reasonable default filename based on the query
  // todo: make the filename configurable through settings
  // todo: make the default parquet options configurable through settings
  // todo: make the currennt parquet options configurable in the dialog
  var fileName = 'huey-results.parquet';
  var sql = getDuckDbPivotSqlStatementForQueryModel(queryModel);
  //see: https://github.com/holdenmatt/duckdb-wasm-kit/blob/main/src/files/exportFile.ts#L31-L49
  await window.hueyDb.connection.query(`copy (${sql}) to \'${fileName}\' (FORMAT PARQUET, COMPRESSION GZIP)`);
  var buffer = await window.hueyDb.instance.copyFileToBuffer(fileName);
  window.hueyDb.instance.dropFile(fileName);
  // see: https://github.com/holdenmatt/duckdb-wasm-kit/blob/main/src/files/parquet.ts
  downloadBlob(buffer, fileName, 'application/vnd.apache.parquet');
}

function getCaptionForQueryAxis(axisId){
  var queryAxis = queryModel.getQueryAxis(axisId);
  var items = queryAxis.getItems();
  if (items.length === 0){
    return '<empty>';
  }
  var itemKeys = Object.keys(items);
  var captions = itemKeys.map(function(itemKey){
    var item = items[itemKey];
    var caption = QueryAxisItem.getCaptionForQueryAxisItem(item);
    return `"${caption}"`;
  });
  return captions.join(', ');
}

var exportTitleFields = {
  'datasource': function(){
    var datasource = queryModel.getDatasource();
    if (!datasource) {
      return '<no datasource>';
    }
    var caption = DataSourcesUi.getCaptionForDatasource(datasource);
    return caption;
  },
  'columns-items': function(){
    return getCaptionForQueryAxis(QueryModel.AXIS_COLUMNS);
  },
  'rows-items': function(){
    return getCaptionForQueryAxis(QueryModel.AXIS_ROWS);
  },
  'cells-items': function(){
    return getCaptionForQueryAxis(QueryModel.AXIS_CELLS);
  },
  'filters-items': function(){
    return getCaptionForQueryAxis(QueryModel.AXIS_FILTERS);
  },
};

function generateExportDialogTitle(){
  var exportTemplate = byId('exportTitleTemplate')
  var exportTemplateValue = exportTemplate.value;
  var replacedTemplate = exportTemplateValue.replace(/\$\{[^\}]+\}/g, function(fieldRef){
    var fieldName = fieldRef.slice(2, -1);
    var func = exportTitleFields[fieldName];
    if (typeof func === 'function'){
      return func(); 
    }
    else {
      return fieldRef;
    }
  });
  return replacedTemplate;
}

function updateExportDialog(){
  var title = generateExportDialogTitle();
  byId('exportTitle').innerText = title;
}

async function executeExport(){
  var dom = byId('exportDialog');
  dom.setAttribute('aria-busy', String(true));
  var progressMessageElement = dom.querySelector('*[role=progressbar] *[role=status]');
  progressMessageElement.innerText = 'Preparing export...';
  try {
    var title = byId('exportTitle').innerText;
    
    var sql, structure;
    if (byId('exportResultShapePivot').checked){
      structure = 'pivot';
      sql = getDuckDbPivotSqlStatementForQueryModel(queryModel);
    }
    else
    if (byId('exportResultShapeTable').checked){
      structure = 'table';
      sql = getDuckDbTableSqlStatementForQueryModel(queryModel);
    }
      
    var selectedTab = TabUi.getSelectedTab('#exportDialog');
    var tabName = selectedTab.getAttribute('for');
    
    var mimeType, compression, includeHeaders,
        dateFormat, timestampFormat, nullValueString,
        columnDelimiter, quote, escape, rowDelimiter
    ;
    var fileExtension, data, copyStatementOptions;
    switch (tabName) {
      case 'exportDelimited':
        columnDelimiter = byId(tabName + 'ColumnDelimiter').value;
        nullValueString = byId(tabName + 'NullString').value;
        includeHeaders = byId(tabName + 'IncludeHeaders').checked;
        quote = byId(tabName + 'Quote').value;
        escape = byId(tabName + 'Escape').value;
        dateFormat = byId(tabName + 'DateFormat').value;
        timestampFormat = byId(tabName + 'TimestampFormat').value;
        compression = byId(tabName + 'Compression').value;
        copyStatementOptions = {
          "FORMAT": 'csv',
          "DELIMITER": `'${columnDelimiter.replace('\'', "''")}'`,
          "NULL": `'${nullValueString.replace('\'', "''")}'`,
          "HEADER": includeHeaders ? 'TRUE' : 'FALSE',
          "QUOTE": `'${quote.replace('\'', "''")}'`,
          "ESCAPE": `'${escape.replace('\'', "''")}'`,
          "DATEFORMAT": `'${dateFormat.replace('\'', "''")}'`,
          "TIMESTAMPFORMAT": `'${timestampFormat.replace('\'', "''")}'`,
          "COMPRESSION": `'${compression.replace('\'', "''")}'`,
          "ESCAPE": `'${escape.replace('\'', "''")}'`,
        };
        mimeType = 'text/csv';
        fileExtension = 'csv';
        break;
      case 'exportJson':
        compression = byId(tabName + 'Compression').value;
        dateFormat = byId(tabName + 'DateFormat').value;
        timestampFormat = byId(tabName + 'TimestampFormat').value;
        rowDelimiter = byId(tabName + 'RowDelimiter').value;
        copyStatementOptions = {
          "FORMAT": 'json',
          "DATEFORMAT": `'${dateFormat.replace('\'', "''")}'`,
          "TIMESTAMPFORMAT": `'${timestampFormat.replace('\'', "''")}'`,
          "COMPRESSION": `'${compression.replace('\'', "''")}'`,
          "ARRAY": rowDelimiter.toUpperCase()
        };
        mimeType = 'application/json';
        fileExtension = 'json';
        break;
      case 'exportParquet':
        compression = byId(tabName + 'Compression').value;
        copyStatementOptions = {
          "COMPRESSION": `'${compression.replace('\'', "''")}'`
        };
        mimeType = 'application/vnd.apache.parquet';
        fileExtension = 'parquet';
        break;
      case 'exportSql':
        mimeType = 'text/plain';
        data = sql;
        fileExtension = 'sql';
        break;
    }

    if (compression !== 'UNCOMPRESSED'){
      fileExtension += '.' + compression.toLowerCase();
    }
    
    if (copyStatementOptions){
      var tmpFileName = [crypto.randomUUID(), fileExtension].join('.');
      progressMessageElement.innerText = `Preparing copy to ${tmpFileName}`;
      var copyStatement = getCopyToStatement(sql, tmpFileName, copyStatementOptions);
      var datasource = queryModel.getDatasource();
      var connection, result;
      try {
        connection = datasource.createManagedConnection();
        result = await connection.query(copyStatement);
        progressMessageElement.innerText = `Extracting from ${tmpFileName}`;
        data = await connection.copyFileToBuffer(tmpFileName);
      }
      finally {
        if (data) {
          await connection.dropFile(tmpFileName);
        }
        if (connection){
          connection.destroy();
        }
      }
      
    }
    
    var destination;
    if (byId('exportDestinationFile').checked){
      destination = 'file';
    }
    else
    if (byId('exportDestinationClipboard').checked){
      destination = 'clipboard';
    }
    
    switch (destination){
      case 'file':
        var fileName = [title, fileExtension].join('.');      
        progressMessageElement.innerText = `Download as ${fileName}`;
        downloadBlob(data, fileName, mimeType);
        break;
      case 'clipboard':
        var text;
        if (typeof data === 'string'){
          text = data;
        }
        else {
          progressMessageElement.innerText = `Copying to clipboard..`;
          text = new TextDecoder('utf-8').decode(data);
        }
        await copyToClipboard(text, 'text/plain');
        break;
    }
    progressMessageElement.innerText = `Success!`;
  }
  catch (e){
    progressMessageElement.innerText = `Error!`;
    showErrorDialog(e);
  }
  finally {
    dom.setAttribute('aria-busy', String(false));
  }
}

function initExportUi(){
  byId('exportButton')
  .addEventListener('click', updateExportDialog);

  byId('exportDialogExecuteButton')
  .addEventListener('click', executeExport);
}
