class QuickQueryMenu {
  
  #queryModel = undefined;
  
  constructor(queryModel){
    this.#queryModel = queryModel;
    
    this.#initFlipAxesButton();
    this.#initCellHeadersOnColumnsButton();
    this.#initCellHeadersOnRowsButton();
    this.#initClearAllButton();
    this.#initColumnStatisticsButton();
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
    
  #initFlipAxesButton(){
    byId('quickQueryFlipAxesButton')
    .addEventListener('click', this.#flipAxesButtonClickHandler.bind(this));
  }
  
  #flipAxesButtonClickHandler(event){
    var queryModel = this.#queryModel;
    queryModel.flipAxes();
  }

  #initCellHeadersOnColumnsButton(){
    byId('quickQueryCellHeadersOnColumnsButton')
    .addEventListener('click', this.#cellHeadersOnColumnsButtonClickHandler.bind(this));
  }
  
  #cellHeadersOnColumnsButtonClickHandler(event){
    var queryModel = this.#queryModel;
    queryModel.setCellHeadersAxis(QueryModel.AXIS_COLUMNS);
  }

  #initCellHeadersOnRowsButton(){
    byId('quickQueryCellHeadersOnRowsButton')
    .addEventListener('click', this.#cellHeadersOnRowsButtonClickHandler.bind(this));
  }
  
  #cellHeadersOnRowsButtonClickHandler(event){
    var queryModel = this.#queryModel;
    queryModel.setCellHeadersAxis(QueryModel.AXIS_ROWS);
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
  
  #initDataPreviewButton(){
    byId('quickQueryDataPreviewButton')
    .addEventListener('click', this.#dataPreviewButtonClickHandler.bind(this));
  }
  
  async #dataPreviewButtonClickHandler(event){
    var queryModelState = this.#newQueryModelState();
    
    var rowsAxisItems = queryModelState.axes[QueryModel.AXIS_ROWS] = [];
    rowsAxisItems.push({
      derivation: 'row number',
      caption: '#'
    });
    
    var cellsAxisItems = queryModelState.axes[QueryModel.AXIS_CELLS] = [];
    
    await this.#forEachColumn(function(columnMetadata,columnIndex){
      var columnName = columnMetadata.column_name;
      var columnType = columnMetadata.column_type;
      var item = {
        column: columnName,
        columnType: columnType,
        caption: columnName,
        aggregator: 'min'
      };
      cellsAxisItems.push(item);
    });
    
    var samplingConfig = {
      size: 100,
      unit: 'ROWS',
      method: 'LIMIT',
      seed: 100
    };
    queryModelState.sampling = {};
    queryModelState.sampling[QueryModel.AXIS_ROWS] = samplingConfig;
    queryModelState.sampling[QueryModel.AXIS_CELLS] = samplingConfig;

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