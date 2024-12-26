class TupleSet extends DataSetComponent {

  static groupingIdAlias = '__huey_grouping_id';

  //
  static getSqlSelectExpressions(queryModel, axisId, includeCountAll){
    var queryAxis = queryModel.getQueryAxis(axisId);
    var queryAxisItems = queryAxis.getItems();
    if (!queryAxisItems.length) {
      return undefined;
    }

    var selectListExpressions = {};
    for (var i = 0; i < queryAxisItems.length; i++) {
      var queryAxisItem = queryAxisItems[i];
      var caption = QueryAxisItem.getCaptionForQueryAxisItem(queryAxisItem);
      var selectListExpression = QueryAxisItem.getSqlForQueryAxisItem(queryAxisItem);
      selectListExpressions[caption] = selectListExpression;
    }

    if (includeCountAll) {
      var countExpression = 'COUNT(*) OVER ()';
      selectListExpressions[countExpression] = countExpression;
    }
    return selectListExpressions;
  }

  static getSqlSelectStatement(queryModel, axisId, includeCountAll, nullsSortOrder, totalsPosition){
    var datasource = queryModel.getDatasource();

    var queryAxis = queryModel.getQueryAxis(axisId);
    var queryAxisItems = queryAxis.getItems();

    var filterAxis = queryModel.getFiltersAxis();
    var filterAxisItems = filterAxis.getItems();

    var samplingConfig;
    if (includeCountAll) {
      samplingConfig = queryModel.getSampling(axisId);
    }

    var sql = SqlQueryGenerator.getSqlSelectStatementForAxisItems({
      datasource: datasource,
      queryAxisItems: queryAxisItems,
      filterAxisItems: filterAxisItems,
      includeCountAll: includeCountAll,
      countAllAlias: undefined,
      nullsSortOrder: nullsSortOrder,
      totalsPosition: totalsPosition,
      samplingConfig: samplingConfig
    });
    return sql;
  }

  #queryAxisId = undefined;

  #tuples = [];
  #tupleValueFields = [];

  #tupleCount = undefined;
  #pageSize = 50;

  constructor(queryModel, axisId, settings){
    super(queryModel, settings);
    this.#queryAxisId = axisId;
  }
  
  #getNullsSortOrder(){
    var settings = this.getSettings();
    var nullsSortOrder;
    if (typeof settings.getSettings === 'function'){
      nullsSortOrder = settings.getSettings([
        'localeSettings', 
        'nullsSortOrder', 
        'value'
      ]);
    };
    if (!nullsSortOrder) {
      nullsSortOrder = 'FIRST';
    }
    if (['FIRST','LAST'].indexOf(nullsSortOrder) === -1) {
      console.warn(`Wrong value for nullsSortOrder "${nullsSortOrder}"`);
      nullsSortOrder = 'FIRST';
    }
    return nullsSortOrder;
  }
  
  #getTotalsPosition(){
    var settings = this.getSettings();
    var totalsPosition;
    if (typeof settings.getSettings === 'function'){
      totalsPosition = settings.getSettings([
        'pivotSettings', 
        'totalsPosition', 
        'value'
      ]);
    }
    if (!totalsPosition){
      totalsPosition = 'AFTER';
    }
    if (['AFTER','BEFORE'].indexOf(totalsPosition) === -1) {
      console.warn(`Wrong value for totalsPosition "${totalsPosition}"`);
      totalsPosition = 'AFTER';
    }
    return totalsPosition;
  }

  getTupleValueFields(){
    return this.#tupleValueFields;
  }

  getPageSize(){
    return this.#pageSize;
  }

  setPageSize(pageSize){
    this.#pageSize = pageSize;
  }

  getQueryAxisId(){
    return this.#queryAxisId;
  }

  getQueryAxisItems(){
    var queryModel = this.getQueryModel();
    var axisId = this.#queryAxisId;

    var queryAxis = queryModel.getQueryAxis(axisId);
    var items = queryAxis.getItems();
    return items;
  }

  #getSqlSelectStatement(includeCountAll){
    var queryModel = this.getQueryModel();
    if (!queryModel) {
      return undefined;
    }
    var nullsSortOrder = this.#getNullsSortOrder();
    var totalsPosition = this.#getTotalsPosition();    
    var sql = TupleSet.getSqlSelectStatement(
      queryModel,
      this.#queryAxisId,
      includeCountAll,
      nullsSortOrder,
      totalsPosition
    );
    return sql;
  }

  clear(){
    this.#tuples = [];
    this.#tupleCount = undefined;
  }

  getTupleCountSync() {
    return this.#tupleCount;
  }

  getTuplesSync(from, to){
    return this.#tuples.slice(from, to);
  }

  getTupleSync(index){
    return this.#tuples[index];
  }

  async getTupleCount(){
    return new Promise(function(resolve, reject){
      resolve(this.#tupleCount);
    });
  }

  #loadTuples(resultSet, offset) {
    var numRows = resultSet.numRows;

    var fields = resultSet.schema.fields;

    var items = this.getQueryAxisItems();
    var hasGroupingId = false, fieldOffset = 0, fieldCount = items.length;
    if (fields[0].name === TupleSet.groupingIdAlias) {
      hasGroupingId = true;
      fieldOffset += 1;
      fieldCount += 1;
    }

    var tuples = this.#tuples;

    // if the offset is 0 we should have included an expression that computes the total count as last
    if (offset === 0) {
      if (numRows === 0){
        this.#tupleCount = 0;
      }
      else {
        var firstRow = resultSet.get(0);
        var lastField = fields[fields.length - 1];
        var totalCount = firstRow[lastField.name];
        this.#tupleCount = parseInt(String(totalCount), 10);
      }
    }
    this.#tupleValueFields = fields.slice(fieldOffset, fieldCount);

    for (var i = 0; i < numRows; i++){

      var row = resultSet.get(i);
      var values = [];
      var tuple = {values: values};

      if (hasGroupingId){
        var groupingId = row[TupleSet.groupingIdAlias];
        if (groupingId > 0) {
          tuple[TupleSet.groupingIdAlias] = groupingId;
        }
      }

      for (var j = fieldOffset; j < fieldCount; j++){
        var field = fields[j];
        var fieldName = field.name;
        var value = row[fieldName];
        values[j - fieldOffset] = value;
      }

      tuples[offset + i] = tuple;
    }
  }

  async #executeAxisQuery(limit, offset){
    var includeCountExpression = offset === 0;

    var axisSql = this.#getSqlSelectStatement(includeCountExpression);
    if (!axisSql){
      return 0;
    }
    axisSql = `${axisSql}\nLIMIT ${limit} OFFSET ${offset}`;

    var connection = await this.getManagedConnection();
    console.log(`SQL to fetch tuples for ${this.#queryAxisId} axis:`);
    console.log(axisSql);
    var resultset = await connection.query(axisSql);
    console.log(`Query method returned, connection ${connection.getConnectionId()} in state ${connection.getState()}` );
    var rejects = await this.getQueryModel().getDatasource().getRejects();
    if (connection.getState() === 'canceled') {
      return 0;
    }
    this.#loadTuples(resultset, offset);

    return resultset.numRows;
  }

  getCachedTupleCount(offset){
    var data = this.#tuples;
    var cachedTupleCount = 0;
    for (var i = offset; i < this.#tupleCount; i++){
      var tuple = data[i];
      if (!tuple){
        break;
      }
      cachedTupleCount += 1;
    }
    return cachedTupleCount;
  }

  async getTuples(count, offset){

    var data = this.#tuples;
    var tuples = [];

    var i = 0;
    var firstIndexToFetch, lastIndexToFetch;

    if (this.#tupleCount !== undefined && offset + count > this.#tupleCount) {
      count = this.#tupleCount - offset;
    }

    while (i < count) {
      var tupleIndex = offset + i;
      var tuple = data[tupleIndex];
      if (tuple === undefined) {
        if (firstIndexToFetch === undefined) {
          firstIndexToFetch = tupleIndex;
          lastIndexToFetch = tupleIndex;
        }
        else
        if (tupleIndex > lastIndexToFetch) {
          lastIndexToFetch = tupleIndex;
        }
      }
      else {
        tuples[i] = tuple;
      }
      i += 1;
    }

    if (firstIndexToFetch === undefined) {
      return tuples;
    }

    lastIndexToFetch += 1;
    var newCount = (lastIndexToFetch - firstIndexToFetch);
    if (newCount < this.#pageSize && (offset + count === lastIndexToFetch) && lastIndexToFetch < this.#tupleCount) {
      newCount = this.#pageSize;
    }

    var numRows = await this.#executeAxisQuery(newCount, firstIndexToFetch);
    tuples = data.slice(offset, offset + count);
    return tuples;
  }

}
