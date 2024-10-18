class QueryAxisItem {

  static createFormatter(axisItem){
    var dataType = QueryAxisItem.getQueryAxisItemDataType(axisItem);
    if (axisItem.aggregator) {
      var aggregatorInfo = AttributeUi.aggregators[axisItem.aggregator];
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
      var derivationInfo = AttributeUi.getDerivationInfo(axisItem.derivation);
      if (derivationInfo.createFormatter) {
        return derivationInfo.createFormatter(axisItem);
      }
      else
      if (derivationInfo.columnType){
        dataType = derivationInfo.columnType;
      }
    }

    if (dataType) {
      var dataTypeInfo = getDataTypeInfo(dataType);
      if (dataTypeInfo) {
        if (dataTypeInfo.createFormatter){
          return dataTypeInfo.createFormatter();
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

  static createLiteralWriter(axisItem){
    var dataType = QueryAxisItem.getQueryAxisItemDataType(axisItem);
    if (!dataType) {
      // this may happen in case the item has an aggregator like sum() - in these cases we don't know what the datatype of the resulting values will be.
      // we need to find a better solution for this but for now just bail out - we currently don't need a literalwriter for aggregated values.
      return null;
    }
    var dataTypeInfo = getDataTypeInfo(dataType);
    var literalWriter;
    if (typeof dataTypeInfo.createLiteralWriter === 'function') {
      literalWriter = dataTypeInfo.createLiteralWriter(dataTypeInfo, dataType);
    }
    else {
      return null;
    }
    return literalWriter;
  }
  
  static getLiteralWriter(axisItem) {
    var literalWriter = axisItem.literalWriter;
    if (literalWriter) {
      return literalWriter;
    }
    literalWriter = QueryAxisItem.createLiteralWriter(axisItem);
    return literalWriter;
  }

  static getCaptionForQueryAxisItem(axisItem){
    var caption = axisItem.caption;
    if (caption){
      return caption;
    }

    caption = QueryAxisItem.createCaptionForQueryAxisItem(axisItem);

    if (axisItem.axis === QueryModel.AXIS_FILTERS) {
      if (axisItem.filter === undefined || axisItem.filter.values === undefined) {
        return 'No filter set'
      }
      var filter = axisItem.filter;
      var values = filter.values;
      var valueKeys = Object.keys(values);
      var valueLabels = [];
      var toValues = filter.toValues;
      var toValueKeys = toValues? Object.keys(toValues) : undefined;
      for (var i = 0; i < valueKeys.length; i++){
        var valueKey = valueKeys[i];
        var valueObject = values[valueKey];
        var valueLabel = valueObject.label;
        if (toValueKeys && i < toValueKeys.length){
          var toValueKey = toValueKeys[i];
          var toValueObject = toValues[toValueKey];
          valueLabel += ' - ' + toValueObject.label;
        }
        valueLabels.push(valueLabel);
      }
      caption = `${filter.filterType} ${valueLabels.join('\n')}`;
    }

    return caption;
  }
  
  static createCaptionForQueryAxisItem(axisItem){
    var caption = axisItem.columnName;
    var postfix = '';
    var prefix = '';
    
    if (axisItem.memberExpressionPath){
      postfix += `.${axisItem.memberExpressionPath.join('.')}`;
    }
    
    if (axisItem.derivation) {
      postfix += ` ${axisItem.derivation}`;
    }
    else
    if (axisItem.aggregator){
      prefix = `${axisItem.aggregator} of `;
    }

    if (postfix) {
      caption += `${postfix}`;
    }
    if (prefix) {
      caption = prefix + caption;
    }
    return caption;
  }

  static getIdForQueryAxisItem(axisItem){
    var id = QueryAxisItem.getSqlForQueryAxisItem(axisItem);
    return id;
  }

  static getSqlForColumnExpression(item, alias, sqlOptions) {
    var sqlExpression = [item.columnName];

    if (alias){
      sqlExpression.unshift(alias);
    }
    
    sqlExpression = getQualifiedIdentifier(sqlExpression, sqlOptions);

    if (item.memberExpressionPath) {
      var memberExpressionPath = item.memberExpressionPath;
      var memberExpression = memberExpressionPath
      .map(function(memberExpressionPathElement){
        // todo: escape single quote in memberExpressionPathElement
        return `['${memberExpressionPathElement}']`;
      })
      .join('');
      sqlExpression += memberExpression;
    }
    return sqlExpression;
  }

  static getSqlForAggregatedQueryAxisItem(item, alias, sqlOptions){
    var columnExpression = item.columnName;

    if (columnExpression === '*') {
      if (alias) {
        columnExpression = `${getQuotedIdentifier(alias)}.*`;
      }
    }
    else {
      columnExpression = QueryAxisItem.getSqlForColumnExpression(item, alias, sqlOptions);
    }

    var aggregator = item.aggregator;
    var aggregatorInfo = AttributeUi.aggregators[aggregator];
    var expressionTemplate = aggregatorInfo.expressionTemplate;
    columnExpression = extrapolateColumnExpression(expressionTemplate, columnExpression);
    return columnExpression;
  }

  static getSqlForDerivedQueryAxisItem(item, alias, sqlOptions){
    var columnExpression = QueryAxisItem.getSqlForColumnExpression(item, alias, sqlOptions);

    var derivation = item.derivation;
    var derivationInfo;
    derivationInfo = AttributeUi.getDerivationInfo(derivation);
    var derivationExpressionTemplate = derivationInfo.expressionTemplate;
    columnExpression = extrapolateColumnExpression(derivationExpressionTemplate, columnExpression);
    
    return columnExpression;
  }

  static getSqlForQueryAxisItem(item, alias, sqlOptions){
    sqlOptions = normalizeSqlOptions(sqlOptions);
    var sqlExpression;
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
    var columnType = queryAxisItem.columnType;
    var dataType = columnType;
    if (queryAxisItem.memberExpressionPath) {
      var memberExpressionPath = queryAxisItem.memberExpressionPath;
      dataType = getMemberExpressionType(columnType, memberExpressionPath);
    }

    var derivationInfo, derivation = queryAxisItem.derivation;
    if (derivation) {
      derivationInfo = AttributeUi.getDerivationInfo(derivation);
      if (derivationInfo.columnType) {
        dataType = derivationInfo.columnType;
      }
      else
      if (derivationInfo.preservesColumnType){
        dataType = columnType;
      }
    }

    var aggregatorInfo, aggregator = queryAxisItem.aggregator;
    if (aggregator) {
      aggregatorInfo = AttributeUi.getAggregatorInfo(aggregator);
      if (aggregatorInfo.columnType) {
        dataType = aggregatorInfo.columnType;
      }
      else
      if (aggregatorInfo.preservesColumnType){
        dataType = columnType;
      }
      else {
        dataType = undefined;
      }
    }

    return dataType;
  }

  static #getFilterAxisItemValuesListAsSqlLiterals(queryAxisItem){
    var sql;
    var filter = queryAxisItem.filter;

    var values = filter.values;
    var toValues = filter.toValues;

    var valueLiterals = Object.keys(values).map(function(key){
      var entry = values[key];
      return entry.literal;
    });
    var toValueLiterals;
    var isRangeFilterType;
    switch (filter.filterType) {
      case FilterDialog.filterTypes.BETWEEN:
      case FilterDialog.filterTypes.NOTBETWEEN:
        isRangeFilterType = true;
        break;
      default:
        isRangeFilterType = false;
    }
    if (isRangeFilterType) {
      toValueLiterals = Object.keys(toValues).map(function(key){
        var entry = toValues[key];
        return entry.literal;
      });
    }
    return {
      valueLiterals: valueLiterals,
      toValueLiterals: toValueLiterals
    };
  }
  
  static getFilterConditionSql(queryAxisItem, alias){
    var filter = queryAxisItem.filter;
    if (!filter) {
      return undefined;
    }
    var literalLists = QueryAxisItem.#getFilterAxisItemValuesListAsSqlLiterals(queryAxisItem);

    if (literalLists.valueLiterals.length === 0){
      return undefined;
    }

    var columnExpression = QueryAxisItem.getSqlForQueryAxisItem(queryAxisItem, alias);
    var operator = '';

    var nullCondition;
    var indexOfNull = literalLists.valueLiterals.findIndex(function(value){
      return value.startsWith('NULL::');
    });
    
    if (indexOfNull !== -1) {
      operator = 'IS';
      switch (filter.filterType) {
        case FilterDialog.filterTypes.EXCLUDE:
        case FilterDialog.filterTypes.NOTLIKE:
        case FilterDialog.filterTypes.NOTBETWEEN:
          operator += ' NOT';
      }
      literalLists.valueLiterals.splice(indexOfNull, 1);
      switch (filter.filterType) {
        case FilterDialog.filterTypes.NOTBETWEEN:
        case FilterDialog.filterTypes.BETWEEN:
          literalLists.toValueLiterals.splice(indexOfNull, 1);
      }
      nullCondition = `${columnExpression} ${operator} NULL`;
      operator = '';
    }

    var sql = '', logicalOperator;
    if (literalLists.valueLiterals.length > 0) {
      switch (filter.filterType) {

        // INCLUDE and EXCLUDE logic        
        case FilterDialog.filterTypes.EXCLUDE:
          // in case of exclude, keep NULL values unless NULL is also in the valuelist.
          // https://github.com/rpbouman/huey/issues/90
          // TODO: if the column happens not to contain any nulls, we can omit this condition
          if (indexOfNull === -1) {
            sql = `${columnExpression} IS NULL OR `;
          }
          operator += literalLists.valueLiterals.length === 1 ? ' !' : ' NOT';
          logicalOperator = 'AND';
        case FilterDialog.filterTypes.INCLUDE:
          operator += literalLists.valueLiterals.length === 1 ? '=' : ' IN';
          var values = literalLists.valueLiterals.length === 1 ? literalLists.valueLiterals[0] : `( ${literalLists.valueLiterals.join('\n,')} )`;
          sql += `${columnExpression} ${operator} ${values}`;

          if (indexOfNull !== -1) {
            sql = `${nullCondition} ${logicalOperator ? logicalOperator : 'OR'} ${sql}`;
          }
          sql = `( ${sql} )`;
          break;

        // LIKE and NOT LIKE logic        
        case FilterDialog.filterTypes.NOTLIKE:
          operator = 'NOT ';
        case FilterDialog.filterTypes.LIKE:
          var dataType = QueryAxisItem.getQueryAxisItemDataType(queryAxisItem);
          if (dataType !== 'VARCHAR'){
            columnExpression = `${columnExpression}::VARCHAR`;
          }
          operator += 'LIKE';
          sql = literalLists.valueLiterals.reduce(function(acc, curr, currIndex){
            acc += '\n';
            if (currIndex) {
              acc += (logicalOperator ? logicalOperator : 'OR') + ' ';
            }
            var value = literalLists.valueLiterals[currIndex];
            acc += `${columnExpression} ${operator} ${value}`;
            return acc;
          }, '');
          break;          

        // BETWEEN and NOT BETWEEN logic        
        case FilterDialog.filterTypes.NOTBETWEEN:
          operator = 'NOT ';
          logicalOperator = 'AND';
        case FilterDialog.filterTypes.BETWEEN:
          operator += 'BETWEEN';
          sql = literalLists.valueLiterals.reduce(function(acc, curr, currIndex){
            acc += '\n';
            if (currIndex) {
              acc += (logicalOperator ? logicalOperator : 'OR') + ' ';
            }
            var fromValue = literalLists.valueLiterals[currIndex];
            var toValue = literalLists.toValueLiterals[currIndex];
            acc += `${columnExpression} ${operator} ${fromValue} AND ${toValue}`;
            return acc;
          }, '');

          if (nullCondition) {
            sql = `${nullCondition} ${logicalOperator ? logicalOperator : 'OR '} ${sql}`
          }
          if (!logicalOperator && nullCondition || literalLists.valueLiterals.length > 1) {
            sql = `( ${sql} )`;
          }
      }
    }
    else {
      sql = nullCondition;
    }
    return sql;
  }
}

class QueryAxis {

  #items = [];
  
  static getCaptionForQueryAxis(queryAxis){
    var items = queryAxis.getItems();
    if (items.length === 0){
      return '<empty>';
    }
    var itemKeys = Object.keys(items);
    var captions = itemKeys.map(function(itemKey){
      var item = items[itemKey];
      var caption = QueryAxisItem.getCaptionForQueryAxisItem(item);
      return `"${caption}"`;
    });
    return captions.join(', ');
  }
  
  getCaption(){
    return QueryAxis.getCaptionForQueryAxis(this);
  }
  
  findItem(config){
    var columnName = config.columnName;
    var derivation = config.derivation;
    var aggregator = config.aggregator;
    var memberExpressionPath = config.memberExpressionPath;
    if (memberExpressionPath instanceof Array){
      memberExpressionPath = JSON.stringify(memberExpressionPath);
    }

    var items = this.#items;
    var itemIndex = items.findIndex(function(item){
      if (item.columnName !== columnName){
        return false;
      }

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

      if (derivation) {
        return item.derivation === derivation;
      }
      else
      if (item.derivation){
        return false;
      }

      else
      if (aggregator) {
        return item.aggregator === aggregator;
      }
      else
      if (item.aggregator){
        return false;
      }
      return true;
    });

    if (itemIndex === -1) {
      return undefined;
    }
    var item = items[itemIndex];
    var copyOfItem = Object.assign({}, item);
    copyOfItem.index = itemIndex;
    return copyOfItem;
  }

  addItem(config){
    var copyOfConfig = Object.assign({}, config);
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
    var item = this.findItem(config);
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
  
  getTotalsItems(){
    var totalsItems = this.#items.filter(function(axisItem){
      return axisItem.includeTotals === true;
    });
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
    
  constructor(config){
    super('change');
    var config = Object.assign({}, QueryModel.#defaultConfig, config);
    if (config.settings){
      this.#settings = settings;
    }
  }

  setCellHeadersAxis(cellheadersaxis) {
    var oldCellHeadersAxis = this.#cellheadersaxis;
    this.#cellheadersaxis = cellheadersaxis;
    this.fireEvent('change', {
      propertiesChanged: {
        cellHeadersAxis: {
          previousValue: oldCellHeadersAxis,
          newValue: cellheadersaxis
        }
      }
    });
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
    var queryAxis = this.getQueryAxis(axisId);
    var caption = queryAxis = queryAxis.getCaption();
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

  #destroyDatasourceHandler(event){
    if (event.target !== this.#datasource) {
      return;
    }
    this.setDatasource(undefined);
  }

  setDatasource(datasource){    
    if (datasource === this.#datasource) {
      return;
    }
    else
    if (this.#datasource) {
      this.#datasource.removeEventListener('destroy', this.#destroyDatasourceHandler.bind(this));
    }

    this.#clear(true);
    var oldDatasource = this.#datasource;
    this.#datasource = datasource;

    if (datasource){
      datasource.addEventListener('destroy', this.#destroyDatasourceHandler.bind(this));
    }

    this.fireEvent('change', {
      propertiesChanged: {
        datasource: {
          previousValue: oldDatasource,
          newValue: datasource
        }
      }
    });
  }

  getDatasource(){
    return this.#datasource;
  }
  
  /**
  * finds all columns refs and lists the axes that use the column
  */
  getReferencedColumns(){
    var referencedColumns = {};
    Object.keys(this.#axes).forEach(function(axisId){
      var axis = this.getQueryAxis(axisId);
      axis.getItems().forEach(function(axisItem){
        var columnName = axisItem.columnName;
        var columnSpec = referencedColumns[columnName];
        if (!columnSpec) {
          columnSpec = {
            columnType: axisItem.columnType,
            axes: []
          };          
          referencedColumns[columnName] = columnSpec;
        }
        if (columnSpec.axes.indexOf(axisId) === -1){
          columnSpec.axes.push(axisId);
        }
      });
    }.bind(this))
    return referencedColumns;
  }

  findItem(config){
    var columnName = config.columnName;
    var memberExpressionPath = config.memberExpressionPath;
    var derivation = config.derivation;
    var aggregator = config.aggregator;

    var axisIds, axisId = config.axis;
    if (axisId) {
      axisIds = [axisId];
    }
    else
    if (aggregator){
      axisIds = ['cells'];
    }
    else {
      axisIds = Object.keys(this.#axes).filter(function(axisId){
        return axisId !== QueryModel.AXIS_FILTERS;
      });
    }

    var findConfig = {
      columnName: config.columnName,
      memberExpressionPath: memberExpressionPath,
      derivation: config.derivation,
      aggregator: config.aggregator
    };
    var axis, item;
    for (var i = 0; i < axisIds.length; i++){
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
    var axisId = config.axis;
    var axis = this.getQueryAxis(config.axis);
    var addedItem = axis.addItem(config);
    addedItem.axis = axisId;
    return addedItem;
  }

  #removeItem(config) {
    var axisId = config.axis;
    var axis = this.getQueryAxis(config.axis);
    var removedItem = axis.removeItem(config);
    removedItem.axis = axisId;
    return removedItem;
  }

  async addItem(config){
    var axis = config.axis;

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
    var copyOfConfig = Object.assign({}, config);
    // filter items are special because they can appear on multiple axes.
    // if the item is a filter axis item, we should not remove the axis.
    if (axis !== QueryModel.AXIS_FILTERS){
      delete copyOfConfig['axis'];
    }
    var item = this.findItem(copyOfConfig);

    var removedItem;
    if (item) {
      // if the item already exits in this model, we first remove it.
      removedItem = this.#removeItem(item);
    }

    if (!config.columnType) {
      if (removedItem && removedItem.columnType) {
        config.columnType = removedItem.columnType;
      }
    }

    if (!config.columnType) {
      var datasource = this.#datasource;
      var columnMetadata = await datasource.getColumnMetadata();
      for (var i = 0; i < columnMetadata.numRows; i++){
        var row = columnMetadata.get(i);
        if (row.column_name === config.columnName) {
          config.columnType = row.column_type;
        }
      }
    }

    var addedItem = this.#addItem(config);

    var axesChangeInfo = {};
    axesChangeInfo[addedItem.axis] = {
      added: [addedItem]
    };
    if (removedItem){
      axesChangeInfo[removedItem.axis] = {
        removed: [removedItem]
      };
    }

    this.fireEvent('change', {
      axesChanged: axesChangeInfo
    });

    return addedItem;
  }

  removeItem(config){
    var copyOfConfig = Object.assign({}, config);

    var axisId = copyOfConfig['axis'];
    if (axisId && axisId !== QueryModel.AXIS_FILTERS) {
      delete copyOfConfig[axisId];
    }

    var item = this.findItem(copyOfConfig);
    if (!item){
      return undefined;
    }
    var axisId = item.axis;
    var axis = this.getQueryAxis(axisId);
    var removedItem = axis.removeItem(item);
    removedItem.axis = axisId;

    var axesChangeInfo = {};
    axesChangeInfo[axisId] = {
      removed: [removedItem]
    };

    this.fireEvent('change', {
      axesChanged: axesChangeInfo
    });

    return removedItem;
  }

  toggleTotals(queryItemConfig, value){
    if (Boolean(value) !== value) {
      return;
    }
    var queryModelItem = this.findItem(queryItemConfig);
    if (!queryModelItem) {
      return;
    }

    var axisId = queryModelItem.axis;
    var axis = this.getQueryAxis(axisId);
    var items = axis.getItems();
    items[queryModelItem.index].includeTotals = value;

    var axesChangeInfo = {};
    axesChangeInfo[axisId] = {
      changed: [items[queryModelItem.index]]
    };

    this.fireEvent('change', {
      axesChanged: axesChangeInfo
    });

    return queryModelItem;
  }

  #clear(suppressFireEvent, axisId){
    var axisIds;
    if (axisId) {
      axisIds = [axisId];
    }
    else {
      axisIds = Object.keys(this.#axes);
    }

    var axesChangeInfo = {};
    for (var i = 0; i < axisIds.length; i++) {
      var axisId = axisIds[i];
      var axis = this.getQueryAxis(axisId);
      var items = axis.getItems();

      if (!items.length) {
        continue;
      }

      axesChangeInfo[axisId] = {
        removed: items
      };
      axis.clear();
    }

    if (!Object.keys(axesChangeInfo).length){
      // no change, don't fire event.
      return;
    }

    if (suppressFireEvent) {
      return;
    }

    this.fireEvent('change', {
      axesChanged: axesChangeInfo
    });
  }

  clear(axisId) {
    // clear and send event;
    this.#clear(false, axisId);
  }

  flipAxes(axisId1, axisId2) {
    var axesChangeInfo = {};

    var axis1 = this.getQueryAxis(axisId1);
    var axis1Items = axis1.getItems();

    var axis2 = this.getQueryAxis(axisId2);
    var axis2Items = axis2.getItems();

    axis1.setItems(axis2Items);
    axis2.setItems(axis1Items);

    if (axis1Items.length) {
      axesChangeInfo[axisId1] = {
        removed: axis1Items
      }
      axesChangeInfo[axisId2] = {
        added: axis1Items
      };
    }
    if (axis2Items.length) {
      axesChangeInfo[axisId2] = {
        removed: axis2Items
      };
      axesChangeInfo[axisId1] = {
        added: axis2Items
      };
    }

    this.fireEvent('change', {
      axesChanged: axesChangeInfo
    });
  }

  setQueryAxisItemFilter(queryAxisItem, filter){
    var queryModelItem = this.findItem(queryAxisItem);
    if (!queryModelItem) {
      throw new Error(`Item is not part of the model!`);
    }
    var oldFilter = queryAxisItem.filter;

    // update the real item stored in the axis
    // (note that the normal getters return copies)
    var axis = this.getQueryAxis(queryModelItem.axis);
    var items = axis.getItems();

    if (Object.keys(filter.values).length){
      filter.toggleState = oldFilter ? oldFilter.toggleState : 'closed';
    }
    else {
      filter = undefined;
    }
    items[queryModelItem.index].filter = filter;

    var axesChangeInfo = {};
    axesChangeInfo[queryAxisItem.axis] = {
      changed: {
        changed: [queryAxisItem]
      }
    };

    this.fireEvent('change', {
      axesChanged: axesChangeInfo
    });
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
    var queryAxis = this.getFiltersAxis();
    var items = queryAxis.getItems();
    if (items.length === 0){
      return undefined;
    }

    if (excludeTupleItems === true){
      var rowsAxis = this.getRowsAxis();
      var columnsAxis = this.getColumnsAxis();
      items = items.filter(function(item){
        if (rowsAxis.findItem(item)) {
          return false;
        }
        if (columnsAxis.findItem(item)) {
          return false;
        }
        return true;
      });
    }

    var conditions = items.filter(function(item){
      if (!item.filter) {
        return false;
      }
      if (Object.keys(item.filter.values) === 0) {
        return false;
      }
      return true;
    }).map(function(item){
      return QueryAxisItem.getFilterConditionSql(item, alias);
    });
    var condition = conditions.join('\nAND ');
    return condition;
  }
  
  getState(){
    var datasource = this.getDatasource();
    if (!datasource) {
      return null;
    }
    var datasourceId = datasource.getId();
    
    var queryModelObject = {
      datasourceId: datasourceId,
      cellsHeaders: this.getCellHeadersAxis(),
      axes: {}
    };
    
    var axisIds = this.getAxisIds().sort();
    var hasItems = false;
    axisIds.forEach(function(axisId){
      var axis = this.getQueryAxis(axisId);
      var items = axis.getItems();
      if (items.length === 0) {
        return '';
      }
      hasItems = true;
      queryModelObject.axes[axisId] = items.map(function(axisItem){
        var strippedItem = {column: axisItem.columnName};
        strippedItem.memberExpressionPath = axisItem.memberExpressionPath;  
        strippedItem.columnType = axisItem.columnType;
        strippedItem.derivation = axisItem.derivation;
        strippedItem.aggregator = axisItem.aggregator;
        if (axisItem.includeTotals === true) {
          strippedItem.includeTotals = true;
        }
        
        if (axisId === QueryModel.AXIS_FILTERS && axisItem.filter){
          strippedItem.filter = axisItem.filter;
        }
        
        return strippedItem;
      });
    }.bind(this));
    if (!hasItems){
      return null;
    }
    return queryModelObject;
  }
  
  get #autoUpdate(){
    var autoUpdate;
    var settings = this.#settings || {};
    if (settings && typeof settings.getSettings === 'function'){
      settings = settings.getSettings('querySettings');
    }
    if (settings.autoRunQuery !== undefined) {
      autoUpdate = settings.autoRunQuery;
    }
    else {
      autoUpdate = true;
    }
    return autoUpdate;
  }
  
  async setState(queryModelState){

    var autoRunQuery = this.#autoUpdate;
    var canAssignSettings = this.#settings && typeof this.#settings.assignSettings === 'function';
    
    if (canAssignSettings){
      settings.assignSettings(['querySettings', 'autoRunQuery'], false);
    }

    try {
      var datasourceId = queryModelState.datasourceId;
      var datasource;
      if (datasourceId){
        datasource = datasourcesUi.getDatasource(datasourceId);
      }
      else 
      if(queryModelState.datasource && queryModelState.datasource instanceof DuckDbDataSource){
        datasource = queryModelState.datasource;
      }
       
      if (this.getDatasource() === datasource) {
        this.clear();
      }
      else {
        this.setDatasource(datasource);
      }
      
      var axes = queryModelState.axes;
      for (var axisId in axes){
        var items = axes[axisId];
        for (var i = 0 ; i < items.length; i++){
          var item = items[i];
          var config = { columnName: item.column };

          config.columnType = item.columnType;
          config.derivation = item.derivation;
          config.aggregator = item.aggregator;
          config.memberExpressionPath = item.memberExpressionPath;
          config.caption = item.caption;
          if (item.includeTotals === true){
            config.includeTotals = true;
          }
          
          var formatter = QueryAxisItem.createFormatter(config);
          if (formatter){
            config.formatter = formatter;
          }
          
          var literalWriter = QueryAxisItem.createLiteralWriter(config);
          if (literalWriter){
            config.literalWriter = literalWriter;
          }
          
          if (axisId === QueryModel.AXIS_FILTERS) {
            var filter = item.filter;
            if (filter) {
              config.filter = filter;
            }
          }
          config.axis = axisId;
          await this.addItem(config);
        }
      }
    }
    catch(e){
      debugger;
    }
    finally {
      if (canAssignSettings){
        this.#settings.assignSettings(['querySettings', 'autoRunQuery'], autoRunQuery);
      }
      
      if (autoRunQuery){
        setTimeout(function(){
          pivotTableUi.updatePivotTableUi();
        }, 1000);
      }
    }
  }
  
}

var queryModel;
function initQueryModel(){
  queryModel = new QueryModel({
    settings: settings
  });
}