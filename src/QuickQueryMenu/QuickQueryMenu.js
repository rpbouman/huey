class QuickQueryMenu {
  
  #queryModel = undefined;
  
  constructor(queryModel){
    this.#queryModel = queryModel;
    
    this.#initClearAllButton();
    this.#initColumnStatisticsButton();
    this.#initAnalyticalPreviewButton();
    this.#initDataPreviewButton();
    this.#initDestructuredDataPreviewButton();
  }
  
  async #forEachColumn(callback, callbackScope){
    if (!callbackScope) {
      callbackScope = this;
    }
    var queryModel = this.#queryModel;
    var datasource = queryModel.getDatasource();
    var columnsMetadata = await datasource.getColumnMetadata();
    
    var callbackResults = [];
    for (var i = 0; i < columnsMetadata.numRows; i++){
      var columnMetadata = columnsMetadata.get(i);
      callbackResults.push( callback.call(callbackScope, columnMetadata, i) );
    }
    
    return callbackResults;
  }
  
  #newQueryModelState(){
    var queryModel = this.#queryModel;
    var datasource = queryModel.getDatasource();
    var datasourceId = datasource.getId();
    
    return {
      datasourceId: datasourceId,
      cellsHeaders: QueryModel.AXIS_COLUMNS,
      axes: {}
    }
  }
    
  #initClearAllButton(){
    byId('quickQueryClearAllButton')
    .addEventListener('click', this.#clearAllButtonClickHandler.bind(this));
  }
  
  async #clearAllButtonClickHandler(event){
    var queryModelState = this.#newQueryModelState();
    var queryModel = this.#queryModel;
    await queryModel.setState(queryModelState);
  }
  
  #initColumnStatisticsButton(){
    byId('quickQueryColumnStatisticsButton')
    .addEventListener('click', this.#columnStatisticsButtonClickHandler.bind(this));
  }
  
  async #columnStatisticsButtonClickHandler(event){
    var queryModelState = this.#newQueryModelState();
    queryModelState.cellsHeaders = QueryModel.AXIS_ROWS;
    var items = queryModelState.axes[QueryModel.AXIS_CELLS] = [];
    var aggregators = ['min', 'max', 'count', 'distinct count'];
    
    await this.#forEachColumn(function(columnMetadata,columnIndex){
      var columnName = columnMetadata.column_name;
      var columnType = columnMetadata.column_type;
      for (var i = 0; i < aggregators.length; i++) {
        var aggregator = aggregators[i];
        var item = {
          column: columnName,
          columnType: columnType,
          aggregator: aggregator
        };
        items.push(item);
      }
    });

    var queryModel = this.#queryModel;
    await queryModel.setState(queryModelState);
  }

  #initAnalyticalPreviewButton(){
    byId('quickQueryAnalyticalPreviewButton')
    .addEventListener('click', this.#analyticalPreviewButtonClickHandler.bind(this));
  }
  
  async #analyticalPreviewButtonClickHandler(event){
  }
  
  #initDataPreviewButton(){
    byId('quickQueryDataPreviewButton')
    .addEventListener('click', this.#dataPreviewButtonClickHandler.bind(this));
  }
  
  async #dataPreviewButtonClickHandler(event){
    var queryModelState = this.#newQueryModelState();
    var items = queryModelState.axes[QueryModel.AXIS_ROWS] = [];
    
    await this.#forEachColumn(function(columnMetadata,columnIndex){
      var columnName = columnMetadata.column_name;
      var columnType = columnMetadata.column_type;
      var item = {
        column: columnName,
        columnType: columnType
      };
      items.push(item);
    });

    var queryModel = this.#queryModel;
    await queryModel.setState(queryModelState);
  }
  
  #initDestructuredDataPreviewButton(){
    byId('quickQueryDestructuredDataPreviewButton')
    .addEventListener('click', this.#destructuredDataPreviewButtonClickHandler.bind(this));
  }
  
  async #destructuredDataPreviewButtonClickHandler(event){
  }

}

var quickQueryMenu;
function initQuickQueryMenu(){
  quickQueryMenu = new QuickQueryMenu(queryModel);
}