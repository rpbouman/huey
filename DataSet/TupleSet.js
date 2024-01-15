class TupleSet {
    
  #queryModel = undefined;
  #queryAxisId = undefined;  

  #tuples = [];
  #tupleValueFields = [];
  
  #tupleCount = undefined;
  #pageSize = 50;
  
  constructor(queryModel, axisId){
    this.#queryModel = queryModel;
    this.#queryAxisId = axisId;  
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

  #getQueryAxisItems(){
    var queryModel = this.#queryModel;
    var axisId = this.#queryAxisId;
    
    var queryAxis = queryModel.getQueryAxis(axisId);
    var items = queryAxis.getItems();
    return items;
  }

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
  
  static getSqlSelectStatement(queryModel, axisId, includeCountAll) {
    var queryAxis = queryModel.getQueryAxis(axisId);
    var queryAxisItems = queryAxis.getItems();
    if (!queryAxisItems.length) {
      return undefined;
    }
    
    var columnExpressions = TupleSet.getSqlSelectExpressions(queryModel, axisId, includeCountAll);

    var selectListExpressions = [];
    var groupByExpressions = [];
    var orderByExpressions = [];
    
    var columnIds = Object.keys(columnExpressions);
    for (var i = 0; i < columnIds.length; i++) {
      var columnId = columnIds[i];
      var columnExpression = columnExpressions[columnId];
      
      if (i >= queryAxisItems.length) {
        selectListExpressions.push(columnExpression);
        break;
      }
      selectListExpressions.push(`${columnExpression} AS ${getQuotedIdentifier(columnId)}`);
      groupByExpressions.push(columnExpression);
      
      var item = queryAxisItems[i];
      var sortDirection = item.sortDirection;
      if (!sortDirection) {
        sortDirection = 'ASC';
      }
      var orderByExpression = `${columnExpression} ${sortDirection}` ;
      orderByExpressions.push(orderByExpression);      
    }

    var datasource = queryModel.getDatasource();
    var fromClause = datasource.getFromClauseSql();
    var sql = [
      `SELECT ${selectListExpressions.join('\n,')}`,
      `${fromClause}`,
      `GROUP BY ${groupByExpressions.join('\n,')}`,
      `ORDER BY ${orderByExpressions.join('\n,')}`
    ].join('\n');
    return sql;
  }

  #getSqlSelectStatement(includeCountAll){
    var sql = TupleSet.getSqlSelectStatement(this.#queryModel, this.#queryAxisId, includeCountAll);
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
    if (this.#tupleCount === undefined) {
      
    }
    return new Promise(function(resolve, reject){
      resolve(this.#tupleCount);
    });
  }

  #loadTuples(resultSet, offset) {
    var numRows = resultSet.numRows;
    var fields = resultSet.schema.fields;
    
    this.#tupleValueFields = fields;
    
    var items = this.#getQueryAxisItems();    
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
        
    for (var i = 0; i < numRows; i++){

      var row = resultSet.get(i);
      var values = [];

      for (var j = 0; j < items.length; j++){
        var field = fields[j];
        var fieldName = field.name;
                
        values[j] = row[fieldName];
      }

      var tuple = {values: values};
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

    var queryModel = this.#queryModel;
    var datasource = queryModel.getDatasource();
    var connection = await datasource.getConnection();

    console.log(`SQL to fetch tuples for ${this.#queryAxisId} axis:`);
    console.log(axisSql);
    
    console.time(`Executing query`);
    var resultset = await connection.query(axisSql);
    console.timeEnd(`Executing query`);
    this.#loadTuples(resultset, offset);

    return resultset.numRows;
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
