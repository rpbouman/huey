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
    const queryModel = this.#queryModel;
    const datasource = queryModel.getDatasource();
    const columnsMetadata = await datasource.getColumnMetadata();
    
    const callbackResults = [];
    for (let i = 0; i < columnsMetadata.numRows; i++){
      const columnMetadata = columnsMetadata.get(i);
      callbackResults.push( callback.call(callbackScope, columnMetadata, i) );
    }
    
    return callbackResults;
  }
  
  #newQueryModelState(){
    const queryModel = this.#queryModel;
    const datasource = queryModel.getDatasource();
    const datasourceId = datasource.getId();
    
    return {
      datasourceId: datasourceId,
      cellsHeaders: QueryModel.AXIS_COLUMNS,
      axes: {}
    }
  }

  #flipAxesButtonClickHandler(event){
    const queryModel = this.#queryModel;
    queryModel.flipAxes();
  }

  #cellHeadersOnColumnsButtonClickHandler(event){
    const queryModel = this.#queryModel;
    queryModel.setCellHeadersAxis(QueryModel.AXIS_COLUMNS);
  }
  
  #cellHeadersOnRowsButtonClickHandler(event){
    const queryModel = this.#queryModel;
    queryModel.setCellHeadersAxis(QueryModel.AXIS_ROWS);
  }

  async #clearAllButtonClickHandler(event){
    const queryModelState = this.#newQueryModelState();
    const queryModel = this.#queryModel;
    await queryModel.setState(queryModelState);
  }
    
  async #columnStatisticsButtonClickHandler(event){
    const queryModelState = this.#newQueryModelState();
    queryModelState.cellsHeaders = QueryModel.AXIS_ROWS;
    const items = queryModelState.axes[QueryModel.AXIS_CELLS] = [];
    const aggregators = ['min', 'max', 'count', 'distinct count'];
    
    await this.#forEachColumn(function(columnMetadata,columnIndex){
      const columnName = columnMetadata.column_name;
      const columnType = columnMetadata.column_type;
      for (let i = 0; i < aggregators.length; i++) {
        const aggregator = aggregators[i];
        const item = {
          column: columnName,
          columnType: columnType,
          aggregator: aggregator
        };
        items.push(item);
      }
    });

    const queryModel = this.#queryModel;
    await queryModel.setState(queryModelState);
  }
    
  async #dataPreviewButtonClickHandler(event){
    const queryModelState = this.#newQueryModelState();
    
    const rowsAxisItems = queryModelState.axes[QueryModel.AXIS_ROWS] = [];
    rowsAxisItems.push({
      derivation: 'row number',
      caption: '#'
    });
    
    const cellsAxisItems = queryModelState.axes[QueryModel.AXIS_CELLS] = [];
    
    await this.#forEachColumn(function(columnMetadata,columnIndex){
      const columnName = columnMetadata.column_name;
      const columnType = columnMetadata.column_type;
      const item = {
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
    
    const samplingConfig = {
      size: 100,
      unit: 'ROWS',
      method: 'LIMIT',
      seed: 100
    };
    queryModelState.sampling = {};
    queryModelState.sampling[QueryModel.AXIS_ROWS] = samplingConfig;
    queryModelState.sampling[QueryModel.AXIS_CELLS] = samplingConfig;

    const queryModel = this.#queryModel;
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

let quickQueryMenu;
function initQuickQueryMenu(){
  quickQueryMenu = new QuickQueryMenu(queryModel);
}