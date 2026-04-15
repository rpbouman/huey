class RejectsDatasource extends DuckDbDataSource {

  #delegateDatasource = undefined;

  constructor(){
    const hueyDb = window.hueyDb;
    const duckdb = hueyDb.duckdb;
    const instance = hueyDb.instance;
    super(duckdb, instance, {
      type: DuckDbDataSource.types.SQLQUERY,
      sql: 'SELECT 1'
    });
  }

  setDelegateDatasource(datasource){
    this.#delegateDatasource = datasource;
    const sql = datasource.getRejectsSql();
    this.setSqlQuery(sql);
  }

  getManagedConnection(){
    const delegateDatasource = this.#delegateDatasource;
    const managedConnection = delegateDatasource.getManagedConnection();
    return managedConnection;
  }

  getId(){
    const delegateDatasource = this.#delegateDatasource;
    const delegateDatasourceId = delegateDatasource.getId();
    const id = `Rejects of ${delegateDatasourceId}`;
    return id;
  }

}

class DatasourceSettingsDialog extends SettingsDialogBase {

  static #id = 'datasourceSettingsDialog';
  static #tabListSelector = `#${DatasourceSettingsDialog.#id} > *[role=tablist]`;


  #datasource = undefined;

  #columnsTabDatasource = undefined;
  #columnsTabQueryModel = undefined;
  #columnsTabPivotTableUi = undefined;

  #rejectsDatasource = undefined;
  #rejectsTabQueryModel = undefined;
  #rejectsTabPivotTableUi = undefined;

  static #fileSizeFormatter = new Intl.NumberFormat();
  
  static #formatFileSize(fileSize){
    return DatasourceSettingsDialog.#fileSizeFormatter.format(fileSize);
  }

  constructor(){
    super({
      id: DatasourceSettingsDialog.#id
    });
    this.#initDatasourceSettingsDialog();
  }

  #initDatasourceSettingsDialog(){
    this.#initCsvReaderOptionsTab();
    this.#initColumnsTab();
    this.#initRejectsTab();
  }

  async #autodetectCsvReaderSettings(event){
    const datasource = this.#datasource;
    if (datasource.getType() !== DuckDbDataSource.types.FILE){
      throw new Error(`Datasource is not of type ${DuckDbDataSource.types.FILE}`);
    }
    const fileType = datasource.getFileType();
    const fileTypeInfo = DuckDbDataSource.getFileTypeInfo(fileType);
    if (fileTypeInfo.duckdb_reader !== 'read_csv'){
      throw new Error(`Datasource is not a CSV file`);
    }

    const datasourceSettings = datasource.getSettings();
    const csvReaderArguments = datasourceSettings.getReaderArguments('csvReader');
    //csvReaderArguments['ignore_errors'] = true;
    let csvReaderArgumentsSql = DatasourceSettings.getReaderArgumentsSql(csvReaderArguments);
    if (csvReaderArgumentsSql && csvReaderArgumentsSql.length) {
      csvReaderArgumentsSql = `, ${csvReaderArgumentsSql}`;
    }
    else {
      csvReaderArgumentsSql = '';
    }

    const sniffer = fileTypeInfo.duckdb_sniffer;
    const fileName = datasource.getFileName();
    const snifferSql = `SELECT * FROM ${sniffer}('${fileName}'${csvReaderArgumentsSql})`;

    const managedConnection = datasource.getManagedConnection();
    // TODO: show a busy spinner
    const result = await managedConnection.query(snifferSql);
    // TODO: hide the busy spinner
    const row = result.get(0);

    function escapeDelimiter(delim){
      return delim.replace(/[\t\r\n\0]/g, function(ch){
        switch (ch){
          case '\t':
            ch = '\\t';
            break;
          case '\r':
            ch = '\\r';
            break;
          case '\n':
            ch = '\\n';
            break;
          case '\0':
            ch = '\\0';
            break;
        }
        return ch;
      });
    }

    const detectedSettings = {
      csvReaderDelim: escapeDelimiter(row.Delimiter),
      csvReaderQuote: escapeDelimiter(row.Quote),
      csvReaderEscape: escapeDelimiter(row.Escape),
      csvReaderNewLine: {
        value: escapeDelimiter(row.NewLineDelimiter)
      },
      csvReaderSkip: row.SkipRows,
      csvReaderHeader: row.HasHeader,
      //csvReaderColumns = row.Columns,
      csvReaderDateformat: row.DateFormat,
      csvReaderTimestampformat: row.TimestampFormat
    };
    datasourceSettings.assignSettings('csvReader', detectedSettings);
    this.updateDialogFromSettings();
  }

  #initCsvReaderOptionsTab(){
    byId('csvReaderRestoreDefaults').addEventListener('click', event => this.restoreToDefaultHandler( event ) );
    byId('csvReaderDetectSettings').addEventListener('click', event => this.#autodetectCsvReaderSettings( event ) );
  }

  #initColumnsTab(){
    const hueyDb = window.hueyDb;
    const duckdb = hueyDb.duckdb;
    const instance = hueyDb.instance;
    this.#columnsTabDatasource = DuckDbDataSource.createFromSql(
      duckdb,
      instance,
      'DESCRIBE SELECT 1'
    );

    this.#columnsTabQueryModel = new QueryModel();
    
    const tabId = 'datasourceSettingsDialogColumnsTab';
    const columnsTabPanel = TabUi.getTabPanel(
      DatasourceSettingsDialog.#tabListSelector,
      `#${tabId}`
    );
    this.#columnsTabPivotTableUi = new PivotTableUi({
      container: columnsTabPanel,
      id: tabId + 'PivotTableUi',
      queryModel: this.#columnsTabQueryModel,
      settings: {autoRunQuery: true}
    });
    
  }

  async #downloadCsvReaderRejectsHandler(event){
    const exportUiSettings = settings.getSettings('exportUi');
    exportUiSettings.exportTitleTemplate = '${datasource}';
    exportUiSettings.exportResultShapePivot = true;

    const ourSettings = new SettingsBase({
      template: {exportUi: exportUiSettings}
    });
    exportDialog.open({
      queryModel: this.#rejectsTabQueryModel,
      settings: ourSettings
    });
  }

  async #clearCsvReaderRejectsHandler(event){
    await this.#datasource.clearRejects();
    this.#updateRejectsTabData();
  }

  #initRejectsTab(){

    byId('csvReaderDownloadRejects').addEventListener('click', event => this.#downloadCsvReaderRejectsHandler( event ) );
    byId('csvReaderClearRejects').addEventListener( 'click', event => this.#clearCsvReaderRejectsHandler( event ) );

    this.#rejectsDatasource = new RejectsDatasource();
    this.#rejectsTabQueryModel = new QueryModel();

    const tabId = 'datasourceSettingsDialogCsvReaderRejectsTab';
    const rejectsTabPanel = TabUi.getTabPanel(
      DatasourceSettingsDialog.#tabListSelector,
      `#${tabId}`
    );
    const section = rejectsTabPanel.querySelector('section');
    this.#rejectsTabPivotTableUi = new PivotTableUi({
      container: section,
      id: tabId + 'PivotTableUi',
      queryModel: this.#rejectsTabQueryModel,
      settings: {autoRunQuery: true}
    });
  }

  #updateColumnsTabData(){
    const datasource = this.#datasource;

    // first clean up the datasource
    this.#columnsTabQueryModel.setDatasource( null );

    // now prepare our column datasource
    const sql = [
      'SELECT CAST(ROW_NUMBER() OVER () AS USMALLINT) AS "#"',
      ', ds_schema.*',
      `FROM (${datasource.getSqlForTableSchema()}) as ds_schema`
    ].join('\n');
    this.#columnsTabDatasource.setSqlQuery(sql);

    // re-initialize the query model.
    const axes = {};
    axes[QueryModel.AXIS_ROWS] = [{column: '#', columnType: 'USMALLINT'}];
    axes[QueryModel.AXIS_CELLS] = [
      {caption: "Column Name", column: 'column_name', columnType: 'VARCHAR', aggregator: 'min'},
      {caption: "Data Type", column: 'column_type', columnType: 'VARCHAR', aggregator: 'min'}
    ];
    this.#columnsTabQueryModel.setState({
      axes: axes,
      datasource: this.#columnsTabDatasource
    });
    this.#columnsTabPivotTableUi.updatePivotTableUi();
  }

  #updateRejectsTabData(){
    const datasource = this.#datasource;

    // first clean up the datasource
    this.#rejectsTabQueryModel.setDatasource( null );

    if (!datasource.supportsRejectsDetection()){
      return;
    }

    const rejectsDatasource = this.#rejectsDatasource;
    rejectsDatasource.setDelegateDatasource(datasource);

    // re-initialize the query model.
    const axes = {};
    axes[QueryModel.AXIS_ROWS] = [{column: 'id', columnType: 'BIGINT'}];
    axes[QueryModel.AXIS_CELLS] = [
      {caption: "Scan", column: 'max_scan_id', columnType: 'BIGINT', aggregator: 'min'},
      {caption: "File", column: 'filename', columnType: 'VARCHAR', aggregator: 'min'},
      {caption: "Line Number", column: 'line_position', columnType: 'BIGINT', aggregator: 'min'},
      {caption: "Column Number", column: 'column_position', columnType: 'BIGINT', aggregator: 'min'},
      {caption: "Column Name", column: 'column_name', columnType: 'VARCHAR', aggregator: 'min'},
      {caption: "Position", column: 'error_position', columnType: 'BIGINT', aggregator: 'min'},
      {caption: "Errors", column: 'errors', columnType: 'VARCHAR', aggregator: 'min'},
      {caption: "Line Text", column: 'csv_line', columnType: 'VARCHAR', aggregator: 'min'},
    ];
    this.#rejectsTabQueryModel.setState({
      axes: axes,
      datasource: rejectsDatasource
    });
    this.#rejectsTabPivotTableUi.updatePivotTableUi();
  }

  async setDatasource(datasource){
    this.#datasource = datasource;

    const datasourceType = datasource.getType();
    byId('datasourceType').value = datasourceType;
    byId('datasourceName').value = DataSourcesUi.getCaptionForDatasource(datasource);

    let fileType, fileSize;
    switch(datasourceType){
      case DuckDbDataSource.types.FILE:
        fileSize = datasource.isUrl ? '' : datasource.getFileSize();
        fileSize = DatasourceSettingsDialog.#formatFileSize(fileSize);
      case DuckDbDataSource.types.FILES:
        fileType = datasource.getFileType();
        break;
      default:
        fileType = '';
        fileSize = '';
    }
    const fileTypeControl = byId('datasourceFileType');
    // we need to set the value property to update the output,
    // but we also need to set the value attribute because we use that in CSS to control visibility of reader param tabs.
    fileTypeControl.setAttribute('value', fileType);
    fileTypeControl.value = fileType;

    byId('datasourceFileSize').value = fileSize;

    this.#updateColumnsTabData();
    this.#updateRejectsTabData();

    TabUi.setSelectedTab(
      DatasourceSettingsDialog.#tabListSelector,
      '#datasourceSettingsDialogColumnsTab'
    );
  }

  open(datasource) {
    this.setDatasource(datasource);
    const settings = datasource.getSettings();
    super.open(settings);
  }
}

let datasourceSettingsDialog;
function initDatasourceSettingsDialog(){
  datasourceSettingsDialog = new DatasourceSettingsDialog();
}