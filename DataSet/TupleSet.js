class TupleSet {
    
  #queryModel = undefined;
  #axisId = undefined;  

  #tuples = [];
  #tupleCount = undefined;
  #pageSize = 50;
  
  constructor(queryModel, axisId){
    this.#queryModel = queryModel;
    this.#axisId = axisId;  
  }

  getPageSize(){
    return this.#pageSize;
  }

  #getQueryAxisItems(){
    var queryModel = this.#queryModel;
    var axisId = this.#axisId;
    
    var queryAxis = queryModel.getQueryAxis(axisId);
    var items = queryAxis.getItems();
    return items;
  }

  #getSqlForAggregatedQueryAxisItem(item){
    var columnName = item.columnName;
    var quotedColumnName = getQuotedIdentifier(columnName);
    var aggregator = item.aggregator;
    var aggregatorInfo = aggregators[aggregator];
    var expressionTemplate = aggregatorInfo.expressionTemplate;
    var expression = expressionTemplate.replace(/\$\{columnName\}/g, quotedColumnName);
    return expression;
  }

  #getSqlForDerivedQueryAxisItem(item){
    var columnName = item.columnName;
    var quotedColumnName = getQuotedIdentifier(columnName);
    var derivation = item.derivation;
    var derivationInfo;
    derivationInfo = dateFields[derivation] || timeFields[derivation];
    var expressionTemplate = derivationInfo.expressionTemplate;
    var expression = expressionTemplate.replace(/\$\{columnName\}/g, quotedColumnName);
    return expression;
  }

  #getSqlSelectExpressions(includeCountAll){
    var items = this.#getQueryAxisItems();
    if (!items.length) {
      return undefined;
    }
    
    var selectListExpressions = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var columnName = item.columnName;
      var quotedColumnName = getQuotedIdentifier(columnName);
      var selectListExpression;
      if (item.aggregator) {
        selectListExpression = this.#getSqlForAggregatedQueryAxisItem(item);
      }
      else
      if (item.derivation) {
        selectListExpression = this.#getSqlForDerivedQueryAxisItem(item);
      }
      else {
        selectListExpression = quotedColumnName;
      }
      selectListExpressions.push(selectListExpression);
    }
    
    if (includeCountAll) {
      selectListExpressions.push('COUNT(*) OVER ()');
    }
    return selectListExpressions;
  }

  #getSqlSelectStatement(includeCountAll){
    var items = this.#getQueryAxisItems();
    if (!items.length) {
      return undefined;
    }
    
    var selectListExpressions = this.#getSqlSelectExpressions(includeCountAll);
    var groupByExpressions = [];
    var orderByExpressions = [];
    
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var selectListExpression = selectListExpressions[i];
      groupByExpressions.push(selectListExpression);
      var sortDirection = item.sortDirection;
      if (!sortDirection) {
        sortDirection = 'ASC';
      }
      var orderByExpression = `${selectListExpression} ${sortDirection}` ;
      orderByExpressions.push(orderByExpression);
    }
    
    var queryModel = this.#queryModel;
    var datasource = queryModel.getDatasource();
    var qualifiedObjectName = datasource.getQualifiedObjectName();
    var sql = `
      SELECT ${selectListExpressions.join('\n,')}
      FROM ${qualifiedObjectName} 
      GROUP BY ${groupByExpressions.join('\n,')}
      ORDER BY ${orderByExpressions.join('\n,')}
    `;
    return sql;
  }
  
  clear(){
    this.#tuples = [];
    this.#tupleCount = undefined;
  }
  
  getTupleCountSync() {
    return this.#tupleCount;
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
        values[j] = row[field.name];
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
    var resultset = await connection.query(axisSql);
    this.#loadTuples(resultset, offset);

    return resultset.numRows;
  }

  async getTuples(count, offset){
    var data = this.#tuples;
    var tuples = [];

    var i = 0;
    var firstIndexToFetch, lastIndexToFetch;
    while (i < count) {
      var tupleIndex = offset + i;
      var tuple = data[tupleIndex];
      tuples[i] = tuple;
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
      i += 1;
    }
    
    if (firstIndexToFetch === undefined) {
      return tuples;
    }
    
    lastIndexToFetch += 1;
    var newCount = (lastIndexToFetch - firstIndexToFetch);
    if (newCount < this.#pageSize && (offset + count === lastIndexToFetch)) {
      newCount = this.#pageSize;
    }        
    var numRows = await this.#executeAxisQuery(newCount, firstIndexToFetch);
    tuples = data.slice(offset, offset + count);
    return tuples;
  }    
  
}
