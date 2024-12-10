class RejectsDatasource extends DuckDbDataSource {

  #delegateDatasource = undefined;

  constructor(){
    var hueyDb = window.hueyDb;
    var duckdb = hueyDb.duckdb;
    var instance = hueyDb.instance;
    super(duckdb, instance, {
      type: DuckDbDataSource.types.SQLQUERY,
      sql: 'SELECT 1'
    });
  }

  setDelegateDatasource(datasource){
    this.#delegateDatasource = datasource;
    var sql = datasource.getRejectsSql();
    this.setSqlQuery(sql);
  }

  getManagedConnection(){
    var delegateDatasource = this.#delegateDatasource;
    var managedConnection = delegateDatasource.getManagedConnection();
    return managedConnection;
  }

  getId(){
    var delegateDatasource = this.#delegateDatasource;
    var delegateDatasourceId = delegateDatasource.getId();
    var id = `Rejects of ${delegateDatasourceId}`;
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
    var datasource = this.#datasource;
    if (datasource.getType() !== DuckDbDataSource.types.FILE){
      throw new Error(`Datasource is not of type ${DuckDbDataSource.types.FILE}`);
    }
    var fileType = datasource.getFileType();
    var fileTypeInfo = DuckDbDataSource.getFileTypeInfo(fileType);
    if (fileTypeInfo.duckdb_reader !== 'read_csv'){
      throw new Error(`Datasource is not a CSV file`);
    }

    var datasourceSettings = datasource.getSettings();
    var csvReaderArguments = datasourceSettings.getCsvReaderArguments();
    csvReaderArguments['ignore_errors'] = true;
    var csvReaderArgumentsSql = DatasourceSettings.getCsvReaderArgumentsSql(csvReaderArguments);

    var fileName = datasource.getFileName();

    var sniffer = fileTypeInfo.duckdb_sniffer;
    var snifferSql = `SELECT * FROM ${sniffer}('${fileName}', ${csvReaderArgumentsSql})`;

    var managedConnection = datasource.getManagedConnection();
    // TODO: show a busy spinner
    var result = await managedConnection.query(snifferSql);
    // TODO: hide the busy spinner
    var row = result.get(0);

    var detectedSettings = {
      csvReaderDelim: row.Delimiter,
      csvReaderQuote: row.Quote,
      csvReaderEscape: row.Escape,
      csvReaderNewLine: {
        value: row.NewLineDelimiter
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
    byId('csvReaderRestoreDefaults')
    .addEventListener(
      'click',
      this.restoreToDefaultHandler.bind(this)
    );
    byId('csvReaderDetectSettings')
    .addEventListener(
      'click',
      this.#autodetectCsvReaderSettings.bind(this)
    );
  }

  #initColumnsTab(){
    var hueyDb = window.hueyDb;
    var duckdb = hueyDb.duckdb;
    var instance = hueyDb.instance;
    this.#columnsTabDatasource = DuckDbDataSource.createFromSql(
      duckdb,
      instance,
      'DESCRIBE SELECT 1'
    );

    this.#columnsTabQueryModel = new QueryModel();
    
    var tabId = 'datasourceSettingsDialogColumnsTab';
    var columnsTabPanel = TabUi.getTabPanel(
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
    var exportUiSettings = settings.getSettings('exportUi');
    exportUiSettings.exportTitleTemplate = '${datasource}';
    exportUiSettings.exportResultShapePivot = true;

    var ourSettings = new SettingsBase({
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

    byId('csvReaderDownloadRejects')
    .addEventListener(
      'click',
      this.#downloadCsvReaderRejectsHandler.bind(this)
    );
    byId('csvReaderClearRejects')
    .addEventListener(
      'click',
      this.#clearCsvReaderRejectsHandler.bind(this)
    );

    this.#rejectsDatasource = new RejectsDatasource();
    this.#rejectsTabQueryModel = new QueryModel();

    var tabId = 'datasourceSettingsDialogCsvReaderRejectsTab';
    var rejectsTabPanel = TabUi.getTabPanel(
      DatasourceSettingsDialog.#tabListSelector,
      `#${tabId}`
    );
    var section = rejectsTabPanel.querySelector('section');
    this.#rejectsTabPivotTableUi = new PivotTableUi({
      container: section,
      id: tabId + 'PivotTableUi',
      queryModel: this.#rejectsTabQueryModel,
      settings: {autoRunQuery: true}
    });
  }

  #updateColumnsTabData(){
    var datasource = this.#datasource;

    // first clean up the datasource
    this.#columnsTabQueryModel.setDatasource( null );

    // now prepare our column datasource
    var sql = [
      'SELECT CAST(ROW_NUMBER() OVER () AS USMALLINT) AS "#"',
      ', ds_schema.*',
      `FROM (${datasource.getSqlForTableSchema()}) as ds_schema`
    ].join('\n');
    this.#columnsTabDatasource.setSqlQuery(sql);

    // re-initialize the query model.
    var axes = {};
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
    var datasource = this.#datasource;

    // first clean up the datasource
    this.#rejectsTabQueryModel.setDatasource( null );

    if (!datasource.supportsRejectsDetection()){
      return;
    }

    var rejectsDatasource = this.#rejectsDatasource;
    rejectsDatasource.setDelegateDatasource(datasource);

    // re-initialize the query model.
    var axes = {};
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

    var datasourceType = datasource.getType();
    byId('datasourceType').value = datasourceType;
    byId('datasourceName').value = DataSourcesUi.getCaptionForDatasource(datasource);

    var fileType, fileSize;
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
    var fileTypeControl = byId('datasourceFileType');
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
    var settings = datasource.getSettings();
    super.open(settings);
  }
}

var datasourceSettingsDialog;
function initDatasourceSettingsDialog(){
  datasourceSettingsDialog = new DatasourceSettingsDialog();
}