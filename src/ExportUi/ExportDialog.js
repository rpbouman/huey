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
      var fieldName = unQuote(fieldRef, '${', '}');
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
  
  static #getSqlForExport(queryModel, options){
    var rowsAxisItems = queryModel.getRowsAxis().getItems();
    var columnsAxisItems = queryModel.getColumnsAxis().getItems();
    var cellsAxisItems = queryModel.getCellsAxis().getItems();
    var axisItems = [].concat(rowsAxisItems, columnsAxisItems, cellsAxisItems);
    var filterAxisItems = queryModel.getFiltersAxis().getItems();

    var opts = Object.assign({}, options, {
      datasource: queryModel.getDatasource(),
      queryAxisItems: axisItems, 
      filterAxisItems: filterAxisItems,
    });
    var sql = SqlQueryGenerator.getSqlSelectStatementForAxisItems(opts);
    return sql
  }

  static getSqlForTabularExport(queryModel, sqlOptions){
    var options = Object.assign({}, {
      sqlOptions: sqlOptions
    });
    var sql = ExportUi.#getSqlForExport(queryModel, options);
    return sql;
  }
  
  static getSqlForPivotExport(queryModel, sqlOptions){
    var columnsAxisItems = queryModel.getColumnsAxis().getItems();
    if (!columnsAxisItems.length) {
      return ExportUi.getSqlForTabularExport(queryModel, sqlOptions);
    }
    
    var options = Object.assign({}, {
      sqlOptions: sqlOptions || {},
      includeOrderBy: false,
      finalStateAsCte: true,
      cteName: '__huey_cells'
    });
    var sql = ExportUi.#getSqlForExport(queryModel, options);
    
    var columns = columnsAxisItems
    .map(function(queryAxisItem){
      var caption = QueryAxisItem.getCaptionForQueryAxisItem(queryAxisItem);
      return quoteIdentifierWhenRequired(caption);
    })
    .join(getComma(options.sqlOptions.commaStyle));
    
    var aggregates;
    var cellsAxisItems = queryModel.getCellsAxis().getItems();
    if (cellsAxisItems.length) {
      aggregates = cellsAxisItems
      .map(function(queryAxisItem){
        var caption = QueryAxisItem.getCaptionForQueryAxisItem(queryAxisItem);
        caption = quoteIdentifierWhenRequired(caption);
        return `FIRST( ${caption} ) AS ${caption}`;
      })
      .join(getComma(options.sqlOptions.commaStyle));
    }
    else {
      aggregates = `FIRST( NULL ) AS _`
    }

    var pivot = [
      `PIVOT (FROM "__huey_cells")`,
      `ON (${columns})`,
      `USING ${aggregates}`
    ].join('\n')
    
    var rowsAxisItems = queryModel.getRowsAxis().getItems();
    if (rowsAxisItems.length) {
      var orderBy = rowsAxisItems
      .map(function(queryAxisItem){
        var caption = QueryAxisItem.getCaptionForQueryAxisItem(queryAxisItem);
        return quoteIdentifierWhenRequired(caption);
      })
      .join(getComma(options.sqlOptions.commaStyle));
      pivot += `\nORDER BY ${orderBy}`;
    }

    sql += `\n${pivot}`;
    return sql;
  }

  static async exportData(queryModel, exportSettings, progressCallback){
    try {
      if (typeof progressCallback !== 'function'){
        progressCallback = function(text){
          console.log(text);
        };
      }
      progressCallback('initSettings');

      var title = exportSettings.exportTitle;
      var exportType = exportSettings.exportType;

      var mimeType, compression, includeHeaders,
          dateFormat, timestampFormat, nullValueString,
          columnDelimiter, quote, escape, rowDelimiter
      ;
      var fileExtension, data, copyStatementOptions, sqlOptions;
      switch (exportType) {
        case 'exportDelimited':
          columnDelimiter = exportSettings[exportType + 'ColumnDelimiter'];
          nullValueString = exportSettings[exportType + 'NullString'];
          includeHeaders = exportSettings[exportType + 'IncludeHeaders'];
          quote = exportSettings[exportType + 'Quote'];
          escape = exportSettings[exportType + 'Escape'];
          dateFormat = exportSettings[exportType + 'DateFormat'];
          timestampFormat = exportSettings[exportType + 'TimestampFormat'];
          compression = exportSettings[exportType + 'Compression'];

          copyStatementOptions = {
            "FORMAT": 'CSV',
            "DELIMITER": `'${columnDelimiter.replace('\'', "''")}'`,
            "NULL": `'${nullValueString.replace('\'', "''")}'`,
            "HEADER": includeHeaders ? 'TRUE' : 'FALSE',
            "QUOTE": `'${quote.replace('\'', "''")}'`,
            "ESCAPE": `'${escape.replace('\'', "''")}'`,
            "DATEFORMAT": `'${dateFormat.replace('\'', "''")}'`,
            "TIMESTAMPFORMAT": `'${timestampFormat.replace('\'', "''")}'`,
            "COMPRESSION": compression.value,
          };
          mimeType = 'text/csv';
          fileExtension = 'csv';
          break;
        case 'exportJson':
          compression = exportSettings[exportType + 'Compression'];
          dateFormat = exportSettings[exportType + 'DateFormat'];
          timestampFormat = exportSettings[exportType + 'TimestampFormat'];
          rowDelimiter = exportSettings[exportType + 'RowDelimiter'];
          copyStatementOptions = {
            "FORMAT": 'JSON',
            "DATEFORMAT": `'${dateFormat.replace('\'', "''")}'`,
            "TIMESTAMPFORMAT": `'${timestampFormat.replace('\'', "''")}'`,
            "COMPRESSION": compression.value,
            "ARRAY": rowDelimiter.value
          };
          mimeType = 'application/json';
          fileExtension = 'json';
          break;
        case 'exportParquet':
          compression = exportSettings[exportType + 'Compression'];
          copyStatementOptions = {
            "FORMAT": 'PARQUET',
            "COMPRESSION": compression.value,
          };
          mimeType = 'application/vnd.apache.parquet';
          fileExtension = 'parquet';
          break;
        case 'exportSql':
          sqlOptions = {
            keywordLettercase: exportSettings[exportType + 'KeywordLettercase'],
            alwaysQuoteIdentifiers: exportSettings[exportType + 'AlwaysQuoteIdentifiers'],
            commaStyle: exportSettings[exportType + 'CommaStyle']
          };
          mimeType = 'text/plain';
          fileExtension = 'sql';
          break;
      }

      var sql, structure;
      if (exportSettings.exportResultShapePivot){
        structure = 'pivot';
        sql = ExportUi.getSqlForPivotExport(queryModel, sqlOptions);
      }
      else
      if (exportSettings.exportResultShapeTable){
        structure = 'table';
        sql = ExportUi.getSqlForTabularExport(queryModel, sqlOptions);
      }

      if (sqlOptions) {
        sql = [
          `/*********************************`,
          `* DuckDB query generated by Huey`,
          `* ${new Date(Date.now())}`,
          `* https://github.com/rpbouman/huey`,
          `**********************************/`,
          sql
        ].join('\n');
        data = sql;
      }

      if (compression && compression.value !== 'UNCOMPRESSED'){
        if (exportType === 'exportParquet'){
          fileExtension = `${compression.value.toLowerCase()}.${fileExtension}`;
        }
        else {
          switch (compression.value){
            case 'GZIP':
              mimeType = 'application/gzip';
              break;
            case 'ZTSD':
              mimeType = 'application/ztsd';
              break;
            default:
              mimeType = 'application/octet-stream';
          }
          fileExtension += `.${compression.value.toLowerCase()}`;
        }
      }

      if (copyStatementOptions){
        var tmpFileName = [crypto.randomUUID(), fileExtension].join('.');
        progressCallback(`Preparing copy to ${tmpFileName}`);
        var copyStatement = getCopyToStatement(sql, tmpFileName, copyStatementOptions);
        var datasource = queryModel.getDatasource();
        var connection, result;
        try {
          connection = datasource.getManagedConnection();
          result = await connection.query(copyStatement);
          progressCallback(`Extracting from ${tmpFileName}`);
          data = await connection.copyFileToBuffer(tmpFileName);
        }
        finally {
          if (data) {
            await connection.dropFile(tmpFileName);
          }
        }
      }

      var destination;
      if (exportSettings.exportDestinationFile){
        destination = 'file';
      }
      else
      if (exportSettings.exportDestinationClipboard){
        destination = 'clipboard';
      }

      switch (destination){
        case 'file':
          var fileName = [exportSettings.exportTitle, fileExtension].join('.');
          fileName = fileName.replace(/\"/g, "'");
          progressCallback(`Download as ${fileName}`);
          ExportUi.downloadBlob(data, fileName, mimeType);
          break;
        case 'clipboard':
          var text;
          if (typeof data === 'string'){
            text = data;
          }
          else {
            progressCallback(`Copying to clipboard..`);
            text = new TextDecoder('utf-8').decode(data);
          }
          await copyToClipboard(text, 'text/plain');
          break;
      }
      progressCallback(`Success!`);
    }
    catch (e){
      progressCallback(`Error!`);
      showErrorDialog(e);
    }
    finally {
    }
  }

  static async exportAxisData(queryModel, axisId, exportSettings, progressCallback){
    var state = queryModel.getState();
    var newAxes = {};
    newAxes[QueryModel.AXIS_FILTERS] = state.axes[QueryModel.AXIS_FILTERS];
    newAxes[axisId] = state.axes[axisId];
    state.axes = newAxes;
    
    var exportQueryModel = new QueryModel();
    await exportQueryModel.setState(state);

    await ExportUi.exportData(exportQueryModel, exportSettings, progressCallback);
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
    try {
      var dialog = this.#getDialog();
      dialog.setAttribute('aria-busy', String(true));

      var progressMessageElement = dialog.querySelector('*[role=progressbar] *[role=status]');
      var progressCallback = function(text){
        progressMessageElement.innerText = text;
      }
      progressCallback('Preparing export...');

      var settings = this.#settings;
      var exportSettings = settings.getSettings('exportUi');

      exportSettings.exportTitle = byId('exportTitle').innerText;
      var tabName = TabUi.getSelectedTab('#exportDialog').getAttribute('for');

      function copyUiSetting(setting, exportTypePrefix){
        exportTypePrefix = exportTypePrefix || '';
        var typeOfSetting = typeof setting;
        switch (typeOfSetting) {
          case 'string':
            var id = exportTypePrefix + setting;
            var control = byId(id);
            var valueProperty;
            switch (control.type){
              case 'radio':
              case 'checkbox':
                valueProperty = 'checked';
                break;
              case 'input':
              default:
                valueProperty = 'value';
            }
            var value = control[valueProperty];
            exportSettings[id] = control.tagName === 'SELECT' ? {value: value} : value;
            return;
          case 'object':
            if (setting instanceof Array) {
              break;
            }
          default:
            throw new Error(`Wrong type for setting "${setting}": should be string or array of strings, not "${typeOfSetting}".`);
        }
        setting.forEach(function(setting){
          copyUiSetting(setting, exportTypePrefix);
        });
      }

      exportSettings.exportType = tabName;

      var mimeType, compression, includeHeaders,
          dateFormat, timestampFormat, nullValueString,
          columnDelimiter, quote, escape, rowDelimiter
      ;
      var fileExtension, data, copyStatementOptions, sqlOptions;
      switch (tabName) {
        case 'exportDelimited':
          copyUiSetting([
            'ColumnDelimiter',
            'NullString',
            'IncludeHeaders',
            'Quote',
            'Escape',
            'DateFormat',
            'TimestampFormat',
            'Compression'
          ], tabName);
          break;
        case 'exportJson':
          copyUiSetting([
            'DateFormat',
            'TimestampFormat',
            'RowDelimiter',
            'Compression'
          ], tabName);
          break;
        case 'exportParquet':
          copyUiSetting([
            'Compression'
          ], tabName);
          break;
        case 'exportSql':
          copyUiSetting([
            'KeywordLettercase',
            'AlwaysQuoteIdentifiers',
            'CommaStyle'
          ], tabName);
          break;
      }
      copyUiSetting([
        'exportResultShapePivot',
        'exportResultShapeTable',
        'exportDestinationFile',
        'exportDestinationClipboard',
      ]);

      var queryModel = this.#queryModel;
      await ExportUi.exportData(queryModel, exportSettings, progressCallback);

      exportSettings = settings.getSettings('exportUi');
      Settings.synchronize(dialog, {"_": exportSettings}, 'settings');
      this.#settings.assignSettings('exportUi', exportSettings);
    }
    catch (e){
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
}
