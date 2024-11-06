class ExportUi {
  
  static downloadURL(url, fileName) {
    var a;
    a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.style = 'display: none';
    a.click();
    a.remove();
  }
  
  static downloadBlob(data, fileName, mimeType, timeout) {
    var blob, url;
    blob = new Blob(
      [data]
    , {type: mimeType}
    );
    url = window.URL.createObjectURL(blob);
    ExportUi.downloadURL(url, fileName);
    timeout = timeout === undefined ? 100 : timeout;
    setTimeout(function() {
      return window.URL.revokeObjectURL(url);
    }, 1000);
  }

  static #exportTitleFields = {
    'datasource': function(queryModel){
      if (!queryModel) {
        queryModel = window.queryModel;
      }
      var datasource = queryModel.getDatasource();
      if (!datasource) {
        return '<no datasource>';
      }
      var caption = DataSourcesUi.getCaptionForDatasource(datasource);
      return caption;
    },
    'columns-items': function(queryModel){
      if (!queryModel) {
        queryModel = window.queryModel;
      }
      var caption = queryModel.getCaptionForQueryAxis(QueryModel.AXIS_COLUMNS);
      return caption;
    },
    'rows-items': function(queryModel){
      if (!queryModel) {
        queryModel = window.queryModel;
      }
      var caption = queryModel.getCaptionForQueryAxis(QueryModel.AXIS_ROWS);
      return caption;
    },
    'cells-items': function(queryModel){
      if (!queryModel) {
        queryModel = window.queryModel;
      }
      var caption = queryModel.getCaptionForQueryAxis(QueryModel.AXIS_CELLS);
      return caption;
    },
    'filters-items': function(queryModel){
      if (!queryModel) {
        queryModel = window.queryModel;
      }
      var caption = queryModel.getCaptionForQueryAxis(QueryModel.AXIS_FILTERS);
      return caption;
    },
    'utc-timestamp': function(queryModel){
      return (new Date(Date.now())).toISOString().split('.')[0];
    },
    'timestamp': function(queryModel){
      var date = new Date();
      
      function padDigit(digit) {
        return digit < 10 ? '0' + digit : digit;
      }
      
      return [
        date.getFullYear()
      , padDigit(date.getMonth() + 1)
      , padDigit(date.getDate())
      ].join('-') + 
      'T'+ [
        padDigit(date.getHours())
      , padDigit(date.getMinutes())
      , padDigit(date.getSeconds())
      ].join(':')
    }
  }
  
  static generateExportTitle(queryModel, titleTemplate){
    if (queryModel === undefined) {
      queryModel = window.queryModel;
    }
    if (titleTemplate === undefined){
      var exportTemplate = byId('exportTitleTemplate')
      titleTemplate = exportTemplate.value;
    }
    var replacedTemplate = titleTemplate.replace(/\$\{[^\}]+\}/g, function(fieldRef){
      // fieldnames are denoted as ${fieldName}, slice(2, -1) gets onlye the name
      var fieldName = fieldRef.slice(2, -1);
      var func = ExportUi.#exportTitleFields[fieldName];
      if (typeof func === 'function'){
        return func(queryModel); 
      }
      else {
        return fieldRef;
      }
    });
    return replacedTemplate;
  }
}

class ExportDialog {
  
  static #id = 'exportDialog';
  
  #queryModel = undefined;
  #settings = undefined;
  
  constructor(){
    this.#initExportDialog();
  }
  
  #initExportDialog(){
    byId('exportDialogCloseButton')
    .addEventListener('click', this.close.bind(this));
    
    byId('exportDialogExecuteButton')
    .addEventListener('click', this.#executeExport.bind(this));
    
    var exportTitleTemplate = byId('exportTitleTemplate');
    exportTitleTemplate.addEventListener('change', this.#titleTemplateChangedHandler.bind(this));
    exportTitleTemplate.addEventListener('input', this.#titleTemplateChangedHandler.bind(this));
    
  }
  
  #titleTemplateChangedHandler(event){
    var exportTitleTemplate = byId('exportTitleTemplate');
    this.#settings.assignSettings(['exportUi', 'exportTitleTemplate'], exportTitleTemplate.value);
    this.#updateExportTitle();
  }

  #updateExportTitle(){
    var queryModel = this.#queryModel;
    var exportTemplate = byId('exportTitleTemplate')
    var titleTemplate = exportTemplate.value;
    
    var title = ExportUi.generateExportTitle(queryModel, titleTemplate);
    byId('exportTitle').innerText = title;
  }
  
  #updateDialog(){
    var dialog = this.#getDialog();
    var settings = this.#settings;
    
    Settings.synchronize(
      dialog, 
      {"_": settings.getSettings('exportUi')}, 
      'dialog'
    );
    this.#updateExportTitle();    
  }

  #getDialog(){
    return byId(ExportDialog.#id);
  }
  
  open(config){
    this.#queryModel = config.queryModel || queryModel;
    this.#settings = config.settings || settings;
    this.#updateDialog();
    var dialog = this.#getDialog();
    dialog.showModal();
  }
  
  close(){
    var dialog = this.#getDialog();
    dialog.close();
  }
  
  async #executeExport(){
    var dialog = this.#getDialog();
    dialog.setAttribute('aria-busy', String(true));

    var queryModel = this.#queryModel;
    var settings = this.#settings;

    var progressMessageElement = dialog.querySelector('*[role=progressbar] *[role=status]');
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
        if (tabName === 'exportParquet'){
          fileExtension = `${compression.toLowerCase()}.${fileExtension}`;
        }
        else {
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
          fileExtension += `.${compression.toLowerCase()}`;
        }
      }
      
      if (copyStatementOptions){
        var tmpFileName = [crypto.randomUUID(), fileExtension].join('.');
        progressMessageElement.innerText = `Preparing copy to ${tmpFileName}`;
        var copyStatement = getCopyToStatement(sql, tmpFileName, copyStatementOptions);
        var datasource = queryModel.getDatasource();
        var connection, result;
        try {
          connection = datasource.getManagedConnection();
          result = await connection.query(copyStatement);
          progressMessageElement.innerText = `Extracting from ${tmpFileName}`;
          data = await connection.copyFileToBuffer(tmpFileName);
        }
        finally {
          if (data) {
            await connection.dropFile(tmpFileName);
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
          ExportUi.downloadBlob(data, fileName, mimeType);
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
      Settings.synchronize(dialog, {"_": exportSettings}, 'settings');
      this.#settings.assignSettings('exportUi', exportSettings);
    }
    catch (e){
      progressMessageElement.innerText = `Error!`;
      showErrorDialog(e);
    }
    finally {
      dialog.setAttribute('aria-busy', String(false));
    }
  }  
}

var exportDialog;
function initExportDialog(){
  exportDialog = new ExportDialog();
  
  var exportButton = byId('exportButton');
  
  exportButton.addEventListener('click', function(event){
    exportDialog.open({
      queryModel: queryModel,
      settings: settings
    });
  });

  var exportTitleTemplate = byId('exportTitleTemplate');
  function titleTemplateChanged(){
    settings.assignSettings(['exportUi', 'exportTitleTemplate'], exportTitleTemplate.value);
    updateExportTitle();
  }
    
  queryModel.addEventListener('change', function(event){

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
    var exportButtonParent = exportButton.parentNode;
    exportButtonParent.style.visibility = exportUiActive ? '' : 'hidden';
    if (!exportUiActive){
      exportDialog.close();
    }
  });
  
}
