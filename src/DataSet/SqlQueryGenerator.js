class SqlQueryGenerator {

  static #getUnnestingFunctions(){
    const unnestingFunctions = {};
    Object.keys(AttributeUi.arrayDerivations).forEach(arrayDerivationKey => {
      const arrayDerivation = AttributeUi.arrayDerivations[arrayDerivationKey];
      const unnestingFunction = arrayDerivation.unnestingFunction;
      if (!unnestingFunction){
        return;
      }
      unnestingFunctions[unnestingFunction + '()'] = arrayDerivation;
    });
    return unnestingFunctions;
  }
  
  static #getExpressionString(columnName, memberExpressionPath){
    const columnExpression = quoteIdentifierWhenRequired(columnName);
    const pathExpression = memberExpressionPath.map(memberExpressionPathElement => {
      return `[${quoteStringLiteral( memberExpressionPathElement ) }]`
    }).join('');
    return `${columnExpression}${pathExpression}`;
  }

  static #getMemberExpressionPathStringForPathWithUnnestingOperation(filterAxisItem){
    const memberExpressionPath = filterAxisItem.memberExpressionPath;
    if (!memberExpressionPath || !memberExpressionPath.length){
      return undefined;
    }
    let memberExpressionPathString = undefined;
    const unnestingFunctions = SqlQueryGenerator.#getUnnestingFunctions();
    for (let j = 0; j < memberExpressionPath.length; j++) {
      const memberExpressionPathElement = memberExpressionPath[j];
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
    const filterAxisItemsByNestingStage = {};
    if (!filterAxisItems){
      return filterAxisItemsByNestingStage;
    }
    
    // only retain filter items that have values
    filterAxisItems = filterAxisItems.filter(filterAxisItem => {
      const filter = filterAxisItem.filter;
      if (!filter){
        return false;
      }
      const values = filter.values;
      if (!values){
        return false;
      }
      const keys = Object.keys(values).filter(key => {
        const valueObject = values[key];
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
    const topLevelFilterAxisItems = [];
    for (let i = 0; i < filterAxisItems.length; i++){
      const filterAxisItem = filterAxisItems[i];
      const memberExpressionPathString = SqlQueryGenerator.#getMemberExpressionPathStringForPathWithUnnestingOperation(filterAxisItem);
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
    // cull filter items that have incomplete filters
    // and filters without any enabled filter values.
    filterItems = filterItems.filter(filterItem => {
      return QueryAxisItem.isFilterItemEffective(filterItem);
    });
    
    // create SQL conditions for filter items
    const filterConditions = filterItems.map(filterItem => {
      let conditionSql;
      const queryAxisItems = filterItem.queryAxisItems;
      // this happens when the cellset generates a filter item to push down tuples, 
      // see https://github.com/rpbouman/huey/issues/134
      if (queryAxisItems) {
        const fields = filterItem.fields;
        const columns = queryAxisItems.map(queryAxisItem => {
          const columnSql = QueryAxisItem.getSqlForQueryAxisItem(queryAxisItem);
          return columnSql;
        }).join('\n, ');
        const values = filterItem.filter.values.map(tupleValues => {
          const valueList = queryAxisItems.map((queryAxisItem, index) => {
            const literalWriter = queryAxisItem.literalWriter;
            const value = tupleValues[index];
            const field = fields[index];
            return literalWriter(value, field);
          }).join(',');
          return `(${valueList})`;
        }).join('\n,');
        conditionSql = `(${columns}) IN (${values})`;
      }
      else {
        // this is the "normal", ui driven filter route.
        conditionSql = QueryAxisItem.getFilterConditionSql(filterItem, tableAlias);
      }
      return conditionSql;
    });
    
    // combine SQL conditions
    const filterCondition = filterConditions.join('\nAND ');
    
    // done.
    return filterCondition;
  }
  
  static #transformFilterItems(
    filterAxisItemsByNestingStage, 
    unnestingItemMemberExpressionPathPrefixString, 
    unnestingOperationItem, 
    cte
  ){
    const unnestingFunctions = SqlQueryGenerator.#getUnnestingFunctions();
    const unnestingFunctionNames = Object.keys(unnestingFunctions);
    const filters = [];
    
    // check each filter path to see if it matches this unnesting stage
    const filterPaths = Object.keys(filterAxisItemsByNestingStage);
    for (let i = 0; i < filterPaths.length; i++){
      const filterPath = filterPaths[i];
      //if (!filterPath.startsWith(unnestingItemMemberExpressionPathPrefixString)){
        // filter path prefix does not match this path prefix, so leave it
      //  continue;
      //}
      const originalFilterAxisItem = filterAxisItemsByNestingStage[filterPath];
      const itemPrefix = SqlQueryGenerator.#getExpressionString(
        originalFilterAxisItem.columnName,
        originalFilterAxisItem.memberExpressionPath
      );
      if (!itemPrefix.startsWith(unnestingItemMemberExpressionPathPrefixString)){
        continue;
      }
      
      // check if there is an unnesting function in the filter, immediately after the prefix
      for (let j = 0; j < unnestingFunctionNames.length; j++){
        const unnestingFunctionName = unnestingFunctionNames[j];
        const unnestingExpression = unnestingItemMemberExpressionPathPrefixString + `['${unnestingFunctionName}']`;
        if (!itemPrefix.startsWith(unnestingExpression)){
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
        const substituteMemberExpressionPath = originalFilterAxisItem.memberExpressionPath.slice(unnestingOperationItem.memberExpressionPath.length + 1);
        const columnExpression = [unnestingOperationItem.columnName].concat(unnestingOperationItem.memberExpressionPath);
        columnExpression.push(unnestingFunctionName);

        // we also need to substittue the column data type to reflect the column change.
        let substituteColumnType;
        const unnestingFunction = unnestingFunctions[unnestingFunctionName];
        if (unnestingFunction.columnType){
          substituteColumnType = unnestingFunction.columnType;
        }
        else
        if (unnestingFunction.hasElementDataType){
          substituteColumnType = getMemberExpressionType(originalFilterAxisItem.columnType, unnestingOperationItem.memberExpressionPath);
          substituteColumnType = getArrayElementType(substituteColumnType);
        }
        
        const filterAxisItem = Object.assign({}, originalFilterAxisItem, {
          columnName: columnExpression.join('.'),
          columnType: substituteColumnType
        });
        
        
        if (substituteMemberExpressionPath.length){
          filterAxisItem.memberExpressionPath = substituteMemberExpressionPath;
        }
        else {
          delete filterAxisItem.memberExpressionPath;
          if (filterAxisItem.derivation) {
            const derivationInfo = AttributeUi.getDerivationInfo(filterAxisItem.derivation);
            if (derivationInfo.unnestingFunction) {
              delete filterAxisItem.derivation;
            }
          }
        }
        
        // now we have to check whether the remaining expressionpath of the filter item still contains unnesting expressions.
        // if it does, then we have to replace the original item in filterAxisItemsByNestingStage with the substituted one
        // if it does not, then we have to remove the path and the item from filterAxisItemsByNestingStage and add them to the cte
        const memberExpressionPathString = SqlQueryGenerator.#getMemberExpressionPathStringForPathWithUnnestingOperation(filterAxisItem);
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
    const unnestingFunctions = SqlQueryGenerator.#getUnnestingFunctions();
    let alias = '__huey_data_foundation';
    const fromClause = datasource.getFromClauseSql();
    const filterAxisItems = filterAxisItemsByNestingStage[''];
    delete filterAxisItemsByNestingStage[''];
    const currentItems = queryAxisItems;
    let cte = {
      items: currentItems,
      from: `${fromClause} AS "${alias}"`,
      filters: filterAxisItems,
      alias: alias
    };
    const ctes = [cte];
    const findIndexOfRowNumberItem = function(queryAxisItem){
      return queryAxisItem.derivation === 'row number';
    };
    let indexOfRownumberItem = currentItems.findIndex(findIndexOfRowNumberItem);
    
    let newItems;
    if (indexOfRownumberItem !== -1){
      newItems = Object.assign([], currentItems);
      do {
        const rowNumberItem = newItems[indexOfRownumberItem];
        const newRowNumberItem = Object.assign({}, rowNumberItem);
        newRowNumberItem.columnName = QueryAxisItem.getSqlForQueryAxisItem(rowNumberItem);
        delete newRowNumberItem.derivation;
        newItems[indexOfRownumberItem] = newRowNumberItem;
        indexOfRownumberItem = newItems.findIndex(findIndexOfRowNumberItem);
      } while (indexOfRownumberItem !== -1);
      alias = 'cte' + (ctes.length + 1);
      ctes.push({
        items: newItems,
        alias: alias,
        from: `FROM ${cte.alias} AS "${alias}"`
      });
    }
    
    // go over ctes to detect unnesting operations
    // add new cte for each new level of unnesting operation
   let unnestingItem;
   do {
      unnestingItem = undefined;
      cte = ctes[ctes.length - 1];
      // at the start of a new stage, initialize
      let unnestingDerivation = undefined;
      let unnestingOperationItem = undefined;
      let memberPathExpressionElement;
      let unnestingItemMemberExpressionPathIndex = undefined;
      let unnestingItemMemberExpressionPathPrefix = undefined;
      let unnestingItemMemberExpressionPathPrefixString = undefined;
      let unnestingItemMemberExpression = undefined;
      let unnestingItemMemberExpressionType = undefined;
      newItems = [];
      let filters;
      const cteItems = cte.items;
      cte.items = [];
      // go over the items currently in scope
      for (let i = 0; i < cteItems.length; i++){

        const currentItem = cteItems[i];
        const derivationInfo = currentItem.derivation ? AttributeUi.getDerivationInfo(currentItem.derivation) : undefined;
        const currentItemMemberExpressionPath = currentItem.memberExpressionPath;
    
        // if there's no member expression path, this is a "normal" item (and certainly not an unnesting operation)
        if (!currentItemMemberExpressionPath) {
          cte.items.push(currentItem);
          newItems.push(currentItem);
          continue;
        }
        
        if (!unnestingItem) {
          // if we haven't found an unnesting operation yet, we go looking for
          // by examining each part of the member expression path.
          for (let j = 0; j < currentItemMemberExpressionPath.length; j++) {
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
            if (derivationInfo && (derivationInfo.hasKeyDataType || derivationInfo.hasValueDataType)) {
            }
            else {
              unnestingItemMemberExpressionType = getArrayElementType(unnestingItemMemberExpressionType);
            }
            
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
        
        const unnestingItemMemberExpressionPathPostfix = currentItemMemberExpressionPath.slice(unnestingItemMemberExpressionPathIndex + 1);
        memberPathExpressionElement = currentItemMemberExpressionPath[unnestingItemMemberExpressionPathIndex];
        
        if (unnestingOperationItem.unnestingFunctions[memberPathExpressionElement] === undefined){
          unnestingOperationItem.unnestingFunctions[memberPathExpressionElement] = 0;
        }
        unnestingOperationItem.unnestingFunctions[memberPathExpressionElement] += 1;
        unnestingDerivation = unnestingFunctions[memberPathExpressionElement];
        
        const newColumn = [].concat(unnestingItemMemberExpressionPathPrefix);
        newColumn.unshift(unnestingItem.columnName);
        newColumn.push(memberPathExpressionElement);
        const newItem = Object.assign({}, currentItem, {
          columnName: newColumn.join('.'),
          columnType: unnestingDerivation.columnType || unnestingOperationItem.elementType,
          memberExpressionPath: unnestingItemMemberExpressionPathPostfix
        });
        
        if (!unnestingItemMemberExpressionPathPostfix.length) {
          // if the unnesting operation is the terminal operation in the memberExpressionPath,
          // then the new item should be made terminal as well.
          // the unnesting operation itself is a derivation, and since that was unnested in the previous cte,
          // it must not be unnested again at a later level, so we remove that info here.
          if (newItem.derivation) {
            const newItemDerivationInfo = AttributeUi.getDerivationInfo(newItem.derivation);
            if (newItemDerivationInfo.unnestingFunction) {
              delete newItem.derivation;
            }
          }
          delete newItem.memberExpressionPath;
        }
        newItems.push(newItem);
        
      } // end items loop
      
      if (unnestingItem) {
        alias = 'cte' + (ctes.length + 1);
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
    const queryAxisItems = options.queryAxisItems; 
    const includeCountAll = options.includeCountAll;
    let countAllAlias = options.countAllAlias;
    const nullsSortOrder = options.nullsSortOrder;
    const totalsPosition = options.totalsPosition;
    const includeOrderBy = options.includeOrderBy === false ? false : true;
    const useLateralColumnAlias = options.useLateralColumnAlias === false ? false : true;    
    const columnExpressions = {};
    cte.items.forEach((item, index) => {
      const originalItem = queryAxisItems[index];
      const caption = QueryAxisItem.getCaptionForQueryAxisItem(originalItem);
      const selectListExpression = QueryAxisItem.getSqlForQueryAxisItem(item, cte.alias);
      columnExpressions[caption] = selectListExpression;
    });
    
    const selectListExpressions = [];

    // the group by expression includes expressons for all axis items.
    let axisGroupByExpressions;
    
    const groupByExpressions = {};
    groupByExpressions[QueryModel.AXIS_ROWS] = [];
    groupByExpressions[QueryModel.AXIS_COLUMNS] = [];
    
    // the groupingSets are created when we find an axis item that has includeTotals
    let axisGroupingSets;
    
    const groupingSets = {};
    groupingSets[QueryModel.AXIS_ROWS] = [];
    groupingSets[QueryModel.AXIS_COLUMNS] = [];
    
    const groupingIdExpressions = [];
    const orderByExpressions = [];
    
    const columnIds = Object.keys(columnExpressions);
    for (let i = 0; i < columnIds.length; i++) {
      const columnId = columnIds[i];
      const columnExpression = columnExpressions[columnId];
      const columnAlias = quoteIdentifierWhenRequired(columnId);
      
      // TODO: see https://github.com/rpbouman/huey/issues/401
      // we should check if it's safe to use a column alias. 
      // if the alias is identical to the name of a column, then we probably shouldn't use an alias
      const columnExpressionReference = useLateralColumnAlias ? columnAlias : columnExpression;
      
      if (includeCountAll && i >= queryAxisItems.length) {
        // when includeCountAll is true, we generate one extra count() over () expression
        // we need that count all to figure out how many tuples there are on the axis in total
        selectListExpressions.push(columnExpression);
        // since this does not correspond to an actual query item, we whould leave immediately after
        break;
      }
      
      selectListExpressions.push(`${columnExpression} AS ${columnAlias}`);
      const queryAxisItem = queryAxisItems[i];
      const axisId = queryAxisItem.axis;
      if (axisId === QueryModel.AXIS_CELLS){
        continue;
      }
      
      const sortDirection = queryAxisItem.sortDirection || 'ASC';
      let itemNullsSortOrder = queryAxisItem.nullsSortOrder || nullsSortOrder
      itemNullsSortOrder = itemNullsSortOrder ? ` NULLS ${itemNullsSortOrder}` : '';
      
      axisGroupByExpressions = groupByExpressions[axisId];
      
      if (queryAxisItem.includeTotals){
        // make a grouping set for the group by expression up to this point
        const groupingSet = [].concat(axisGroupByExpressions);
        axisGroupingSets = groupingSets[axisId];
        axisGroupingSets.push(groupingSet);
        
        // each totals column needs to be included in a grouping id expression
        // so we can figure out which result rows are totals (and for what group).
        
        // adding columnExpression rather than reference, see https://github.com/rpbouman/huey/issues/401 
        groupingIdExpressions.push(columnExpression);
        
        // store a placeholder for the groupingId expression in the order by expressions.
        // we will replace these later with expressions to sort the totals.
        orderByExpressions.push(columnExpression);
      }
      
      // adding columnExpression rather than reference, see https://github.com/rpbouman/huey/issues/401 
      axisGroupByExpressions.push(columnExpression);
      
      let orderByExpression = `${columnExpressionReference} ${sortDirection}`;
      orderByExpression += itemNullsSortOrder;
      orderByExpressions.push(orderByExpression);
    }

    if (includeCountAll) {
      const countExpression = 'COUNT(*) OVER ()';
      countAllAlias = countAllAlias || countExpression;
      selectListExpressions.push(`${countExpression} AS "${countAllAlias}"`);
    }
    
    let groupByClause = undefined;
    if (groupingSets[QueryModel.AXIS_ROWS].length || groupingSets[QueryModel.AXIS_COLUMNS].length){
      axisGroupingSets = [];

      const rowsAxisGroupingSets = groupingSets[QueryModel.AXIS_ROWS];
      axisGroupByExpressions = groupByExpressions[QueryModel.AXIS_ROWS];
      if (rowsAxisGroupingSets.length) {
        if (rowsAxisGroupingSets[rowsAxisGroupingSets.length - 1].length < axisGroupByExpressions.length){
          // if we have to make grouping sets, then we need to add our "normal" group by clause too
          rowsAxisGroupingSets.push([].concat(axisGroupByExpressions));
        }
      }
      else
      if (axisGroupByExpressions.length) {
        rowsAxisGroupingSets.push(axisGroupByExpressions);
      }

      const columnsAxisGroupingSets = groupingSets[QueryModel.AXIS_COLUMNS];
      axisGroupByExpressions = groupByExpressions[QueryModel.AXIS_COLUMNS];
      if (columnsAxisGroupingSets.length){
        if (columnsAxisGroupingSets[columnsAxisGroupingSets.length - 1].length < axisGroupByExpressions.length){
          // if we have to make grouping sets, then we need to add our "normal" group by clause too
          columnsAxisGroupingSets.push([].concat(axisGroupByExpressions));
        }
      }
      else
      if (axisGroupByExpressions.length) {
        columnsAxisGroupingSets.push(axisGroupByExpressions);
      }

      if (rowsAxisGroupingSets.length && columnsAxisGroupingSets.length) {
        axisGroupingSets = [];
        rowsAxisGroupingSets.forEach(rowsAxisGroupingSet => {
          columnsAxisGroupingSets.forEach((columnsAxisGroupingSet) => {
            axisGroupingSets.push([].concat(rowsAxisGroupingSet, columnsAxisGroupingSet));
          });
        });
      }
      else 
      if (rowsAxisGroupingSets.length){
        axisGroupingSets = rowsAxisGroupingSets;
      }
      else
      if (columnsAxisGroupingSets.length){
        axisGroupingSets = columnsAxisGroupingSets;
      }
      
      const groupingSetsSql = axisGroupingSets
      .map(groupingSet => {                     // generate SQL for grouping set
        return [
          '  (',
          `    ${groupingSet.join('\n  , ')}`,
          '  )'
        ].join('\n');
      })
      .join(',');
      groupByClause = `GROUPING SETS(\n${groupingSetsSql}\n)`;

      // if we have grouping sets, we need to add a GROUPING_ID expression 
      // over all grouping exprssions so we can identify which rows are super-aggregate rows
      const groupingIdAlias = quoteIdentifierWhenRequired(TupleSet.groupingIdAlias);
      const groupingIdExpression = `\n GROUPING_ID(\n   ${groupingIdExpressions.join('\n , ')}\n  ) AS ${groupingIdAlias}`;
      selectListExpressions.unshift(groupingIdExpression);

      // for each column in the grouping id, 
      // insert an order by expression to keep the totals together with the items they are totalling
      let sortDir = totalsPosition === 'AFTER' ? 'ASC' : 'DESC';
      groupingIdExpressions.forEach((groupingIdExpression, groupingIdExpressionIndex) => {
        var bitshift = groupingIdExpressions.length - groupingIdExpressionIndex - 1;
        bitshift = bitshift ? `(1 << ${bitshift})` : 1;
        const orderByExpression = `${groupingIdAlias} & ${bitshift} ${sortDir}`;
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

    let sql = [
      `SELECT ${selectListExpressions.join('\n,')}`,
      cte.from
    ];
    SqlQueryGenerator.#generateWhereClause(cte, sql);

    if (groupByClause) {
      groupByClause = `GROUP BY ${groupByClause}`;
      sql.push(groupByClause);
    }
        
    if (includeOrderBy !== false && orderByExpressions.length) {
      sql.push(`ORDER BY ${orderByExpressions.join('\n,')}`);
    }

    sql = sql.join('\n');
    return sql;
  }

  static #getSqlSelectStatementForIntermediateStage(cte, sqlOptions){
    const unnestingFunctions = SqlQueryGenerator.#getUnnestingFunctions();
    const selectListExpressions = {};
    cte.items.forEach(item => {
      if (item.isUnnestingExpression === true) {
        const itemUnnestingFunctions = item.unnestingFunctions;
        Object.keys(itemUnnestingFunctions).forEach(unnestingFunction => {
          const arrayDerivation = unnestingFunctions[unnestingFunction];
          const expressionTemplate = arrayDerivation.expressionTemplate;
          const columnExpression = QueryAxisItem.getSqlForColumnExpression(item, cte.alias, sqlOptions);
          const unnestingExpression = extrapolateColumnExpression(expressionTemplate, columnExpression);
          const alias = [item.columnName].concat(item.memberExpressionPath, [unnestingFunction]).join('.');
          selectListExpressions[alias] = unnestingExpression;
        });
      }
      else 
      if (item.derivation === 'row number') {
        const rowNumberSql = QueryAxisItem.getSqlForQueryAxisItem(item);
        selectListExpressions[rowNumberSql] = rowNumberSql;
      }
      else
      if (item.aggregator === 'count' && item.columnName === '*'){
        return;
      }
      else {
        const column = item.alias || item.columnName;
        if (selectListExpressions[column] === undefined) {
          selectListExpressions[column] = getQualifiedIdentifier(cte.alias, item.columnName);
        }
      }
    });
    const sqlSelectList = Object.keys(selectListExpressions).map(columnId => {
      return `${selectListExpressions[columnId]} AS ${quoteIdentifierWhenRequired(columnId)}`
    });
    const sql = [
      `SELECT ${sqlSelectList.join('\n,')}`,
      cte.from
    ];
    
    SqlQueryGenerator.#generateWhereClause(cte, sql);
    
    const samplingConfig = sqlOptions.samplingConfig;
    if (samplingConfig){
      sql.push( getUsingSampleClause(samplingConfig, true) );
    }

    sql.unshift(`"${cte.alias}" AS (`)
    sql.push(')');
    const sqlText = sql.join('\n');
    return sqlText;
  }
  
  static #generateWhereClause(cte, sql){
    const filterAxisItems = cte.filters;
    if (!filterAxisItems) {
      return;
    }
    if (!filterAxisItems.length){
      return;
    }
    const whereCondition = SqlQueryGenerator.#getConditionForFilterItems(filterAxisItems, cte.alias);
    sql.push(`WHERE ${whereCondition}`);
  }

  static getSqlSelectStatementForAxisItems(options){
    const queryAxisItems = options.queryAxisItems;

    if (!queryAxisItems.length) {
      return undefined;
    }

    const datasource = options.datasource; 
    const filterAxisItems = options.filterAxisItems;
    const samplingConfig = options.samplingConfig

    const sqlOptions = normalizeSqlOptions(options.sqlOptions);

    const filterAxisItemsByNestingStage = SqlQueryGenerator.#getFilterItemsByNestingStage(filterAxisItems);
    const ctes = SqlQueryGenerator.#getUnnestingStages(
      datasource,
      queryAxisItems, 
      filterAxisItemsByNestingStage
    );

    const cte = ctes.pop();
    options.samplingConfig = ctes.length ? undefined : samplingConfig;
    let sql = SqlQueryGenerator.#getSqlSelectStatementForFinalStage(cte, options);
    
    const sqls = ctes.map((cte, index) => {
      sqlOptions.samplingConfig = index === 0 ? samplingConfig : undefined;
      const sql = SqlQueryGenerator.#getSqlSelectStatementForIntermediateStage(cte, sqlOptions);
      return sql;
    });
    
    if (options.finalStateAsCte === true) {
      sql = sql.replace(/\n/g, '\n  ');
      sqls.push(`${quoteIdentifierWhenRequired(options.cteName)} AS (\n  ${sql}\n)`);
      sql = '';
    }
    const withSql = sqls.length ? `WITH ${sqls.join('\n,')}\n` : '';
    sql = withSql + sql;
    return sql;
  }

}