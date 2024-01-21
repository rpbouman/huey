class QueryUi {
  
  #id = undefined;
  #queryModel = undefined;
  #queryAxisTemplateId = undefined;
  #queryAxisItemTemplateId = undefined;
  
  
  constructor(config){
    this.#id = config.id || 'queryUi';
    this.#queryModel = config.queryModel; 
    this.#queryAxisTemplateId = config.queryAxisTemplateId || 'queryUiAxis';
    this.#queryAxisItemTemplateId = config.queryAxisItemTemplateId || 'queryUiAxisItem';
    this.#renderAxes();
    this.#initEvents();
  }
  
  #queryUiClickHandler(event){
    var target = event.target;
    if (target.tagName !== 'BUTTON'){
      return;
    }
    var node = target;
    var axis, axisItem;
    var isClearAxisAction, isPrimaryAxisAction, isAxisItemAction;
    var dom = this.getDom();
    while (node && node !== dom){
      switch (node.tagName){
        case 'SECTION':
          axis = node;
          break;
        case 'LI':
          axisItem = node;
          break;
      }
      node = node.parentNode;
    }
    
    if (!axis){
      return;
    }
    
    var targetId = target.getAttribute('id');
    if (targetId.endsWith('-axis-primary-action')) {
      this.#axisPrimaryActionButtonClicked(axis);
    }
    else
    if (targetId.endsWith('-clear-axis')){
      this.#axisClearButtonClicked(axis);
    }
    
    if (!axisItem){
      return;
    }
    
    if (targetId.endsWith('-move-left')) {
      this.#queryAxisUiItemMoveLeftClicked(axisItem);
    }
    else
    if (targetId.endsWith('-move-right')) {
      this.#queryAxisUiItemMoveRightClicked(axisItem);
    }
    else
    if (targetId.endsWith('-remove-from-axis')){
      this.#queryAxisUiItemRemoveClicked(axisItem);
    }
    else
    if (targetId.endsWith('-move-to-other-axis')){
      this.#queryAxisUiItemMoveToAxisClicked(axisItem);      
    }
  }

  #queryAxisUiItemMoveToAxisClicked(queryAxisItemUi){
    var item = this.#getQueryModelItem(queryAxisItemUi);
    delete item.index;
    switch (item.axis) {
      case QueryModel.AXIS_COLUMNS:
        item.axis = QueryModel.AXIS_ROWS;
        break;
      case QueryModel.AXIS_ROWS:
        item.axis = QueryModel.AXIS_COLUMNS;
        break;
    }
    this.#queryModel.addItem(item);
  }

  #moveQueryAxisItemUi(queryAxisItemUi, direction) {
    var item = this.#getQueryModelItem(queryAxisItemUi);
    var itemIndex = item.index;
    itemIndex += direction;
    item.index = itemIndex;
    this.#queryModel.addItem(item);
  }

  #queryAxisUiItemMoveLeftClicked(queryAxisItemUi){
    this.#moveQueryAxisItemUi(queryAxisItemUi, -1);
  }

  #queryAxisUiItemMoveRightClicked(queryAxisItemUi){
    this.#moveQueryAxisItemUi(queryAxisItemUi, 1);
  }

  #queryAxisUiItemRemoveClicked(queryAxisItemUi){
    var item = this.#getQueryModelItem(queryAxisItemUi);
    queryModel.removeItem(item);
  }

  #updateQueryUi(){
    var dom = this.getDom();
    dom.setAttribute('data-cellheadersaxis', this.#queryModel.getCellHeadersAxis());
    var axes = dom.childNodes;
    for (var i = 0; i < axes.length; i++){
      var axis = axes.item(i);
      if (axis.nodeType !== 1 || axis.tagName !== 'SECTION') {
        continue;
      }
      var axisId = axis.getAttribute('data-axis');
      var queryModelAxis = queryModel.getQueryAxis(axisId);
      this.#updateQueryAxisUi(axis, queryModelAxis);
    }
  }
  
  #getQueryAxisItemUiCaption(axisItem){
    return axisItem.columnName;
  }
  
  #getQueryModelItem(queryAxisItemUi){
    var searchItem = {
      columnName: queryAxisItemUi.getAttribute('data-column_name'),
      derivation: queryAxisItemUi.getAttribute('data-derivation'),
      aggregator: queryAxisItemUi.getAttribute('data-aggregator')
    };
    var item = this.#queryModel.findItem(searchItem);
    if (!item) {
      throw new Error(`Unexpected error: could not find item ${JSON.stringify(searchItem)} in query model`);
    }
    return item;
  }
  
  #createQueryAxisItemUi(axisItem){
    
    var id = this.#id + '-' + QueryAxisItem.getIdForQueryAxisItem(axisItem);
    
    var itemUi = this.#instantiateTemplate('queryUiAxisItem', id);
    itemUi.setAttribute('id', id);
    itemUi.setAttribute('data-column_name',  axisItem.columnName);

    var derivation = axisItem.derivation;
    if (derivation) {
      itemUi.setAttribute('data-derivation', derivation);
    }
    
    var aggregator = axisItem.aggregator;
    if (aggregator) {
      itemUi.setAttribute('data-aggregator', aggregator);
    }
    
    var captionText = this.#getQueryAxisItemUiCaption(axisItem);
    var captionUi = itemUi.getElementsByTagName('span').item(0);
    captionUi.innerText = captionText;

    return itemUi;
  }
  
  #updateQueryAxisUi(axisUi, queryModelAxis) {
    var axisItemsUi = axisUi.getElementsByTagName('ol').item(0);
    axisItemsUi.innerHTML = '';
    var items = queryModelAxis.getItems();
    for (var i = 0; i < items.length; i++){
      var item = items[i];
      var queryAxisItemUi = this.#createQueryAxisItemUi(item);
      axisItemsUi.appendChild(queryAxisItemUi);
    }
  }
  
  #queryModelChangeHandler(event) {
    // TODO: examine the event Data and figure out if we have to update the entire ui or just bits of it.
    this.#updateQueryUi();
  }
  
  #initEvents(){
    var dom = this.getDom();
    dom.addEventListener('click', this.#queryUiClickHandler.bind(this));

    this.#queryModel.addEventListener('change', this.#queryModelChangeHandler.bind(this));
  }
  
  #axisClearButtonClicked(axis){
    var axisId = axis.getAttribute('data-axis');
    this.#queryModel.clear(axisId);
  }

  #axisPrimaryActionButtonClicked(axis){
    var axisId = axis.getAttribute('data-axis');
    switch (axisId){
      case QueryModel.AXIS_COLUMNS:
      case QueryModel.AXIS_ROWS:
        this.#queryModel.flipAxes(QueryModel.AXIS_COLUMNS, QueryModel.AXIS_ROWS);
        break;
      case QueryModel.AXIS_CELLS:
        var cellheadersaxis = this.#queryModel.getCellHeadersAxis();
        switch (cellheadersaxis) {
          case QueryModel.AXIS_COLUMNS:
            cellheadersaxis = QueryModel.AXIS_ROWS;
            break;
          case QueryModel.AXIS_ROWS:
            cellheadersaxis = QueryModel.AXIS_COLUMNS;
            break;
          default:
            throw new Error(`Unrecognized cellaxisplacement ${cellheadersaxis}`);
        }
        this.#queryModel.setCellHeadersAxis(cellheadersaxis);
        break;
    }
  }
    
  #instantiateTemplate(templateId, instanceId) {
    var template = byId(templateId);
    var clone = template.content.cloneNode(true);
    var index = 0;
    var node;
    do {
      var node = clone.childNodes.item(index++);
    } while (node && node.nodeType !== node.ELEMENT_NODE);
    node.setAttribute('id', instanceId);
    var buttons = node.getElementsByTagName('button');
    for (var i = 0; i < buttons.length; i++){
      var button = buttons.item(i);
      var buttonId = instanceId + '-' + button.getAttribute('id');
      button.setAttribute('id', buttonId);
      button.parentNode.setAttribute('for', buttonId);
    }
    return node;
  }
  
  #getCellsAxisPrimaryActionTitle(){
    var cellsAxisPrimaryActionTitle;
    var targetAxis;
    var cellHeadersAxis = this.#queryModel.getCellHeadersAxis();
    switch (cellHeadersAxis){
      case QueryModel.AXIS_COLUMNS:
        targetAxis = QueryModel.AXIS_ROWS;
        break;
      case QueryModel.AXIS_ROWS:
        targetAxis = QueryModel.AXIS_COLUMNS;
        break;
    }
    var cellsAxisPrimaryActionTitle = `Move the cell headers to the ${targetAxis} axis`;
    return cellsAxisPrimaryActionTitle;
  }
  
  #renderAxis(config){
    var axisId = config.axisId;
    var caption = config.caption || (axisId.charAt(0).toUpperCase() + axisId.substr(1));
    var axis = this.#instantiateTemplate(this.#queryAxisTemplateId, this.#id + '-' + axisId);

    var primaryAxisActionLabelTitle;
    if (config.primaryAxisActionLabelTitle){
      primaryAxisActionLabelTitle = config.primaryAxisActionLabelTitle;
    }
    else {
      switch (axisId) {
        case QueryModel.AXIS_COLUMNS:
        case QueryModel.AXIS_ROWS:
          primaryAxisActionLabelTitle = 'Flip the rows and columns axes';
          break;
        case QueryModel.AXIS_CELLS:
          primaryAxisActionLabelTitle = this.#getCellsAxisPrimaryActionTitle();
          break;
      }
    }
    var labels = axis.getElementsByTagName('label');
    
    var primaryAxisActionLabel = labels.item(0);
    primaryAxisActionLabel.setAttribute('title', primaryAxisActionLabelTitle);
    
    labels.item(1).setAttribute('title', `Clear all items from the ${axisId} axis.`);
    
    axis.setAttribute('data-axis', axisId);
    var heading = axis.getElementsByTagName('h1').item(0);
    heading.innerText = caption;
    this.getDom().appendChild(axis);
  }
  
  #renderAxes(){
    this.#renderAxis({
      axisId: QueryModel.AXIS_COLUMNS
    });
    this.#renderAxis({
      axisId: QueryModel.AXIS_ROWS
    });
    this.#renderAxis({
      axisId: QueryModel.AXIS_CELLS
    });    
  }
  
  getDom(){
    return byId(this.#id);
  }
}

var queryUi;
function initQueryUi(){
  queryUi = new QueryUi({
    id: 'queryUi',
    queryModel: queryModel
  });
}
