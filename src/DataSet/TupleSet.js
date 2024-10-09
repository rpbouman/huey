class TupleSet extends DataSetComponent {

  static groupingIdAlias = '__huey_grouping_id';
   
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
    var sqlOptions = normalizeSqlOptions();
    var queryAxis = queryModel.getQueryAxis(axisId);
    var queryAxisItems = queryAxis.getItems();
    if (!queryAxisItems.length) {
      return undefined;
    }
    
    var dataFoundationAlias = '__huey_data_foundation';
    var datasource = queryModel.getDatasource();
    var fromClause = datasource.getFromClauseSql(dataFoundationAlias);
        
    var unnestingFunctions = {};
    Object.keys(AttributeUi.arrayDerivations).forEach(function(arrayDerivationKey){
      var arrayDerivation = AttributeUi.arrayDerivations[arrayDerivationKey];
      var unnestingFunction = arrayDerivation.unnestingFunction;
      if (!unnestingFunction){
        return;
      }
      unnestingFunctions[unnestingFunction + '()'] = arrayDerivation;
    });

    // analyze the filter items and store them in a dict: 
    // - filter items that require unnesting are stored by memberExpressionPath
    var filterAxis = queryModel.getFiltersAxis();
    var filterAxisItems = filterAxis.getItems();
    var filterAxisItemsByNestingStage = {};
    _filterAxisIems: for (var i = 0; i < filterAxisItems.length; i++){
      var filterAxisItem = filterAxisItems[i];
      var memberExpressionPath = filterAxisItem.memberExpressionPath;
      var memberExpressionPathString = undefined;
      if (memberExpressionPath){
        _memberExpressionPath: for (var j = 0; j < memberExpressionPath.length; j++) {
          var memberExpressionPathElement = memberExpressionPath[j];
          if (unnestingFunctions[memberPathExpressionElement] === undefined) {
            continue;
          }
          memberExpressionPathString = [filterAxisItem.columnName].concat(memberExpressionPath).join('.');
          break;
        }
      }
      
      if (!memberExpressionPathString) {
        memberExpressionPathString = '';
      }
      
      var filterAxisItemsForStage = filterAxisItemsByNestingStage[memberExpressionPathString];
      if (!filterAxisItemsForStage) {
        filterAxisItemsForStage = [];
        filterAxisItemsByNestingStage[memberExpressionPathString] = filterAxisItemsForStage;
      }
      filterAxisItemsForStage.push(filterAxisItem);
    }      
    
    var filterConditions, whereClause = undefined;
    
    filterAxisItems = filterAxisItemsByNestingStage[''];
    if (filterAxisItems && filterAxisItems.length) {
      filterConditions = filterAxisItems.map(function(filterAxisItem){
        return QueryAxisItem.getFilterConditionSql(filterAxisItem, dataFoundationAlias);
      });      
      whereClause = filterConditions.join('\nAND ');
    }
    
    var cteIndex = 0;
    var currentItems = queryAxisItems;
    var cte, ctes = [{
      items: currentItems,
      from: fromClause,
      where: whereClause,
      alias: dataFoundationAlias,
    }];
    
    // go over ctes to detect unnesting operations
    // add new cte for each new level of unnesting operation
    do {
      cte = ctes[cteIndex++];
      // at the start of a new stage, initialize
      var unnestingItem = undefined;
      var unnestingOperationItem = undefined;
      var unnestingItemMemberExpressionPathIndex = undefined;
      var unnestingItemMemberExpressionPathPrefix = undefined;
      var unnestingItemMemberExpressionPathPrefixString = undefined;
      var newItems = [];

      var currentItems = cte.items;
      cte.items = [];
      // go over the items currently in scope
      for (var i = 0; i < currentItems.length; i++){

        var currentItem = currentItems[i];
        var currentItemMemberExpressionPath = currentItem.memberExpressionPath;
    
        // if there's no member expression path, this is a "normal" item (and certainly not an unnesting operation)
        if (!currentItemMemberExpressionPath) {
          cte.items.push(currentItem);
          newItems.push(currentItem);
          continue;
        }
        
        if (!unnestingItem) {
          // if we haven't found an unnesting operation yet, we go looking for
          // by examining each part of the member expression path.
          for (var j = 0; j < currentItemMemberExpressionPath.length; j++) {
            var memberPathExpressionElement = currentItemMemberExpressionPath[j];
            if (unnestingFunctions[memberPathExpressionElement] === undefined) {
              continue;
            }
            // we found an unnesting operation!
            unnestingItem = currentItem;
            unnestingItemMemberExpressionPathIndex = j;
            unnestingItemMemberExpressionPathPrefix = currentItemMemberExpressionPath.slice(0, j);
            unnestingItemMemberExpressionPathPrefixString = unnestingItemMemberExpressionPathPrefix.join('.');
            
            // add an unnesting operation to the current cte.
            unnestingOperationItem = {
              isUnnestingExpression: true,
              columnName: currentItem.columnName,
              memberExpressionPath: unnestingItemMemberExpressionPathPrefix,
              unnestingFunction: memberPathExpressionElement,
              alias: [
                currentItem.columnName, 
                unnestingItemMemberExpressionPathPrefixString, 
                currentItemMemberExpressionPath[j]
              ].join('.')
            };
            cte.items.push(unnestingOperationItem);
            
            break;
          }
        }

        // if there is no unnesting item, 
        // or if the current item is not part of the unnesting stage, 
        // then carry the current item and continue with the next
        if (
          !unnestingItem || 
          currentItem.columnName !== unnestingItem.columnName ||
          unnestingItemMemberExpressionPathPrefixString !== currentItemMemberExpressionPath.slice(0, unnestingItemMemberExpressionPathIndex).join('.')
        ){
          cte.items.push(currentItem);
          newItems.push(currentItem);
          continue;
        }
        
        // if we arrive here, it means the current item belongs to the current unnesting stage.
        // we already added the unnesting operation to the current cte
        // so where we add the rewritten version of the item as items for the next cte.
        var unnestingItemMemberExpressionPathPostfix = currentItemMemberExpressionPath.slice(unnestingItemMemberExpressionPathIndex + 1);
        var newItem = Object.assign({}, currentItem, {
          columnName: unnestingOperationItem.alias,
          memberExpressionPath: unnestingItemMemberExpressionPathPostfix
        });
        newItems.push(newItem);
        
      } // end items loop
      
      if (unnestingItem) {
        var alias = 'cte' + cteIndex;
        ctes.push({
          items: newItems,
          alias: alias,
          from: `FROM ${cte.alias} AS "${alias}"`
        });
      }
      // if we didn't find a new unnesting stage, we are done.
    } while(unnestingItem);

    
    var cte = ctes.pop();
    var sql = '';
    var columnExpressions = {};
    cte.items.forEach(function(item, index){
      var originalItem = queryAxisItems[index];
      var caption = QueryAxisItem.getCaptionForQueryAxisItem(originalItem);
      var selectListExpression = QueryAxisItem.getSqlForQueryAxisItem(item, cte.alias);
      columnExpressions[caption] = selectListExpression;
    });
    
    var selectListExpressions = [];

    // the group by expression includes expressons for all axis items.
    var groupByExpressions = [];

    // the groupingSets are created when we find an axis item that has includeTotals
    var groupingSets = [];
    
    var orderByExpressions = [];
    
    var columnIds = Object.keys(columnExpressions);
    var queryAxisItem;
    for (var i = 0; i < columnIds.length; i++) {
      var columnId = columnIds[i];
      var columnExpression = columnExpressions[columnId];
      var orderByExpression = columnExpression;
      
      if (includeCountAll && i >= queryAxisItems.length) {
        // when includeCountAll is true, we generate one extra count() over () expression
        // we need that count all to figure out how many tuples there are on the axis in total
        selectListExpressions.push(columnExpression);
        // since this does not correspond to an actual query item, we whould leave immediately after
        break;
      }
      
      selectListExpressions.push(`${columnExpression} AS ${getQuotedIdentifier(columnId)}`);
      var queryAxisItem = queryAxisItems[i];
      var sortDirection = queryAxisItem.sortDirection || 'ASC';
      
      if (queryAxisItem.includeTotals){
        var groupingSet = [].concat(groupByExpressions, [columnExpression]);
        groupingSets.push(groupingSet);
        
        // if we have an axis item with includeTotals, then we want the super-aggregate rows (the totels) 
        // to appear directly below the group of rows with a particular column value.
        // but because the total row has a NULL their, it will sort lower than anything else.
        // changing the order by expresison to MAX fixes that as it will get the value of the row that sorted last.
        // (there are still some issues when you have actual NULL values in the column but we'll get to that later).
        var orderByAggregate = 'MAX';
        orderByExpression = `${orderByAggregate}( ${orderByExpression} )`;
      }
      
      groupByExpressions.push(columnExpression);      
      orderByExpressions.push(`${orderByExpression} ${sortDirection}`);
    }
    
    if (groupingSets.length){
      if (groupingSets[groupingSets.length - 1].length < groupByExpressions.length){
        // if we have to make grouping sets, then we need to add our "normal" group by clause too
        groupingSets.push([].concat(groupByExpressions));
      }
      // if we have grouping sets, we need to add a GROUPING_ID expression with the largest grouping set so we can identify which rows are super-aggregate rows
      var groupingIdAlias = getQuotedIdentifier(TupleSet.groupingIdAlias);
      var groupingIdExpression = `GROUPING_ID( ${groupByExpressions.join(',')} ) AS ${groupingIdAlias}`;
      selectListExpressions.unshift(groupingIdExpression);
      orderByExpressions.push(`${groupingIdAlias} ASC`);
    }

    if (includeCountAll) {
      var countExpression = 'COUNT(*) OVER ()';
      selectListExpressions.push(`${countExpression} AS "${countExpression}"`);
    }

    var sql = [
      `SELECT ${selectListExpressions.join('\n,')}`,
      cte.from
    ];
    if (cte.where) {
      sql.push(`WHERE ${cte.where}`);
    }
    
    var groupByClause = `GROUP BY `;
    if (groupingSets.length > 1) {
      groupByClause += 'GROUPING SETS(\n' + groupingSets.map(function(groupingSet){
        return [
          '  (',
          `    ${groupingSet.join('\n  , ')}`,
          '  )'
        ].join('\n');
      }).join(',') + '\n)';
    }
    else {
      groupByClause += groupByExpressions.join('\n,');
    }
    sql.push(groupByClause);
    sql.push(`ORDER BY ${orderByExpressions.join('\n,')}`);
    sql = sql.join('\n');
        
    
    var sqls = ctes.map(function(cte){
      var sql;
      var selectListExpressions = {};
      cte.items.forEach(function(item){
        if (item.isUnnestingExpression === true) {
          var arrayDerivation = unnestingFunctions[item.unnestingFunction];
          var expressionTemplate = arrayDerivation.expressionTemplate;
          var columnExpression = QueryAxisItem.getSqlForColumnExpression(item, cte.alias, sqlOptions);
          var unnestingExpression = extrapolateColumnExpression(expressionTemplate, columnExpression);
          selectListExpressions[item.alias] = unnestingExpression;
        }
        else {
          var column = item.alias || item.columnName;
          if (selectListExpressions[column] === undefined) {
            selectListExpressions[column] = getQualifiedIdentifier(cte.alias, item.columnName);
          }
        }
      });
      var sqlSelectList = Object.keys(selectListExpressions).map(function(columnId){
        return `${selectListExpressions[columnId]} AS ${getQuotedIdentifier(columnId)}`
      });
      sql = [
        `SELECT ${sqlSelectList.join('\n,')}`,
        cte.from
      ];
      if (cte.where){
        sql.push(`WHERE ${cte.where}`);
      }
      sql.unshift(`"${cte.alias}" AS (`)
      sql.push(')');
      sql = sql.join('\n');
      return sql;
    });

    if (sqls.length) {
      sql = `WITH ${sqls.join('\n,')}\n${sql}`;
    }
    
    return sql;
  }
      
  static getSqlSelectStatementYYY(queryModel, axisId, includeCountAll) {
    // this is here just for testing and development
    var tmp = TupleSet.getSqlSelectStatementXXX(queryModel, axisId, includeCountAll);
    
    var queryAxis = queryModel.getQueryAxis(axisId);
    var queryAxisItems = queryAxis.getItems();
    if (!queryAxisItems.length) {
      return undefined;
    }
    
    var columnExpressions = TupleSet.getSqlSelectExpressions(queryModel, axisId, includeCountAll);

    var selectListExpressions = [];

    // the group by expression includes expressons for all axis items.
    var groupByExpressions = [];

    // the groupingSets are created when we find an axis item that has includeTotals
    var groupingSets = [];
    
    var orderByExpressions = [];
    
    var columnIds = Object.keys(columnExpressions);
    var queryAxisItem;
    for (var i = 0; i < columnIds.length; i++) {
      var columnId = columnIds[i];
      var columnExpression = columnExpressions[columnId];
      var orderByExpression = columnExpression;
      
      if (includeCountAll && i >= queryAxisItems.length) {
        // when includeCountAll is true, we generate one extra count() over () expression
        // we need that count all to figure out how many tuples there are on the axis in total
        selectListExpressions.push(columnExpression);
        // since this does not correspond to an actual query item, we whould leave immediately after
        break;
      }
      
      selectListExpressions.push(`${columnExpression} AS ${getQuotedIdentifier(columnId)}`);
      var queryAxisItem = queryAxisItems[i];
      var sortDirection = queryAxisItem.sortDirection || 'ASC';
      
      if (queryAxisItem.includeTotals){
        /*
        var groupingSet = [].concat(
          groupByExpressions, 
          columnIds
          .slice(i+1, includeCountAll ? -1 : undefined)
          .filter(function(columnId, i){
            var indexOfQueryAxisItem = columnIds.indexOf(columnId);
            var queryAxisItem = queryAxisItems[indexOfQueryAxisItem];
            return !queryAxisItem.includeTotals;
          })
          .map(function(columnId){
            return columnExpressions[columnId];
          })
        );
        */
        var groupingSet = [].concat(groupByExpressions, [columnExpression]);
        groupingSets.push(groupingSet);
        
        // if we have an axis item with includeTotals, then we want the super-aggregate rows (the totels) 
        // to appear directly below the group of rows with a particular column value.
        // but because the total row has a NULL their, it will sort lower than anything else.
        // changing the order by expresison to MAX fixes that as it will get the value of the row that sorted last.
        // (there are still some issues when you have actual NULL values in the column but we'll get to that later).
        var orderByAggregate = 'MAX';
        orderByExpression = `${orderByAggregate}( ${orderByExpression} )`;
      }
      
      groupByExpressions.push(columnExpression);      
      orderByExpressions.push(`${orderByExpression} ${sortDirection}`);
    }
    
    if (groupingSets.length){
      if (groupingSets[groupingSets.length - 1].length < groupByExpressions.length){
        // if we have to make grouping sets, then we need to add our "normal" group by clause too
        groupingSets.push([].concat(groupByExpressions));
      }
      // if we have grouping sets, we need to add a GROUPING_ID expression with the largest grouping set so we can identify which rows are super-aggregate rows
      var groupingIdAlias = getQuotedIdentifier(TupleSet.groupingIdAlias);
      var groupingIdExpression = `GROUPING_ID( ${groupByExpressions.join(',')} ) AS ${groupingIdAlias}`;
      selectListExpressions.unshift(groupingIdExpression);
      orderByExpressions.push(`${groupingIdAlias} ASC`);
    }

    var datasource = queryModel.getDatasource();
    var fromClause = datasource.getFromClauseSql();
    var sql = [
      `SELECT ${selectListExpressions.join('\n,')}`,
      fromClause
    ];
    var filterCondition = queryModel.getFilterConditionSql();
    if (filterCondition){
      sql.push(`WHERE ${filterCondition}`);
    }
    
    var groupByClause = `GROUP BY `;
    if (groupingSets.length > 1) {
      groupByClause += 'GROUPING SETS(\n' + groupingSets.map(function(groupingSet){
        return [
          '  (',
          `    ${groupingSet.join('\n  , ')}`,
          '  )'
        ].join('\n');
      }).join(',') + '\n)';
    }
    else {
      groupByClause += groupByExpressions.join('\n,');
    }
    sql.push(groupByClause);
    sql.push(`ORDER BY ${orderByExpressions.join('\n,')}`);
    sql = sql.join('\n');
    return sql;
  }
   
  #queryAxisId = undefined;

  #tuples = [];
  #tupleValueFields = [];
  
  #tupleCount = undefined;
  #pageSize = 50;
  
  constructor(queryModel, axisId){
    super(queryModel);
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

  getQueryAxisItems(){
    var queryModel = this.getQueryModel();
    var axisId = this.#queryAxisId;
    
    var queryAxis = queryModel.getQueryAxis(axisId);
    var items = queryAxis.getItems();
    return items;
  }

  #getSqlSelectStatement(includeCountAll, values){
    var queryModel = this.getQueryModel();
    if (!queryModel) {
      return undefined;
    }
    var sql = TupleSet.getSqlSelectStatement(
      queryModel, 
      this.#queryAxisId, 
      includeCountAll, 
      values
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
    if (this.#tupleCount === undefined) {
      
    }
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
