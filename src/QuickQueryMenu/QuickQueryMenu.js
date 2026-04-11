class QuickQueryMenu {
  
  #queryModel = undefined;
  
  constructor(queryModel){
    this.#queryModel = queryModel;
    
    byId('quickQueryFlipAxesButton').addEventListener('click', event => this.#flipAxesButtonClickHandler( event ) );
    byId('quickQueryCellHeadersOnColumnsButton').addEventListener('click', event => this.#cellHeadersOnColumnsButtonClickHandler( event ) );
    byId('quickQueryCellHeadersOnRowsButton').addEventListener('click', event => this.#cellHeadersOnRowsButtonClickHandler( event ) );
    byId('quickQueryClearAllButton').addEventListener('click', event => this.#clearAllButtonClickHandler( event ) );
    byId('quickQueryColumnStatisticsButton').addEventListener('click', event => this.#columnStatisticsButtonClickHandler( event ) );
    byId('quickQueryDataPreviewButton').addEventListener('click', event => this.#dataPreviewButtonClickHandler( event ) );
    byId('quickQueryDestructuredDataPreviewButton').addEventListener('click', event => this.#destructuredDataPreviewButtonClickHandler( event ) );
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

  #flipAxesButtonClickHandler(event){
    var queryModel = this.#queryModel;
    queryModel.flipAxes();
  }

  #cellHeadersOnColumnsButtonClickHandler(event){
    var queryModel = this.#queryModel;
    queryModel.setCellHeadersAxis(QueryModel.AXIS_COLUMNS);
  }
  
  #cellHeadersOnRowsButtonClickHandler(event){
    var queryModel = this.#queryModel;
    queryModel.setCellHeadersAxis(QueryModel.AXIS_ROWS);
  }

  async #clearAllButtonClickHandler(event){
    var queryModelState = this.#newQueryModelState();
    var queryModel = this.#queryModel;
    await queryModel.setState(queryModelState);
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
      item.formatter = QueryAxisItem.createFormatter(item);
      item.literalWriter = QueryAxisItem.createLiteralWriter(item);
      item.parser = QueryAxisItem.createParser(item);
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
    
  async #destructuredDataPreviewButtonClickHandler(event){
    // this should be like the data preview but,
    // - any STRUCT columns should be expanded to column.member items
    // - if a member of a STRUCT happens to be STRUCT, it should expanded to members too
    // - any arrays should be expanded to unnest() expressions.
    alert('Not implemented');
  }

}

var quickQueryMenu;
function initQuickQueryMenu(){
  quickQueryMenu = new QuickQueryMenu(queryModel);
}