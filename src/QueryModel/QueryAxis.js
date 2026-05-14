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
