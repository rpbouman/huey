class ExportUi {

  static downloadURL(url, fileName) {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.style = 'display: none';
    a.click();
    a.remove();
  }

  static downloadBlob(data, fileName, mimeType, timeout) {
    const blob = new Blob(
      [data]
    , {type: mimeType}
    );
    const url = window.URL.createObjectURL(blob);
    ExportUi.downloadURL(url, fileName);
    timeout = timeout === undefined ? 1000 : timeout;
    setTimeout( () => window.URL.revokeObjectURL(url), timeout);
  }

  static #exportTitleFields = {
    'datasource': function(queryModel){
      if (!queryModel) {
        queryModel = window.queryModel;
      }
      const datasource = queryModel.getDatasource();
      if (!datasource) {
        return '<no datasource>';
      }
      const caption = DataSourcesUi.getCaptionForDatasource(datasource);
      return caption;
    },
    'columns-items': function(queryModel){
      if (!queryModel) {
        queryModel = window.queryModel;
      }
      const caption = queryModel.getCaptionForQueryAxis(QueryModel.AXIS_COLUMNS);
      return caption;
    },
    'rows-items': function(queryModel){
      if (!queryModel) {
        queryModel = window.queryModel;
      }
      const caption = queryModel.getCaptionForQueryAxis(QueryModel.AXIS_ROWS);
      return caption;
    },
    'cells-items': function(queryModel){
      if (!queryModel) {
        queryModel = window.queryModel;
      }
      const caption = queryModel.getCaptionForQueryAxis(QueryModel.AXIS_CELLS);
      return caption;
    },
    'filters-items': function(queryModel){
      if (!queryModel) {
        queryModel = window.queryModel;
      }
      const caption = queryModel.getCaptionForQueryAxis(QueryModel.AXIS_FILTERS);
      return caption;
    },
    'utc-timestamp': function(queryModel){
      return (new Date(Date.now())).toISOString().split('.')[0];
    },
    'timestamp': function(queryModel){
      const date = new Date();

      function padDigit(digit) {
        return String(digit).padStart(2, '0');
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
      const exportTemplate = byId('exportTitleTemplate')
      titleTemplate = exportTemplate.value;
    }
    const replacedTemplate = titleTemplate.replace(/\$\{[^\}]+\}/g, fieldRef => {
      const fieldName = unQuote(fieldRef, '${', '}');
      const func = ExportUi.#exportTitleFields[fieldName];
      return typeof func === 'function' ? func(queryModel) : fieldRef;
    });
    return replacedTemplate;
  }
  
  static #getSqlForExport(queryModel, options){
    const rowsAxisItems = queryModel.getRowsAxis().getItems();
    const columnsAxisItems = queryModel.getColumnsAxis().getItems();
    const cellsAxisItems = queryModel.getCellsAxis().getItems();
    const axisItems = [].concat(rowsAxisItems, columnsAxisItems, cellsAxisItems);
    const filterAxisItems = queryModel.getFiltersAxis().getItems();

    const datasource = queryModel.getDatasource();
    const opts = Object.assign({}, options, {
      datasource: datasource,
      queryAxisItems: axisItems, 
      filterAxisItems: filterAxisItems,
    });
    const sql = SqlQueryGenerator.getSqlSelectStatementForAxisItems(opts);
    return sql
  }

  static getSqlForTabularExport(queryModel, sqlOptions){
    const options = Object.assign({}, {
      sqlOptions: sqlOptions
    });
    const sql = ExportUi.#getSqlForExport(queryModel, options);
    return sql;
  }
  
  static getSqlForPivotExport(queryModel, sqlOptions){
    const columnsAxisItems = queryModel.getColumnsAxis().getItems();
    if (!columnsAxisItems.length) {
      return ExportUi.getSqlForTabularExport(queryModel, sqlOptions);
    }
    
    const options = Object.assign({}, {
      sqlOptions: sqlOptions || {},
      includeOrderBy: false,
      finalStateAsCte: true,
      cteName: '__huey_cells'
    });
    let sql = ExportUi.#getSqlForExport(queryModel, options);
    
    const columns = columnsAxisItems
    .map(function(queryAxisItem){
      const caption = QueryAxisItem.getCaptionForQueryAxisItem(queryAxisItem);
      return quoteIdentifierWhenRequired(caption);
    })
    .join(getComma(options.sqlOptions.commaStyle));
    
    let aggregates;
    const cellsAxisItems = queryModel.getCellsAxis().getItems();
    if (cellsAxisItems.length) {
      aggregates = cellsAxisItems
      .map(queryAxisItem => {
        let caption = QueryAxisItem.getCaptionForQueryAxisItem(queryAxisItem);
        caption = quoteIdentifierWhenRequired(caption);
        return `FIRST( ${caption} ) AS ${caption}`;
      })
      .join(getComma(options.sqlOptions.commaStyle));
    }
    else {
      aggregates = `FIRST( NULL ) AS _`
    }

    let pivot = [
      `PIVOT (FROM "__huey_cells")`,
      `ON (${columns})`,
      `USING ${aggregates}`
    ].join('\n')
    
    const rowsAxisItems = queryModel.getRowsAxis().getItems();
    if (rowsAxisItems.length) {
      const orderBy = rowsAxisItems
      .map(queryAxisItem => {
        caption = QueryAxisItem.getCaptionForQueryAxisItem(queryAxisItem);
        return quoteIdentifierWhenRequired(caption);
      })
      .join(getComma(options.sqlOptions.commaStyle));
      pivot += `\nORDER BY ${orderBy}`;
    }

    sql += `\n${pivot}`;
    return sql;
  }
  
  static getExportSqlForQueryModel(queryModel, exportSettings, exportType){
    
    const sqlOptions = {
      keywordLettercase: exportSettings[exportType + 'KeywordLettercase'],
      alwaysQuoteIdentifiers: exportSettings[exportType + 'AlwaysQuoteIdentifiers'],
      commaStyle: exportSettings[exportType + 'CommaStyle']
    };

    let sql, structure;
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
        `/***********************************`,
        `* DuckDB query generated by Huey`,
        `* ${(new Date(Date.now())).toISOString()}`,
        `* https://github.com/rpbouman/huey`,
        `***********************************/`,
        sql
      ].join('\n');
    }

    return sql;
  }

  static async exportDataForQueryModel(queryModel, exportSettings, progressCallback){
    const sql = ExportUi.getExportSqlForQueryModel(queryModel, exportSettings);
    const datasource = queryModel.getDatasource();
    return ExportUi.exportData(datasource, sql, exportSettings, progressCallback);
  }

  static async exportData(datasource, sql, exportSettings, progressCallback){
    try {
      if (typeof progressCallback !== 'function'){
        progressCallback = function(text){
          console.log(text);
        };
      }
      progressCallback('initSettings');

      const exportType = exportSettings.exportType;

      let mimeType, compression, includeHeaders,
          dateFormat, timestampFormat, nullValueString,
          columnDelimiter, quote, escape, rowDelimiter
      ;
      let fileExtension, data, copyStatementOptions;
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
          if (columnDelimiter === '\\t') {
            fileExtension = 'tsv';
          }
          else {
            fileExtension = 'csv';
          }
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
          fileExtension = 'json';
          break;
        case 'exportParquet':
          compression = exportSettings[exportType + 'Compression'];
          var parquetVersion = exportSettings[exportType + 'Version'];
          copyStatementOptions = {
            "FORMAT": 'PARQUET',
            "ROW_GROUP_SIZE": exportSettings['exportParquetRowGroupSize'],
            //this option requires preserve_insertion_order to be disabled.
            //"ROW_GROUP_SIZE_BYTES": exportSettings['exportParquetRowGroupSizeBytes'],
            "COMPRESSION": compression.value,
            "PARQUET_VERSION": parquetVersion.value
          };
          if (compression.value === 'ZSTD') {
            var compressionLevel = exportSettings[exportType + 'CompressionLevel'];
            copyStatementOptions['COMPRESSION_LEVEL'] = compressionLevel;
          }
          fileExtension = 'parquet';
          break;
        case 'exportSql':
          mimeType = 'text/plain';
          fileExtension = 'sql';
          data = sql;
          break;
        case 'exportXlsx':
          fileExtension = 'xlsx';
          copyStatementOptions = {
            "FORMAT": '\'xlsx\'',
            "HEADER": `${Boolean(exportSettings.exportXlsxIncludeHeaders)}`,
            "SHEET_ROW_LIMIT": exportSettings.exportXlsxSheetRowLimit,
          };
          let sheetName = (exportSettings.exportXlsxSheet || '').trim();
          if ( sheetName.length ) {
            sheetName = quoteStringLiteral(sheetName);
            copyStatementOptions["SHEET"] = sheetName;
          }
          break;
        case 'exportQuery':
          const encodingSettings = exportSettings[exportType + 'Encoding'];
          const encodingOption = encodingSettings.value;
          const indent = exportSettings[exportType + 'Indentation'];
          data = {
            queryModel: queryModel.getState()
          };
          data = JSON.stringify(data, null, indent);
          switch  (encodingOption) {
            case 'HASH':
              data = encodeURIComponent( data );
              data = btoa( data );
              data = '#' + data;
              fileExtension = 'hueyqh';
              mimeType = 'text/plain';
              break;
            case 'JSON':
              fileExtension = 'hueyq';
              mimeType = 'application/json';
              break;
            default:
          }
          break;
        default:
          console.error(`Don't know how to handle export type "${exportType}".`);
      }

      const fileTypeInfo = DuckDbDataSource.getFileTypeInfo(fileExtension);
      if (fileTypeInfo) {
        if (!mimeType){
          mimeType = fileTypeInfo.mimeType;
        }
        if (fileTypeInfo.duckdb_extension){
          await ensureDuckDbExtensionLoadedAndInstalled(
            fileTypeInfo.duckdb_extension, 
            fileTypeInfo.duckdb_extension_repository
          );
        }
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
            case 'ZSTD':
              mimeType = 'application/zstd';
              break;
            default:
              mimeType = 'application/octet-stream';
          }
          fileExtension += `.${compression.value.toLowerCase()}`;
        }
      }

      if (copyStatementOptions){
        const tmpFileName = [crypto.randomUUID(), fileExtension].join('.');
        progressCallback(`Preparing copy to ${tmpFileName}`);
        const copyStatement = getCopyToStatement(sql, tmpFileName, copyStatementOptions);
        let connection;
        try {
          connection = datasource.getManagedConnection();
          const result = await connection.query(copyStatement);
          progressCallback(`Extracting from ${tmpFileName}`);
          data = await connection.copyFileToBuffer(tmpFileName);
          
          // fix for https://github.com/rpbouman/huey/issues/627
          // for some reason, we get the buffer back with a leading byte.
          // It does not appear to be the same byte
          if (fileExtension === 'xlsx' && data.length >= 3 && data[1] === 'P'.charCodeAt(0) && data[2] === 'K'.charCodeAt(0)){
            console.warn(`Corrupt excel file! First byte was ${data[0]} - slicing from position 1.`);
            data  = data.slice(1);
          }
        }
        finally {
          if (data) {
            await connection.dropFile(tmpFileName);
          }
        }
      }

      let destination;
      if (exportSettings.exportDestinationFile){
        destination = 'file';
      }
      else
      if (exportSettings.exportDestinationClipboard){
        destination = 'clipboard';
      }

      switch (destination){
        case 'file':
          let fileName = [exportSettings.exportTitle, fileExtension].join('.');
          fileName = fileName.replace(/\"/g, "'");
          progressCallback(`Download as ${fileName}`);
          ExportUi.downloadBlob(data, fileName, mimeType);
          break;
        case 'clipboard':
          let text;
          if (typeof data === 'string'){
            text = data;
          }
          else {
            progressCallback(`Copying to clipboard..`);
            text = new TextDecoder('utf-8').decode(data);
          }
          await copyToClipboard(text, mimeType);
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
    const state = queryModel.getState();
    const newAxes = {};
    newAxes[QueryModel.AXIS_FILTERS] = state.axes[QueryModel.AXIS_FILTERS];
    newAxes[axisId] = state.axes[axisId];
    state.axes = newAxes;
    
    const exportQueryModel = new QueryModel();
    await exportQueryModel.setState(state);

    await ExportUi.exportDataForQueryModel(exportQueryModel, exportSettings, progressCallback);
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
    byId('exportDialogCloseButton').addEventListener('click', event => this.close( event ) );
    byId('exportDialogExecuteButton').addEventListener('click', event => this.#executeExport( event ) );

    const exportTitleTemplate = byId('exportTitleTemplate');
    exportTitleTemplate.addEventListener('change', event => this.#titleTemplateChangedHandler( event ) );
    exportTitleTemplate.addEventListener('input', event => this.#titleTemplateChangedHandler( event ) );

  }

  #titleTemplateChangedHandler(event){
    const exportTitleTemplate = byId('exportTitleTemplate');
    this.#settings.assignSettings(['exportUi', 'exportTitleTemplate'], exportTitleTemplate.value);
    this.#updateExportTitle();
  }

  #updateExportTitle(){
    const queryModel = this.#queryModel;
    const exportTemplate = byId('exportTitleTemplate')
    const titleTemplate = exportTemplate.value;

    const title = ExportUi.generateExportTitle(queryModel, titleTemplate);
    byId('exportTitle').textContent = title;
  }

  #updateDialog(){
    const dialog = this.#getDialog();
    const settings = this.#settings;

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
    const dialog = this.#getDialog();
    dialog.showModal();
  }

  close(){
    const dialog = this.#getDialog();
    dialog.close();
  }

  async #executeExport(){
    const dialog = this.#getDialog();
    try {
      dialog.setAttribute('aria-busy', String(true));

      const settings = this.#settings;
      const exportSettings = settings.getSettings('exportUi');
      Settings.synchronize(dialog, {"_": exportSettings}, 'settings');
      this.#settings.assignSettings('exportUi', exportSettings);
      
      const progressMessageElement = dialog.querySelector('*[role=progressbar] *[role=status]');
      const progressCallback = function(text){
        progressMessageElement.textContent = text;
      }
      progressCallback('Preparing export...');


      exportSettings.exportTitle = byId('exportTitle').textContent;
      const tabName = TabUi.getSelectedTab('#exportDialog').getAttribute('for');

      function copyUiSetting(setting, exportTypePrefix){
        exportTypePrefix = exportTypePrefix || '';
        const typeOfSetting = typeof setting;
        switch (typeOfSetting) {
          case 'string':
            const id = exportTypePrefix + setting;
            const control = byId(id);
            let valueProperty;
            switch (control.type){
              case 'radio':
              case 'checkbox':
                valueProperty = 'checked';
                break;
              case 'input':
              default:
                valueProperty = 'value';
            }
            const value = control[valueProperty];
            exportSettings[id] = control.tagName === 'SELECT' ? {value: value} : value;
            return;
          case 'object':
            if (setting instanceof Array) {
              break;
            }
          default:
            throw new Error(`Wrong type for setting "${setting}": should be string or array of strings, not "${typeOfSetting}".`);
        }
        setting.forEach(setting => {
          copyUiSetting(setting, exportTypePrefix);
        });
      }

      exportSettings.exportType = tabName;

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

      const queryModel = this.#queryModel;
      await ExportUi.exportDataForQueryModel(queryModel, exportSettings, progressCallback);

    }
    catch (e){
      showErrorDialog(e);
    }
    finally {
      dialog.setAttribute('aria-busy', String(false));
    }
  }

}

let exportDialog;
function initExportDialog(){
  exportDialog = new ExportDialog();

  const exportButton = byId('exportButton');

  exportButton.addEventListener('click', function(event){
    exportDialog.open({
      queryModel: queryModel,
      settings: settings
    });
  });

  const exportTitleTemplate = byId('exportTitleTemplate');
  function titleTemplateChanged(){
    settings.assignSettings(['exportUi', 'exportTitleTemplate'], exportTitleTemplate.value);
    updateExportTitle();
  }
}
