class SqlQueryGenerator {

  static #getUnnestingFunctions(){
    var unnestingFunctions = {};
    Object.keys(AttributeUi.arrayDerivations).forEach(function(arrayDerivationKey){
      var arrayDerivation = AttributeUi.arrayDerivations[arrayDerivationKey];
      var unnestingFunction = arrayDerivation.unnestingFunction;
      if (!unnestingFunction){
        return;
      }
      unnestingFunctions[unnestingFunction + '()'] = arrayDerivation;
    });
    return unnestingFunctions;
  }
  
  static #getExpressionString(columnName, memberExpressionPath){
    var columnExpression = getQuotedIdentifier(columnName);
    var pathExpression = memberExpressionPath.map(function(memberExpressionPathElement){
      return `[${quoteStringLiteral( memberExpressionPathElement ) }]`
    }).join('');
    return `${columnExpression}${pathExpression}`;    
  }

  static #getMemberExpressionPathStringForPathWithUnnestingOperation(filterAxisItem){
    var memberExpressionPath = filterAxisItem.memberExpressionPath;
    if (!memberExpressionPath || !memberExpressionPath.length){
      return undefined;
    }
    var memberExpressionPathString = undefined;
    var unnestingFunctions = SqlQueryGenerator.#getUnnestingFunctions();
    for (var j = 0; j < memberExpressionPath.length; j++) {
      var memberExpressionPathElement = memberExpressionPath[j];
      if (unnestingFunctions[memberExpressionPathElement] === undefined) {
        continue;
      }
      memberExpressionPathString = SqlQueryGenerator.#getExpressionString(
        filterAxisItem.columnName, 
        memberExpressionPath
      );
      break;
    }
    return memberExpressionPathString;
  }

  static #getFilterItemsByNestingStage(filterAxisItems){
    var filterAxisItemsByNestingStage = {};
    if (!filterAxisItems){
      return filterAxisItemsByNestingStage;
    }
    
    // only retain filter items that have values
    filterAxisItems = filterAxisItems.filter(function(filterAxisItem){
      var filter = filterAxisItem.filter;
      if (!filter){
        return false;
      }
      var values = filter.values;
      if (!values){
        return false;
      }
      var keys = Object.keys(values);
      keys = keys.filter(function(key){
        var valueObject = values[key];
        return valueObject.enabled !== false;
      });
      if (!keys.length){
        return false;
      }
      return true;
    });
    
    if (!filterAxisItems.length){
      return filterAxisItemsByNestingStage;
    }

    // analyze the filter items and store them in a dict: 
    // - filter items that require unnesting are stored by memberExpressionPath
    var topLevelFilterAxisItems = [];
    var unnestingFunctions = SqlQueryGenerator.#getUnnestingFunctions();
    for (var i = 0; i < filterAxisItems.length; i++){
      var filterAxisItem = filterAxisItems[i];
      var memberExpressionPathString = SqlQueryGenerator.#getMemberExpressionPathStringForPathWithUnnestingOperation(filterAxisItem);
      if (memberExpressionPathString) {
        filterAxisItemsByNestingStage[memberExpressionPathString] = filterAxisItem;
      }
      else {
        topLevelFilterAxisItems.push(filterAxisItem);
      }
    }
    
    // - filter items that do not require unnesting are stored separateley and finally stored by path ''
    if (topLevelFilterAxisItems.length){
      filterAxisItemsByNestingStage[''] = topLevelFilterAxisItems;
    }
    return filterAxisItemsByNestingStage;
  }
  
  static #getConditionForFilterItems(filterItems, tableAlias){
    return filterItems
    .filter(function(filterItem){
      var filter = filterItem.filter;
      if (!filter) {
        return false;
      }
      
      var values = filter.values;
      if (!values){
        return false;
      }
      
      var keys = Object.keys(values);
      keys = keys.filter(function(key){
        var valueObject = values[key];
        return valueObject.enabled !== false;
      });
      if (keys.length === 0) {
        return false;
      }
      return true;
    })
    .map(function(filterItem){
      return QueryAxisItem.getFilterConditionSql(filterItem, tableAlias);
    })
    .join('\nAND ');
  }
  
  static #transformFilterItems(
    filterAxisItemsByNestingStage, 
    unnestingItemMemberExpressionPathPrefixString, 
    unnestingOperationItem, 
    cte
  ){
    var unnestingFunctions = SqlQueryGenerator.#getUnnestingFunctions();
    var unnestingFunctionNames = Object.keys(unnestingFunctions);
    var filters = [];
    
    // check each filter path to see if it matches this unnesting stage
    var filterPaths = Object.keys(filterAxisItemsByNestingStage);
    for (var i = 0; i < filterPaths.length; i++){
      var filterPath = filterPaths[i];
      if (!filterPath.startsWith(unnestingItemMemberExpressionPathPrefixString)){
        // filter path prefix does not match this path prefix, so leave it
        continue;
      }
      
      // check if there is an unnesting function in the filter, immediately after the prefix
      for (var j = 0; j < unnestingFunctionNames.length; j++){
        var unnestingFunctionName = unnestingFunctionNames[j];
        var unnestingExpression = unnestingItemMemberExpressionPathPrefixString + `['${unnestingFunctionName}']`;
        if (!filterPath.startsWith(unnestingExpression)){
          // filter path does not match this unnesting function, so try the next
          continue;
        }
        
        // this filter path matches this unnesting stage, so register that in the unnesting operation
        if (unnestingOperationItem.unnestingFunctions[unnestingFunctionName] === undefined){
          unnestingOperationItem.unnestingFunctions[unnestingFunctionName] = 0;
        }
        unnestingOperationItem.unnestingFunctions[unnestingFunctionName] += 1;
        
        // since these filter items are part of this unnesting stage, 
        // we need replace them with new filter items that reference the column of the unnested item
        var originalFilterAxisItem = filterAxisItemsByNestingStage[filterPath];
        var substituteMemberExpressionPath = originalFilterAxisItem.memberExpressionPath.slice(unnestingOperationItem.memberExpressionPath.length + 1);
        var columnExpression = [unnestingOperationItem.columnName].concat(unnestingOperationItem.memberExpressionPath);
        columnExpression.push(unnestingFunctionName);
        var filterAxisItem = Object.assign({}, originalFilterAxisItem, {
          columnName: columnExpression.join('.')
        });
        
        if (substituteMemberExpressionPath.length){
          filterAxisItem.memberExpressionPath = substituteMemberExpressionPath;
        }
        else {
          delete filterAxisItem.memberExpressionPath;
          delete filterAxisItem.derivation;
        }
        
        // now we have to check whether the remaining expressionpath of the filter item still contains unnesting expressions.
        // if it does, then we have to replace the original item in filterAxisItemsByNestingStage with the substituted one
        // if it does not, then we have to remove the path and the item from filterAxisItemsByNestingStage and add them to the cte
        var memberExpressionPathString = SqlQueryGenerator.#getMemberExpressionPathStringForPathWithUnnestingOperation(filterAxisItem);
        if (memberExpressionPathString) {
          // replace the original filter axis item with the one that substitutes the path prefix with the column name of the corresponding unnesting operation
          filterAxisItemsByNestingStage[filterPath] = filterAxisItem;
        }
        else {
          // no more unnesting operations for this filter item past this stage, so we have to apply it here.
          filters.push(filterAxisItem);
        }
      }
    }
    return filters.length ? filters : undefined;
  }
  
  static #getUnnestingStages(datasource, queryAxisItems, filterAxisItemsByNestingStage){
    var unnestingFunctions = SqlQueryGenerator.#getUnnestingFunctions();
    var dataFoundationAlias = '__huey_data_foundation';
    var fromClause = datasource.getFromClauseSql();
    
    var filterAxisItems = filterAxisItemsByNestingStage[''];
    delete filterAxisItemsByNestingStage[''];
    
    var cteIndex = 0;
    var currentItems = queryAxisItems;
    var cte, ctes = [{
      items: currentItems,
      from: `${fromClause} AS "${dataFoundationAlias}"`,
      filters: filterAxisItems,
      alias: dataFoundationAlias,
    }];
    
    // go over ctes to detect unnesting operations
    // add new cte for each new level of unnesting operation
    do {
      cte = ctes[cteIndex++];
      // at the start of a new stage, initialize
      var unnestingDerivation = undefined;
      var unnestingItem = undefined;
      var unnestingOperationItem = undefined;
      var memberPathExpressionElement;
      var unnestingItemMemberExpressionPathIndex = undefined;
      var unnestingItemMemberExpressionPathPrefix = undefined;
      var unnestingItemMemberExpressionPathPrefixString = undefined;
      var unnestingItemMemberExpression = undefined;
      var unnestingItemMemberExpressionType = undefined;
      var newItems = [];
      var filters;
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
            memberPathExpressionElement = currentItemMemberExpressionPath[j];
            unnestingDerivation = unnestingFunctions[memberPathExpressionElement];
            if (unnestingDerivation === undefined) {
              continue;
            }
            
            // we found an unnesting operation!
            unnestingItem = currentItem;
            unnestingItemMemberExpressionPathIndex = j;
            unnestingItemMemberExpressionPathPrefix = currentItemMemberExpressionPath.slice(0, j);

            unnestingItemMemberExpressionPathPrefixString = SqlQueryGenerator.#getExpressionString(
              unnestingItem.columnName, 
              unnestingItemMemberExpressionPathPrefix
            );
            
            // get the type of the array we're unnesting
            unnestingItemMemberExpressionType = getMemberExpressionType(
              currentItem.columnType, 
              unnestingItemMemberExpressionPathPrefix
            );
            // to get the element type, remove the trailing []
            unnestingItemMemberExpressionType = unnestingItemMemberExpressionType.slice(0, -2);
            
            // add an unnesting operation to the current cte.
            unnestingOperationItem = {
              isUnnestingExpression: true,
              columnName: currentItem.columnName,
              columnType: currentItem.columnType,
              elementType: unnestingItemMemberExpressionType,
              memberExpressionPath: unnestingItemMemberExpressionPathPrefix,
              // we use this to record which unnesting functions should be called at this level.
              // currently it could be either unnest(), generate_subscrips(), or both
              // at the bottem part of the outer loop, when creating items for the next cte, 
              // we count how many times there are items based on either of these functions.
              // Then, when generating SQL we figure if we have have to generate SQL expressions
              // for either or both these functions
              unnestingFunctions: {}
            };
            
            // check if there are any filter items at this unnesting level.
            filters = SqlQueryGenerator.#transformFilterItems(
              filterAxisItemsByNestingStage, 
              unnestingItemMemberExpressionPathPrefixString, 
              unnestingOperationItem, 
              cte
            );
            
            cte.items.push(unnestingOperationItem);
            break;
          }
        }

        // if there is no unnesting item, 
        // or if the current item is not part of the unnesting stage, 
        // then carry the current item and continue with the next
        if (
          !unnestingItem ||
          unnestingItemMemberExpressionPathPrefixString !== SqlQueryGenerator.#getExpressionString(
            currentItem.columnName, 
            currentItemMemberExpressionPath.slice(0, unnestingItemMemberExpressionPathIndex)
          )
        ){
          cte.items.push(currentItem);
          newItems.push(currentItem);
          continue;
        }
        
        // if we arrive here, it means the current item belongs to the current unnesting stage.
        // we already added the unnesting operation to the current cte
        // so where we add the rewritten version of the item as items for the next cte.
        
        var unnestingItemMemberExpressionPathPostfix = currentItemMemberExpressionPath.slice(unnestingItemMemberExpressionPathIndex + 1);
        memberPathExpressionElement = currentItemMemberExpressionPath[unnestingItemMemberExpressionPathIndex];
        
        if (unnestingOperationItem.unnestingFunctions[memberPathExpressionElement] === undefined){
          unnestingOperationItem.unnestingFunctions[memberPathExpressionElement] = 0;
        }
        unnestingOperationItem.unnestingFunctions[memberPathExpressionElement] += 1;
        
        unnestingDerivation = unnestingFunctions[memberPathExpressionElement];
        
        var newColumn = [].concat(unnestingItemMemberExpressionPathPrefix);
        newColumn.unshift(unnestingItem.columnName);
        newColumn.push(memberPathExpressionElement);
        var newItem = Object.assign({}, currentItem, {
          columnName: newColumn.join('.'),
          columnType: unnestingDerivation.columnType || unnestingOperationItem.elementType,
          memberExpressionPath: unnestingItemMemberExpressionPathPostfix
        });
        
        if (!unnestingItemMemberExpressionPathPostfix.length) {
          // if the unnesting operation is the terminal operation in the memberExpressionPath,
          // then the new item should be made terminal as well.
          // the unnesting operation itself is a derivation, and since that was unnested in the previous cte,
          // it must not be unnested again at a later level, so we remove that info here.
          delete newItem.derivation;
          delete newItem.memberExpressionPath;
        }
        newItems.push(newItem);
        
      } // end items loop
      
      if (unnestingItem) {
        var alias = 'cte' + cteIndex;
        ctes.push({
          items: newItems,
          alias: alias,
          from: `FROM ${cte.alias} AS "${alias}"`,
          filters: filters
        });
      }
      // if we didn't find a new unnesting stage, we are done.
    } while(unnestingItem);
    return ctes;
  }

  static #getSqlSelectStatementForFinalStage(cte, options){
    var queryAxisItems = options.queryAxisItems; 
    var includeCountAll = options.includeCountAll;
    var countAllAlias = options.countAllAlias;
    var nullsSortOrder = options.nullsSortOrder;
    var totalsPosition = options.totalsPosition;
    var samplingConfig = options.samplingConfig;
    var includeOrderBy = options.includeOrderBy === false ? false : true;
    
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
    var axisGroupByExpressions, groupByExpressions = {};
    groupByExpressions[QueryModel.AXIS_ROWS] = [];
    groupByExpressions[QueryModel.AXIS_COLUMNS] = [];
    // the groupingSets are created when we find an axis item that has includeTotals
    var axisGroupingSets, groupingSets = {};
    groupingSets[QueryModel.AXIS_ROWS] = [];
    groupingSets[QueryModel.AXIS_COLUMNS] = [];
    
    var groupingIdExpressions = [];
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
      var itemNullsSortOrder = queryAxisItem.nullsSortOrder || nullsSortOrder
      itemNullsSortOrder = itemNullsSortOrder ? ` NULLS ${itemNullsSortOrder}` : '';
      
      var axisId = queryAxisItem.axis;
      axisGroupByExpressions = groupByExpressions[axisId];
      
      if (queryAxisItem.includeTotals){
        axisGroupingSets = groupingSets[axisId];
        var groupingSet = [].concat(axisGroupByExpressions);
        axisGroupingSets.push(groupingSet);
        groupingIdExpressions.push(columnExpression);
        // store a placeholder for the groupingId expression in the order by expressions.
        // we will replace these later with expressions to sort the totals.
        orderByExpressions.push(columnExpression);
      }
      
      if (axisId !== QueryModel.AXIS_CELLS && queryAxisItem.derivation !== 'rownumber'){
        axisGroupByExpressions.push(columnExpression);
      }
      orderByExpression = `${orderByExpression} ${sortDirection}`;
      orderByExpression += itemNullsSortOrder;
      orderByExpressions.push(orderByExpression);
    }

    if (includeCountAll) {
      var countExpression = 'COUNT(*) OVER ()';
      countAllAlias = countAllAlias || countExpression;
      selectListExpressions.push(`${countExpression} AS "${countAllAlias}"`);
    }
    
    var groupByClause = undefined;
    if (groupingSets[QueryModel.AXIS_ROWS].length || groupingSets[QueryModel.AXIS_COLUMNS].length){
      axisGroupingSets = [];

      var rowsAxisGroupingSets = groupingSets[QueryModel.AXIS_ROWS];
      axisGroupByExpressions = groupByExpressions[QueryModel.AXIS_ROWS];
      if (rowsAxisGroupingSets.length) {
        if (rowsAxisGroupingSets[rowsAxisGroupingSets.length - 1].length < axisGroupByExpressions.length){
          // if we have to make grouping sets, then we need to add our "normal" group by clause too
          rowsAxisGroupingSets.push([].concat(axisGroupByExpressions));
        }
      }
      else
      if (axisGroupByExpressions.length) {
        rowsAxisGroupingSets = [axisGroupByExpressions];
      }

      var columnsAxisGroupingSets = groupingSets[QueryModel.AXIS_COLUMNS];
      axisGroupByExpressions = groupByExpressions[QueryModel.AXIS_COLUMNS];
      if (columnsAxisGroupingSets.length){
        if (columnsAxisGroupingSets[columnsAxisGroupingSets.length - 1].length < axisGroupByExpressions.length){
          // if we have to make grouping sets, then we need to add our "normal" group by clause too
          columnsAxisGroupingSets.push([].concat(axisGroupByExpressions));
        }
      }
      else
      if (axisGroupByExpressions.length) {
        columnsAxisGroupingSets = [axisGroupByExpressions];
      }

      axisGroupingSets = [].concat(rowsAxisGroupingSets, columnsAxisGroupingSets);
      rowsAxisGroupingSets.forEach(function(rowsAxisGroupingSet){
        columnsAxisGroupingSets.forEach(function(columnsAxisGroupingSet){
          axisGroupingSets.push([].concat(rowsAxisGroupingSet, columnsAxisGroupingSet));
        });
      });
      
      var groupingSetsSql = axisGroupingSets
      .map(function(groupingSet){                     // generate SQL for grouping set
        return [
          '  (',
          `    ${groupingSet.join('\n  , ')}`,
          '  )'
        ].join('\n');
      })
      .reduce(function(groupingSetsSql, groupingSql){ // deduplicate grouping sets
        if (groupingSetsSql.indexOf(groupingSql) === -1){
          groupingSetsSql.push(groupingSql);
        }
        return groupingSetsSql;
      }, [])                                          // join groups
      .join(',');
      groupByClause = `GROUPING SETS(\n${groupingSetsSql}\n)`;

      // if we have grouping sets, we need to add a GROUPING_ID expression 
      // over all grouping exprssions so we can identify which rows are super-aggregate rows
      var groupingIdAlias = getQuotedIdentifier(TupleSet.groupingIdAlias);
      var groupingIdExpression = `\n GROUPING_ID(\n   ${groupingIdExpressions.join('\n , ')}\n  ) AS ${groupingIdAlias}`;
      selectListExpressions.unshift(groupingIdExpression);

      // for each column in the grouping id, 
      // insert an order by expression to keep the totals together with the items they are totalling
      sortDirection = totalsPosition === 'AFTER' ? 'ASC' : 'DESC';
      groupingIdExpressions.forEach(function(groupingIdExpression, groupingIdExpressionIndex){
        var bitshift = groupingIdExpressions.length - groupingIdExpressionIndex - 1;
        bitshift = bitshift ? `(1 << ${bitshift})` : 1;
        orderByExpression = `${groupingIdAlias} & ${bitshift} ${sortDirection}`;
        var indexOfGroupingIdExpression = orderByExpressions.indexOf(groupingIdExpression);
        orderByExpressions[indexOfGroupingIdExpression] = `${orderByExpression}`;
      });
    }
    else
    if (groupByExpressions[QueryModel.AXIS_ROWS].length || groupByExpressions[QueryModel.AXIS_COLUMNS].length) {
      groupByClause = [].concat(
        groupByExpressions[QueryModel.AXIS_ROWS], 
        groupByExpressions[QueryModel.AXIS_COLUMNS]
      ).join('\n,');
    }

    var sql = [
      `SELECT ${selectListExpressions.join('\n,')}`,
      cte.from
    ];
    SqlQueryGenerator.#generateWhereClause(cte, sql);

    if (groupByClause) {
      groupByClause = `GROUP BY ${groupByClause}`;
      sql.push(groupByClause);
    }
    
    if (samplingConfig){
      sql.push( getUsingSampleClause(samplingConfig, true) );
    }
    if (includeOrderBy !== false) {
      sql.push(`ORDER BY ${orderByExpressions.join('\n,')}`);
    }

    sql = sql.join('\n');
    return sql;
  }

  static #getSqlSelectStatementForIntermediateStage(cte, sqlOptions){
    var unnestingFunctions = SqlQueryGenerator.#getUnnestingFunctions();
    var sql;
    var selectListExpressions = {};
    cte.items.forEach(function(item){
      if (item.isUnnestingExpression === true) {
        var itemUnnestingFunctions = item.unnestingFunctions;
        Object.keys(itemUnnestingFunctions).forEach(function(unnestingFunction){
          var arrayDerivation = unnestingFunctions[unnestingFunction];
          var expressionTemplate = arrayDerivation.expressionTemplate;
          var columnExpression = QueryAxisItem.getSqlForColumnExpression(item, cte.alias, sqlOptions);
          var unnestingExpression = extrapolateColumnExpression(expressionTemplate, columnExpression);
          var alias = [item.columnName].concat(item.memberExpressionPath, [unnestingFunction]).join('.');
          selectListExpressions[alias] = unnestingExpression;
        });
      }
      else 
      if (item.aggregator === 'count' && item.columnName === '*'){
        return;
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
    
    SqlQueryGenerator.#generateWhereClause(cte, sql);
    
    sql.unshift(`"${cte.alias}" AS (`)
    sql.push(')');
    sql = sql.join('\n');
    return sql;
  }
  
  static #generateWhereClause(cte, sql){
    var filterAxisItems = cte.filters;
    if (filterAxisItems && filterAxisItems.length){
      var whereCondition = SqlQueryGenerator.#getConditionForFilterItems(filterAxisItems, cte.alias);
      sql.push(`WHERE ${whereCondition}`);
    }
  }

  static getSqlSelectStatementForAxisItems(options){
    var queryAxisItems = options.queryAxisItems;

    if (!queryAxisItems.length) {
      return undefined;
    }

    var datasource = options.datasource; 
    var filterAxisItems = options.filterAxisItems;
    var samplingConfig = options.samplingConfig

    var sqlOptions = normalizeSqlOptions();

    var filterAxisItemsByNestingStage = SqlQueryGenerator.#getFilterItemsByNestingStage(filterAxisItems);
    var ctes = SqlQueryGenerator.#getUnnestingStages(
      datasource,
      queryAxisItems, 
      filterAxisItemsByNestingStage
    );

    var cte = ctes.pop();
    options.samplingConfig = ctes.length ? undefined : samplingConfig;
    var sql = SqlQueryGenerator.#getSqlSelectStatementForFinalStage(cte, options);
    
    var sqls = ctes.map(function(cte, index){
      options.samplingConfig = index === 0 ? samplingConfig : undefined;
      var sql = SqlQueryGenerator.#getSqlSelectStatementForIntermediateStage(cte, sqlOptions);
      return sql;
    });
    
    if (options.finalStateAsCte === true) {
      sql = sql.replace(/\n/g, '\n  ');
      sqls.push(`${getQuotedIdentifier(options.cteName)} AS (\n  ${sql}\n)`);
      sql = '';
    }
    var withSql = sqls.length ? `WITH ${sqls.join('\n,')}` : '';
    sql = withSql + sql;
    return sql;
  }

}