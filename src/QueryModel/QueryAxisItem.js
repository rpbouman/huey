class QueryAxisItem {

  static createFormatter(axisItem){
    let dataType = QueryAxisItem.getQueryAxisItemDataType(axisItem);
    if (axisItem.aggregator) {
      const aggregatorInfo = AttributeUi.aggregators[axisItem.aggregator];
      if (aggregatorInfo.createFormatter){
        return aggregatorInfo.createFormatter(axisItem);
      }
      else
      if (aggregatorInfo.columnType) {
        dataType = aggregatorInfo.columnType;
      }
      else
      if (aggregatorInfo.preservesColumnType) {
        // okay, noop
      }
      else {
        //todo.
      }
    }
    else
    if (axisItem.derivation){
      const derivationInfo = AttributeUi.getDerivationInfo(axisItem.derivation);
      if (derivationInfo.createFormatter) {
        return derivationInfo.createFormatter(axisItem);
      }
      else
      if (derivationInfo.columnType){
        dataType = derivationInfo.columnType;
      }
    }

    if (dataType) {
      const dataTypeInfo = getDataTypeInfo(dataType);
      if (dataTypeInfo) {
        if (dataTypeInfo.createFormatter){
          return dataTypeInfo.createFormatter(axisItem);
        }
      }
      else {
        console.error(`No data type info found for ${dataType}`);
      }
    }
    else{
      console.warn(`No data type for axisItem "${QueryAxisItem.getCaptionForQueryAxisItem(axisItem)}".`);
    }

    console.warn(`Using fallback formatter for axisItem ${QueryAxisItem.getCaptionForQueryAxisItem(axisItem)}`);
    return fallbackFormatter;
  }

  static createParser(axisItem){
    if (axisItem.derivation){
      const derivationInfo = AttributeUi.getDerivationInfo(axisItem.derivation);
      if (derivationInfo.createParser) {
        return derivationInfo.createParser(axisItem);
      }
    }
  }

  static createLiteralWriter(axisItem){
    const dataType = QueryAxisItem.getQueryAxisItemDataType(axisItem);
    if (!dataType) {
      // this may happen in case the item has an aggregator like sum() - in these cases we don't know what the datatype of the resulting values will be.
      // we need to find a better solution for this but for now just bail out - we currently don't need a literalwriter for aggregated values.
      return null;
    }
    const dataTypeInfo = getDataTypeInfo(dataType);
    if (dataTypeInfo && typeof dataTypeInfo.createLiteralWriter === 'function') {
      return dataTypeInfo.createLiteralWriter(dataTypeInfo, dataType);
    }
    return null;
  }

  static getLiteralWriter(axisItem) {
    let literalWriter = axisItem.literalWriter;
    if (literalWriter) {
      return literalWriter;
    }
    literalWriter = QueryAxisItem.createLiteralWriter(axisItem);
    return literalWriter;
  }

  static getCaptionForQueryAxisItem(axisItem){
    let caption = axisItem.caption;
    if (caption){
      return caption;
    }
    caption = QueryAxisItem.createCaptionForQueryAxisItem(axisItem);
    if (axisItem.axis !== QueryModel.AXIS_FILTERS) {
      return caption;
    }

    let filterItemCaption = `: No filters set.`;
    const filter = axisItem.filter;
    if (filter) {
      const values = filter.values;
      if (values) {
        const valueKeys = Object.keys(values);
        if (valueKeys.length){
          const valueLabels = [];
          const toValues = filter.toValues;
          const toValueKeys = toValues? Object.keys(toValues) : undefined;
          for (let i = 0; i < valueKeys.length; i++){
            const valueKey = valueKeys[i];
            const valueObject = values[valueKey];
            let valueLabel = valueObject.label;
            if (toValueKeys && i < toValueKeys.length){
              const toValueKey = toValueKeys[i];
              const toValueObject = toValues[toValueKey];
              valueLabel += ' - ' + toValueObject.label;
            }
            valueLabels.push(valueLabel);
          }
          filterItemCaption = ` ${filter.filterType} ${valueLabels.join('\n')}`;
        }
      }
    }

    caption = `${caption}${filterItemCaption}`
    return caption;
  }

  static createCaptionForQueryAxisItem(axisItem){
    let caption = axisItem.columnName;
    if (axisItem.memberExpressionPath) {
      const path = Object.assign([], axisItem.memberExpressionPath);
      switch (axisItem.derivation) {
        case 'elements':
        case 'element indices':
          path.pop();
      }
      caption = `${caption}.${path.join('.')}`;
    }

    if (axisItem.derivation) {
      const translatedDerivation = Internationalization.getText(axisItem.derivation);
      if (caption) {
        caption = Internationalization.getText('{1} of {2}', translatedDerivation, caption);
      }
      else {
        caption = translatedDerivation;
      }
    }
    else
    if (axisItem.aggregator) {
      const translatedAggregator = Internationalization.getText(axisItem.aggregator);
      if (caption) {
        caption = Internationalization.getText('{1} of {2}', translatedAggregator, caption);
      }
      else {
        caption = translatedAggregator;
      }
      if (Boolean(axisItem.partitionByItems)){
        const partitionByItemCaptions = axisItem.partitionByItems
          .map(item => QueryAxisItem.getCaptionForQueryAxisItem(item))
          .join(',')
        ;
        caption += ` OVER (${partitionByItemCaptions})`;
      }
    }
    return caption;
  }

  static getIdForQueryAxisItem(axisItem){
    // see issue https://github.com/rpbouman/huey/issues/352
    // only the sql expression is not enough to identify an Item
    // some items may have identical SQL, but a different formatter
    // the caption should be unique but to be on the safe side
    // we'll take the combination of sql expression and caption
    // and we'll stylize it as an aliased SQL expression
    const sqlExpression = QueryAxisItem.getSqlForQueryAxisItem(axisItem);
    const caption = QueryAxisItem.getCaptionForQueryAxisItem(axisItem);
    const alias = quoteIdentifierWhenRequired(caption);
    const id = `${sqlExpression} AS ${alias}`;
    return id;
  }

  static getSqlForColumnExpression(item, alias, sqlOptions) {
    let sqlExpression = [item.columnName];
    if (alias){
      sqlExpression.unshift(alias);
    }
    sqlExpression = getQualifiedIdentifier(sqlExpression, sqlOptions);

    if (item.memberExpressionPath) {
      sqlExpression = item.memberExpressionPath.reduce((acc, curr) => {
        if ( curr.endsWith('()') ) {
          acc = `${curr.slice(0, -2)}( ${acc} )`;
        }
        else {
          acc += `['${curr}']`;
        }
        return acc;
      }, sqlExpression);
    }
    return sqlExpression;
  }

  static getSqlForAggregatedQueryAxisItem(item, alias, sqlOptions){
    let columnExpression = item.columnName;
    if (columnExpression === '*') {
      if (alias) {
        columnExpression = `${quoteIdentifierWhenRequired(alias)}.*`;
      }
    }
    else
    if (item.derivation){
      columnExpression = QueryAxisItem.getSqlForDerivedQueryAxisItem(item, alias, sqlOptions);
    }
    else {
      columnExpression = QueryAxisItem.getSqlForColumnExpression(item, alias, sqlOptions);
    }

    const aggregator = item.aggregator;
    const aggregatorInfo = AttributeUi.aggregators[aggregator];
    const expressionTemplate = aggregatorInfo.expressionTemplate;
    columnExpression = extrapolateColumnExpression(expressionTemplate, columnExpression);
    
    const partitionByItems = item.partitionByItems;
    if (Boolean(partitionByItems)){
      let windowClause = 'OVER (';
      if (partitionByItems.length) {
        windowClause += ' PARTITION BY ';
        windowClause += partitionByItems.map(item => QueryAxisItem.getSqlForQueryAxisItem( item, alias ) ).join(', ');
      }
      windowClause += ' )';
      columnExpression += ' ' + windowClause;
    }
    
    return columnExpression;
  }

  static getSqlForDerivedQueryAxisItem(item, alias, sqlOptions){
    let columnExpression = QueryAxisItem.getSqlForColumnExpression(item, alias, sqlOptions);
    const derivation = item.derivation;
    const derivationInfo = AttributeUi.getDerivationInfo(derivation);
    const derivationExpressionTemplate = derivationInfo.expressionTemplate;
    columnExpression = extrapolateColumnExpression(derivationExpressionTemplate, columnExpression);
    return columnExpression;
  }

  static getSqlForQueryAxisItem(item, alias, sqlOptions){
    sqlOptions = normalizeSqlOptions(sqlOptions);
    let sqlExpression;
    if (item.aggregator) {
      if (item.partitionByItems) {
        sqlExpression = QueryAxisItem.getSqlForAggregatedQueryAxisItem(item, alias, sqlOptions);
      }
      else {
        sqlExpression = QueryAxisItem.getSqlForAggregatedQueryAxisItem(item, alias, sqlOptions);
      }
    }
    else
    if (item.derivation) {
      sqlExpression = QueryAxisItem.getSqlForDerivedQueryAxisItem(item, alias, sqlOptions);
    }
    else {
      sqlExpression = QueryAxisItem.getSqlForColumnExpression(item, alias, sqlOptions);
    }
    return sqlExpression;
  }

  static getQueryAxisItemDataType(queryAxisItem){
    const columnType = queryAxisItem.columnType;
    let dataType = columnType;

    /*
      see https://github.com/rpbouman/huey/issues/505
      If items have a member expression path, then we first need to unwrap that and get the type of the path.
      Once we have that, we can evaluate type hints like hasElementDataType, hasKeyArrayDataType, preservesColumnType
    */
    if (queryAxisItem.memberExpressionPath) {
      const memberExpressionPath = queryAxisItem.memberExpressionPath;
      dataType = getMemberExpressionType(columnType, memberExpressionPath);
      if (memberExpressionPath[memberExpressionPath.length - 1].endsWith('()')){
        return dataType;
      }
    }

    const derivation = queryAxisItem.derivation;
    if (derivation) {
      const derivationInfo = AttributeUi.getDerivationInfo(derivation);
      if (derivationInfo.columnType) {
        dataType = derivationInfo.columnType;
      }
      else
      if (derivationInfo.hasElementDataType){
        dataType = getArrayElementType(dataType);
      }
      else
      if (derivationInfo.hasKeyDataType || derivationInfo.hasKeyArrayDataType){
        dataType = getMemberExpressionType(dataType, 'key');
        if (derivationInfo.hasKeyArrayDataType){
          dataType = getArrayType(dataType);
        }
      }
      else
      if (derivationInfo.hasValueDataType || derivationInfo.hasValueArrayDataType){
        dataType = getArrayElementType(dataType);
        dataType = getMemberExpressionType(dataType, 'value');
        if (derivationInfo.hasValueArrayDataType) {
          dataType = getArrayType(dataType);
        }
      }
      else
      if (derivationInfo.hasEntryDataType || derivationInfo.hasEntryArrayDataType){
        dataType = getMapEntryType(dataType);
        if (derivationInfo.hasEntryArrayDataType) {
          dataType = getArrayType(dataType);
        }
      }
      else
      if (derivation === 'median'){
        dataType = getArrayElementType(dataType);
        dataType = getMedianReturnDataTypeForArgumentDataType(dataType);
      }
      else
      if (!derivationInfo.preservesColumnType){
        console.warn(`Item ${QueryAxisItem.getIdForQueryAxisItem(queryAxisItem)} has derivation "${derivation}" which does not preserve column type and no column type set.`);
      }
    }

    const aggregator = queryAxisItem.aggregator;
    if (aggregator) {
      const aggregatorInfo = AttributeUi.getAggregatorInfo(aggregator);
      if (aggregatorInfo.columnType) {
        dataType = aggregatorInfo.columnType;
      }
      else
      if (aggregatorInfo.preservesColumnType){
        // noop
      }
      else
      if (aggregatorInfo && typeof aggregatorInfo.getReturnDataTypeForArgumentDataType === 'function'){
        dataType = aggregatorInfo.getReturnDataTypeForArgumentDataType(dataType);
      }
      else {
        dataType = undefined;
      }
    }

    return dataType;
  }

  // includeDisabledItems: if true then return all values, if not true then exclude values that have enabled===false;
  static #getFilterAxisItemValuesListAsSqlLiterals(queryAxisItem, includeDisabledItems){
    const filter = queryAxisItem.filter;
    const values = filter.values;
    const toValues = filter.toValues;
    let keys = Object.keys(values);

    if (includeDisabledItems !== true) {
      keys = keys.filter(key => values[key].enabled !== false);
    }

    const isRangeFilterType = FilterDialog.isRangeFilterType(filter.filterType);
    const toValueKeys = isRangeFilterType ? Object.keys(toValues) : undefined;
    const toValueLiterals = isRangeFilterType ? [] : undefined;
    const valueLiterals = keys.map((key, index) => {
      const entry = values[key];
      if (isRangeFilterType) {
        toValueLiterals.push( toValues[toValueKeys[index]].literal );
      }
      return entry.literal;
    });
    return {
      valueLiterals: valueLiterals,
      toValueLiterals: toValueLiterals
    };
  }

  static isFilterItemEffective(queryAxisItem){
    const filter = queryAxisItem.filter;
    if (!filter) {
      return undefined;
    }
    const literalLists = QueryAxisItem.#getFilterAxisItemValuesListAsSqlLiterals(queryAxisItem);
    return literalLists.valueLiterals.length !== 0;
  }

  static getFilterConditionSql(queryAxisItem, alias){
    if (!QueryAxisItem.isFilterItemEffective(queryAxisItem)) {
      return undefined;
    }
    const filter = queryAxisItem.filter;
    let columnExpression = QueryAxisItem.getSqlForQueryAxisItem(queryAxisItem, alias);
    let dataType = QueryAxisItem.getQueryAxisItemDataType(queryAxisItem);
    if (dataType === 'VARCHAR' && filter.caseSensitive === false) {
      columnExpression = `${columnExpression} COLLATE NOCASE`;
    }

    let operator = '';
    let nullCondition;
    const literalLists = QueryAxisItem.#getFilterAxisItemValuesListAsSqlLiterals(queryAxisItem);
    const indexOfNull = literalLists.valueLiterals.findIndex(
      value => value === 'NULL' || value.startsWith('NULL::')
    );

    if (indexOfNull !== -1) {
      operator = 'IS';
      if (FilterDialog.isExclusiveFilterType(filter.filterType)){
        operator += ' NOT';
      }
      literalLists.valueLiterals.splice(indexOfNull, 1);
      if (FilterDialog.isRangeFilterType(filter.filterType)){
        literalLists.toValueLiterals.splice(indexOfNull, 1);
      }
      nullCondition = `${columnExpression} ${operator} NULL`;
      operator = '';
    }

    let sql = '', logicalOperator;
    let needsParentheses = false;
    if (literalLists.valueLiterals.length > 0) {
      switch (filter.filterType) {

        // INCLUDE and EXCLUDE logic
        case FilterDialog.filterTypes.EXCLUDE:
          // in case of exclude, keep NULL values unless NULL is also in the valuelist.
          // https://github.com/rpbouman/huey/issues/90
          // TODO: if the column happens not to contain any nulls, we can omit this condition
          if (indexOfNull === -1) {
            sql = `${columnExpression} IS NULL OR `;
            needsParentheses = true;
          }
          operator += literalLists.valueLiterals.length === 1 ? ' !' : ' NOT';
          logicalOperator = 'AND';
        case FilterDialog.filterTypes.INCLUDE:
          operator += literalLists.valueLiterals.length === 1 ? '=' : ' IN';
          const values = literalLists.valueLiterals.length === 1 ? literalLists.valueLiterals[0] : `( ${literalLists.valueLiterals.join('\n,')} )`;
          sql += `${columnExpression} ${operator} ${values}`;
          if (indexOfNull !== -1) {
            if (!logicalOperator) {
              logicalOperator = 'OR';
              needsParentheses = true;
            }
            sql = `${nullCondition} ${logicalOperator} ${sql}`;
          }
          sql = `( ${sql} )`;
          break;

        // LIKE and NOT LIKE logic
        case FilterDialog.filterTypes.NOTLIKE:
          operator = 'NOT ';
          logicalOperator = 'AND';
        case FilterDialog.filterTypes.LIKE:
          dataType = QueryAxisItem.getQueryAxisItemDataType(queryAxisItem);
          if (dataType !== 'VARCHAR'){
            columnExpression = `${columnExpression}::VARCHAR`;
          }
          operator += 'LIKE';
          sql = literalLists.valueLiterals.reduce((acc, curr, currIndex) => {
            acc += '\n';
            if (currIndex) {
              if (!logicalOperator) {
                logicalOperator = 'OR';
                needsParentheses = true;
              }
              acc += logicalOperator + ' ';
            }
            const value = literalLists.valueLiterals[currIndex];
            acc += `${columnExpression} ${operator} ${value}`;
            return acc;
          }, '');

          if (indexOfNull === -1) {
            // https://github.com/rpbouman/huey/issues/391
            // This is essentially the same as
            // https://github.com/rpbouman/huey/issues/90
            // but for NOT LIKE
            if (filter.filterType === FilterDialog.filterTypes.NOTLIKE) {
              nullCondition = `${columnExpression} IS NULL`;
              if (literalLists.valueLiterals.length) {
                sql = `(${sql}) OR ${nullCondition}`;
                needsParentheses = true;
              }
              else {
                sql = nullCondition;
              }
            }
          }
          else {
            if (!logicalOperator) {
              logicalOperator = 'OR';
              needsParentheses = true;
            }
            sql = `${nullCondition} ${logicalOperator} ${sql}`;
          }
          break;

        // BETWEEN and NOT BETWEEN logic
        case FilterDialog.filterTypes.NOTBETWEEN:
          operator = 'NOT ';
          logicalOperator = 'AND';
        case FilterDialog.filterTypes.BETWEEN:
          operator += 'BETWEEN';
          sql = literalLists.valueLiterals.reduce((acc, curr, currIndex) => {
            acc += '\n';
            if (currIndex) {
              if (!logicalOperator){
                logicalOperator = 'OR';
                needsParentheses = true;
              }
              acc += logicalOperator + ' ';
            }
            const fromValue = literalLists.valueLiterals[currIndex];
            const toValue = literalLists.toValueLiterals[currIndex];
            acc += `${columnExpression} ${operator} ${fromValue} AND ${toValue}`;
            return acc;
          }, '');

          if (nullCondition) {
            if (!logicalOperator){
              logicalOperator = 'OR';
              needsParentheses = true;
            }
            sql = `${nullCondition} ${logicalOperator} ${sql}`
          }
          break;
        case FilterDialog.filterTypes.NOTHASANY:
        case FilterDialog.filterTypes.NOTHASALL:
        case FilterDialog.filterTypes.HASANY:
        case FilterDialog.filterTypes.HASALL:
          let arrayFunction;
          switch (filter.filterType){
            case FilterDialog.filterTypes.HASANY:
            case FilterDialog.filterTypes.NOTHASANY:
              arrayFunction = 'list_has_any';
              break;
            case FilterDialog.filterTypes.HASALL:
            case FilterDialog.filterTypes.NOTHASALL:
              arrayFunction = 'list_has_all';
              break;
          }
          let valueList = literalLists.valueLiterals.reduce((acc, curr, currIndex) => {
            const valueLiteral = literalLists.valueLiterals[currIndex];
            acc.push(valueLiteral);
            return acc;
          }, []);
          valueList = `[ ${valueList.join(',')} ]`;
          sql = `${arrayFunction}( ${columnExpression}, ${valueList} )`;
          if (FilterDialog.isExclusiveFilterType(filter.filterType)){
            sql = `NOT ${sql}`;
          }
          break;
      }
    }
    else {
      sql = nullCondition;
    }
    if (needsParentheses) {
      sql = `( ${sql} )`;
    }
    return sql;
  }
  
  static indexOfItem(needle, haystack){
    return haystack.findIndex(item => QueryAxisItem.equals(needle, item) );
  }
  
  static equals(item1, item2){
    if ( (item1.columnName || '') !== (item2.columnName || '') ){
      return false;
    }

    if (item1.memberExpressionPath) {
      if (!item2.memberExpressionPath){
        return false;
      }
      const memberExpressionPath1 = item1.memberExpressionPath instanceof Array ? JSON.stringify(item1.memberExpressionPath) : item1.memberExpressionPath;
      const memberExpressionPath2 = item2.memberExpressionPath instanceof Array ? JSON.stringify(item2.memberExpressionPath) : item2.memberExpressionPath;
      if ( memberExpressionPath1 !== memberExpressionPath2 ) {
        return false;
      }
    }
    else
    if (item2.memberExpressionPath) {
      return false;
    }

    if (item1.derivation) {
      if (item1.derivation !== item2.derivation) {
        return false;
      }
    }
    else
    if (item2.derivation){
      return false;
    }

    if (item1.aggregator) {
      if (item1.aggregator !== item2.aggregator){
        return false;
      }
    }
    else
    if (item2.aggregator){
      return false;
    }
    
    const partitionByItems1 = item1.partitionByItems;
    const partitionByItems2 = item2.partitionByItems;
    if (partitionByItems1){
      if (!partitionByItems2){
        return false;
      }
      const n = partitionByItems1.length;
      if (partitionByItems2.length !== n){
        return false;
      }
      if (partitionByItems1.some( item => QueryAxisItem.indexOfItem(item, partitionByItems2) === -1 ) ){
        return false;
      }
    }
    else
    if (partitionByItems2){
      return false;
    }
    return true;
  }
}
