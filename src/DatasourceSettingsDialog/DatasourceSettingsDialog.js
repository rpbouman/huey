class DatasourceSettingsDialog {
  
  static #id = 'datasourceSettingsDialog';
  
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
    var datasource = DuckDbDataSource.createFromSql(
      duckdb, 
      instance, 
      'SELECT 1'
    );
    var columnsQueryModel = new QueryModel();
    columnsQueryModel.setDatasource(datasource);
    
    var tabId = 'datasourceSettingsDialogColumnsTab';
    var columnsTabPanel = TabUi.getTabPanel(`#${DatasourceSettingsDialog.#id} > *[role=tablist]`, `#${tabId}`);
    var columnsTable = new PivotTableUi({
      container: columnsTabPanel,
      id: tabId + 'Table',
      queryModel: columnsQueryModel,
      settings: settings
    });
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