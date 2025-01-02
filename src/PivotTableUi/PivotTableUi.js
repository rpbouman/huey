class PivotTableUi extends EventEmitter {

  static #templateId = 'pivotTableUiTemplate';

  #id = undefined;
  #queryModel = undefined;
  #settings = undefined;

  #columnsTupleSet = undefined;
  #rowsTupleSet = undefined;
  #cellsSet = undefined;

  #resizeObserver = undefined;
  #resizeTimeoutId = undefined;
  #resizeTimeout = 1000;
  #scrollTimeout = 500;

  #columnHeaderResizeTimeout = 500;
  #columnHeaderResizeTimeoutId = undefined;

  // the maximum width in ch units
  static #maximumCellWidth = 30;

  constructor(config){
    super(['updated', 'busy']);
    this.#initDom(config);
    this.#id = config.id;

    this.#initSettings(config.settings);

    var queryModel = config.queryModel;
    this.#queryModel = queryModel;

    var columnsTupleSet = new TupleSet(this.#queryModel, QueryModel.AXIS_COLUMNS, this.#settings);
    this.#columnsTupleSet = columnsTupleSet;
    var rowsTupleSet = new TupleSet(this.#queryModel, QueryModel.AXIS_ROWS, this.#settings);
    this.#rowsTupleSet = rowsTupleSet;

    this.#cellsSet = new CellSet(
      this.#queryModel, [
        rowsTupleSet,
        columnsTupleSet,
      ],
      this.#settings
    );

    this.#initQueryModelChangeHandler()
    this.#initScrollHandler();
    this.#initResizeObserver();
    this.#initCancelQueryButtonClickHandler();

  }

  #initDom(config) {
    var template = byId(PivotTableUi.#templateId);
    var clone = template.content.cloneNode(true);
    var index = 0, element;
    do {
      element = clone.childNodes.item(index++);
    } while (element && element.nodeType !== element.ELEMENT_NODE);
    element.setAttribute('id', config.id);

    var container = config.container;
    switch (typeof container){
      case 'string':
        container = byId(config.container);
    }

    container.appendChild(element);
  }

  #getTotalsString(axisItem){
    var generalSettings = this.#settings.getSettings('pivotSettings');
    var totalsString = generalSettings.totalsString;
    return totalsString;
  }

  getQueryModel(){
    return this.#queryModel;
  }

  #initCancelQueryButtonClickHandler(){
    byId('cancelQueryButton')
    .addEventListener(
      'click',
      this.#cancelQueryButtonClicked.bind(this)
    );
  }

  async #cancelQueryButtonClicked(event){
    var cancelResults = await Promise.all([
      this.#columnsTupleSet.cancelPendingQuery(),
      this.#rowsTupleSet.cancelPendingQuery(),
      this.#cellsSet.cancelPendingQuery()
    ]);
    console.log(`Results: `, cancelResults);
    this.#setNeedsUpdate(true);
  }

  #initQueryModelChangeHandler(){
    var queryModel = this.getQueryModel();
    var timeoutCallback = function(){
      var timeoutValue;
      if (this.#settings){
        if (typeof this.#settings.getSettings === 'function'){
          timeoutValue = this.#settings.getSettings(['querySettings', 'autoRunQueryTimeout']);
        }
        else {
          timeoutValue = this.#settings.autoRunQueryTimeout || 1000;
        }
        if (typeof timeoutValue === 'function'){
          timeoutValue = timeoutValue();
        }
      };
      return timeoutValue;
    }.bind(this);

    bufferEvents(
      queryModel,
      'beforechange',
      this.#queryModelBeforeChangeHandler,
      this,
      timeoutCallback
    );
    bufferEvents(
      queryModel,
      'change',
      this.#queryModelChangeHandler,
      this,
      timeoutCallback
    );
    //queryModel.addEventListener('change', this.#queryModelChangeHandler.bind(this));
  }

  #initScrollHandler(){
    var container = this.#getInnerContainerDom();
    bufferEvents(
      container,
      'scroll',
      this.#handleInnerContainerScrolled,
      this,
      this.#scrollTimeout
    );
  }

  #initResizeObserver(){
    var dom = this.getDom();

    this.#resizeObserver = new ResizeObserver(function(entries){
      for (var entry of entries){
        var target = entry.target;
        if (target === dom) {
          this.#handleDomResized();
        }
        else
        if (hasClass(target, 'pivotTableUiHeaderCell')){
          this.#handleColumnHeaderResized(entry);
        }
      }
    }.bind(this));

    this.#resizeObserver.observe(dom);
  }

  #toggleObserveColumnsResizing(onOff){
    var tableHeaderDom = this.#getTableHeaderDom();
    var headerRows = tableHeaderDom.childNodes;
    if (!headerRows.length){
      return;
    }

    var methodName = 'observe';
    if (onOff === false) {
      methodName = 'un' + methodName;
    }
    var method = this.#resizeObserver[methodName];

    var headerRow = headerRows.item(0);
    var columns = headerRow.childNodes;
    for (var i = 0; i < columns.length; i++){
      var column = columns.item(i);
      if (!hasClass(column, 'pivotTableUiHeaderCell')){
        continue;
      }
      if (hasClass(column, 'pivotTableUiStufferCell')){
        continue;
      }
      method.call(this.#resizeObserver, column);
    }
  }

  #handleDomResized(){
    if (this.#resizeTimeoutId !== undefined) {
      clearTimeout(this.#resizeTimeoutId);
      this.#resizeTimeoutId = undefined;
    }
    this.#resizeTimeoutId = setTimeout(function(){
      if (this.#autoUpdate && !this.#getBusy()) {
        this.updatePivotTableUi();
      }
      else {
        //this.#setNeedsUpdate(true);
      }
      clearTimeout(this.#resizeTimeoutId);
      this.#resizeTimeoutId = undefined;
    }.bind(this), this.#resizeTimeout);
  }

  // this takes a column axis header cell and calculates the corresponding tuple index and cell axis item index
  #getColumnHeaderTupleAndCellAxisInfo(columnHeader){
    var physicalTupleIndices = this.#getPhysicalTupleIndices();

    var physicalColumnsAxisTupleIndex = physicalTupleIndices.physicalColumnsAxisTupleIndex;
    var axisId = QueryModel.AXIS_COLUMNS;
    var tupleIndexInfo = this.#getTupleIndexForPhysicalIndex(axisId, physicalColumnsAxisTupleIndex);

    var columnsAxisSizeInfo = physicalTupleIndices.columnsAxisSizeInfo;
    var headerCount = columnsAxisSizeInfo.headers.columnCount;

    var headerRow = columnHeader.parentNode;
    var siblings = headerRow.childNodes;
    var physicalColumnIndex;
    for (var i = headerCount; i < siblings.length; i++) {
      if (siblings.item(i) === columnHeader){
        physicalColumnIndex = i;
        break;
      }
    }
    if (physicalColumnIndex === undefined){
      //throw new Error(`Internal error: could not determine physical column index`);
    }
    // TODO: return the actual info
  }

  #handleColumnHeaderResized(resizeEntry) {
    if (this.#columnHeaderResizeTimeoutId !== undefined) {
      clearTimeout(this.#columnHeaderResizeTimeoutId);
      this.#columnHeaderResizeTimeoutId = undefined;
    }
    this.#columnHeaderResizeTimeoutId = setTimeout(function(){
      var target = resizeEntry.target;
      var width = target.style.width;
      if (width.endsWith('px')) {
        // user changed column width - this is where we should store the width in the corresponding column tuple.
        var info = this.#getColumnHeaderTupleAndCellAxisInfo(target);
        //debugger;
      }
      clearTimeout(this.#columnHeaderResizeTimeoutId);
      this.#columnHeaderResizeTimeoutId = undefined;
    }.bind(this), this.#columnHeaderResizeTimeout);
  }

  #initSettings(settings){
    this.#settings = settings;
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
      autoUpdate = false;
    }
    return autoUpdate;
  }

  #setNeedsUpdate(needsUpdate){
    var dom = this.getDom();
    dom.setAttribute('data-needs-update', String(Boolean(needsUpdate)));
  }

  #queryModelStateBeforeChange = undefined;
  #queryModelFilterConditionBeforeChange = undefined;
  #queryModelBeforeChangeHandler(event, count){
    if (count !== 0) {
      return;
    }
    var queryModelState = this.#queryModel.getState({includeItemIndices: true});
    this.#queryModelStateBeforeChange = JSON.stringify(queryModelState);
    this.#queryModelFilterConditionBeforeChange = this.#queryModel.getFilterConditionSql(false);
  }

  #queryModelChangeHandler(event, count){
    if (count !== undefined) {
      return;
    }
    var stateBefore = this.#queryModelStateBeforeChange;

    var queryModelStateAfterChange = this.#queryModel.getState({includeItemIndices: true});
    var stateAfter = JSON.stringify(queryModelStateAfterChange);
    if (stateBefore === stateAfter){
      return;
    }
    var queryModelStateBeforeChange = JSON.parse(stateBefore);

    var needsClearing = false;
    var needsUpdate = false;

    var clearRowsTupleSet = false;
    var clearColumnsTupleSet = false;
    var clearCellsSet = false;

    var stateChange = QueryModel.compareStates(queryModelStateBeforeChange, queryModelStateAfterChange);
    var axesChangedInfo = stateChange.axesChanged;
    if (axesChangedInfo){

      if (axesChangedInfo[QueryModel.AXIS_ROWS] !== undefined) {
        clearCellsSet = clearRowsTupleSet = true;
      }

      if (axesChangedInfo[QueryModel.AXIS_COLUMNS] !== undefined) {
        clearCellsSet = clearColumnsTupleSet = true;
      }

      if (axesChangedInfo[QueryModel.AXIS_CELLS] !== undefined) {
        needsUpdate = true;
        if (!clearCellsSet) {
          // NOOP!

          // This case is special - it means only the cells axis changed
          // But adding or removing items to only the cellset does not require clearing of the cells,
          // as we store aggregate items together and separately in the cell data.
        }
      }

      if (axesChangedInfo[QueryModel.AXIS_FILTERS]) {
        var filterConditionSql = this.#queryModel.getFilterConditionSql(false);
        if (filterConditionSql !== this.#queryModelFilterConditionBeforeChange) {
          needsUpdate = true;
          clearCellsSet = clearColumnsTupleSet = clearRowsTupleSet = true;
        }
      }
    }

    if (stateChange.propertiesChanged){
      var propertiesChangedInfo = stateChange.propertiesChanged;

      if (propertiesChangedInfo.datasource) {
        clearCellsSet = clearRowsTupleSet = clearColumnsTupleSet = true;
        needsClearing = true;
      }

      if (propertiesChangedInfo.cellsHeaders){
        // moving cells to another axis does not change the tuples or the cached cells,
        // it only requires rerendering the table.
        needsUpdate = true;
      }
    }

    // only clear tuple sets or cellset if the change requires it.
    if (clearColumnsTupleSet) {
      var columnsTupleSet = this.#columnsTupleSet;
      columnsTupleSet.clear();
      needsUpdate = true;
    }

    if (clearRowsTupleSet === true) {
      var rowsTupleSet = this.#rowsTupleSet;
      rowsTupleSet.clear();
      needsUpdate = true;
    }

    if (clearCellsSet === true) {
      var cellsSet = this.#cellsSet;
      cellsSet.clear();
      needsUpdate = true;
    }

    var countQueryAxisItems = [
      QueryModel.AXIS_ROWS,
      QueryModel.AXIS_COLUMNS,
      QueryModel.AXIS_CELLS
    ].reduce(function(acc, curr){
      var queryModel = this.getQueryModel();
      var queryAxis = queryModel.getQueryAxis(curr);
      var queryAxisItems = queryAxis.getItems();
      return acc + queryAxisItems.length;
    }.bind(this), 0);

    if (countQueryAxisItems === 0) {
      needsClearing = true;
    }

    if (needsClearing) {
      this.clear();
      needsUpdate = false;
    }

    this.#setNeedsUpdate(needsUpdate);

    if (!this.#autoUpdate){
      return;
    }

    if (needsUpdate){
      this.updatePivotTableUi();
    }

  }

  #setBusy(busy){
    var dom = this.getDom();
    dom.setAttribute('aria-busy', String(Boolean(busy)));
    this.fireEvent('busy', {
      busy: Boolean(busy)
    })
  }

  #getBusy(){
    var dom = this.getDom();
    return dom.getAttribute('aria-busy') === 'true';
  }

  #fireUpdatedSuccess(){
    var tupleCounts = {};
    tupleCounts[QueryModel.AXIS_ROWS] = this.#rowsTupleSet.getTupleCountSync();
    tupleCounts[QueryModel.AXIS_COLUMNS] = this.#columnsTupleSet.getTupleCountSync();

    var status = {
      status: 'success',
      tupleCounts: tupleCounts
    }
    this.fireEvent('updated', status);
  }

  async #handleInnerContainerScrolled(event, count){
    if (count === undefined){
      // this is the last scroll event, update the table contents.
      try {
        this.#setBusy(true);
        await this.#updateDataToScrollPosition();
        this.#fireUpdatedSuccess();
      }
      catch(error){
        console.error(error);
        this.fireEvent('updated', {
          status: 'error',
          error: error
        });
      }
      setTimeout(this.#setBusy.bind(this), 1);
    }
    else
    if (count !== 0) {
      return;
    }
    // this is the first scroll event, set the busy indicator
    this.getDom().setAttribute('aria-busy', String(true));
  }

  #getPhysicalTupleIndices(){
    var innerContainer = this.#getInnerContainerDom();

    //
    var scrollWidth = innerContainer.scrollWidth;
    var left = innerContainer.scrollLeft;

    var columnsAxisSizeInfo = this.#getColumnsAxisSizeInfo();
    var headersWidth = columnsAxisSizeInfo ? columnsAxisSizeInfo.headers.width : 0;
    var horizontallyScrolledFraction = left / (scrollWidth - headersWidth);
    var numberOfPhysicalColumnsAxisTuples = this.#getNumberOfPhysicalTuplesForAxis(QueryModel.AXIS_COLUMNS);
    var physicalColumnsAxisTupleIndex = Math.ceil((columnsAxisSizeInfo.headers.columnCount + numberOfPhysicalColumnsAxisTuples) * horizontallyScrolledFraction);

    //
    var scrollHeight = innerContainer.scrollHeight;
    var top = innerContainer.scrollTop;

    var rowsAxisSizeInfo = this.#getRowsAxisSizeInfo();
    var headersHeight = rowsAxisSizeInfo.headers.height;
    var verticallyScrolledFraction = top / (scrollHeight - headersHeight);
    var numberOfPhysicalRowsAxisTuples = this.#getNumberOfPhysicalTuplesForAxis(QueryModel.AXIS_ROWS);
    var physicalRowsAxisTupleIndex = Math.ceil(numberOfPhysicalRowsAxisTuples * verticallyScrolledFraction);

    return {
      columnsAxisSizeInfo: columnsAxisSizeInfo,
      physicalColumnsAxisTupleIndex: physicalColumnsAxisTupleIndex,
      rowsAxisSizeInfo: rowsAxisSizeInfo,
      physicalRowsAxisTupleIndex: physicalRowsAxisTupleIndex
    };
  }

  async #updateDataToScrollPosition(){
    var physicalTupleIndices = this.#getPhysicalTupleIndices();

    var physicalColumnsAxisTupleIndex = physicalTupleIndices.physicalColumnsAxisTupleIndex;
    var physicalRowsAxisTupleIndex = physicalTupleIndices.physicalRowsAxisTupleIndex;

    var columnAxisPromise = this.#updateColumnsAxisTupleData(physicalColumnsAxisTupleIndex);
    var rowAxisPromise = this.#updateRowsAxisTupleData(physicalRowsAxisTupleIndex);

    await Promise.all([columnAxisPromise, rowAxisPromise]);
    await this.#updateCellData(physicalColumnsAxisTupleIndex, physicalRowsAxisTupleIndex);
  }

  #getTupleIndexForPhysicalIndex(axisId, physicalIndex){
    var queryModel = this.getQueryModel();
    var cellHeadersAxis = queryModel.getCellHeadersAxis();
    var factor;
    if (cellHeadersAxis === axisId){
      var cellsAxis = queryModel.getCellsAxis();
      var cellsAxisItems = cellsAxis.getItems();
      var numCellsAxisItems = cellsAxisItems.length;
      if (numCellsAxisItems === 0) {
        factor = 1;
      }
      else {
        factor = numCellsAxisItems;
      }
    }
    else {
      factor = 1;
    }
    var fractionalIndex = physicalIndex / factor;
    var tupleIndex = Math.floor(fractionalIndex);
    var fraction = fractionalIndex - tupleIndex;
    var cellsAxisItemIndex = Math.round(fraction * factor);

    return {
      physicalIndex: physicalIndex,
      axisId: axisId,
      factor: factor,
      tupleIndex: tupleIndex,
      cellsAxisItemIndex: cellsAxisItemIndex
    };
  }

  // get the indices of all totals items.
  // this is a helper for #isTotalsMember
  static #getTotalsItemsIndices(queryAxisItems){
    return queryAxisItems && queryAxisItems.length ? queryAxisItems.reduce(function(acc, curr, index){
      if (curr.includeTotals) {
        acc.unshift(index);
      }
      return acc;
    }, []) : undefined;
  }
  // if the tuple has a grouping id,
  // find the most significant bit of the grouping id
  // find the totals item that corresponds with the MSB of the grouping id
  // find the index of that totals item
  // if the index of the current item is equal to or greater than the index of the totals item, then return true
  // else return false.

  static #isTotalsMember(groupingId, totalsItemsIndices, currentItemIndex){
    if (
      !groupingId ||
      !totalsItemsIndices ||
      !totalsItemsIndices.length ||
      currentItemIndex === undefined
    ){
      return Infinity;
    }

    var i = BigInt(totalsItemsIndices.length - 1);
    while (i >= 0n && !(groupingId & (1n << i)))  {
      i -= 1n;
    }

    return  (i < 0n) ? Infinity : totalsItemsIndices[i];
  }

  async #updateColumnsAxisTupleData(physicalColumnsAxisTupleIndex){
    if (isNaN(physicalColumnsAxisTupleIndex)) {
      return;
    }
    var repeatingValuesIndex;
    var hideRepeatingAxisValues = this.#getHideRepeatingAxisValues();
    var dittoMark = hideRepeatingAxisValues ? this.#getDittoMark() : '';

    var axisId = QueryModel.AXIS_COLUMNS;
    var tupleIndexInfo = this.#getTupleIndexForPhysicalIndex(axisId, physicalColumnsAxisTupleIndex);
    var columnsAxisSizeInfo = this.#getColumnsAxisSizeInfo();
    var count = columnsAxisSizeInfo.columns.columnCount;
    var maxColumnIndex = columnsAxisSizeInfo.headers.columnCount + count;
    var tupleCount = Math.ceil(count / (tupleIndexInfo.factor - tupleIndexInfo.cellsAxisItemIndex));
    var tupleSet = this.#columnsTupleSet;

    var queryModel = this.getQueryModel();
    var queryAxis = queryModel.getColumnsAxis();
    var queryAxisItems = queryAxis.getItems();
    var totalsItemsIndices = PivotTableUi.#getTotalsItemsIndices(queryAxisItems);

    var tupleValueFields = tupleSet.getTupleValueFields();
    var tupleValueField;

    var tuples = await tupleSet.getTuples(tupleCount, tupleIndexInfo.tupleIndex);
    // local tuple index in our array of tuples
    var tupleIndex = 0;

    var cellHeadersAxis = queryModel.getCellHeadersAxis();
    var cellsAxisItems, numCellsAxisItems;
    var doCellHeaders = (cellHeadersAxis === axisId);
    if (doCellHeaders) {
      var cellsAxis = queryModel.getCellsAxis();
      cellsAxisItems = cellsAxis.getItems();
      if (cellsAxisItems.length === 0){
        doCellHeaders = false;
      }
    }

    var cellsAxisItemIndex = tupleIndexInfo.cellsAxisItemIndex;

    var tableHeaderDom = this.#getTableHeaderDom();
    var rows = tableHeaderDom.childNodes;
    var numRows = rows.length;
    //if (!doCellHeaders){
    //  numRows -= 1;
    //}

    // for each tuple
    var columnsOffset = columnsAxisSizeInfo.headers.columnCount;
    for (var i = columnsOffset; i < maxColumnIndex; i++){
      var tuple = tuples[tupleIndex];
      var prevTuple = tuples[tupleIndex - 1];
      repeatingValuesIndex = undefined;

      var groupingId = tuple ? tuple[TupleSet.groupingIdAlias] : undefined;
      var isTotalsColumn = Boolean(groupingId);

      //for each header row
      for (var j = 0; j < numRows; j++){
        var queryAxisItem = queryAxisItems[j];

        var row = rows.item(j);
        var cells = row.childNodes;
        var cell = cells.item(i);
        cell.setAttribute('data-columns-tuple-index', tupleIndex);
        cell.setAttribute('data-totals', isTotalsColumn);
        var label = getChildWithClassName(cell, 'pivotTableUiCellLabel');
        var isTotalsMember = PivotTableUi.#isTotalsMember(groupingId, totalsItemsIndices, queryAxisItem ? j : undefined);

        var labelText = undefined;
        var titleText = undefined;
        var tupleValue;
        if (tuple && j < tuple.values.length){
          tupleValueField = tupleValueFields[j];
          tupleValue = tuple.values[j];
          if (hideRepeatingAxisValues && prevTuple && (repeatingValuesIndex === undefined || repeatingValuesIndex === j - 1)){
            var prevTupleValue = prevTuple.values[j];
            if (tupleValue === prevTupleValue) {
              repeatingValuesIndex = j;
            }
            else
            if (repeatingValuesIndex === undefined){
              repeatingValuesIndex = j - 1;
            }
          }

          this.#setCellValueLiteral(cell, queryAxisItem, tupleValue, tupleValueField);

          if (isTotalsMember > j) {
            if (queryAxisItem.formatter) {
              titleText = queryAxisItem.formatter(tupleValue, tupleValueField);
            }
            else {
              titleText = String(tupleValue);
            }
            if (cellsAxisItemIndex === 0 || i === columnsOffset) {
              labelText = titleText;
            }
          }
          else
          if (isTotalsMember === j){
            titleText = this.#getTotalsString(queryAxisItem);
            if (cellsAxisItemIndex === 0 || i === columnsOffset){
              labelText = titleText;
            }
          }
          else {
            labelText = '';
          }
          titleText = `${QueryAxisItem.getCaptionForQueryAxisItem(queryAxisItem)} (${tupleIndex + 1}): ${titleText}`;

          if (hideRepeatingAxisValues){
            var isRepeatingValue;
            if (
              repeatingValuesIndex === j || 
              doCellHeaders && cellsAxisItems.length && (cellsAxisItemIndex > 0 && i !== columnsOffset)
            ){
              labelText = dittoMark;
              isRepeatingValue = true;
            }
            else {
              isRepeatingValue = false;
            }
            cell.setAttribute('data-is-repeating-value', isRepeatingValue);
          }
          else {
            cell.removeAttribute('data-is-repeating-value');
          }
        }
        else
        if (doCellHeaders && cellsAxisItems.length) {
          var cellsAxisItem = cellsAxisItems[cellsAxisItemIndex];
          this.#setCellItemId(cell, cellsAxisItem, cellsAxisItemIndex);
          titleText = labelText = QueryAxisItem.getCaptionForQueryAxisItem(cellsAxisItem);
        }

        if (!labelText || !labelText.length) {
          labelText = String.fromCharCode(160);
        }

        label.innerText = labelText;
        label.title = titleText;

        if (j === 0){
          if (tuple && tuple.widths) {
            var cellsAxisItem = cellsAxisItems.length === 0 ? null : cellsAxisItems[cellsAxisItemIndex];
            var cellsAxisItemLabel = cellsAxisItems.length === 0 ? '' : QueryAxisItem.getIdForQueryAxisItem(cellsAxisItem);
            var width = tuple.widths[cellsAxisItemLabel];
            if (width !== undefined) {
              cell.style.width = width + 'px';
            }
          }
        }

      }

      if (doCellHeaders) {
        cellsAxisItemIndex += 1;
        if (cellsAxisItemIndex === cellsAxisItems.length) {
          cellsAxisItemIndex = 0;
          tupleIndex += 1;
        }
      }
      else {
        tupleIndex += 1;
      }
    }
  }

  async #updateRowsAxisTupleData(physicalRowsAxisTupleIndex){
    var repeatingValuesIndex;
    var hideRepeatingAxisValues = this.#getHideRepeatingAxisValues();
    var dittoMark = hideRepeatingAxisValues ? this.#getDittoMark() : '';
    
    var axisId = QueryModel.AXIS_ROWS;
    var tupleIndexInfo = this.#getTupleIndexForPhysicalIndex(axisId, physicalRowsAxisTupleIndex);
    var rowsAxisSizeInfo = this.#getRowsAxisSizeInfo();
    var columnsAxisSizeInfo = this.#getColumnsAxisSizeInfo();
    var count = rowsAxisSizeInfo.rows.rowCount;
    var tupleCount = Math.ceil(count / tupleIndexInfo.factor);
    if (tupleIndexInfo.cellsAxisItemIndex > 0) {
      tupleCount += 1;
    }      
    var tupleSet = this.#rowsTupleSet;

    var queryModel = this.getQueryModel();
    var queryAxis = queryModel.getRowsAxis();
    var queryAxisItems = queryAxis.getItems();
    var totalsItemsIndices = PivotTableUi.#getTotalsItemsIndices(queryAxisItems);

    var tupleValueFields = tupleSet.getTupleValueFields();
    var tuples = await tupleSet.getTuples(tupleCount, tupleIndexInfo.tupleIndex || 0);

    var cellHeadersAxis = queryModel.getCellHeadersAxis();
    var cellsAxisItems;
    var doCellHeaders = (cellHeadersAxis === axisId);
    if (doCellHeaders) {
      var cellsAxis = queryModel.getCellsAxis();
      cellsAxisItems = cellsAxis.getItems();
    }

    var tupleIndex = 0;
    var cellsAxisItemIndex = tupleIndexInfo.cellsAxisItemIndex;

    var tableBodyDom = this.#getTableBodyDom();
    var rows = tableBodyDom.childNodes;

    for (var i = 0; i < rows.length - 1; i++) {
      var row = rows.item(i);
      var cells = row.childNodes;

      var tuple = tuples[tupleIndex];
      var prevTuple = tuples[tupleIndex - 1];
      repeatingValuesIndex = undefined;

      row.setAttribute('data-rows-tuple-index', tupleIndex);
      var groupingId = tuple ? tuple[TupleSet.groupingIdAlias] : undefined;

      var isTotalsRow = Boolean(groupingId);
      row.setAttribute("data-totals", isTotalsRow);

      var columnsOffset = columnsAxisSizeInfo.headers.columnCount;
      for (var j = 0; j < columnsOffset; j++){
        var queryAxisItem = queryAxisItems[j];
        var cell = cells.item(j);
        var label = getChildWithClassName(cell, 'pivotTableUiCellLabel');

        var labelText = undefined;
        var titleText = undefined;
        var numMembers = tuple ? tuple.values.length : 0;
        if (tuple && j < numMembers) {
          var isTotalsMember = PivotTableUi.#isTotalsMember(groupingId, totalsItemsIndices, queryAxisItem ? j : undefined);
          var tupleValue = tuple.values[j];

          if (hideRepeatingAxisValues && prevTuple && (repeatingValuesIndex === undefined || repeatingValuesIndex === j - 1)){
            var prevTupleValue = prevTuple.values[j];
            if (tupleValue === prevTupleValue) {
              repeatingValuesIndex = j;
            }
            else
            if (repeatingValuesIndex === undefined){
              repeatingValuesIndex = j - 1;
            }
          }

          var tupleValueField = tupleValueFields[j];
          this.#setCellValueLiteral(cell, queryAxisItem, tupleValue, tupleValueField);
          if (isTotalsMember > j) {
            if (queryAxisItem.formatter) {
              labelText = queryAxisItem.formatter(tupleValue, tupleValueField);
            }
            else {
              labelText = String(tupleValue);
            }
            cell.setAttribute('data-totals', false);
          }
          else
          if (isTotalsMember === j) {
            labelText = this.#getTotalsString(queryAxisItem);
            cell.setAttribute('data-totals', true);
          }
          else {
            labelText = '';
            cell.setAttribute('data-totals', false);
          }
          titleText = `${QueryAxisItem.getCaptionForQueryAxisItem(queryAxisItem)}: ${labelText}`;

          if (hideRepeatingAxisValues){
            var isRepeatingValue;
            if (
              repeatingValuesIndex === j ||
              doCellHeaders && cellsAxisItems.length && (cellsAxisItemIndex > 0 && i !== 0)
            ){
              // add ditto marks, unless this is a totals cell
              labelText = isTotalsMember <= j ? undefined : dittoMark;
              isRepeatingValue = true;
            }
            else {
              isRepeatingValue = false;
            }
            cell.setAttribute('data-is-repeating-value', isRepeatingValue);
          }
          else {
            cell.removeAttribute('data-is-repeating-value');
          }
        }
        else
        if (doCellHeaders && j === columnsOffset - 1) {
          var cellsAxisItem = cellsAxisItems[cellsAxisItemIndex];
          labelText = QueryAxisItem.getCaptionForQueryAxisItem(cellsAxisItem);
          titleText = labelText;
        }

        if (!labelText || !labelText.length) {
          labelText = String.fromCharCode(160);
        }

        label.innerText = labelText;
        label.title = titleText;
      }

      if (doCellHeaders) {
        cellsAxisItemIndex += 1;
        if (cellsAxisItemIndex === cellsAxisItems.length || cellsAxisItems.length === 0) {
          cellsAxisItemIndex = 0;
          tupleIndex += 1;
        }
      }
      else {
        tupleIndex += 1;
      }
    }
  }

  #setCellItemId(cellElement, queryAxisItem, queryAxisItemIndex){
    if (!queryAxisItem){
      return;
    }
    cellElement.setAttribute('data-axis', queryAxisItem.axis);
    var itemId = QueryAxisItem.getIdForQueryAxisItem(queryAxisItem);
    cellElement.setAttribute('data-axis-item', itemId);
    cellElement.setAttribute('data-axis-item-index', queryAxisItemIndex);
  }

  #setCellValueLiteral(cellElement, queryAxisItem, tupleValue, tupleValueField){
    if (!tupleValue && !tupleValueField) {
      // this really should't happen but sometimes does when the cached tuples are out of sync witht he query model.
      console.warn(`No tuple value and no tuple value field.`);
      return;
    }
    switch (tupleValueField.type.typeId){
      case 12:  // variable size list
        if (tupleValue !== null){
          console.warn(`Tuple value is a variable length list. Refuse to write out its literal value.`);
        }
        return;
      default:
    }

    cellElement.setAttribute('data-axis', queryAxisItem.axis);

    var itemId = QueryAxisItem.getIdForQueryAxisItem(queryAxisItem);
    cellElement.setAttribute('data-axis-item', itemId);

    var valueLiteral;
    var literalWriter = queryAxisItem.literalWriter;
    if (literalWriter){
      valueLiteral = literalWriter(tupleValue, tupleValueField);
    }
    else {
      valueLiteral = getDuckDbLiteralForValue(tupleValue, tupleValueField.type);
    }
    cellElement.setAttribute('data-value-literal', valueLiteral);

    var cellValueType = String(tupleValueField.type);
    if (queryAxisItem.derivation) {
      var derivationInfo = AttributeUi.getDerivationInfo(queryAxisItem.derivation);
      if (derivationInfo.dataValueTypeOverride) {
        cellValueType = derivationInfo.dataValueTypeOverride;
      }
    }
    cellElement.setAttribute('data-value-type', cellValueType);
  }

  #renderCellValue(cell, cellsAxisItem, cellElement){
    var label = getChildWithClassName(cellElement, 'pivotTableUiCellLabel');
    if (!cell || !cellsAxisItem){
      label.title = '';
      return label.innerText = '';
    }

    var values = cell.values;
    var sqlExpression = QueryAxisItem.getSqlForQueryAxisItem(cellsAxisItem, CellSet.datasetRelationName);
    var value = values[sqlExpression];

    var cellValueFields = this.#cellsSet.getCellValueFields();
    var cellValueField = cellValueFields[sqlExpression];
    this.#setCellValueLiteral(cellElement, cellsAxisItem, value, cellValueField);

    var labelText;
    var formatter = cellsAxisItem.formatter;

    if (formatter) {
      labelText = formatter(value, cellValueField);
    }
    else
    if (value === null){
      labelText = '';
    }
    else {
      labelText = String(value);
    }
    label.innerText = labelText;

    var caption = QueryAxisItem.getCaptionForQueryAxisItem(cellsAxisItem);
    label.title = `${caption}: ${labelText}`;
    return labelText
  }

  async #updateCellData(physicalColumnsAxisTupleIndex, physicalRowsAxisTupleIndex){
    var tableBodyDom = this.#getTableBodyDom();
    var tableBodyRows = tableBodyDom.childNodes;

    var tableHeaderDom = this.#getTableHeaderDom();
    var tableHeaderRows = tableHeaderDom.childNodes;
    var firstTableHeaderRow = tableHeaderRows.item(0);
    var firstTableHeaderRowCells = firstTableHeaderRow.childNodes;

    var queryModel = this.getQueryModel();
    var cellHeadersAxis = queryModel.getCellHeadersAxis();

    var rowsAxis = queryModel.getRowsAxis();
    var rowsAxisItems = rowsAxis.getItems();
    var columnsAxis = queryModel.getColumnsAxis();
    var columnsAxisItems = columnsAxis.getItems();
    var cellsAxis = queryModel.getCellsAxis();
    var cellsAxisItems = cellsAxis.getItems();
    var itemId;

    var columnTupleIndexInfo = this.#getTupleIndexForPhysicalIndex(QueryModel.AXIS_COLUMNS, physicalColumnsAxisTupleIndex);
    var columnsAxisSizeInfo = this.#getColumnsAxisSizeInfo();
    var headerColumnCount = columnsAxisSizeInfo.headers.columnCount;

    var rowTupleIndexInfo = this.#getTupleIndexForPhysicalIndex(QueryModel.AXIS_ROWS, physicalRowsAxisTupleIndex);

    var rowCount = tableBodyRows.length - 1;
    var columnCount = firstTableHeaderRowCells.length - headerColumnCount - 1;

    var columnsAxisTupleIndex = columnTupleIndexInfo.tupleIndex;
    var rowsAxisTupleIndex = rowTupleIndexInfo.tupleIndex;
    var numRowsAxisTuples, numColumnsAxisTuples;
    var columnsTupleRange = [];
    var rowsTupleRange = [];
    switch (cellHeadersAxis){
      case QueryModel.AXIS_COLUMNS:
        if (columnsAxisItems.length){
          numColumnsAxisTuples = Math.ceil(columnCount / columnTupleIndexInfo.factor);
          if (columnTupleIndexInfo.cellsAxisItemIndex) {
            numColumnsAxisTuples += 1;
          }
        }
        else {
          numColumnsAxisTuples = 0;
        }
        numRowsAxisTuples = rowsAxisItems.length ? tableBodyRows.length - 1 : 0;
        break;
      case QueryModel.AXIS_ROWS:
        numColumnsAxisTuples = columnsAxisItems.length ? columnCount : 0;
        if (rowsAxisItems.length){
          numRowsAxisTuples = Math.ceil((tableBodyRows.length - 1) / rowTupleIndexInfo.factor);
          if (rowTupleIndexInfo.cellsAxisItemIndex){
            numRowsAxisTuples += 1;
          }
        }
        else {
          numRowsAxisTuples = 0;
        }
        break;
    }
    columnsTupleRange = [columnsAxisTupleIndex, columnsAxisTupleIndex + numColumnsAxisTuples];
    rowsTupleRange = [rowsAxisTupleIndex, rowsAxisTupleIndex + numRowsAxisTuples];

    var cellsAxisItemIndex;

    var cellsSet = this.#cellsSet;
    var cells = await cellsSet.getCells([rowsTupleRange, columnsTupleRange]);

    var cellIndex;

    for (var i = 0; i < tableBodyRows.length - 1; i++){
      var tableRow = tableBodyRows.item(i);
      if (!tableRow){
        continue;
      }
      var cellElements = tableRow.childNodes;

      if (cellHeadersAxis === QueryModel.AXIS_ROWS && i === 0){
        cellsAxisItemIndex = rowTupleIndexInfo.cellsAxisItemIndex;
        rowsAxisTupleIndex = rowTupleIndexInfo.tupleIndex;
      }

      for (var j = headerColumnCount; j < headerColumnCount + columnCount; j++){

        if (j === headerColumnCount) {
          columnsAxisTupleIndex = columnTupleIndexInfo.tupleIndex;
          if (cellHeadersAxis === QueryModel.AXIS_COLUMNS) {
            cellsAxisItemIndex = columnTupleIndexInfo.cellsAxisItemIndex;
          }
        }

        var cellElement = cellElements.item(j);
        if (!cellElement){
          console.error(`Warning: no DOM found for cell ${i},${j}`);
          continue;
        }
        
        var cellIndex = cellsSet.getCellIndex(rowsAxisTupleIndex, columnsAxisTupleIndex);
        var cell = undefined;
        if (cells) {
          cell = cells[cellIndex];
        }
        var cellsAxisItem = cellsAxisItems[cellsAxisItemIndex];
        var labelText = this.#renderCellValue(cell, cellsAxisItem, cellElement);

        var headerCell = firstTableHeaderRowCells.item(j);
        if (headerCell) {
          cellElement.setAttribute('data-totals', headerCell.getAttribute('data-totals'));
          // adjust the column width if necessary.
          var width = headerCell.style.width;
          if (width.endsWith('ch')){
            var newWidth = labelText.length + 1;

            if (newWidth > PivotTableUi.#maximumCellWidth) {
              newWidth = PivotTableUi.#maximumCellWidth;
            }

            if (newWidth > parseInt(width, 10)) {
              headerCell.style.width = newWidth + 'ch';
            }
          }
        }
        else {
          console.error(`Warning: no header cell at position ${j}`);
        }

        if (cellHeadersAxis === QueryModel.AXIS_COLUMNS){
          cellsAxisItemIndex += 1;
          if (cellsAxisItemIndex >= cellsAxisItems.length) {
            cellsAxisItemIndex = 0;
            columnsAxisTupleIndex += 1;
          }
        }
        else {
          columnsAxisTupleIndex += 1;
        }
      }

      if (cellHeadersAxis === QueryModel.AXIS_ROWS){
        cellsAxisItemIndex += 1;
        if (cellsAxisItemIndex >= cellsAxisItems.length) {
          cellsAxisItemIndex = 0;
          rowsAxisTupleIndex += 1;
        }
      }
      else {
        rowsAxisTupleIndex += 1;
      }
    }
  }

  #renderHeader() {
    var tableHeaderDom = this.#getTableHeaderDom();
    var tableBodyDom = this.#getTableBodyDom();

    var queryModel = this.getQueryModel();
    var cellHeadersAxis = queryModel.getCellHeadersAxis();

    var rowsAxis = queryModel.getRowsAxis();
    var rowsAxisItems = rowsAxis.getItems();

    var columnsAxis = queryModel.getColumnsAxis();
    var columnsAxisItems = columnsAxis.getItems();

    var cellsAxis = queryModel.getCellsAxis();
    var cellsAxisItems = cellsAxis.getItems();

    var numColumnAxisRows = columnsAxisItems.length;
    if (cellHeadersAxis === QueryModel.AXIS_COLUMNS) {
      numColumnAxisRows += 1;
    }
    if (numColumnAxisRows === 0) {
      numColumnAxisRows = 1;
    }

    var numRowAxisColumns = rowsAxisItems.length;
    if (cellHeadersAxis === QueryModel.AXIS_ROWS) {
      // make room for the cell headers on the rows axis
      if (columnsAxisItems.length || cellsAxisItems.length) {
        numRowAxisColumns += 1;
      }
    }

    if (numRowAxisColumns === 0) {
      numRowAxisColumns = 1;
    }

    var firstTableHeaderRow, firstTableHeaderRowCells;
    for (var i = 0; i < numColumnAxisRows; i++){
      var tableRow = createEl('div', {
        "class": "pivotTableUiRow"
      });
      tableHeaderDom.appendChild(tableRow);

      var tableCell, labelText, label;
      for (var j = 0; j < numRowAxisColumns; j++) {
        tableCell = createEl('div', {
          "class": 'pivotTableUiCell pivotTableUiHeaderCell'
        });
        tableRow.appendChild(tableCell);

        var columnWidth;
        // headers for the  row axis columns
        if (i === (numColumnAxisRows - 1)) {
          if (j < rowsAxisItems.length){
            tableCell.className += ' pivotTableUiRowsAxisHeaderCell';
            var rowsAxisItem = rowsAxisItems[j];
            this.#setCellItemId(tableCell, rowsAxisItem, j);
            labelText = QueryAxisItem.getCaptionForQueryAxisItem(rowsAxisItem);
            columnWidth = (labelText.length + 2);

            if (columnWidth > PivotTableUi.#maximumCellWidth) {
              columnWidth = PivotTableUi.#maximumCellWidth;
            }

            columnWidth += 'ch';
            label = createEl('span', {
              "class": 'pivotTableUiCellLabel pivotTableUiAxisHeaderLabel',
            });
            label.title = labelText;
            label.innerText = labelText;
            tableCell.appendChild(label);
          }
          else
          if (cellHeadersAxis === QueryModel.AXIS_ROWS) {
            columnWidth = rowsAxisItems.reduce(function(acc, curr){
              labelText = QueryAxisItem.getCaptionForQueryAxisItem(curr);
              columnWidth = labelText.length;
              return columnWidth > acc ? columnWidth : acc;
            }, 0);

            columnWidth += 1;

            if (columnWidth > PivotTableUi.#maximumCellWidth) {
              columnWidth = PivotTableUi.#maximumCellWidth;
            }

            columnWidth += 'ch';
          }

          firstTableHeaderRow = tableHeaderDom.childNodes.item(0);
          firstTableHeaderRowCells = firstTableHeaderRow.childNodes;
          var firstTableHeaderRowCell = firstTableHeaderRowCells.item(j);
          firstTableHeaderRowCell.style.width = columnWidth;
        }
      }

      // headers for the column axis rows
      if (i < columnsAxisItems.length) {
        tableCell.className += ' pivotTableUiColumnsAxisHeaderCell';
        var columnsAxisItem = columnsAxisItems[i];
        this.#setCellItemId(tableCell, columnsAxisItem, i);
        labelText = QueryAxisItem.getCaptionForQueryAxisItem(columnsAxisItem);
        label = createEl('span', {
          "class": 'pivotTableUiCellLabel pivotTableUiAxisHeaderLabel'
        });
        label.title = labelText;
        label.innerText = labelText;
        columnWidth = labelText.length + 1;

        if (columnWidth > PivotTableUi.#maximumCellWidth) {
          columnWidth = PivotTableUi.#maximumCellWidth;
        }

        tableCell.style.width = columnWidth + 'ch';
        tableCell.appendChild(label);
      }
    }

    firstTableHeaderRow = tableHeaderDom.childNodes.item(0);
    var stufferCell, stufferRow;
    stufferCell = createEl('div', {
      "class": "pivotTableUiCell pivotTableUiHeaderCell pivotTableUiStufferCell"
    });
    firstTableHeaderRow.appendChild(stufferCell);

    stufferRow = createEl('div', {
      "class": "pivotTableUiRow"
    });
    tableBodyDom.appendChild(stufferRow);
    stufferCell = createEl('div', {
      "class": "pivotTableUiCell pivotTableUiHeaderCell pivotTableUiStufferCell"
    });
    stufferRow.appendChild(stufferCell);
  }

  #renderColumns(tuples){

    var containerDom = this.#getInnerContainerDom();
    var innerContainerWidth = containerDom.clientWidth;
    var tableDom = this.#getTableDom();
    var physicalColumnsAdded = 0;

    var queryModel = this.getQueryModel();
    var queryAxis = queryModel.getColumnsAxis();
    var queryAxisItems = queryAxis.getItems();
    var totalsItemsIndices = PivotTableUi.#getTotalsItemsIndices(queryAxisItems);

    var tupleValueFields = this.#columnsTupleSet.getTupleValueFields();

    var numCellHeaders = 0;
    var numTuples = tuples.length;
    var numColumns = numTuples;
    var cellHeadersPlacement = queryModel.getCellHeadersAxis();
    var renderCellHeaders = (cellHeadersPlacement === QueryModel.AXIS_COLUMNS);

    var cellsAxis = queryModel.getCellsAxis();
    var cellItems = cellsAxis.getItems();
    if (renderCellHeaders) {
      numCellHeaders = cellItems.length;
      if (numCellHeaders === 0) {
        numCellHeaders = 1;
      }
    }
    else {
      numCellHeaders = 1;
    }

    // if there are no tuples on the column axis, but there are items in the cells axis,
    // then we still need 1 column
    if (numColumns === 0 && cellItems.length) {
      numColumns = 1;
    }

    var tableHeaderDom = this.#getTableHeaderDom();
    var headerRows = tableHeaderDom.childNodes;
    var firstHeaderRow = headerRows.item(0);

    if (!firstHeaderRow) {
      return;
    }

    var firstHeaderRowCells = firstHeaderRow.childNodes;
    var stufferCell = firstHeaderRowCells.item(firstHeaderRowCells.length - 1);

    // loop for each row from the column axis query result
    // if there aren't any, but the cells are on the column axis, and there is at least one item on the cell axis, this will still run once.
    for (var i = 0; i < numColumns; i++){
      var tuple;
      if (i < numTuples){
        tuple = tuples[i];
      }

      var valuesMaxWidth = 0, columnWidth = 0;
      var values, groupingId;
      if (tuple){
        values = tuple.values;
        groupingId = tuple[TupleSet.groupingIdAlias];
      }

      for (var k = 0; k < numCellHeaders; k++){
        for (var j = 0; j < headerRows.length; j++){
          var queryAxisItem = queryAxisItems[j];
          var isTotalsMember = PivotTableUi.#isTotalsMember(groupingId, totalsItemsIndices, queryAxisItem ? j : undefined);

          var headerRow = headerRows.item(j);

          var cell = createEl('div', {
            "class": "pivotTableUiCell pivotTableUiHeaderCell",
            "data-totals": groupingId > 0
          });
          this.#setCellItemId(cell, queryAxisItem, j);

          if (j === headerRows.length - 1 && renderCellHeaders && cellItems.length){
            cell.className += ' pivotTableUiCellAxisHeaderCell';
          }

          var labelText = undefined;
          if (isTotalsMember > j){
            if (values && j < values.length) {
              if (k === 0) {
                var value = values[j];
                var tupleValueField = tupleValueFields[j];
                labelText = queryAxisItem.formatter ? queryAxisItem.formatter(value, tupleValueField) : String(value);
                this.#setCellValueLiteral(cell, queryAxisItem, value, tupleValueField);
              }
              else {
                labelText = String.fromCharCode(160);
              }

              if (labelText.length > valuesMaxWidth){
                valuesMaxWidth = labelText.length;
                columnWidth = valuesMaxWidth;
              }
            }
            else
            if (renderCellHeaders && k < cellItems.length) {
              var cellItem = cellItems[k];
              labelText = QueryAxisItem.getCaptionForQueryAxisItem(cellItem);
              columnWidth = labelText.length > valuesMaxWidth ? labelText.length : valuesMaxWidth;
              this.#setCellItemId(cell, cellItem, k);
            }
          }
          else
          if (isTotalsMember === j) {
            labelText = this.#getTotalsString(queryAxisItem);
          }
          if (labelText === undefined) {
            labelText = String.fromCharCode(160);
          }

          var label = createEl('span', {
            "class": "pivotTableUiCellLabel"
          });
          label.title = labelText;
          label.innerText = labelText;

          cell.appendChild(label);

          if (j === 0){
            headerRow.insertBefore(cell, stufferCell);
          }
          else {
            headerRow.appendChild(cell);
          }

          if (j === headerRows.length - 1) {

            columnWidth += 1;
            if (columnWidth > PivotTableUi.#maximumCellWidth) {
              columnWidth = PivotTableUi.#maximumCellWidth;
            }

            stufferCell.previousSibling.style.width = columnWidth + 'ch';
          }
        }

        physicalColumnsAdded += 1;
        //check if the table overshoots the allowable width
        if (tableDom.clientWidth > innerContainerWidth) {
          return;
        }
      }
    }
  }

  #removeExcessColumns(){
    var tableHeaderDom = this.#getTableHeaderDom();
    var headerRows = tableHeaderDom.childNodes;
    var firstHeaderRow = headerRows.item(0);
    if (!firstHeaderRow) {
      return;
    }
    var firstHeaderRowCells = firstHeaderRow.childNodes;
    var lastHeaderRowIndex = headerRows.length -1;

    var containerDom = this.#getInnerContainerDom();
    var innerContainerWidth = containerDom.clientWidth;
    var tableDom = this.#getTableDom();

    while (tableDom.clientWidth > innerContainerWidth) {
      // table exceeds allowed width remove the last column.
      for (var j = lastHeaderRowIndex; j >=0; j--){
        var headerRow = headerRows.item(j);
        var cells = headerRow.childNodes;
        var lastCellIndex = firstHeaderRowCells.length - 2;
        if (lastCellIndex < 0 || lastCellIndex >= cells.length) {
          return;
        }
        var lastCell = cells.item(lastCellIndex);
        if (j === lastHeaderRowIndex && (tableDom.clientWidth - lastCell.clientWidth) < innerContainerWidth) {
          return;
        }
        headerRow.removeChild(lastCell);
      }
    }
  }

  #removeExcessRows(){
    var tableHeaderDom = this.#getTableHeaderDom();
    var headerRows = tableHeaderDom.childNodes;

    var containerDom = this.#getInnerContainerDom();
    var innerContainerHeight = containerDom.clientHeight;
    var tableDom = this.#getTableDom();

    var tableBodyDom = this.#getTableBodyDom();
    var tableBodyDomRows = tableBodyDom.childNodes;

    while (tableDom.clientHeight > innerContainerHeight && tableBodyDomRows.length > 1) {
      // the last row is the stuffer row, remove the row before that.
      var tableBodyRow = tableBodyDomRows[tableBodyDomRows.length - 2];
      tableBodyDom.removeChild(tableBodyRow);
    }
  }

  #renderRows(tuples){
    var containerDom = this.#getInnerContainerDom();
    var innerContainerHeight = containerDom.clientHeight;
    var tableDom = this.#getTableDom();
    var physicalRowsAdded = 0;

    var queryModel = this.getQueryModel();
    var columnsAxis = queryModel.getColumnsAxis();
    var columnAxisItems = columnsAxis.getItems();

    var rowsAxis = queryModel.getRowsAxis();
    var rowAxisItems = rowsAxis.getItems();
    var numColumns = rowAxisItems.length;
    var itemId;

    var tupleValueFields = this.#rowsTupleSet.getTupleValueFields();

    var numCellHeaders = 1;
    var numRows = tuples.length;
    var cellHeadersPlacement = queryModel.getCellHeadersAxis();
    var renderCellHeaders = (cellHeadersPlacement === QueryModel.AXIS_ROWS);

    var cellsAxis = queryModel.getCellsAxis();
    var cellAxisItems = cellsAxis.getItems();

    if (renderCellHeaders) {
      numCellHeaders = cellAxisItems.length;
      if (numCellHeaders === 0) {
        numCellHeaders = 1;

        var columnsAxis = queryModel.getColumnsAxis();
        var columnAxisItems = columnsAxis.getItems();
        if (columnAxisItems.length){
          numColumns += 1;
        }
      }
      else {
        numColumns += 1;
      }
    }
    else
    if (numColumns === 0){
      numColumns = 1;
    }

    // if there are no tuples on the rows axis, but there are items in the cells axis,
    // then we still need 1 row
    if (numRows === 0 && cellAxisItems.length) {
      numRows = 1;
    }

    var tableHeaderDom = this.#getTableHeaderDom();
    var tableHeaderRows = tableHeaderDom.childNodes;
    var firstTableHeaderRow = tableHeaderRows.item(0);

    if (!firstTableHeaderRow){
      return;
    }
    var firstTableHeaderRowCells = firstTableHeaderRow.childNodes;

    var tableBodyDom = this.#getTableBodyDom();
    var tableBodyDomRows = tableBodyDom.childNodes;
    var stufferRow = tableBodyDomRows.item(0);

    for (var i = 0; i < numRows; i++){
      var tuple = tuples[i];
      var groupingId = tuple ? tuple[TupleSet.groupingIdAlias] : undefined;

      for (var k = 0; k < numCellHeaders; k++){
        var bodyRow = createEl('div', {
          "class": "pivotTableUiRow",
          "data-totals": groupingId > 0
        });

        tableBodyDom.insertBefore(bodyRow, stufferRow);

        for (var j = 0; j < numColumns; j++){
          var cell = createEl('div', {
            "class": "pivotTableUiCell pivotTableUiHeaderCell"
          });

          var headerCell = firstTableHeaderRowCells[bodyRow.childNodes.length];
          var headerCellWidth = parseInt(headerCell.style.width, 10);

          bodyRow.appendChild(cell);

          var labelText = undefined;
          if (j < rowAxisItems.length) {
            if (k === 0 && tuple) {
              var value = tuple.values[j];
              var rowAxisItem = rowAxisItems[j];
              this.#setCellItemId(cell, rowAxisItem, j);

              var tupleValueField = tupleValueFields[j];
              labelText = rowAxisItem.formatter ? rowAxisItem.formatter(value, tupleValueField) : String(value);
              this.#setCellValueLiteral(cell, rowAxisItem, value, tupleValueField);

            }
          }
          else {
            cell.className += ' pivotTableUiCellAxisHeaderCell';
            if (k < cellAxisItems.length && renderCellHeaders) {
              var cellsAxisItem = cellAxisItems[k];
              labelText = QueryAxisItem.getCaptionForQueryAxisItem(cellsAxisItem);
              this.#setCellItemId(cell, cellsAxisItem, k);
            }
          }

          if (!labelText || !labelText.length) {
            labelText = String.fromCharCode(160);
          }

          var label = createEl('span', {
            "class": "pivotTableUiCellLabel",
          });
          label.title = labelText;
          label.innerText = labelText;
          cell.appendChild(label);

          if (headerCellWidth < labelText.length){
            headerCellWidth = labelText.length + 1;

            if (headerCellWidth > PivotTableUi.#maximumCellWidth) {
              headerCellWidth = PivotTableUi.#maximumCellWidth;
            }

            headerCell.style.width = headerCellWidth + 'ch';
            cell.style.width = headerCellWidth + 'ch';
          }
        }

        physicalRowsAdded += 1;
        // check if the table overshoots its heigh.
        var newTableDomHeight = tableDom.clientHeight;
        if (newTableDomHeight > innerContainerHeight) {
          // remove the last added row to ensure it fits in the container
          // we need it to it or else the "sticky" positioning won't work as intended
          // TODO: mabe position the table explicitly to achieve the sticky effect so we don't need to remove the ultimate row/column
          //tableBodyDom.removeChild(bodyRow);
          return;
        }
      }
    }
  }

  #renderCells(){
    var tableHeaderDom = this.#getTableHeaderDom();

    var columnAxisSizeInfo = this.#getColumnsAxisSizeInfo();
    var columnOffset = columnAxisSizeInfo.headers.columnCount;
    var columnCount = columnAxisSizeInfo.headers.columnCount + columnAxisSizeInfo.columns.columnCount;

    var tableBodyDom = this.#getTableBodyDom();
    var tableBodyDomRows = tableBodyDom.childNodes;

    for (var i = 0; i < tableBodyDomRows.length - 1; i++){
      var bodyRow = tableBodyDomRows.item(i);
      for (var j = columnOffset; j < columnCount; j++){

        var cell = createEl('div', {
          "class": "pivotTableUiCell pivotTableUiValueCell",
          "data-axis": QueryModel.AXIS_CELLS
        });
        bodyRow.appendChild(cell);
        var label = createEl('span', {
          "class": "pivotTableUiCellLabel"
        }, '');
        cell.appendChild(label);
      }
    }
  }

  async #estimateColumnsAxisPageSize(){
    return 100;
  }

  async #estimateRowsAxisPageSize(){
    return 100;
  }

  #getDittoMark(){
    var dittoMark;
    var settings = this.#settings;
    if (settings && typeof settings.getSettings === 'function') {
      settings = settings.getSettings('pivotSettings');
    }
    if (settings){
      dittoMark = settings.dittoMark;
    }
    if ( dittoMark === undefined) {
      dittoMark = '〃';
    }
    return dittoMark;
  }
  
  #getHideRepeatingAxisValues(){
    var hideRepeatingAxisValues;
    var settings = this.#settings;
    if (settings && typeof settings.getSettings === 'function') {
      settings = settings.getSettings('pivotSettings');
    }
    if (settings){
      hideRepeatingAxisValues = settings.hideRepeatingAxisValues;
    }
    if ( hideRepeatingAxisValues === undefined) {
      hideRepeatingAxisValues = true;
    }
    return hideRepeatingAxisValues;
  }

  #getMaxCellWidth(){
    var maxCellWidth;
    var settings = this.#settings;
    if (settings && typeof settings.getSettings === 'function') {
      settings = settings.getSettings('pivotSettings');
    }
    if (settings){
      maxCellWidth = settings.maxCellWidth;
    }
    if (maxCellWidth){
      maxCellWidth = parseInt(maxCellWidth, 10);
    }
    if ( maxCellWidth === undefined || isNaN(maxCellWidth) || maxCellWidth <= 0 ) {
      maxCellWidth = 30;
    }
    return maxCellWidth;
  }

  async updatePivotTableUi(){
    if (this.#getBusy()) {
      return;
    }

    var maxCellWidth = this.#getMaxCellWidth();
    PivotTableUi.#maximumCellWidth = maxCellWidth;

    var tableDom = this.#getTableDom();
    try {

      this.#setBusy(true);
      this.clear();

      var columnsTupleSet = this.#columnsTupleSet;
      var rowsTupleSet = this.#rowsTupleSet;

      this.#renderHeader();

      tableDom.style.width = '';

      var pageSizes = await Promise.all([
        this.#estimateColumnsAxisPageSize(),
        this.#estimateRowsAxisPageSize(),
      ]);

      columnsTupleSet.setPageSize(pageSizes[0]);
      rowsTupleSet.setPageSize(pageSizes[1]);

      var renderAxisPromises = [
        columnsTupleSet.getTuples(columnsTupleSet.getPageSize(), 0),
        rowsTupleSet.getTuples(rowsTupleSet.getPageSize(), 0)
      ];

      var renderAxisPromisesResults = await Promise.all(renderAxisPromises)

      var columnTuples = renderAxisPromisesResults[0];
      this.#setHorizontalSize(0);
      this.#renderColumns(columnTuples);

      var rowTuples = renderAxisPromisesResults[1];
      this.#setVerticalSize(0);

      this.#renderRows(rowTuples);

      this.#updateVerticalSizer();
      this.#toggleObserveColumnsResizing(true);

      this.#renderCells();

      //await this.#updateCellData(0, 0);
      await this.#updateDataToScrollPosition();
      setTimeout(function(){
        this.#removeExcessColumns();
        this.#updateHorizontalSizer();
        this.#removeExcessRows();
        this.#updateVerticalSizer();
      }.bind(this), 1000)
      this.#setNeedsUpdate(false);
      this.#fireUpdatedSuccess();
    }
    catch(e){
      console.error(e);
      var eventData = {
        status: 'error',
        error: e
      };
      this.fireEvent('updated', eventData);
    }
    finally {
      tableDom.style.width = '99.99%';
      this.#setBusy(false);
    }
  }

  clear(){
    this.#toggleObserveColumnsResizing(false);
    var tableHeaderDom = this.#getTableHeaderDom();
    tableHeaderDom.innerHTML = '';
    var tableBodyDom = this.#getTableBodyDom();
    tableBodyDom.innerHTML = '';
    this.#setHorizontalSize(0);
    this.#setVerticalSize(0);
    this.#fireUpdatedSuccess();
  }

  getDom(){
    return document.getElementById(this.#id);
  }

  #getInnerContainerDom(){
    return getChildWithClassName(this.getDom(), 'pivotTableUiInnerContainer');
  }

  #getHorizontalSizer() {
    return getChildWithClassName(this.#getInnerContainerDom(), 'pivotTableUiHorizontalSizer');
  }

  #setHorizontalSize(size){
    var sizer = this.#getHorizontalSizer();
    sizer.style.width = size + 'px';
  }

  #getNumberOfPhysicalTuplesForAxis(axisId){
    var queryModel = this.getQueryModel();
    var cellHeadersAxis = queryModel.getCellHeadersAxis();

    var factor;
    if (cellHeadersAxis === axisId) {
      var cellsAxis = queryModel.getCellsAxis();
      var items = cellsAxis.getItems();
      factor = items.length;
    }

    if (!factor) {
      factor = 1;
    }

    var tupleSet;
    switch (axisId){
      case QueryModel.AXIS_COLUMNS:
        tupleSet = this.#columnsTupleSet;
        break;
      case QueryModel.AXIS_ROWS:
        tupleSet = this.#rowsTupleSet;
        break;
      default:
        throw new Error(`Invalid axis id ${axisId}.`);
    }
    var tupleCount = tupleSet.getTupleCountSync();
    if (tupleCount === undefined) {
      tupleCount = 1;
    }
    var numberOfPhysicalRows = tupleCount * factor;
    return numberOfPhysicalRows;
  }

  #getColumnsAxisSizeInfo(){
    var tableHeaderDom = this.#getTableHeaderDom();
    var firstHeaderRow = tableHeaderDom.childNodes.item(0);

    if (!firstHeaderRow ){
      return undefined;
    }

    var cells = firstHeaderRow.childNodes;

    var queryModel = this.getQueryModel();
    var rowsAxis = queryModel.getQueryAxis(QueryModel.AXIS_ROWS);
    var rowsAxisItems = rowsAxis.getItems();

    var columnsAxis = queryModel.getQueryAxis(QueryModel.AXIS_COLUMNS);
    var columnsAxisItems = columnsAxis.getItems();

    var cellsAxis = queryModel.getQueryAxis(QueryModel.AXIS_CELLS);
    var cellsAxisItems = cellsAxis.getItems();

    var cellHeadersAxis = queryModel.getCellHeadersAxis();

    var numHeaderItems;
    numHeaderItems = rowsAxisItems.length;
    if (cellHeadersAxis === QueryModel.AXIS_ROWS) {
      if (cellsAxisItems.length){
        numHeaderItems += 1;
      }
    }

    if (numHeaderItems === 0) {
      numHeaderItems = 1;
    }

     var sizeInfo = {
      headers: {
        width: 0,
        columnCount: numHeaderItems,
        numPhysicalHeaders: 0
      },
      columns: {
        width: 0,
        columnCount: 0
      }
    };

    // we have to subtract 1 for the stuffer cell.
    var numCells = cells.length - 1;
    for (var i = 0; i < numCells; i++){
      var cell = cells.item(i);
      if (i < numHeaderItems) {
        sizeInfo.headers.width += cell.clientWidth;
        sizeInfo.headers.numPhysicalHeaders += 1;
      }
      else {
        sizeInfo.columns.width += cell.clientWidth;
        sizeInfo.columns.columnCount += 1;
      }
    }

    return sizeInfo;
  }

  #updateHorizontalSizer(){
    var numberOfPhysicalTuples = this.#getNumberOfPhysicalTuplesForAxis(QueryModel.AXIS_COLUMNS);
    var sizeInfo = this.#getColumnsAxisSizeInfo();
    if (!sizeInfo) {
      console.warn('updateHorizontalSizer: no sizeInfo');
      return;
    }

    var avgColumnWidth;
    if (sizeInfo.columns.columnCount === 0) {
      avgColumnWidth = 0;
    }
    else {
      avgColumnWidth = sizeInfo.columns.width / sizeInfo.columns.columnCount;
    }
    var requiredWidth = avgColumnWidth * numberOfPhysicalTuples;

    var headersWidth;
    if (sizeInfo.headers.numPhysicalHeaders === sizeInfo.headers.columnCount) {
      // all headers are rendered, the headersWidth is the actual width;
      headersWidth = sizeInfo.headers.width;
    }
    else {
      var avgHeaderWidth = sizeInfo.headers.width / sizeInfo.headers.numPhysicalHeaders;
      headersWidth = avgHeaderWidth * sizeInfo.headers.columnCount;
    }

    var totalWidth = headersWidth + requiredWidth;
    this.#setHorizontalSize(totalWidth);
  }

  #getVerticalSizer() {
    return getChildWithClassName(this.#getInnerContainerDom(), 'pivotTableUiVerticalSizer');
  }

  #setVerticalSize(size){
    var sizer = this.#getVerticalSizer();
    sizer.style.height = size + 'px';
  }

  #getRowsAxisSizeInfo(){
    var tableHeaderDom = this.#getTableHeaderDom();
    var tableBodyDom = this.#getTableBodyDom();

    return {
      headers: {
        height: tableHeaderDom.clientHeight,
        rowCount: tableHeaderDom.childNodes.length
      },
      rows: {
        height: tableBodyDom.clientHeight,
        // we have to subtract 1 from the number of childnodes because we always have one empty row for the stuffer cell.
        rowCount: tableBodyDom.childNodes.length - 1
      }
    };
  }

  #updateVerticalSizer(){
    var numberOfPhysicalTuples = this.#getNumberOfPhysicalTuplesForAxis(QueryModel.AXIS_ROWS);
    var sizeInfo = this.#getRowsAxisSizeInfo();
    if (!sizeInfo) {
      console.warn('updateVerticalSizer: no sizeInfo');
      return;
    }
    var physicalRowHeight = sizeInfo.rows.height / sizeInfo.rows.rowCount;
    var requiredHeight = physicalRowHeight * numberOfPhysicalTuples;
    var totalHeight = sizeInfo.headers.height + requiredHeight;
    this.#setVerticalSize(totalHeight);
  }

  #getTableDom(){
    return getChildWithClassName(this.#getInnerContainerDom(), 'pivotTableUiTable');
  }

  #getTableHeaderDom(){
    return getChildWithClassName(this.#getTableDom(), 'pivotTableUiTableHeader');
  }

  #getTableBodyDom(){
    return getChildWithClassName(this.#getTableDom(), 'pivotTableUiTableBody');
  }

  #contextMenuContext = null;
  beforeShowContextMenu(event, contextMenu){
    var target = event.target;
    var cell = target;
    var dom = this.getDom();
    while (cell !== dom && cell && !hasClass(cell, 'pivotTableUiCell')){
      cell = cell.parentNode;
    }
    if (!cell || cell === dom) {
      return false;
    }
    this.#contextMenuContext = cell;
  }

  async contextMenuItemClicked(event) {
    var target = event.target;
    var id = target.id;

    var contextMenuContext = this.#contextMenuContext;
    this.#contextMenuContext = null;

    if (id === 'pivotTableContextMenuItemCopyCell'){
      copyToClipboard(contextMenuContext.textContent, 'text/plain');
      return;
    }

    var exportSettings = this.#settings.getSettings('exportUi');
    exportSettings.exportType = 'exportDelimited';
    exportSettings.exportResultShapePivot = !(exportSettings.exportResultShapeTable = true);

    exportSettings.exportDestinationClipboard = true;
    exportSettings.exportDestinationFile = false;

    var queryAxisItem, cellsAxisItem, filter, filterAxisItem, itemId;
    var queryModel = this.#queryModel;
    var cellHeadersAxis = queryModel.getCellHeadersAxis();

    var queryModelState = queryModel.getState();
    var queryModelAxes = queryModelState.axes;
    var filterAxisItems = queryModelAxes[QueryModel.AXIS_FILTERS];
    var cellsAxisItems = queryModelAxes[QueryModel.AXIS_CELLS];
    var rowsAxisItems = queryModelAxes[QueryModel.AXIS_ROWS];
    var columnsAxisItems = queryModelAxes[QueryModel.AXIS_COLUMNS];

    var tableHeaderDom = this.#getTableHeaderDom();
    var tableHeaderRows = tableHeaderDom.childNodes;
    var tableBodyDom = this.#getTableBodyDom();
    var tableBodyRows = tableBodyDom.childNodes;
    var tableHeaderRow, tableBodyRow, cells;

    // calculate the number of row headers
    var numRowHeaders = rowsAxisItems ? rowsAxisItems.length : 0;
    var numColumnHeaders = columnsAxisItems ? columnsAxisItems.length : 0;
    if (cellsAxisItems && cellsAxisItems.length) {
      switch (cellHeadersAxis){
        case QueryModel.AXIS_COLUMNS:
          numColumnHeaders += 1;
          break;
        case QueryModel.AXIS_ROWS:
          numRowHeaders += 1;
          break;
      }
    }

    var busyDialog = byId('visualizationProgressDialog');
    busyDialog.showModal();
    switch (id){
      case 'pivotTableContextMenuItemCopyColumnTuples':
        delete queryModelAxes[QueryModel.AXIS_ROWS];
        delete queryModelAxes[QueryModel.AXIS_CELLS];
        break;
      case 'pivotTableContextMenuItemCopyRowTuples':
        delete queryModelAxes[QueryModel.AXIS_COLUMNS];
        delete queryModelAxes[QueryModel.AXIS_CELLS];
        break;
      case 'pivotTableContextMenuItemCopyTable':
        exportSettings.exportResultShapePivot = !(exportSettings.exportResultShapeTable = false);
        break;
      case 'pivotTableContextMenuItemCopyColumn':
        // find the physical column index
        var columnIndex = 0;
        var cell = contextMenuContext;
        while (cell && cell.previousSibling) {
          columnIndex += 1;
          cell = cell.previousSibling;
        }

        if (columnIndex < rowsAxisItems.length) {
          // the column is in the range of the row headers, this is a simple axis query on 1 row axis item
          delete queryModelAxes[QueryModel.AXIS_COLUMNS];
          delete queryModelAxes[QueryModel.AXIS_CELLS];
          queryAxisItem = rowsAxisItems[columnIndex];
          queryModelAxes[QueryModel.AXIS_ROWS].length = 0;
          queryModelAxes[QueryModel.AXIS_ROWS].push(queryAxisItem);
        }
        else
        if (columnIndex < numRowHeaders){
          // the column is in the range of the row headers, but this is not a row axis item - it must be a cells axis header.

        }
        else {
          exportSettings.exportResultShapePivot = !(exportSettings.exportResultShapeTable = false);
          // the column is a table column;
          // to export it, we set up a transformed query model that applies a filter to select only this column.
          if (!filterAxisItems){
            queryModelAxes[QueryModel.AXIS_FILTERS] = filterAxisItems = [];
          }

          for (var i = 0; i < tableHeaderRows.length; i++){
            tableHeaderRow = tableHeaderRows.item(i);
            cells = tableHeaderRow.childNodes;
            cell = cells.item(columnIndex);
            if (i < columnsAxisItems.length){
              queryAxisItem = columnsAxisItems[i];
              itemId = QueryAxisItem.getIdForQueryAxisItem(queryAxisItem);
              filterAxisItem = filterAxisItems.find(function(filterAxisItem){
                var id = QueryAxisItem.getIdForQueryAxisItem(filterAxisItem);
                return id === itemId;
              });
              if (filterAxisItem){
                filter = filterAxisItem.filter;
              }
              else{
                filterAxisItem = Object.assign({}, queryAxisItem);
                filter = filterAxisItem.filter = {};
                filterAxisItems.push(filterAxisItem);
              }
              filter.filterType = FilterDialog.filterTypes.INCLUDE;
              filter.values = {};
              filter.values[cell.textContent] = {
                value: cell.textContent,
                label: cell.textContent,
                literal: cell.getAttribute('data-value-literal')
              };
            }
            else
            if (cellHeadersAxis === QueryModel.AXIS_COLUMNS){
              itemId = cell.getAttribute('data-axis-item');
              cellsAxisItem = cellsAxisItems.find(function(cellsAxisItem){
                var id = QueryAxisItem.getIdForQueryAxisItem(cellsAxisItem);
                return id === itemId;
              });
              cellsAxisItems.length = 0;
              cellsAxisItems.push(cellsAxisItem);
            }
          }
        }
        break;
      case 'pivotTableContextMenuItemCopyRow':

        // find the physical row index
        var row = contextMenuContext.parentNode;
        var rowIndex = 0;
        while (row && row.previousSibling) {
          rowIndex += 1;
          row = row.previousSibling;
        }

        row = contextMenuContext.parentNode;
        if (row.parentNode === tableHeaderDom) {
          if (rowIndex < columnsAxisItems.length){
            // this is a simple axis query on 1 column axis item.
            delete queryModelAxes[QueryModel.AXIS_ROWS];
            delete queryModelAxes[QueryModel.AXIS_CELLS];
            queryAxisItem = columnsAxisItems[rowIndex];
            queryModelAxes[QueryModel.AXIS_COLUMNS].length = 0;
            queryModelAxes[QueryModel.AXIS_COLUMNS].push(queryAxisItem);

          }
          else
          if (rowIndex < numColumnHeaders) {
            // this must be the cells header
          }
        }
        else
        if (row.parentNode === tableBodyDom){
          var cells = row.childNodes;
          exportSettings.exportResultShapePivot = !(exportSettings.exportResultShapeTable = false);
          // the column is a table column;
          // to export it, we set up a transformed query model that applies a filter to select only this column.
          if (!filterAxisItems){
            queryModelAxes[QueryModel.AXIS_FILTERS] = filterAxisItems = [];
          }

          for (var i = 0; i < numRowHeaders; i++){
            cell = cells.item(i);
            if (i < rowsAxisItems.length){
              queryAxisItem = rowsAxisItems[i];
              itemId = QueryAxisItem.getIdForQueryAxisItem(queryAxisItem);
              filterAxisItem = filterAxisItems.find(function(filterAxisItem){
                var id = QueryAxisItem.getIdForQueryAxisItem(filterAxisItem);
                return id === itemId;
              });
              if (filterAxisItem){
                filter = filterAxisItem.filter;
              }
              else{
                filterAxisItem = Object.assign({}, queryAxisItem);
                filter = filterAxisItem.filter = {};
                filterAxisItems.push(filterAxisItem);
              }
              filter.filterType = FilterDialog.filterTypes.INCLUDE;
              filter.values = {};
              filter.values[cell.textContent] = {
                value: cell.textContent,
                label: cell.textContent,
                literal: cell.getAttribute('data-value-literal')
              };
            }
            else
            if (cellHeadersAxis === QueryModel.AXIS_ROWS){
              itemId = cell.getAttribute('data-axis-item');
              cellsAxisItem = cellsAxisItems.find(function(cellsAxisItem){
                var id = QueryAxisItem.getIdForQueryAxisItem(cellsAxisItem);
                return id === itemId;
              });
              cellsAxisItems.length = 0;
              cellsAxisItems.push(cellsAxisItem);
            }
          }
        }
        else {
        }
        break;
    }

    try {
      var exportQueryModel = new QueryModel();
      await exportQueryModel.setState(queryModelState);
      await ExportUi.exportData(exportQueryModel, exportSettings);
    }
    catch(error) {
      showErrorDialog(error);
    }
    finally {
    }
    busyDialog.close();
  }
}

var pivotTableUi;
function initPivotTableUi(){
  pivotTableUi = new PivotTableUi({
    container: 'workarea',
    id: 'pivotTableUi',
    queryModel: queryModel,
    settings: settings
  });

  var pivotTableUiContextMenu = new ContextMenu(pivotTableUi, 'pivotTableContextMenu');
}