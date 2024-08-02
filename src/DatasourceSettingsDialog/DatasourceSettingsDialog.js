class DatasourceSettingsDialog {
  
  static #id = 'datasourceSettingsDialog';
  
  #columnsTabDatasource = undefined;
  #columnsTabQueryModel = undefined;
  #columnsTabPivotTableUi = undefined;
  
  constructor(){
    this.#initDatasourceSettingsDialog();
  }
    
  #initDatasourceSettingsDialog(){
    byId('datasourceSettingsDialogOkButton')
    .addEventListener(
      'click', 
      this.#datasourceSettingsDialogOkButtonClicked.bind(this)
    );
    
    byId('datasourceSettingsDialogCancelButton')
    .addEventListener(
      'click', 
      this.#datasourceSettingsDialogCancelButtonClicked.bind(this)
    );
    this.#initColumnsTab();
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
    var columnsTabPanel = TabUi.getTabPanel(`#${DatasourceSettingsDialog.#id} > *[role=tablist]`, `#${tabId}`);
    this.#columnsTabPivotTableUi = new PivotTableUi({
      container: columnsTabPanel,
      id: tabId + 'PivotTableUi',
      queryModel: this.#columnsTabQueryModel,
      settings: settings
    });
       
  }

  #updateColumnsTabData(){
    this.#columnsTabQueryModel.setDatasource( null );
    this.#columnsTabQueryModel.setDatasource( this.#columnsTabDatasource );
    this.#columnsTabQueryModel.addItem({axis: QueryModel.AXIS_ROWS, columnName: 'column_name', columnType: 'VARCHAR'});
    this.#columnsTabQueryModel.addItem({axis: QueryModel.AXIS_ROWS, columnName: 'column_type', columnType: 'VARCHAR'});
  }
  
  #datasourceSettingsDialogOkButtonClicked(event){
    this.close();
  }

  #datasourceSettingsDialogCancelButtonClicked(event){
    this.close();
  }
  
  #getDialog(){
    return byId(DatasourceSettingsDialog.#id);
  }
  
  #getDatasourceType(){
    return byId('datasourceType');
  }

  #getDatasourceFileType(){
    return byId('datasourceFileType');
  }

  #getDatasourceName(){
    return byId('datasourceName');
  }
  
  setDatasource(datasource){
    var datasourceType = datasource.getType();
    this.#getDatasourceType().value = datasourceType;
    this.#getDatasourceName().value = DataSourcesUi.getCaptionForDatasource(datasource);
   
    this.#getDatasourceFileType().value = "";
    switch(datasourceType){
      case DuckDbDataSource.types.FILE:
      case DuckDbDataSource.types.FILES:
        var fileType = datasource.getFileType();
        this.#getDatasourceFileType().value = fileType;
    }
    var sql = datasource.getSqlForTableSchema();
    this.#columnsTabDatasource.setSqlQuery(sql);
    this.#updateColumnsTabData();
  }
  
  open(datasource) {
    this.setDatasource(datasource);
    this.#getDialog().showModal();
  }
  
  close(){
    this.#getDialog().close();
  }
}

var datasourceSettingsDialog;
function initDatasourceSettingsDialog(){
  datasourceSettingsDialog = new DatasourceSettingsDialog();
}