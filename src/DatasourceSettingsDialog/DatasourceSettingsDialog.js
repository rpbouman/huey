class DatasourceSettingsDialog {
  
  #id = 'datasourceSettingsDialog';
  
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
  }
  
  #datasourceSettingsDialogOkButtonClicked(event){
    this.close();
  }

  #datasourceSettingsDialogCancelButtonClicked(event){
    this.close();
  }
  
  #getDialog(){
    return byId(this.#id);
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