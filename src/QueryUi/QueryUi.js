class QueryUi {

  #id = undefined;
  #queryModel = undefined;
  #filterDialog = filterDialog;
  #queryAxisTemplateId = undefined;
  #queryAxisItemTemplateId = undefined;


  constructor(config){
    this.#id = config.id || 'queryUi';
    this.#queryModel = config.queryModel;
    this.#filterDialog = config.filterDialog;
    this.#queryAxisTemplateId = config.queryAxisTemplateId || 'queryUiAxis';
    this.#queryAxisItemTemplateId = config.queryAxisItemTemplateId || 'queryUiAxisItem';
    this.#renderAxes();
    this.#initEvents();
  }

  #queryUiClickHandler(event){
    var target = event.target;
    var tagName = target.tagName;
    switch (tagName){
      case 'BUTTON':
      case 'INPUT':
      case 'LABEL':
      case 'SPAN':
        break;
      default:
        return;
    }
    var node = target;
    var axis, queryAxisItemUi;
    var isClearAxisAction, isPrimaryAxisAction, isAxisItemAction;
    var dom = this.getDom();
    var dataValueKey = null, dataValueEnabled;
    
    while (node && node !== dom){
      switch (node.tagName){
        case 'SECTION':
          axis = node;
          break;
        case 'LI':
          queryAxisItemUi = node;
          if (dataValueKey === null) {
            dataValueKey = node.getAttribute('data-value');
          }
          break;
      }
      node = node.parentNode;
    }

    if (!axis){
      return;
    }

    var targetId = target.getAttribute('id');
    if (targetId) {
      if (targetId.endsWith('-axis-primary-action')) {
        this.#axisPrimaryActionButtonClicked(axis);
      }
      else
      if (targetId.endsWith('-clear-axis')){
        this.#axisClearButtonClicked(axis);
      }
    }

    if (!queryAxisItemUi){
      return;
    }

    if (targetId) {
      if (targetId.endsWith('-move-left')) {
        this.#queryAxisUiItemMoveLeftClicked(queryAxisItemUi);
      }
      else
      if (targetId.endsWith('-move-right')) {
        this.#queryAxisUiItemMoveRightClicked(queryAxisItemUi);
      }
      else
      if (targetId.endsWith('-remove-from-axis')){
        this.#queryAxisUiItemRemoveClicked(queryAxisItemUi);
      }
      else
      if (targetId.endsWith('-move-to-other-axis')){
        this.#queryAxisUiItemMoveToAxisClicked(queryAxisItemUi);
      }
      else
      if (targetId.endsWith('-edit-filter-condition')){
        this.#openFilterDialogForQueryAxisItemUi(queryAxisItemUi);
      }
      else
      if (targetId.endsWith('-toggle-totals')){
        this.#queryAxisUiItemToggleTotals(queryAxisItemUi);
      }
      else 
      if (dataValueKey !== null){
        this.#queryAxisUiItemToggleEnableDataValue(
          queryAxisItemUi,
          dataValueKey
        );
      }
    }
  }

  #openFilterDialogForQueryAxisItemUi(queryAxisItemUi){
    var queryModelItem = this.#getQueryModelItem(queryAxisItemUi);
    this.#filterDialog.openFilterDialog(this.#queryModel, queryModelItem, queryAxisItemUi);
  }

  openFilterDialogForQueryModelItem(queryModelItem){
    var queryAxisItemUi = this.#getQueryAxisItemUi(queryModelItem);
    // when we're restoring page state, the queryUi may be populated but hidden.
    // in this case we need to wait a bit until the query ui is rendered
    // else the filter dialog will pop up at the entirely wrong position.
    if (queryAxisItemUi.clientWidth === 0){
      setTimeout(function(){
        this.openFilterDialogForQueryModelItem(queryModelItem);
      }.bind(this), 100);
    }
    else {
      this.#filterDialog.openFilterDialog(this.#queryModel, queryModelItem, queryAxisItemUi);
    }
  }

  #queryAxisUiItemMoveToAxisClicked(queryAxisItemUi){
    var queryModelItem = this.#getQueryModelItem(queryAxisItemUi);
    delete queryModelItem.index;
    switch (queryModelItem.axis) {
      case QueryModel.AXIS_COLUMNS:
        queryModelItem.axis = QueryModel.AXIS_ROWS;
        break;
      case QueryModel.AXIS_ROWS:
        queryModelItem.axis = QueryModel.AXIS_COLUMNS;
        break;
    }
    this.#queryModel.addItem(queryModelItem);
  }

  #moveQueryAxisItemUi(queryAxisItemUi, direction) {
    var queryModelItem = this.#getQueryModelItem(queryAxisItemUi);
    var itemIndex = queryModelItem.index;
    itemIndex += direction;
    queryModelItem.index = itemIndex;
    this.#queryModel.addItem(queryModelItem);
  }

  #queryAxisUiItemMoveLeftClicked(queryAxisItemUi){
    this.#moveQueryAxisItemUi(queryAxisItemUi, -1);
  }

  #queryAxisUiItemMoveRightClicked(queryAxisItemUi){
    this.#moveQueryAxisItemUi(queryAxisItemUi, 1);
  }

  #queryAxisUiItemRemoveClicked(queryAxisItemUi){
    var queryModelItem = this.#getQueryModelItem(queryAxisItemUi);
    queryModel.removeItem(queryModelItem);
  }

  #queryAxisUiItemToggleTotals(queryAxisItemUi){
    var id = queryAxisItemUi.getAttribute('id');
    var toggleTotalsCheckbox = queryAxisItemUi.querySelector(`menu > label > input[type=checkbox]`);
    var value = toggleTotalsCheckbox.checked;
    var queryModelItem = this.#getQueryModelItem(queryAxisItemUi);
    queryModel.toggleTotals(queryModelItem, value);
  }
  
  #queryAxisUiItemToggleEnableDataValue(queryAxisItemUi, dataValueKey){
    var id = queryAxisItemUi.getAttribute('id');
    var queryModelItem = this.#getQueryModelItem(queryAxisItemUi);
    var filter = queryModelItem.filter;
    var values = filter.values;
    var valueObject = values[dataValueKey];
    if (valueObject.enabled === false) {
      delete valueObject.enabled;
    }
    else {
      valueObject.enabled = false;
    }
    this.#queryModel.setQueryAxisItemFilter(queryModelItem, filter);
  }
  
  #getAxisUiElements(){
    var dom = this.getDom();
    var axisUiElements = dom.querySelectorAll('SECTION[data-axis]');
    return axisUiElements;
  }

  #checkOverflowTimeout = undefined;
  #updateQueryUi(){
    var dom = this.getDom();
    dom.setAttribute('data-cellheadersaxis', this.#queryModel.getCellHeadersAxis());
    var axes = this.#getAxisUiElements();
    for (var i = 0; i < axes.length; i++){
      var axis = axes.item(i);
      var axisId = axis.getAttribute('data-axis');
      var queryModelAxis = queryModel.getQueryAxis(axisId);
      this.#updateQueryAxisUi(axis, queryModelAxis);
    }
    
    if (this.#checkOverflowTimeout !== undefined) {
      clearTimeout(this.#checkOverflowTimeout);
      this.#checkOverflowTimeout = undefined;
    }
    if (dom.clientHeight === 0) {
      return;
    }
    setTimeout(function(){
      this.#checkOverflow();
    }.bind(this), 100);
  }

  #checkOverflow(axisUi){
    if (axisUi) {
      var ol = axisUi.getElementsByTagName('OL').item(0);
      // this is the explicitly set height. If it is not NaN, it means the element has been resized.
      var style = ol.style;
      var height = parseInt(style.height, 10);

      // this is the minimum height.
      var computedStyle = getComputedStyle(ol);
      var minHeight = parseInt(computedStyle.minHeight, 10);

      // this is the actual, runtime height of the element
      var clientHeight = ol.clientHeight;

      style.height = '';
      var resize, overflow;
      if (ol.clientHeight > minHeight) {
        // restor height
        if (!isNaN(height)) {
          style.height = height + 'px';
        }
        resize = 'vertical';
        overflow = 'scroll';
      }
      else {
        // this is perfect - we can remove the resizer because the user doesn't need it.
        resize = 'none';
        overflow = 'auto';
      }
      style.resize = resize;
      style.overflowY = overflow;
      return;
    }
    
    var axes = this.#getAxisUiElements();
    for (var i = 0; i < axes.length; i++){
      var axisUi = axes.item(i);
      this.#checkOverflow(axisUi);
    }
  }

  #getQueryAxisItemUiCaption(axisItem){
    if (axisItem.caption) {
      return axisItem.caption;
    }
    var expression = axisItem.columnName;
    if (axisItem.memberExpressionPath) {
      var path = Object.assign([], axisItem.memberExpressionPath);
      switch (axisItem.derivation) {
        case 'elements':
        case 'element indices':
          path.pop();
      }
      expression = `${expression}.${path.join('.')}`;
    }
    
    if (axisItem.derivation) {
      expression = `${axisItem.derivation} of ${expression}`;
    }
    else 
    if (axisItem.aggregator) {
      expression = `${axisItem.aggregator} of ${expression}`;
    }
    
    return expression;
  }

  #getQueryModelItem(queryAxisItemUi){
    var searchItem = {
      columnName: queryAxisItemUi.getAttribute('data-column_name'),
      memberExpressionPath: queryAxisItemUi.getAttribute('data-member_expression_path'),
      derivation: queryAxisItemUi.getAttribute('data-derivation'),
      aggregator: queryAxisItemUi.getAttribute('data-aggregator')
    };

    var axisUi = queryAxisItemUi.parentNode.parentNode;
    var axisId = axisUi.getAttribute('data-axis');
    if (axisId === QueryModel.AXIS_FILTERS){
      searchItem.axis = axisId;
    }

    var item = this.#queryModel.findItem(searchItem);
    if (!item) {
      throw new Error(`Unexpected error: could not find item ${JSON.stringify(searchItem)} in query model`);
    }
    return item;
  }

  #getQueryAxisItemUi(queryModelAxisItem){
    var axisId = queryModelAxisItem.axis;
    var cssSelector = `#${this.#id}-${axisId} > ol > li[data-column_name="${queryModelAxisItem.columnName}"]`;
    
    if (queryModelAxisItem.memberExpressionPath){
      cssSelector += `[data-member_expression_path='${JSON.stringify(queryModelAxisItem.memberExpressionPath)}']`;
    }
    
    if (queryModelAxisItem.derivation){
      cssSelector += `[data-derivation="${queryModelAxisItem.derivation}"]`;
    }
    
    if (queryModelAxisItem.aggregator){
      cssSelector += `[data-aggregator="${queryModelAxisItem.aggregator}"]`;
    }
    
    return document.querySelector(cssSelector);
  }
  
  static #getQueryAxisItemUiTitle(axisItem){
    var title;
    if (
      axisItem.axis === QueryModel.AXIS_FILTERS && !axisItem.filter || 
      axisItem.filter && Object.keys(axisItem.filter.values).length === 0
    ) {
      title = 'No filters set. Click the filter Icon to open the Filter Dialog to create filters.';
    }
    else {
      title = QueryAxisItem.getCaptionForQueryAxisItem(axisItem);
    }
    return title;
  }

  #createQueryAxisItemUi(axisItem){
    var axisId = axisItem.axis;
    var id = this.#id
    if (axisId === QueryModel.AXIS_FILTERS) {
      id += `-${axisId}`;
    }
    id += `-${QueryAxisItem.getIdForQueryAxisItem(axisItem)}`;

    var itemUi, itemUiTemplateId;
    switch (axisId) {
      case QueryModel.AXIS_FILTERS:
        itemUiTemplateId = 'queryUiFilterAxisItem';
        break;
      default:
        itemUiTemplateId = 'queryUiAxisItem';
    }
    itemUi = this.#instantiateQueryUiTemplate(itemUiTemplateId, id);
    
    var title = QueryUi.#getQueryAxisItemUiTitle(axisItem);
    itemUi.setAttribute('title', title);
    itemUi.setAttribute('data-column_name',  axisItem.columnName);

    var memberExpressionPath = axisItem.memberExpressionPath;
    if (memberExpressionPath) {
      if (memberExpressionPath instanceof Array) {
        memberExpressionPath = JSON.stringify(memberExpressionPath);
      }
      itemUi.setAttribute('data-member_expression_path', memberExpressionPath);
    }

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

    var toggleTotalsCheckbox = itemUi.querySelector(`menu > label > input[type=checkbox]`);
    if (toggleTotalsCheckbox) {
      toggleTotalsCheckbox.checked = axisItem.includeTotals === true;
    }
    
    if (axisId === QueryModel.AXIS_FILTERS && axisItem.filter && axisItem.filter.values) {
      this.#createQueryAxisItemFilterUi(itemUi, axisItem);
    }

    return itemUi;
  }
  
  #createQueryAxisItemFilterUi(itemUi, axisItem){
    var valuesUi = itemUi.getElementsByTagName('ol')[0];
    var filter = axisItem.filter;
    itemUi.setAttribute('data-filterType', filter.filterType);
    
    var detailsElement = itemUi.getElementsByTagName('details')[0];
    if (filter.toggleState === 'open') {
      detailsElement.setAttribute('open', String(true) );
    }
    setTimeout(function(){
      detailsElement.addEventListener('toggle', this.#filterItemToggleHandler.bind(this));
    }.bind(this), 1000)
          
    var values = filter.values;
    var valueKeys = Object.keys(values);
    
    var toValues = filter.toValues;
    var toValueKeys = toValues? Object.keys(toValues) : undefined;

    for (var i = 0; i < valueKeys.length; i++){
      var valueKey = valueKeys[i];
      var valueObject = values[valueKey];
      
      var valueId = itemUi.id + '-' + i;
      var valueLabel = valueObject.label;
      
      var valueUi = instantiateTemplate('queryUiFilterAxisItemValue');
      var label = valueUi.querySelector('label');
      label.setAttribute('for', valueId);
      valueUi.setAttribute('data-value-index', i);
      valueUi.setAttribute('data-value', valueKey);
      var checkbox = label.querySelector('input[type=checkbox]');
      checkbox.setAttribute('id', valueId);
      checkbox.checked = valueObject.enabled !== false;
      if (toValueKeys && i < toValueKeys.length){
        var toValueKey = toValueKeys[i];
        var toValueObject = toValues[toValueKey];
        valueUi.setAttribute('data-to-value', toValueKey);
      }

      var labelSpan = label.querySelector('span');
      labelSpan.textContent = valueLabel;
      valuesUi.appendChild(valueUi);
    }
  }
  
  #filterItemToggleHandler(event){
    var target = event.target;
    var queryModelItem = this.#getQueryModelItem(target.parentNode);
    var toggleState = event.newState;
    this.#queryModel.setQueryAxisItemFilterToggleState(queryModelItem, toggleState);
  }
  
  #updateQueryAxisUi(axisUi, queryModelAxis) {
    var axisItemsUi = axisUi.getElementsByTagName('ol').item(0);
    axisItemsUi.innerHTML = '';
    var items = queryModelAxis.getItems();
    var n = items.length;
    var separator, item, queryAxisItemUi;
    for (var i = 0; i < n; i++){
      item = items[i];
      queryAxisItemUi = this.#createQueryAxisItemUi(item);
      axisItemsUi.appendChild(queryAxisItemUi);
    }
  }

  #updateTimeout = undefined;
  #openFilterUiTimeout = undefined;
  #queryModelChangeHandler(event) {
    var eventData = event.eventData;
    var needsUpdate = false;
    if (eventData.propertiesChanged) {
      needsUpdate = true;
    }
    else
    if (eventData.axesChanged){
      var axisChangeInfo = eventData.axesChanged[QueryModel.AXIS_FILTERS];
      if (axisChangeInfo){
        if (
          axisChangeInfo.added && axisChangeInfo.added.length ||
          axisChangeInfo.removed && axisChangeInfo.removed.length
        ) {
          needsUpdate = true;
        }
        else
        if (axisChangeInfo.changed){
          for (var itemId in axisChangeInfo.changed){
            var itemChangeInfo = axisChangeInfo.changed[itemId];
            if (itemChangeInfo.filter){
              needsUpdate = true;
            }
          }
        }
      }
      else {
        needsUpdate = true;
      }
    }
    
    if (needsUpdate){
      if (this.#updateTimeout !== undefined){
        clearTimeout(this.#updateTimeout);
        this.#updateTimeout = undefined;
      }
      this.#updateTimeout = setTimeout(function(){
        this.#updateTimeout = undefined;
        this.#updateQueryUi();
      }.bind(this), 100);
    }
    
    // if a filter was added by the user, then we want to pop up the filter Dialog
    // we can't really distinguish between the user adding them, or them being added because of page state restore
    // but we're assuming that if there is a filter item without any values, it must have been added by the user.
    // so, in that case, we pop up the filter dialog.
    var axesChanged = eventData.axesChanged;
    if (axesChanged) {
      var filters = axesChanged[QueryModel.AXIS_FILTERS];
      if (filters) {
        var filterItems = filters.added;
        if (filterItems && filterItems.length === 1) {
          filterItems = filterItems.filter(function(filterItem){
            var filter = filterItem.filter;
            if (!filter) {
              return true;
            }
            var values = filter.values;
            if (!values) {
              return true;
            }
            if (!Object.keys(values).length){
              return true;
            }
            return false;
          });
          if (filterItems.length) {
            var lastFilterItem = filterItems[filterItems.length - 1];
            if (this.#openFilterUiTimeout !== undefined){
              clearTimeout(this.#openFilterUiTimeout);
              this.#openFilterUiTimeout = undefined;
            }
            this.#openFilterUiTimeout = setTimeout(function(){
              this.#openFilterUiTimeout = undefined;
              this.openFilterDialogForQueryModelItem(lastFilterItem);
            }.bind(this), 250);
          }
        }
      }
    }
  }

  #initEvents(){
    var dom = this.getDom();
    dom.addEventListener('click', this.#queryUiClickHandler.bind(this));

    this.#queryModel.addEventListener('change', this.#queryModelChangeHandler.bind(this));
    
    this.#initDragAndDrop();
  }
  
  #initDragAndDrop(){
    this.#initDrag();
    this.#initDrop();
  }
  
  #initDrag(){
    var dom = this.getDom();
    
    dom.addEventListener('dragstart', function(event){
      var queryAxisItemUi = event.target;
      var queryAxisItemsUi = queryAxisItemUi.parentNode;
      var axisUi = queryAxisItemsUi.parentNode;
      var axisId = axisUi.getAttribute('data-axis');
      
      var queryAxisItem = this.#getQueryModelItem(queryAxisItemUi);
      var data = {};
      
      if (queryAxisItem.aggregator){
        data.aggregator = {key: queryAxisItem.aggregator, value: queryAxisItem.aggregator};
      }

      data.axis = {key: queryAxisItem.axis, value: queryAxisItem.axis};
      data.index = {key: queryAxisItem.index, value: queryAxisItem.index};
      var id = QueryAxisItem.getIdForQueryAxisItem(queryAxisItem);
      data.id = {key: id, value: id};
      
      if (axisId === QueryModel.AXIS_FILTERS){
        data.filters = {key: queryAxisItem.index, value: queryAxisItem.index};
      }

      data['application/json'] = queryAxisItem;

      DragAndDropHelper.setData(event, data);
      var dataTransfer = event.dataTransfer;
      dataTransfer.dropEffect = dataTransfer.effectAllowed = 'move';
      dataTransfer.setDragImage(queryAxisItemUi, -20, 0);
      
    }.bind(this));
    
  }
  
  #initDrop(){
    var dom = this.getDom();
    
    var prevElements = undefined;
    function cleanupPrevElements(){
      if (!prevElements) {
        return;
      }
      if (prevElements.axis) {
        prevElements.axis.removeAttribute('data-dragover');
      }
      if (prevElements.item) {
        prevElements.item.removeAttribute('data-dragoverside');
      }
      prevElements = undefined;
    }
    
    
    dom.addEventListener('dragend', function(event){
      event.preventDefault();
      cleanupPrevElements();
    });

    dom.addEventListener('dragover', function(event){
      event.preventDefault();
      var dataTransfer = event.dataTransfer;
      var queryUiElements = QueryUi.#findQueryUiElements(event);

      var axis = queryUiElements.axis;
      if (!axis){
        dataTransfer.effectAllowed = dataTransfer.dropEffect = 'none';
        cleanupPrevElements();
        return;
      }

      var items = queryUiElements.items;
      var item = queryUiElements.item;
      
      var axisId = axis.getAttribute('data-axis');
      var info = DragAndDropHelper.getData(event);
      
      var isAggregator = Boolean(info.aggregator);
      var isDefaultAggregator = Boolean(info.defaultaggregator);

      var existingId = this.#id;
      var isSameAxis = Boolean(info.axis) && info.axis.key === axisId;
      var isCellsAxis;
      switch (axisId) {
        case QueryModel.AXIS_CELLS:
          isCellsAxis = true;
        case QueryModel.AXIS_FILTERS:
          if (Boolean(info.filters)) {
            existingId += `-${axisId}`;
            isSameAxis = true;
          }
        default:
          if (isSameAxis && info.id.key) {
            existingId += '-' + info.id.key;
          }
          else
          if (isCellsAxis && Boolean(info.defaultaggregator) && info.defaultaggregator.key.length) {
            isSameAxis = true;
            existingId += '-' + info.defaultaggregator.key;
          }
          else {
            existingId = undefined;
          }
      }
      
      var dropEffect;
      if (isCellsAxis){
        if (! (isAggregator || isDefaultAggregator) ){
          // if this is the cells axis, but this item cannot be an aggregator, then drop is forbidden.
          dropEffect = 'none';
        }
      }
      else
      if (isAggregator) {
        // if this is not the cells axis, but the item is an aggregator, drop is forbidden
        dropEffect = 'none';
      }
      
      // if we're dragging over an existing query ui item
      if (item) {
        if (dropEffect !== 'none') {
          var middle = item.offsetLeft + item.clientWidth/2;
          var dragOverSide = event.clientX <= middle ? 'left' : 'right';
          if (isSameAxis) {
            dropEffect = 'move';
            if (
              item.id === existingId  ||
              (dragOverSide === 'left' && item.previousSibling && item.previousSibling.id === existingId) ||
              (dragOverSide === 'right' && item.nextSibling && item.nextSibling.id === existingId)
            ) {
              dropEffect = 'none';
            }
            else {
              item.setAttribute('data-dragoverside', dragOverSide);
            }
          }
          else {
            item.setAttribute('data-dragoverside', dragOverSide);
          }
        }

        if (prevElements && prevElements.item && (prevElements.item !== item || dropEffect === 'none')) {
          prevElements.item.removeAttribute('data-dragoverside');
        }
      }
      else {
        // if we're not dragging over an item but are dragging over an axis,
        // and the axis' last item is the same as  the dragged item,
        // then dropping wouldn't change the query, so indicate drop is not allowed.
        if (existingId && items && items.lastChild && items.lastChild.id === existingId) {
          dropEffect = 'none';
        }
        if (prevElements && prevElements.item){
          prevElements.item.removeAttribute('data-dragoverside');
        }
      }

      if (prevElements && prevElements.axis && prevElements.axis !== axis) {
        prevElements.axis.removeAttribute('data-dragover');
      }
      
      if (dropEffect) {
        dataTransfer.effectAllowed = dataTransfer.dropEffect = dropEffect;
      }
      if (dropEffect === 'none') {
        axis.removeAttribute('data-dragover');
      }
      else {
        axis.setAttribute('data-dragover', item ? 1 : 0);
      }
      
      prevElements = queryUiElements;

    }.bind(this));
    
    dom.addEventListener('drop', function(event){
      event.preventDefault();
      var queryUiElements = QueryUi.#findQueryUiElements(event);
      if (!queryUiElements.axis){
        return;
      }

      var dataTransfer = event.dataTransfer;
      if (dataTransfer.effectAllowed === 'none') {
        return;
      }

      var axisId = queryUiElements.axis.getAttribute('data-axis');
      
      var info = DragAndDropHelper.getData(event);
      var queryAxisItem = info['application/json'];

      if (axisId === QueryModel.AXIS_CELLS && !Boolean(queryAxisItem.aggregator)) {
        var defaultAggregator = info.defaultaggregator.value;
        queryAxisItem.aggregator = defaultAggregator;
      }
      
      queryAxisItem.axis = axisId;
      
      var item = queryUiElements.item; //prevElements ? prevElements.item : undefined;
      if (item) {
        var queryModelItem = this.#getQueryModelItem(item);
        var index = queryModelItem.index;
        queryAxisItem.index = index;
      }
      cleanupPrevElements();
      
      this.#queryModel.addItem(queryAxisItem);
    }.bind(this));
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

  #instantiateQueryUiTemplate(templateId, instanceId) {
    var node = instantiateTemplate(templateId, instanceId);
    //
    var buttons = node.querySelectorAll('menu > label > button, menu > label > input[type=checkbox]');
    for (var i = 0; i < buttons.length; i++){
      var button = buttons.item(i);
      var buttonId = instanceId + button.getAttribute('id');
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
  
  static #findQueryUiElements(event){
    var queryUi = event.currentTarget;
    var el = event.target;
    
    var elements = {};
    while (el && el !== queryUi){
      switch (el.tagName) {
        case 'LI':
          elements.item = el;
          break;
        case 'OL':
          elements.items = el;
          break;
        case 'SECTION':
          var axisId = el.getAttribute('data-axis');
          if (axisId) {
            elements.axis = el;
          }
        
      }
      el = el.parentNode;
    }
    return elements;
  }

  #renderAxis(config){
    var axisId = config.axisId;
    var caption = config.caption || (axisId.charAt(0).toUpperCase() + axisId.substr(1));
    var axis = this.#instantiateQueryUiTemplate(this.#queryAxisTemplateId, this.#id + '-' + axisId);
    
    var itemArea = axis.querySelector('ol');

    var primaryAxisActionLabelTitle;
    if (config.primaryAxisActionLabelTitle){
      primaryAxisActionLabelTitle = config.primaryAxisActionLabelTitle;
    }
    else {
      switch (axisId) {
        case QueryModel.AXIS_FILTERS:
          primaryAxisActionLabelTitle = '...';
          break;
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
      axisId: QueryModel.AXIS_FILTERS
    });
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
    queryModel: queryModel,
    filterDialog: filterDialog
  });
}
