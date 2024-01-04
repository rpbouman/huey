class QueryAxisItem {

  static getCaptionForQueryAxisItem(axisItem){
    var caption = axisItem.columnName;
    var postfix;
    if (axisItem.derivation) {
      postfix = axisItem.derivation;
    }
    else 
    if (axisItem.aggregator){
      postfix = axisItem.aggregator;
    }
    
    if (postfix) {
      caption += ` ${postfix}`;
    }
    return caption;
  }
  
  static getIdForQueryAxisItem(axisItem){
    var id = QueryAxisItem.getSqlForQueryAxisItem(axisItem);
    return id;
  }
  
  static getSqlForAggregatedQueryAxisItem(item, alias){
    var columnName = item.columnName;
    if (alias){
      columnName = getQualifiedIdentifier(alias, columnName);
    }
    else {
      columnName = getQuotedIdentifier(columnName);
    }
    var aggregator = item.aggregator;
    var aggregatorInfo = aggregators[aggregator];
    var expressionTemplate = aggregatorInfo.expressionTemplate;
    var expression = expressionTemplate.replace(/\$\{columnName\}/g, columnName);
    return expression;
  }

  static getSqlForDerivedQueryAxisItem(item, alias){
    var columnName = item.columnName;
    if (alias){
      columnName = getQualifiedIdentifier(alias, columnName);
    }
    else {
      columnName = getQuotedIdentifier(columnName);
    }
    var derivation = item.derivation;
    var derivationInfo;
    derivationInfo = dateFields[derivation] || timeFields[derivation];
    var expressionTemplate = derivationInfo.expressionTemplate;
    var expression = expressionTemplate.replace(/\$\{columnName\}/g, columnName);
    return expression;
  }

  static getSqlForQueryAxisItem(item, alias){
    var sqlExpression;
    if (item.aggregator) {
      sqlExpression = QueryAxisItem.getSqlForAggregatedQueryAxisItem(item, alias);
    }
    else
    if (item.derivation) {
      sqlExpression = QueryAxisItem.getSqlForDerivedQueryAxisItem(item, alias);
    }
    else {
      if (alias){
        sqlExpression = getQualifiedIdentifier(alias, item.columnName);
      }
      else {
        sqlExpression = getQuotedIdentifier(item.columnName);
      }
    }    
    return sqlExpression;
  }
}


class QueryAxis {
  
  #items = [];

  findItem(config){
    var columnName = config.columnName;
    var derivation = config.derivation;
    var aggregator = config.aggregator;
    
    var items = this.#items;
    var itemIndex = items.findIndex(function(item){
      if (item.columnName !== columnName){
        return false;
      }
      if (derivation) {
        return item.derivation === derivation;
      }
      else
      if (aggregator) {
        return item.aggregator === aggregator;
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
    this.#items.splice(item.index, 1);
    return item;
  }
  
  clear(){
    this.#items = [];
  }
  
  getItems() {
    return [].concat(this.#items);
  }
  
  setItems(items) {
    this.#items = items;
  }
}

class QueryModel extends EventEmitter {
  
  static AXIS_ROWS = 'rows';
  static AXIS_COLUMNS = 'columns';
  static AXIS_CELLS = 'cells';
  
  #axes = {
    columns: new QueryAxis(),
    rows: new QueryAxis(),
    cells: new QueryAxis()
  };
  
  #cellheadersaxis = QueryModel.AXIS_COLUMNS;
  
  #datasource = undefined;
  
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
  
  getCellHeadersAxis(){
    return this.#cellheadersaxis;
  }
  
  getQueryAxis(axisId){
    return this.#axes[axisId];
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
  
  setDatasource(datasource){
    this.#datasource = datasource;
  }
  
  getDatasource(){
    return this.#datasource;
  }
  
  findItem(config){
    var columnName = config.columnName;
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
      axisIds = Object.keys(this.#axes);
    }

    var findConfig = {
      columnName: config.columnName,
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
  
  addItem(config){
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
    delete copyOfConfig['axis'];
    var item = this.findItem(copyOfConfig);
    
    var removedItem;
    if (item) {
      // if the item already exits in this model, we first remove it.
      removedItem = this.#removeItem(item);
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
    delete copyOfConfig['axis'];
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
  
  clear(axisId) {
    
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
    
    this.fireEvent('change', {
      axesChanged: axesChangeInfo
    });
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
      axesChangeInfo[axis1] = {
        removed: axis1Items
      }
      axesChangeInfo[axis2] = {
        added: axis1Items
      };
    }
    if (axis2Items.length) {
      axesChangeInfo[axis2] = {
        removed: axis2Items
      };
      axesChangeInfo[axis1] = {
        added: axis2Items
      };
    }
    
    this.fireEvent('change', {
      axesChanged: axesChangeInfo
    });
  }
  
}

var queryModel;
function initQueryModel(){
  queryModel = new QueryModel();
}