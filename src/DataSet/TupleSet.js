class TupleSet extends DataSetComponent {

  static groupingIdAlias = '__huey_grouping_id';

  //
  static getSqlSelectExpressions(queryModel, axisId, includeCountAll){
    const queryAxis = queryModel.getQueryAxis(axisId);
    const queryAxisItems = queryAxis.getItems();
    if (!queryAxisItems.length) {
      return undefined;
    }

    const selectListExpressions = {};
    for (let i = 0; i < queryAxisItems.length; i++) {
      const queryAxisItem = queryAxisItems[i];
      const caption = QueryAxisItem.getCaptionForQueryAxisItem(queryAxisItem);
      const selectListExpression = QueryAxisItem.getSqlForQueryAxisItem(queryAxisItem);
      selectListExpressions[caption] = selectListExpression;
    }

    if (includeCountAll) {
      const countExpression = 'COUNT(*) OVER ()';
      selectListExpressions[countExpression] = countExpression;
    }
    return selectListExpressions;
  }

  static getSqlSelectStatement(queryModel, axisId, includeCountAll, nullsSortOrder, totalsPosition){
    const datasource = queryModel.getDatasource();

    const queryAxis = queryModel.getQueryAxis(axisId);
    const queryAxisItems = queryAxis.getItems();

    const filterAxis = queryModel.getFiltersAxis();
    const filterAxisItems = filterAxis.getItems();

    let samplingConfig;
    if (includeCountAll) {
      samplingConfig = queryModel.getSampling(axisId);
    }

    const sql = SqlQueryGenerator.getSqlSelectStatementForAxisItems({
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
    const settings = this.getSettings();
    let nullsSortOrder;
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
    const settings = this.getSettings();
    let totalsPosition;
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
    const queryModel = this.getQueryModel();
    const axisId = this.#queryAxisId;

    const queryAxis = queryModel.getQueryAxis(axisId);
    const items = queryAxis.getItems();
    return items;
  }

  #getSqlSelectStatement(includeCountAll){
    const queryModel = this.getQueryModel();
    if (!queryModel) {
      return undefined;
    }
    const nullsSortOrder = this.#getNullsSortOrder();
    const totalsPosition = this.#getTotalsPosition();    
    const sql = TupleSet.getSqlSelectStatement(
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
    return new Promise( (resolve, reject) => resolve(this.#tupleCount) );
  }

  #loadTuples(resultSet, offset) {
    const numRows = resultSet.numRows;
    const fields = resultSet.schema.fields;
    const items = this.getQueryAxisItems();
    
    let hasGroupingId = false, fieldOffset = 0, fieldCount = items.length;
    if (fields[0].name === TupleSet.groupingIdAlias) {
      hasGroupingId = true;
      fieldOffset += 1;
      fieldCount += 1;
    }

    const tuples = this.#tuples;

    // if the offset is 0 we should have included an expression that computes the total count as last
    if (offset === 0) {
      if (numRows === 0){
        this.#tupleCount = 0;
      }
      else {
        const firstRow = resultSet.get(0);
        const lastField = fields[fields.length - 1];
        const totalCount = firstRow[lastField.name];
        this.#tupleCount = parseInt(String(totalCount), 10);
      }
    }
    this.#tupleValueFields = fields.slice(fieldOffset, fieldCount);

    for (let i = 0; i < numRows; i++){

      const row = resultSet.get(i);
      const values = [];
      const tuple = {values: values};

      if (hasGroupingId){
        const groupingId = row[TupleSet.groupingIdAlias];
        if (groupingId > 0) {
          tuple[TupleSet.groupingIdAlias] = groupingId;
        }
      }

      for (let j = fieldOffset; j < fieldCount; j++){
        const field = fields[j];
        const fieldName = field.name;
        const value = row[fieldName];
        values[j - fieldOffset] = value;
      }

      tuples[offset + i] = tuple;
    }
  }

  async #executeAxisQuery(limit, offset){
    const includeCountExpression = offset === 0;

    let axisSql = this.#getSqlSelectStatement(includeCountExpression);
    if (!axisSql){
      return 0;
    }
    axisSql = `${axisSql}\nLIMIT ${limit} OFFSET ${offset}`;

    const connection = await this.getManagedConnection();
    console.log(`SQL to fetch tuples for ${this.#queryAxisId} axis:`);
    console.log(axisSql);
    const resultset = await connection.query(axisSql);
    console.log(`Query method returned, connection ${connection.getConnectionId()} in state ${connection.getState()}` );
    if (connection.getState() === 'canceled') {
      return 0;
    }
    this.#loadTuples(resultset, offset);

    return resultset.numRows;
  }

  getCachedTupleCount(offset){
    const data = this.#tuples;
    let cachedTupleCount = 0;
    for (let i = offset; i < this.#tupleCount; i++){
      const tuple = data[i];
      if (!tuple){
        break;
      }
      cachedTupleCount += 1;
    }
    return cachedTupleCount;
  }

  async getTuples(count, offset){

    const data = this.#tuples;
    let tuples = [];

    let firstIndexToFetch, lastIndexToFetch;

    if (this.#tupleCount !== undefined && offset + count > this.#tupleCount) {
      count = this.#tupleCount - offset;
    }

    let i = 0;
    while (i < count) {
      const tupleIndex = offset + i;
      const tuple = data[tupleIndex];
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
    let newCount = (lastIndexToFetch - firstIndexToFetch);
    if (newCount < this.#pageSize && (offset + count === lastIndexToFetch) && lastIndexToFetch < this.#tupleCount) {
      newCount = this.#pageSize;
    }

    await this.#executeAxisQuery(newCount, firstIndexToFetch);
    tuples = data.slice(offset, offset + count);
    return tuples;
  }

}
