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

function downloadURL(url, fileName) {
  var a;
  a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.style = 'display: none';
  a.click();
  a.remove();
};

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

function updateExportTitle(){
  var title = generateExportDialogTitle();
  byId('exportTitle').innerText = title;
}

function updateExportDialog(){
  updateExportTitle();
  Settings.synchronize(byId('exportDialog'), {"_": settings.getSettings('exportUi')}, 'dialog');
}

async function executeExport(){
  var dom = byId('exportDialog');
  dom.setAttribute('aria-busy', String(true));
  var progressMessageElement = dom.querySelector('*[role=progressbar] *[role=status]');
  progressMessageElement.innerText = 'Preparing export...';
  try {
    var title = byId('exportTitle').innerText;
          
    var selectedTab = TabUi.getSelectedTab('#exportDialog');
    var tabName = selectedTab.getAttribute('for');
    
    var mimeType, compression, includeHeaders,
        dateFormat, timestampFormat, nullValueString,
        columnDelimiter, quote, escape, rowDelimiter
    ;
    var fileExtension, data, copyStatementOptions, sqlOptions;
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
          "FORMAT": 'CSV',
          "DELIMITER": `'${columnDelimiter.replace('\'', "''")}'`,
          "NULL": `'${nullValueString.replace('\'', "''")}'`,
          "HEADER": includeHeaders ? 'TRUE' : 'FALSE',
          "QUOTE": `'${quote.replace('\'', "''")}'`,
          "ESCAPE": `'${escape.replace('\'', "''")}'`,
          "DATEFORMAT": `'${dateFormat.replace('\'', "''")}'`,
          "TIMESTAMPFORMAT": `'${timestampFormat.replace('\'', "''")}'`,
          "COMPRESSION": compression,
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
          "FORMAT": 'JSON',
          "DATEFORMAT": `'${dateFormat.replace('\'', "''")}'`,
          "TIMESTAMPFORMAT": `'${timestampFormat.replace('\'', "''")}'`,
          "COMPRESSION": compression,
          "ARRAY": rowDelimiter.toUpperCase()
        };
        mimeType = 'application/json';
        fileExtension = 'json';
        break;
      case 'exportParquet':
        compression = byId(tabName + 'Compression').value;
        copyStatementOptions = {
          "FORMAT": 'PARQUET',
          "COMPRESSION": compression,
        };
        mimeType = 'application/vnd.apache.parquet';
        fileExtension = 'parquet';
        break;
      case 'exportSql':
        sqlOptions = {};
        mimeType = 'text/plain';
        var keywordLetterCase = byId(tabName + 'KeywordLettercase').value;
        sqlOptions.keywordLetterCase = keywordLetterCase;
        var alwaysQuoteIdentifiers = byId(tabName + 'AlwaysQuoteIdentifiers').checked;
        sqlOptions.alwaysQuoteIdentifiers = alwaysQuoteIdentifiers;
        var commaStyle = byId(tabName + 'CommaStyle').value;
        sqlOptions.commaStyle = commaStyle;
        fileExtension = 'sql';        
        break;
    }

    var sql, structure;
    if (byId('exportResultShapePivot').checked){
      structure = 'pivot';
      sql = getDuckDbPivotSqlStatementForQueryModel(queryModel, sqlOptions);
    }
    else
    if (byId('exportResultShapeTable').checked){
      structure = 'table';
      sql = getDuckDbTableSqlStatementForQueryModel(queryModel, sqlOptions);
    }
    
    if (sqlOptions) {
      data = sql;
    }

    if (compression && compression !== 'UNCOMPRESSED'){
      if (tabName !== 'exportParquet'){
        switch (compression){
          case 'GZIP':  
            mimeType = 'application/gzip';
            break;
          case 'ZTSD':  
            mimeType = 'application/ztsd';
            break;
          default:
            mimeType = 'application/octet-stream';
        }
      }
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
    var exportSettings = settings.getSettings('exportUi');
    Settings.synchronize(byId('exportDialog'), {"_": exportSettings}, 'settings');
    settings.assignSettings('exportUi', exportSettings);
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


  var exportTitleTemplate = byId('exportTitleTemplate');
  function titleTemplateChanged(){
    settings.assignSettings(['exportUi', 'exportTitleTemplate'], exportTitleTemplate.value);
    updateExportTitle();
  }
  
  exportTitleTemplate.addEventListener('change', titleTemplateChanged);
  exportTitleTemplate.addEventListener('input', titleTemplateChanged);
  
  queryModel.addEventListener('change', function(event){
    var eventData = event.eventData;
    if (eventData.propertiesChanged) {
      if (eventData.propertiesChanged.datasource) {
        var currentDatasourceCaption;
        var datasource = eventData.propertiesChanged.datasource.newValue;
        if (datasource) {
          currentDatasourceCaption = DataSourcesUi.getCaptionForDatasource(datasource);
        }
        else {
          currentDatasourceCaption = '';
        }
        byId('currentDatasource').innerHTML = currentDatasourceCaption;
      }
    }

    var exportUiActive;
    if (
      queryModel.getColumnsAxis().getItems().length === 0 &&
      queryModel.getRowsAxis().getItems().length === 0 &&
      queryModel.getCellsAxis().getItems().length === 0
    ){
      exportUiActive = false;
    }
    else {
      exportUiActive = true;
    }
    var exportButton = byId('exportButton').parentNode;
    exportButton.style.visibility = exportUiActive ? '' : 'hidden';
    if (!exportUiActive){
      byId('exportDialog').close();
    }

    var title = generateExportDialogTitle();
    document.title = 'Huey - ' + title;
  });
  
}
