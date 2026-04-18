class QueryUi {

  static #templateId = 'queryUiTemplate';
  static #queryUiFilterAxisItemTemplateId = 'queryUiFilterAxisItem';
  static #queryUiAxisItemTemplateId = 'queryUiAxisItem';
  static #queryUiFilterAxisItemValueTemplateId = 'queryUiFilterAxisItemValue';
  static #queryUiAxisTemplateId = 'queryUiAxis';

  #id = undefined;
  #container = undefined;
  #queryModel = undefined;
  #filterDialog = filterDialog;

  constructor(config){
    this.#container = config.container
    this.#id = config.id || 'queryUi';

    this.#queryModel = config.queryModel;
    this.#filterDialog = config.filterDialog;
    this.#initDom(config);
    this.#renderAxes();
    this.#initEvents();
  }

  #queryUiClickHandler(event){
    const target = event.target;
    const tagName = target.tagName;
    switch (tagName){
      case 'BUTTON':
      case 'INPUT':
      case 'LABEL':
      case 'SPAN':
        break;
      default:
        return;
    }
    let axis, queryAxisItemUi;
    let dataValueKey = null, dataValueEnabled;
    let node = target;
    const dom = this.getDom();
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

    const targetId = target.getAttribute('id');
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
    const queryModelItem = this.#getQueryModelItem(queryAxisItemUi);
    this.#filterDialog.openFilterDialog(this.#queryModel, queryModelItem, queryAxisItemUi);
    this.#filterDialogStateChanged();
  }

  openFilterDialogForQueryModelItem(queryModelItem){
    const queryAxisItemUi = this.#getQueryAxisItemUi(queryModelItem);
    // when we're restoring page state, the queryUi may be populated but hidden.
    // in this case we need to wait a bit until the query ui is rendered
    // else the filter dialog will pop up at the entirely wrong position.
    if (queryAxisItemUi.clientWidth === 0){
      setTimeout(() => this.openFilterDialogForQueryModelItem(queryModelItem), 100);
    }
    else {
      //this.#filterDialog.openFilterDialog(this.#queryModel, queryModelItem, queryAxisItemUi);
      this.#openFilterDialogForQueryAxisItemUi(queryAxisItemUi);
    }
  }

  #queryAxisUiItemMoveToAxisClicked(queryAxisItemUi){
    const queryModelItem = this.#getQueryModelItem(queryAxisItemUi);
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
    const queryModelItem = this.#getQueryModelItem(queryAxisItemUi);
    let itemIndex = queryModelItem.index;
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
    const queryModelItem = this.#getQueryModelItem(queryAxisItemUi);
    queryModel.removeItem(queryModelItem);
  }

  #queryAxisUiItemToggleTotals(queryAxisItemUi){
    const toggleTotalsCheckbox = queryAxisItemUi.querySelector(`menu > label > input[type=checkbox]`);
    const value = toggleTotalsCheckbox.checked;
    const queryModelItem = this.#getQueryModelItem(queryAxisItemUi);
    queryModel.toggleTotals(queryModelItem, value);
  }
  
  #queryAxisUiItemToggleEnableDataValue(queryAxisItemUi, dataValueKey){
    const queryModelItem = this.#getQueryModelItem(queryAxisItemUi);
    const filter = queryModelItem.filter;
    const values = filter.values;
    const valueObject = values[dataValueKey];
    if (valueObject.enabled === false) {
      delete valueObject.enabled;
    }
    else {
      valueObject.enabled = false;
    }
    this.#queryModel.setQueryAxisItemFilter(queryModelItem, filter);
  }
  
  #getAxisUiElements(){
    const dom = this.getDom();
    const axisUiElements = dom.querySelectorAll('SECTION[data-axis]');
    return axisUiElements;
  }

  #checkOverflowTimeout = undefined;
  #updateQueryUi(){
    const dom = this.getDom();
    dom.setAttribute('data-cellheadersaxis', this.#queryModel.getCellHeadersAxis());
    const axes = this.#getAxisUiElements();
    for (let i = 0; i < axes.length; i++){
      const axis = axes.item(i);
      const axisId = axis.getAttribute('data-axis');
      const queryModelAxis = queryModel.getQueryAxis(axisId);
      this.#updateQueryAxisUi(axis, queryModelAxis);
    }
    
    if (this.#checkOverflowTimeout !== undefined) {
      clearTimeout(this.#checkOverflowTimeout);
      this.#checkOverflowTimeout = undefined;
    }
    if (dom.clientHeight === 0) {
      return;
    }
    setTimeout(() => this.#checkOverflow(), 100);
  }

  #checkOverflow(axisUi){
    if (axisUi) {
      const ol = axisUi.getElementsByTagName('OL').item(0);
      // this is the explicitly set height. If it is not NaN, it means the element has been resized.
      const style = ol.style;
      const height = parseInt(style.height, 10);

      // this is the minimum height.
      const computedStyle = getComputedStyle(ol);
      const minHeight = parseInt(computedStyle.minHeight, 10);

      style.height = '';
      let resize, overflow;
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
    
    const axes = this.#getAxisUiElements();
    for (let i = 0; i < axes.length; i++){
      const axisUi = axes.item(i);
      this.#checkOverflow(axisUi);
    }
  }

  #getQueryAxisItemUiCaption(axisItem){
    return axisItem.caption ? axisItem.caption : QueryAxisItem.createCaptionForQueryAxisItem(axisItem);
  }

  #getQueryModelItem(queryAxisItemUi){
    const searchItem = {
      columnName: queryAxisItemUi.getAttribute('data-column_name'),
      memberExpressionPath: queryAxisItemUi.getAttribute('data-member_expression_path'),
      derivation: queryAxisItemUi.getAttribute('data-derivation'),
      aggregator: queryAxisItemUi.getAttribute('data-aggregator')
    };

    const axisUi = queryAxisItemUi.parentNode.parentNode;
    const axisId = axisUi.getAttribute('data-axis');
    if (axisId === QueryModel.AXIS_FILTERS){
      searchItem.axis = axisId;
    }

    const item = this.#queryModel.findItem(searchItem);
    if (!item) {
      throw new Error(`Unexpected error: could not find item ${JSON.stringify(searchItem)} in query model`);
    }
    return item;
  }

  #getQueryAxisItemUi(queryModelAxisItem){
    const axisId = queryModelAxisItem.axis;
    let cssSelector = `#${this.#id}-${axisId} > ol > li[data-column_name="${queryModelAxisItem.columnName || ''}"]`;
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
    let title;
    if (
      axisItem.axis === QueryModel.AXIS_FILTERS && !axisItem.filter || 
      axisItem.filter && Object.keys(axisItem.filter.values).length === 0
    ) {
      title = 'No filters set. Click the filter Icon to open the Filter Dialog to create filters.';
      title = Internationalization.getText(title) || title;
    }
    else {
      title = QueryAxisItem.getCaptionForQueryAxisItem(axisItem);
    }
    return title;
  }
  
  #getCaptionUi(itemUi){
    return itemUi.getElementsByTagName('span').item(0);
  }

  #createQueryAxisItemUi(axisItem){
    const axisId = axisItem.axis;
    let id = this.#id
    if (axisId === QueryModel.AXIS_FILTERS) {
      id += `-${axisId}`;
    }
    id += `-${QueryAxisItem.getIdForQueryAxisItem(axisItem)}`;

    let itemUiTemplateId;
    switch (axisId) {
      case QueryModel.AXIS_FILTERS:
        itemUiTemplateId = QueryUi.#queryUiFilterAxisItemTemplateId;
        break;
      default:
        itemUiTemplateId = QueryUi.#queryUiAxisItemTemplateId;
    }
    const itemUi = this.#instantiateQueryUiTemplate(itemUiTemplateId, id);
    
    const title = QueryUi.#getQueryAxisItemUiTitle(axisItem);
    itemUi.setAttribute('title', title);
    itemUi.setAttribute('data-column_name', axisItem.columnName || '');

    let memberExpressionPath = axisItem.memberExpressionPath;
    if (memberExpressionPath) {
      if (memberExpressionPath instanceof Array) {
        memberExpressionPath = JSON.stringify(memberExpressionPath);
      }
      itemUi.setAttribute('data-member_expression_path', memberExpressionPath);
    }

    const derivation = axisItem.derivation;
    if (derivation) {
      itemUi.setAttribute('data-derivation', derivation);
    }

    const aggregator = axisItem.aggregator;
    if (aggregator) {
      itemUi.setAttribute('data-aggregator', aggregator);
    }

    const captionUi = this.#getCaptionUi(itemUi);
    captionUi.textContent = this.#getQueryAxisItemUiCaption(axisItem);

    const toggleTotalsCheckbox = itemUi.querySelector(`menu > label > input[type=checkbox]`);
    if (toggleTotalsCheckbox) {
      toggleTotalsCheckbox.checked = axisItem.includeTotals === true;
    }
    
    if (axisId === QueryModel.AXIS_FILTERS && axisItem.filter && axisItem.filter.values) {
      this.#createQueryAxisItemFilterUi(itemUi, axisItem);
    }

    return itemUi;
  }
  
  #createQueryAxisItemFilterUi(itemUi, axisItem){
    const filter = axisItem.filter;
    const filterType = filter.filterType;
    itemUi.setAttribute('data-filterType', filterType);

    const header = itemUi.querySelector('details > header');
    header.textContent = FilterDialog.getLabelForFilterType(filterType);

    const detailsElement = itemUi.getElementsByTagName('details')[0];
    if (filter.toggleState === 'open') {
      detailsElement.setAttribute('open', String(true) );
    }
    setTimeout(() => detailsElement.addEventListener('toggle', event => this.#filterItemToggleHandler(event) ), 1000)
          
    const values = filter.values;
    const valueKeys = Object.keys(values);
    
    const captionUi = this.#getCaptionUi(itemUi);
    captionUi.textContent += ` (${valueKeys.length})`;
    
    const toValues = filter.toValues;
    const toValueKeys = toValues? Object.keys(toValues) : undefined;

    const valuesUi = itemUi.getElementsByTagName('ol')[0];
    for (let i = 0; i < valueKeys.length; i++){
      const valueKey = valueKeys[i];
      const valueObject = values[valueKey];
      
      const valueId = itemUi.id + '-' + i;
      let valueLabel = valueObject.label;
      
      const valueUi = instantiateTemplate(QueryUi.#queryUiFilterAxisItemValueTemplateId);
      let label = valueUi.querySelector('label:has( > input[type=checkbox] )');
      label.setAttribute('for', valueId);
      valueUi.setAttribute('data-value-index', i);
      valueUi.setAttribute('data-value', valueKey);
      const checkbox = label.querySelector('input[type=checkbox]');
      checkbox.setAttribute('id', valueId);
      checkbox.checked = valueObject.enabled !== false;
      if (toValueKeys && i < toValueKeys.length){
        const toValueKey = toValueKeys[i];
        const toValueObject = toValues[toValueKey];
        valueUi.setAttribute('data-to-value', toValueKey);
        valueLabel += ` - ${toValueObject.label}`;
      }

      const labelSpan = label.querySelector('span');
      labelSpan.textContent = valueLabel;
      valuesUi.appendChild(valueUi);
      
      const deleteValueId = valueId + '-delete'; 
      label = valueUi.querySelector('label:has( > button )');
      label.setAttribute('for', deleteValueId);
      const button = label.querySelector('button');
      button.setAttribute('id', deleteValueId);
      button.addEventListener('click', event => this.#deleteFilterValueClickHandler( event ) );
    }
  }
  
  #deleteFilterValueClickHandler(event){
    event.stopPropagation();
    const button = event.target;
    const label = button.parentNode;
    const item = label.parentNode;
    const list = item.parentNode;
    const details = list.parentNode;
    const queryUiItem = details.parentNode;
    const queryModelItem = this.#getQueryModelItem(queryUiItem);
    const filter = queryModelItem.filter;
    const values = filter.values;
    const value = item.getAttribute('data-value');
    delete values[value];
    this.#queryModel.setQueryAxisItemFilter(queryModelItem, filter);
  }
  
  #filterItemToggleHandler(event){
    const target = event.target;
    const queryModelItem = this.#getQueryModelItem(target.parentNode);
    const toggleState = event.newState;
    this.#queryModel.setQueryAxisItemFilterToggleState(queryModelItem, toggleState);
  }
  
  #updateQueryAxisUi(axisUi, queryModelAxis) {
    const axisItemsUi = axisUi.getElementsByTagName('ol').item(0);
    axisItemsUi.innerHTML = '';
    const items = queryModelAxis.getItems();
    const n = items.length;
    let item, queryAxisItemUi;
    for (let i = 0; i < n; i++){
      item = items[i];
      queryAxisItemUi = this.#createQueryAxisItemUi(item);
      axisItemsUi.appendChild(queryAxisItemUi);
    }
  }

  #updateTimeout = undefined;
  #openFilterUiTimeout = undefined;
  #queryModelChangeHandler(event) {
    const eventData = event.eventData;
    let needsUpdate = false;
    if (eventData.propertiesChanged) {
      needsUpdate = true;
    }
    else
    if (eventData.axesChanged){
      const axisChangeInfo = eventData.axesChanged[QueryModel.AXIS_FILTERS];
      if (axisChangeInfo){
        if (
          axisChangeInfo.added && axisChangeInfo.added.length ||
          axisChangeInfo.removed && axisChangeInfo.removed.length
        ) {
          needsUpdate = true;
        }
        else
        if (axisChangeInfo.changed){
          for (let itemId in axisChangeInfo.changed){
            const itemChangeInfo = axisChangeInfo.changed[itemId];
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
      this.#updateTimeout = setTimeout(() => {
        this.#updateTimeout = undefined;
        this.#updateQueryUi();
      }, 100);
    }
    
    // if a filter was added by the user, then we want to pop up the filter Dialog
    // we can't really distinguish between the user adding them, or them being added because of page state restore
    // but we're assuming that if there is a filter item without any values, it must have been added by the user.
    // so, in that case, we pop up the filter dialog.
    const axesChanged = eventData.axesChanged;
    if (!axesChanged) {
      return;
    }

    const filters = axesChanged[QueryModel.AXIS_FILTERS];
    if (!filters) {
      return;
    }

    let filterItems = filters.added;
    if (!filterItems || filterItems.length !== 1) {
      return;
    }
    
    filterItems = filterItems.filter(filterItem => {
      const filter = filterItem.filter;
      if (!filter) {
        return true;
      }
      const values = filter.values;
      if (!values) {
        return true;
      }
      if (!Object.keys(values).length){
        return true;
      }
      return false;
    });
    
    if (!filterItems.length) {
      return;
    }
    
    if (this.#openFilterUiTimeout !== undefined){
      clearTimeout(this.#openFilterUiTimeout);
      this.#openFilterUiTimeout = undefined;
    }
    
    const lastFilterItem = filterItems[filterItems.length - 1];
    this.#openFilterUiTimeout = setTimeout(() => {
      this.#openFilterUiTimeout = undefined;
      this.openFilterDialogForQueryModelItem(lastFilterItem);
    }, 250);
  }

  #initEvents(){
    const dom = this.getDom();
    dom.addEventListener('click', event => this.#queryUiClickHandler( event ) );
    this.#queryModel.addEventListener('change', event => this.#queryModelChangeHandler( event ) );
    this.#initDragAndDrop();
    this.#initFilterUiEvents();
  }
  
  #initFilterUiEvents(){
    const filterUi = this.#filterDialog;
    const filterDialog = filterUi.getDom();
    filterDialog.addEventListener('close', event => this.#filterDialogStateChanged( event ) );
  }
  
  #filterDialogStateChanged(){
    const filterUi = this.#filterDialog;
    const filterDialog = filterUi.getDom();
    const queryAxisItem = filterUi.getQueryAxisItem();
    const opened = filterDialog.hasAttribute('open');
    const queryAxisItemUi = this.#getQueryAxisItemUi(queryAxisItem);
    const attribute = 'data-is-being-edited-by-filter-dialog';
    if (opened) {
      queryAxisItemUi.setAttribute(attribute, true);
    }
    else {
      queryAxisItemUi.removeAttribute(attribute);
    }
  }
  
  #handleDragStart(event) {
    const queryAxisItemUi = event.target;
    const queryAxisItemsUi = queryAxisItemUi.parentNode;
    const axisUi = queryAxisItemsUi.parentNode;
    const axisId = axisUi.getAttribute('data-axis');
    
    const queryAxisItem = this.#getQueryModelItem(queryAxisItemUi);
    const data = {};
    
    if (queryAxisItem.aggregator){
      data.aggregator = {key: queryAxisItem.aggregator, value: queryAxisItem.aggregator};
    }

    data.axis = {key: queryAxisItem.axis, value: queryAxisItem.axis};
    data.index = {key: queryAxisItem.index, value: queryAxisItem.index};
    const id = QueryAxisItem.getIdForQueryAxisItem(queryAxisItem);
    data.id = {key: id, value: id};
    
    if (axisId === QueryModel.AXIS_FILTERS){
      data.filters = {key: queryAxisItem.index, value: queryAxisItem.index};
    }

    data['application/json'] = queryAxisItem;
    DragAndDropHelper.addTextDataForQueryItem(queryAxisItem, data);

    DragAndDropHelper.setData(event, data);
    const dataTransfer = event.dataTransfer;
    dataTransfer.dropEffect = dataTransfer.effectAllowed = 'move';
    dataTransfer.setDragImage(queryAxisItemUi, -20, 0);
  }
  
  
  #handleDragOver(event) {
  }

  #initDragAndDrop(){
    const dom = this.getDom();
    
    let prevElements = undefined;
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
    
    dom.addEventListener('dragstart', event => this.#handleDragStart(event) );
    
    dom.addEventListener('dragend', event => {
      event.preventDefault();
      cleanupPrevElements();
    });

    dom.addEventListener('dragover', event => {
      event.preventDefault();
      const dataTransfer = event.dataTransfer;
      const queryUiElements = QueryUi.#findQueryUiElements(event);

      const axis = queryUiElements.axis;
      if (!axis){
        dataTransfer.effectAllowed = dataTransfer.dropEffect = 'none';
        cleanupPrevElements();
        return;
      }
      
      const info = DragAndDropHelper.getData(event);

      let existingId = this.#id;
      const axisId = axis.getAttribute('data-axis');
      let isSameAxis = Boolean(info.axis) && info.axis.key === axisId;
      let isCellsAxis;
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
      
      let dropEffect;
      const isAggregator = Boolean(info.aggregator);
      const isDefaultAggregator = Boolean(info.defaultaggregator);
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
      const item = queryUiElements.item;
      if (item) {
        if (dropEffect !== 'none') {
          const middle = item.offsetLeft + item.clientWidth/2;
          const dragOverSide = event.clientX <= middle ? 'left' : 'right';
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
        const items = queryUiElements.items;
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
    });
    
    dom.addEventListener('drop', event => {
      event.preventDefault();
      const queryUiElements = QueryUi.#findQueryUiElements(event);
      if (!queryUiElements.axis){
        return;
      }

      const dataTransfer = event.dataTransfer;
      if (dataTransfer.effectAllowed === 'none') {
        return;
      }

      const axisId = queryUiElements.axis.getAttribute('data-axis');
      const info = DragAndDropHelper.getData(event);
      const queryAxisItem = info['application/json'];
      
      switch (axisId) {
        case QueryModel.AXIS_CELLS:
          if (!Boolean(queryAxisItem.aggregator)) {
            const defaultAggregator = info.defaultaggregator.value;
            queryAxisItem.aggregator = defaultAggregator;
          }
          delete queryAxisItem.includeTotals;
          delete queryAxisItem.filter;
          break;
        case QueryModel.AXIS_FILTERS:
          delete queryAxisItem.includeTotals;
          break;
        case QueryModel.AXIS_ROWS:
        case QueryModel.AXIS_COLUMNS:
          delete queryAxisItem.filter;
          break;
        default:
      }
      
      queryAxisItem.axis = axisId;
      
      const item = queryUiElements.item; //prevElements ? prevElements.item : undefined;
      // assign the dropped item an index to position it on the axis.
      if (item) {
        const dragOverSide = item.getAttribute('data-dragoverside');
        // if dragging over an existing item, then we need to update to index to that item's index
        // (the drag over code already figured out that this new item comes behind this one)
        const queryModelItem = this.#getQueryModelItem(item);
        let index = queryModelItem.index;
        if (dragOverSide  === 'right'){
          if (queryAxisItem.axis === axisId && (queryAxisItem.index > index || queryAxisItem.index === undefined)) 
          index += 1;
        }
        queryAxisItem.index = index;
      }
      else {
        // https://github.com/rpbouman/huey/issues/368
        // if we're dropping the item at the end of the axis, 
        // then it must appear at the end. The item's original index (if any) must be deleted, 
        // so that the query model will add it to the end.
        delete queryAxisItem.index;
      }
      cleanupPrevElements();
      this.#queryModel.addItem(queryAxisItem);
    });
  }

  #axisClearButtonClicked(axis){
    const axisId = axis.getAttribute('data-axis');
    this.#queryModel.clear(axisId);
  }

  #axisPrimaryActionButtonClicked(axis){
    const axisId = axis.getAttribute('data-axis');
    switch (axisId){
      case QueryModel.AXIS_COLUMNS:
      case QueryModel.AXIS_ROWS:
        this.#queryModel.flipAxes(QueryModel.AXIS_COLUMNS, QueryModel.AXIS_ROWS);
        break;
      case QueryModel.AXIS_CELLS:
        let cellheadersaxis = this.#queryModel.getCellHeadersAxis();
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
    const node = instantiateTemplate(templateId, instanceId);
    //
    const buttons = node.querySelectorAll('menu > label > button, menu > label > input[type=checkbox]');
    for (let i = 0; i < buttons.length; i++){
      const button = buttons.item(i);
      const buttonId = instanceId + button.getAttribute('id');
      button.setAttribute('id', buttonId);
      button.parentNode.setAttribute('for', buttonId);
    }
    return node;
  }

  #getCellsAxisPrimaryActionTitle(){
    let targetAxis;
    const cellHeadersAxis = this.#queryModel.getCellHeadersAxis();
    switch (cellHeadersAxis){
      case QueryModel.AXIS_COLUMNS:
        targetAxis = QueryModel.AXIS_ROWS;
        break;
      case QueryModel.AXIS_ROWS:
        targetAxis = QueryModel.AXIS_COLUMNS;
        break;
    }
    const cellsAxisPrimaryActionTitle = `Move the cell headers to the ${targetAxis} axis`;
    return cellsAxisPrimaryActionTitle;
  }
  
  static #findQueryUiElements(event){
    const queryUi = event.currentTarget;
    let el = event.target;
    
    const elements = {};
    while (el && el !== queryUi){
      switch (el.tagName) {
        case 'LI':
          elements.item = el;
          break;
        case 'OL':
          elements.items = el;
          break;
        case 'SECTION':
          const axisId = el.getAttribute('data-axis');
          if (axisId) {
            elements.axis = el;
          }
        
      }
      el = el.parentNode;
    }
    return elements;
  }

  #renderAxis(config){
    const axisId = config.axisId;
    const axis = this.#instantiateQueryUiTemplate(QueryUi.#queryUiAxisTemplateId, this.#id + '-' + axisId);
    
    let primaryAxisActionLabelTitle;
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
    const labels = axis.getElementsByTagName('label');
    const primaryAxisActionLabel = labels.item(0);
    Internationalization.setAttributes(primaryAxisActionLabel, 'title', primaryAxisActionLabelTitle);

    const removeTitle = `Clear all items from the ${axisId} axis.`;
    Internationalization.setAttributes(labels.item(1), 'title', removeTitle);

    axis.setAttribute('data-axis', axisId);
    const heading = axis.getElementsByTagName('h1').item(0);
    const caption = config.caption || (axisId.charAt(0).toUpperCase() + axisId.substr(1));
    Internationalization.setTextContent(heading, caption);
    this.getDom().appendChild(axis);
  }

  #initDom(config) {
    const dom = instantiateTemplate(QueryUi.#templateId, config.id)
    let container = config.container;
    switch (typeof container){
      case 'string':
        container = byId(config.container);
    }
    container.appendChild(dom);
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

let queryUi;
function initQueryUi(){
  queryUi = new QueryUi({
    id: 'queryUi',
    container: 'workarea',
    queryModel: queryModel,
    filterDialog: filterDialog
  });
}
