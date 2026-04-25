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
    if (typeof dataTypeInfo.createLiteralWriter === 'function') {
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
      sqlExpression = QueryAxisItem.getSqlForAggregatedQueryAxisItem(item, alias, sqlOptions);
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
}

class QueryAxis {

  #items = [];

  static getCaptionForQueryAxis(queryAxis){
    const items = queryAxis.getItems();
    if (items.length === 0){
      return '<empty>';
    }
    const itemKeys = Object.keys(items);
    const captions = itemKeys.map(itemKey => {
      const item = items[itemKey];
      const caption = QueryAxisItem.getCaptionForQueryAxisItem(item);
      return `"${caption}"`;
    });
    return captions.join(', ');
  }

  getCaption(){
    return QueryAxis.getCaptionForQueryAxis(this);
  }

  findItem(config){
    const columnName = config.columnName || '';
    const derivation = config.derivation;
    const aggregator = config.aggregator;
    let memberExpressionPath = config.memberExpressionPath;
    if (memberExpressionPath instanceof Array){
      memberExpressionPath = JSON.stringify(memberExpressionPath);
    }

    const items = this.#items;
    const itemIndex = items.findIndex(item => {
      // check column name
      if ((item.columnName || '') !== columnName){
        return false;
      }
      // check member expression path
      if (memberExpressionPath) {
        if (!item.memberExpressionPath){
          return false;
        }
        if (memberExpressionPath !== JSON.stringify(item.memberExpressionPath)) {
          return false;
        }
      }
      else
      if (item.memberExpressionPath) {
        return false;
      }
      // check derivation
      if (derivation) {
        if (item.derivation !== derivation) {
          return false;
        }
      }
      else
      if (item.derivation){
        return false;
      }
      // check aggregator
      if (aggregator) {
        if (item.aggregator !== aggregator){
          return false;
        }
      }
      else
      if (item.aggregator){
        return false;
      }
      // all checks passed
      return true;
    });

    if (itemIndex === -1) {
      return undefined;
    }
    const item = items[itemIndex];
    const copyOfItem = Object.assign({}, item);
    if (item.filter) {
      copyOfItem.filter = JSON.parse(JSON.stringify(item.filter));
    }
    copyOfItem.index = itemIndex;
    return copyOfItem;
  }

  addItem(config){
    const copyOfConfig = Object.assign({}, config);
    if (copyOfConfig.index === undefined) {
      copyOfConfig.index = this.#items.length;
    }
    else {
      if (copyOfConfig.index < 0) {
        copyOfConfig.index = 0;
      }
      else
      if (copyOfConfig.index > this.#items.length){
        copyOfConfig.index = this.#items.length;
      }
    }
    delete copyOfConfig['axis'];
    this.#items.splice(copyOfConfig.index, 0, copyOfConfig);
    return copyOfConfig;
  }

  removeItem(config){
    const item = this.findItem(config);
    if (!item){
      return undefined;
    }
    this.#items.splice(item.index, 1);
    return item;
  }

  clear(){
    this.#items = [];
  }

  getItems() {
    return [].concat(this.#items);
  }

  syncItemIndices(){
    this.#items.forEach((item, index) => item.index = index);
  }

  getTotalsItems(){
    const totalsItems = this.#items.filter(axisItem => axisItem.includeTotals === true);
    return totalsItems.length ? totalsItems : undefined;
  }

  setItems(items) {
    this.#items = items;
  }

}

class QueryModel extends EventEmitter {

  static AXIS_FILTERS = 'filters';
  static AXIS_ROWS = 'rows';
  static AXIS_COLUMNS = 'columns';
  static AXIS_CELLS = 'cells';

  static #defaultConfig = {};

  #axes = {
    filters: new QueryAxis(),
    columns: new QueryAxis(),
    rows: new QueryAxis(),
    cells: new QueryAxis()
  };

  #cellheadersaxis = QueryModel.AXIS_COLUMNS;
  #settings = undefined;
  #datasource = undefined;
  #sampling = undefined;

  constructor(config){
    super(['change', 'beforechange']);
    config = Object.assign({}, QueryModel.#defaultConfig, config);
    if (config.settings){
      this.#settings = config.settings;
    }
  }

  getSampling(axisId){
    const sampling = this.#sampling;
    if (!sampling){
      return undefined;
    }

    if (axisId === undefined){
      return sampling;
    }

    return sampling[axisId];
  }

  setCellHeadersAxis(cellheadersaxis) {
    const oldCellHeadersAxis = this.#cellheadersaxis;
    if (cellheadersaxis === oldCellHeadersAxis) {
      return;
    }
    const eventData = {
      propertiesChanged: {
        cellHeadersAxis: {
          previousValue: oldCellHeadersAxis,
          newValue: cellheadersaxis
        }
      }
    };

    this.fireEvent('beforechange', eventData);
    this.#cellheadersaxis = cellheadersaxis;
    this.fireEvent('change', eventData);
  }

  getAxisIds(){
    return Object.keys(this.#axes);
  }

  getCellHeadersAxis(){
    return this.#cellheadersaxis;
  }

  getQueryAxis(axisId){
    return this.#axes[axisId];
  }

  getCaptionForQueryAxis(axisId){
    const queryAxis = this.getQueryAxis(axisId);
    const caption = queryAxis.getCaption();
    return caption;
  }

  getFiltersAxis(){
    return this.getQueryAxis(QueryModel.AXIS_FILTERS);
  }

  getColumnsAxis(){
    return this.getQueryAxis(QueryModel.AXIS_COLUMNS);
  }

  getRowsAxis(){
    return this.getQueryAxis(QueryModel.AXIS_ROWS);
  }

  getCellsAxis(){
    return this.getQueryAxis(QueryModel.AXIS_CELLS);
  }

  #destroyDatasourceHandler = (function(event){
    if (event.target !== this.#datasource) {
      return;
    }
    this.setDatasource(undefined);
  }).bind(this)

  setDatasource(datasource, dontClear){
    const oldDatasource = this.#datasource;
    if (datasource === oldDatasource) {
      return;
    }

    const eventData = {
      propertiesChanged: {
        datasource: {
          previousValue: oldDatasource,
          newValue: datasource
        }
      }
    }

    this.fireEvent('beforechange', eventData);
    if (oldDatasource) {
      this.#datasource.removeEventListener('destroy', this.#destroyDatasourceHandler );
    }

    if (dontClear !== true) {
      this.#clear();
    }
    this.#datasource = datasource;
    if (datasource){
      datasource.addEventListener('destroy', this.#destroyDatasourceHandler );
    }
    this.fireEvent('change', eventData);
  }

  getDatasource(){
    return this.#datasource;
  }

  findItem(config){
    const aggregator = config.aggregator;
    let axisIds, axisId = config.axis;
    if (axisId) {
      axisIds = [axisId];
    }
    else
    if (aggregator){
      axisIds = ['cells'];
    }
    else {
      axisIds = Object.keys(this.#axes).filter(axisId => axisId !== QueryModel.AXIS_FILTERS);
    }

    const columnName = config.columnName;
    const memberExpressionPath = config.memberExpressionPath;
    const derivation = config.derivation;
    const findConfig = {
      columnName: config.columnName,
      memberExpressionPath: memberExpressionPath,
      derivation: config.derivation,
      aggregator: config.aggregator
    };
    let axis, item;
    for (let i = 0; i < axisIds.length; i++){
      axisId = axisIds[i];
      axis = this.getQueryAxis(axisId);
      item = axis.findItem(findConfig);
      if (item) {
        item.axis = axisId;
        break;
      }
    }
    return item;
  }

  #addItem(config){
    const axisId = config.axis;
    const axis = this.getQueryAxis(config.axis);
    const addedItem = axis.addItem(config);
    addedItem.axis = axisId;
    return addedItem;
  }

  #removeItem(config) {
    const axisId = config.axis;
    const axis = this.getQueryAxis(config.axis);
    const removedItem = axis.removeItem(config);
    removedItem.axis = axisId;
    return removedItem;
  }

  async addItem(config){
    let axis = config.axis;

    if (!axis) {
      if (config.aggregator) {
        axis = QueryModel.AXIS_CELLS;
      }
      else {
        // todo: find some way to figure out the most appropriate default axis.
        throw new Error(`Can't add item: No axis specified!`);
      }
    }

    // make an axis-less version of the item so we can locate it in case it's already added to the model.
    const copyOfConfig = Object.assign({}, config);
    // filter items are special because they can appear on multiple axes.
    // if the item is a filter axis item, we should not remove the axis.
    if (axis !== QueryModel.AXIS_FILTERS){
      delete copyOfConfig['axis'];
    }
    const foundItem = this.findItem(copyOfConfig);

    if (!config.columnType) {
      if (foundItem && foundItem.columnType) {
        config.columnType = foundItem.columnType;
      }
      else {
        const datasource = this.#datasource;
        const columnMetadata = await datasource.getColumnMetadata();
        for (let i = 0; i < columnMetadata.numRows; i++){
          const row = columnMetadata.get(i);
          if (row.column_name === config.columnName) {
            config.columnType = row.column_type;
          }
        }
      }
    }

    if (!config.formatter) {
      if (foundItem && foundItem.formatter) {
        config.formatter = foundItem.formatter;
      }
      else {
        const formatter = QueryAxisItem.createFormatter(config);
        if (formatter){
          config.formatter = formatter;
        }
      }
    }

    if (!config.literalWriter) {
      if (foundItem && foundItem.literalWriter) {
        config.literalWriter = foundItem.literalWriter;
      }
      else {
        const literalWriter = QueryAxisItem.createLiteralWriter(config);
        if (literalWriter){
          config.literalWriter = literalWriter;
        }
      }
    }

    if (!config.parser) {
      if (foundItem && foundItem.parser) {
        config.parser = foundItem.parser;
      }
      else {
        const parser = QueryAxisItem.createParser(config);
        if (parser){
          config.parser = parser;
        }
      }
    }

    if (axis === QueryModel.AXIS_FILTERS && !config.filter && foundItem && foundItem.filter){
      config.filter = foundItem.filter;
    }

    const axesChangeInfo = {};
    const eventData = { axesChanged: axesChangeInfo };
    axesChangeInfo[config.axis] = { added: [config] };

    if (foundItem){
      let axisChangeInfo = axesChangeInfo[foundItem.axis];
      if (!axisChangeInfo) {
        axisChangeInfo = {};
        axesChangeInfo[foundItem.axis] = axisChangeInfo;
      }
      axisChangeInfo.removed = [foundItem];
    }
    this.fireEvent('beforechange', eventData);

    let removedItem;
    if (foundItem) {
      // if the item already exits in this model, we first remove it.
      removedItem = this.#removeItem(foundItem);
      axesChangeInfo[removedItem.axis].removed = [removedItem];
    }
    const addedItem = this.#addItem(config);
    axesChangeInfo[addedItem.axis].added = [addedItem];

    this.getQueryAxis(axis).syncItemIndices();
    if (foundItem && foundItem.axis !== axis){
      this.getQueryAxis(foundItem.axis).syncItemIndices();
    }

    this.fireEvent('change', eventData);
    return addedItem;
  }

  removeItem(config){
    const copyOfConfig = Object.assign({}, config);

    const newAxisId = copyOfConfig.axis;
    if (newAxisId && newAxisId !== QueryModel.AXIS_FILTERS) {
      delete copyOfConfig.axis;
    }

    const item = this.findItem(copyOfConfig);
    if (!item){
      return undefined;
    }

    const axesChangeInfo = {};
    const eventData = { axesChanged: axesChangeInfo };

    const oldAxisId = item.axis;
    axesChangeInfo[oldAxisId] = { removed: [item] };
    this.fireEvent('beforechange', eventData);

    const axis = this.getQueryAxis(oldAxisId);
    const removedItem = axis.removeItem(item);
    axis.syncItemIndices();

    axesChangeInfo[oldAxisId] = { removed: [removedItem] };

    this.fireEvent('change', eventData);
    return removedItem;
  }

  static #getAxisItemChangeInfo(queryModelItem, propertyName, newValue){
    const itemChangeInfo = {};
    const propertyChangeInfo = {};
    const itemId = QueryAxisItem.getIdForQueryAxisItem(queryModelItem);
    itemChangeInfo[itemId] = propertyChangeInfo;
    propertyChangeInfo[propertyName] = {
      oldValue: queryModelItem[propertyName],
      newValue: newValue
    };

    const axesChangeInfo = {};
    const axisId = queryModelItem.axis;
    axesChangeInfo[axisId] = { changed: itemChangeInfo };

    return axesChangeInfo;
  }

  toggleTotals(queryItemConfig, value){
    if (Boolean(value) !== value) {
      return;
    }
    const queryModelItem = this.findItem(queryItemConfig);
    if (!queryModelItem) {
      return;
    }

    const eventData = { axesChanged: {} };

    const axisId = queryModelItem.axis;
    const axis = this.getQueryAxis(axisId);
    const items = axis.getItems();
    const item = items[queryModelItem.index];

    const propertyName = 'includeTotals';
    eventData.axesChanged = QueryModel.#getAxisItemChangeInfo(
      item,
      propertyName,
      value
    );

    this.fireEvent('beforechange', eventData);
    item[propertyName] = value;
    this.fireEvent('change', eventData);

    return queryModelItem;
  }

  #clear(axisId){
    const axisIds = axisId ? [axisId] : Object.keys(this.#axes);
    for (let i = 0; i < axisIds.length; i++) {
      const axisId = axisIds[i];
      const axis = this.getQueryAxis(axisId);
      axis.clear();
    }
  }

  clear(axisId) {
    const axesChangeInfo = {};
    const eventData = { axesChanged: axesChangeInfo };
    const axisIds = axisId ? [axisId] : Object.keys(this.#axes);

    for (let i = 0; i < axisIds.length; i++) {
      const localAxisId = axisIds[i];
      const axis = this.getQueryAxis(localAxisId);
      const items = axis.getItems();
      if (!items.length) {
        continue;
      }
      axesChangeInfo[localAxisId] = { removed: items };
    }

    if (!Object.keys(axesChangeInfo).length){
      // no change, don't fire event.
      return;
    }
    this.fireEvent('beforechange', eventData);
    this.#clear(axisId);
    this.fireEvent('change', eventData);
  }

  flipAxes(axisId1, axisId2) {
    if (axisId2 === undefined){
      switch (axisId1) {
        case QueryModel.AXIS_COLUMNS:
          axisId2 = QueryModel.AXIS_ROWS;
          break;
        case QueryModel.AXIS_ROWS:
          axisId2 = QueryModel.AXIS_COLUMNS;
          break;
        case undefined:
          axisId1 = QueryModel.AXIS_COLUMNS;
          axisId2 = QueryModel.AXIS_ROWS;
      }
    }

    const axis1 = this.getQueryAxis(axisId1);
    const axis1Items = axis1.getItems();

    const axis2 = this.getQueryAxis(axisId2);
    const axis2Items = axis2.getItems();

    if (!axis1Items.length && !axis2Items.length) {
      return;
    }

    const axesChangeInfo = {};
    const eventData = { axesChanged: axesChangeInfo };

    axesChangeInfo[axisId1] = {};
    axesChangeInfo[axisId2] = {};

    if (axis1Items.length) {
      axesChangeInfo[axisId1].removed = axis1Items;
      axesChangeInfo[axisId2].added = axis1Items.map(axisItem => Object.assign( {}, axisItem, { axis: axisId2 } ) );
    }
    if (axis2Items.length) {
      axesChangeInfo[axisId2].removed = axis2Items;
      axesChangeInfo[axisId1].added = axis2Items.map(axisItem => Object.assign( {}, axisItem, { axis: axisId1 } ) );
    }

    this.fireEvent('beforechange', eventData);
    axis1.setItems(axesChangeInfo[axisId1].added || []);
    axis2.setItems(axesChangeInfo[axisId2].added || []);
    this.fireEvent('change', eventData);
  }

  setQueryAxisItemFilter(queryAxisItem, filter){
    const axisId = queryAxisItem.axis;
    if (axisId !== QueryModel.AXIS_FILTERS){
      throw new Error(`Item is not a filter axis item!`);
    }

    const queryModelItem = this.findItem(queryAxisItem);
    if (!queryModelItem) {
      throw new Error(`Item is not part of the model!`);
    }
    const oldFilter = queryAxisItem.filter;

    // update the real item stored in the axis
    // (note that the normal getters return copies)
    const axis = this.getQueryAxis(queryModelItem.axis);
    const items = axis.getItems();

    if (Object.keys(filter.values).length){
      filter.toggleState = oldFilter ? oldFilter.toggleState : 'closed';
    }
    else {
      filter = undefined;
    }
    queryAxisItem = items[queryModelItem.index];

    const propertyName = 'filter';
    const axesChangeInfo = QueryModel.#getAxisItemChangeInfo(
      queryAxisItem,
      propertyName,
      filter
    );
    const eventData = { axesChanged: axesChangeInfo };
    this.fireEvent('beforechange', eventData);
    queryAxisItem[propertyName] = filter;
    this.fireEvent('change', eventData);
  }

  setQueryAxisItemFilterToggleState(queryAxisItem, toggleState){
    if (queryAxisItem.axis !== QueryModel.AXIS_FILTERS){
      throw new Error(`Item is not a filter axis item!`);
    }

    const queryModelItem = this.findItem(queryAxisItem);
    if (!queryModelItem) {
      throw new Error(`Item is not part of the model!`);
    }

    const axis = this.getQueryAxis(queryModelItem.axis);
    const items = axis.getItems();
    const item = items[queryModelItem.index];

    const propertyName = 'toggleState';
    const axesChangeInfo = QueryModel.#getAxisItemChangeInfo(
      item,
      propertyName,
      toggleState
    );
    const eventData = { axesChanged: axesChangeInfo };
    this.fireEvent('beforechange', eventData);
    item.filter[propertyName] = toggleState;
    this.fireEvent('change', eventData);
  }

  /**
  * Gets the sql condition for all filters.
  * If excludeTupleItems is true, then all filter items that appear on the rows and columns axes will be skipped.
  * That option is intended to be used to run the cellset query, because the cellset is already restricted by vales from the tuples
  * So if the tuples are already calculated with the filters in effect, then the tuple values must already be a subset of the values that satisfy the filter
  * and hence we shouldn't need to filter again on those items.
  *
  * NOTE: we probabably shoudl remove the excludeTupleItems option as it can almost never be applied
  * for example, if there are subtotals required, it will result in wrong results.
  */
  getFilterConditionSql(excludeTupleItems, alias){
    const queryAxis = this.getFiltersAxis();
    let items = queryAxis.getItems();
    if (items.length === 0){
      return undefined;
    }

    if (excludeTupleItems === true){
      const rowsAxis = this.getRowsAxis();
      const columnsAxis = this.getColumnsAxis();
      items = items.filter(item => {
        if (rowsAxis.findItem(item)) {
          return false;
        }
        if (columnsAxis.findItem(item)) {
          return false;
        }
        return true;
      });
    }

    // Only keep items that can contribute to the filter.
    // This means less work for the next steps and easier debugging.
    items = items.filter( item => QueryAxisItem.isFilterItemEffective( item ) );

    // Sort the items.
    // The implied SQL condition is independent of the order of the items
    // and by sorting, we make it easy to see if a change in the filter axis
    // could actually affect the result.
    items = items.sort(function(filterItem1, filterItem2){
      const id1 = QueryAxisItem.getIdForQueryAxisItem(filterItem1);
      const id2 = QueryAxisItem.getIdForQueryAxisItem(filterItem2);
      if (id1 > id2) {
        return 1;
      }
      else
      if (id1 < id2) {
        return -1;
      }
      return 0;
    });

    // Generate the SQL for each item.
    const conditions = items.map( item => QueryAxisItem.getFilterConditionSql(item, alias) );
    if (!conditions.length) {
      return undefined;
    }
    // Combine the individual item conditions
    const condition = conditions.join('\nAND ');
    return condition;
  }

  static compareStates(oldState, newState){
    oldState = oldState || {};
    newState = newState || {};

    function getPropertyNames(){
      const propertyNames = {};
      for (let i = 0; i < arguments.length; i++){
        const object = arguments[i];
        if (!object) {
          continue;
        }
        Object.keys(arguments[i]).forEach( propertyName => propertyNames[propertyName] = propertyName );
      }
      return Object.keys(propertyNames);
    }

    function compareObjects(oldState, newState, ignoreProperties){
      const propertiesChanged = {};
      const propertyNames = getPropertyNames(oldState, newState);
      for (let i = 0; i < propertyNames.length; i++){
        const propertyName = propertyNames[i];
        if (ignoreProperties && ignoreProperties.includes(propertyName) ){
          continue;
        }
        const oldValue = oldState[propertyName];
        const newValue = newState[propertyName];

        if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
          continue;
        }

        propertiesChanged[propertyName] = {
          oldValue: oldValue,
          newValue: newValue
        };
      }
      return Object.keys(propertiesChanged).length ? propertiesChanged : undefined;
    }

    function axisAsObject(axis){
      return axis.reduce((acc, curr) => {
        const id = QueryAxisItem.getIdForQueryAxisItem(curr);
        acc[id] = curr;
        return acc;
      }, {});
    }

    const axesChanged = {};
    const oldAxes = oldState.axes || {};
    const newAxes = newState.axes || {};
    const axisIds = getPropertyNames(oldAxes, newAxes);
    for (let i = 0; i < axisIds.length; i++){
      const axisChange = {
        added: [],
        removed: [],
        changed: {}
      };
      const axisId = axisIds[i];
      const oldAxisItems = axisAsObject(oldAxes[axisId] || []);
      const newAxisItems = axisAsObject(newAxes[axisId] || []);
      const itemIds = getPropertyNames(oldAxisItems, newAxisItems);
      for (let j = 0; j < itemIds.length; j++){
        const itemId = itemIds[j];
        const oldAxisItem = oldAxisItems[itemId];
        const newAxisItem = newAxisItems[itemId];
        if (oldAxisItem) {
          if (newAxisItem){
            const change = compareObjects(oldAxisItem, newAxisItem);
            if (change) {
              axisChange.changed[itemId] = change;
            }
          }
          else {
            axisChange.removed.push(oldAxisItem);
          }
        }
        else
        if (newAxisItem) {
          axisChange.added.push(newAxisItem);
        }
      }

      if (!axisChange.added.length){
        delete axisChange.added;
      }
      if (!axisChange.removed.length){
        delete axisChange.removed;
      }
      if (!Object.keys(axisChange.changed).length){
        delete axisChange.changed;
      }
      if (Object.keys(axisChange).length) {
        axesChanged[axisId] = axisChange;
      }
    }

    const stateChange = {};
    const propertiesChanged = compareObjects(oldState, newState, ['axes']) || {};
    if (Object.keys(propertiesChanged)){
      stateChange.propertiesChanged = Object.assign({}, propertiesChanged);
    }
    if (Object.keys(axesChanged)){
      stateChange.axesChanged = axesChanged;
    }
    return stateChange;
  }

  getState(options){
    const datasource = this.getDatasource();
    if (!datasource) {
      return null;
    }
    const datasourceId = datasource.getId();

    const queryModelObject = {
      datasourceId: datasourceId,
      cellsHeaders: this.getCellHeadersAxis(),
      axes: {},
      sampling: this.#sampling
    };

    const axisIds = this.getAxisIds().sort();
    let hasItems = false;
    axisIds.forEach(axisId => {
      const axis = this.getQueryAxis(axisId);
      const items = axis.getItems();
      if (items.length === 0) {
        return '';
      }
      hasItems = true;
      queryModelObject.axes[axisId] = items.map(axisItem => {
        const strippedItem = {columnName: axisItem.columnName};
        strippedItem.columnType = axisItem.columnType;
        if (axisItem.memberExpressionPath){
          strippedItem.memberExpressionPath = axisItem.memberExpressionPath;
        }
        if (axisItem.derivation) {
          strippedItem.derivation = axisItem.derivation;
        }
        if (axisItem.aggregator){
          strippedItem.aggregator = axisItem.aggregator;
        }
        if (axisItem.includeTotals === true) {
          strippedItem.includeTotals = true;
        }

        if (axisId === QueryModel.AXIS_FILTERS && axisItem.filter){
          strippedItem.filter = axisItem.filter;
        }

        if (options && options.includeItemIndices){
          strippedItem.index = axisItem.index;
        }

        return strippedItem;
      });
    });
    if (!hasItems){
      return null;
    }
    return queryModelObject;
  }

  get #autoUpdate(){
    let settings = this.#settings || {};
    if (settings && typeof settings.getSettings === 'function'){
      settings = settings.getSettings('querySettings');
    }
    const autoUpdate = settings.autoRunQuery === undefined ? true : settings.autoRunQuery;
    return autoUpdate;
  }

  async setState(queryModelState){

    const autoRunQuery = this.#autoUpdate;
    const canAssignSettings = this.#settings && typeof this.#settings.assignSettings === 'function';

    if (canAssignSettings){
      settings.assignSettings(['querySettings', 'autoRunQuery'], false);
    }

    try {
      const datasourceId = queryModelState.datasourceId;
      let datasource;
      if (datasourceId){
        datasource = datasourcesUi.getDatasource(datasourceId);
      }
      else
      if ( queryModelState.datasource && queryModelState.datasource instanceof DuckDbDataSource ){
        datasource = queryModelState.datasource;
      }
      else {
        datasource = this.getDatasource();
      }

      if (this.getDatasource() === datasource) {
        this.clear();
      }
      else {
        this.setDatasource(datasource);
      }

      const cellsHeaders = queryModelState.cellsHeaders || QueryModel.AXIS_COLUMNS;
      this.setCellHeadersAxis(cellsHeaders);

      const axes = queryModelState.axes || {};
      for (let axisId in axes){
        const items = axes[axisId];
        if(!items) {
          continue;
        }
        for (let i = 0 ; i < items.length; i++){
          const item = items[i];
          const config = { columnName: item.column || item.columnName };
          config.columnType = item.columnType;
          config.derivation = item.derivation;
          config.aggregator = item.aggregator;
          config.memberExpressionPath = item.memberExpressionPath;
          config.caption = item.caption;
          
          if (item.includeTotals === true){
            config.includeTotals = true;
          }

          if (axisId === QueryModel.AXIS_FILTERS) {
            const filter = item.filter;
            if (filter) {
              config.filter = filter;
            }
          }
          config.axis = axisId;
          await this.addItem(config);
        }
      }
      const sampling = queryModelState.sampling || undefined;
      this.#sampling = sampling;
    }
    catch(e){
      showErrorDialog(e);
    }
    finally {
      if (canAssignSettings){
        this.#settings.assignSettings(['querySettings', 'autoRunQuery'], autoRunQuery);
      }
    }
  }

  static getReferencedColumns(queryModelState){
    if (!queryModelState){
      return null;
    }
    const axes = queryModelState.axes;
    const referencedColumns = Object.keys(axes).reduce((acc, curr) => {
      const items = axes[curr];
      items.forEach((item, index) => {
        const columnName = item.column || item.columnName;
        if (columnName === undefined || columnName === '*'){
          return;
        }
        acc[columnName] = { columnType: item.columnType };
      });
      return acc;
    },{});
    return referencedColumns;
  }

}

let queryModel;
function initQueryModel(){
  queryModel = new QueryModel({ settings: settings });
}