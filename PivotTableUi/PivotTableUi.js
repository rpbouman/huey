class PivotTableUi {
    
  #id = undefined;
  #queryModel = undefined;
    
  #columnsTupleSet = undefined;
  #rowsTupleSet = undefined;
  #cellsSet = undefined;
  
  // 
  #rowIndex = 0;
  #columnIndex = 0;
    
  #resizeTimeoutId = undefined;
  #resizeTimeout = 1000;
  
  constructor(config){
    this.#id = config.id;
    
    var queryModel = config.queryModel;
    this.#queryModel = queryModel;

    var columnsTupleSet = new TupleSet(queryModel, QueryModel.AXIS_COLUMNS);
    this.#columnsTupleSet = columnsTupleSet;
    var rowsTupleSet = new TupleSet(queryModel, QueryModel.AXIS_ROWS);
    this.#rowsTupleSet = rowsTupleSet;
    
    this.#cellsSet = new CellSet(queryModel, [
        rowsTupleSet,
        columnsTupleSet
    ]);
   
    queryModel.addEventListener('change', this.#queryModelChangeHandler.bind(this));
    
    var container = this.#getInnerContainerDom();
    bufferEvents(
      container,
      'scroll',
      this.#handleInnerContainerScrolled,
      this,
      100
    );

    var resizeObserver = new ResizeObserver(function(){
      if (this.#resizeTimeoutId !== undefined) {
        clearTimeout(this.#resizeTimeoutId);
        this.#resizeTimeoutId = undefined;
      }
      this.#resizeTimeoutId = setTimeout(function(){
        this.#updatePivotTableUi();
      }.bind(this), this.#resizeTimeout);
    }.bind(this));
    var dom = this.getDom();
    resizeObserver.observe(dom);
  }
  
  #queryModelChangeHandler(event){
        
    var clearRowsTupleSet = false;
    var clearColumnsTupleSet = false;
    var clearCellsSet = false;
    
    // examine the change
    var eventData = event.eventData;
    if (eventData.axesChanged) {
      var axesChangedInfo = eventData.axesChanged;

      if (axesChangedInfo[QueryModel.AXIS_ROWS] !== undefined) {
        clearCellsSet = clearRowsTupleSet = true;
      }          

      if (axesChangedInfo[QueryModel.AXIS_COLUMNS] !== undefined) {
        clearCellsSet = clearColumnsTupleSet = true;
      }          

      if (axesChangedInfo[QueryModel.AXIS_CELLS] !== undefined) {
        if (!clearCellsSet) {
          // NOOP!
          
          // This case is special - it means only the cells axis changed
          // But adding or removing items to only the cellset does not require clearing of the cells,
          // as we store aggregate items together and separately in the cell data.
        }
      }          
    }
    else 
    if (eventData.propertiesChanged){
      var propertiesChangedInfo = eventData.propertiesChanged;
      
      if (propertiesChangedInfo.cellHeadersAxis){
        // moving cells to another axis does not change the tuples or the cached cells, 
        // it only requires rerendering the table.
      }
    }

    // only clear tuple sets or cellset if the change requires it.
    if (clearColumnsTupleSet) {
      var columnsTupleSet = this.#columnsTupleSet;
      columnsTupleSet.clear();
    }

    if (clearRowsTupleSet === true) {
      var rowsTupleSet = this.#rowsTupleSet;
      rowsTupleSet.clear();
    }

    if (clearCellsSet === true) {
      var cellsSet = this.#cellsSet;
      cellsSet.clear();
    }
    
    this.#updatePivotTableUi();
  }
  
  #setBusy(busy){
    var dom = this.getDom();
    dom.setAttribute('data-updating', String(Boolean(busy)));
  }
  
  #handleInnerContainerScrolled(event, count){
    if (count === undefined){
      // this is the last scroll event, update the table contents.
      this.#updateDataToScrollPosition()
      .then(function(){
        // nothing to do here, yet.
      }.bind(this))
      .catch(function(error){
        console.error(error);
      }.bind(this))
      .finally(function(){
        // for some reason, the attribute doesn't get updated unless we apply timeout.
        setTimeout(this.#setBusy.bind(this), 1);
      }.bind(this));
    }
    else 
    if (count !== 0) {
      return;
    }
    // this is the first scroll event, set the busy indicator
    this.#setBusy(true);
  }
  
  async #updateDataToScrollPosition(){
    var innerContainer = this.#getInnerContainerDom();
        
    //
    var scrollWidth = innerContainer.scrollWidth;
    var left = innerContainer.scrollLeft;

    var columnsAxisSizeInfo = this.#getColumnsAxisSizeInfo();
    var headersWidth = columnsAxisSizeInfo.headers.width;
    var horizontallyScrolledFraction = left / (scrollWidth - headersWidth);
    var numberOfPhysicalColumnsAxisTuples = this.#getNumberOfPhysicalTuplesForAxis(QueryModel.AXIS_COLUMNS);
    var physicalColumnsAxisTupleIndex = Math.round(numberOfPhysicalColumnsAxisTuples * horizontallyScrolledFraction);

    var columnAxisPromise = this.#updateColumnsAxisTupleData(physicalColumnsAxisTupleIndex);

    //
    var scrollHeight = innerContainer.scrollHeight;
    var top = innerContainer.scrollTop;
    
    var rowsAxisSizeInfo = this.#getRowsAxisSizeInfo();
    var headersHeight = rowsAxisSizeInfo.headers.height;
    var verticallyScrolledFraction = top / (scrollHeight - headersHeight);
    var numberOfPhysicalRowsAxisTuples = this.#getNumberOfPhysicalTuplesForAxis(QueryModel.AXIS_ROWS);
    var physicalRowsAxisTupleIndex = Math.round(numberOfPhysicalRowsAxisTuples * verticallyScrolledFraction);

    var rowAxisPromise = this.#updateRowsAxisTupleData(physicalRowsAxisTupleIndex);
    
    await Promise.all([columnAxisPromise, rowAxisPromise]);
    
    return this.#updateCellData(physicalColumnsAxisTupleIndex, physicalRowsAxisTupleIndex);
  }
      
  #getTupleIndexForPhysicalIndex(axisId, physicalIndex){
    var queryModel = this.#queryModel;
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
  
  async #updateColumnsAxisTupleData(physicalColumnsAxisTupleIndex){
    var axisId = QueryModel.AXIS_COLUMNS;
    var tupleIndexInfo = this.#getTupleIndexForPhysicalIndex(axisId, physicalColumnsAxisTupleIndex);
    var columnsAxisSizeInfo = this.#getColumnsAxisSizeInfo();
    var count = columnsAxisSizeInfo.columns.columnCount;
    var maxColumnIndex = columnsAxisSizeInfo.headers.columnCount + count;
    var tupleCount = Math.ceil(count / tupleIndexInfo.factor);
    var tupleSet = this.#columnsTupleSet;
    var tuples = await tupleSet.getTuples(tupleCount, tupleIndexInfo.tupleIndex);

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

    var tupleIndex = 0;
    var cellsAxisItemIndex = tupleIndexInfo.cellsAxisItemIndex;
    
    var tableHeaderDom = this.#getTableHeaderDom();
    var rows = tableHeaderDom.childNodes;
    var numRows = rows.length;
    if (!doCellHeaders){
      numRows -= 1;
    }
    
    // for each tuple
    for (var i = columnsAxisSizeInfo.headers.columnCount; i < maxColumnIndex; i++){
      var tuple = tuples[tupleIndex];
      
      //for each header row
      for (var j = 0; j < numRows; j++){
        var row = rows.item(j);
        var cells = row.childNodes;
        var cell = cells.item(i);
        var label = getChildWithClassName(cell, 'pivotTableUiCellLabel');
        
        var labelText;
        var tupleValue;
        if (tuple && j < tuple.values.length){
          tupleValue = tuple.values[j];

          if (cellsAxisItemIndex === 0 || i === columnsAxisSizeInfo.headers.columnCount) {
            labelText = String(tupleValue);
          }
          else {
            labelText = '';
          }
        }
        else 
        if (doCellHeaders) {
          if (cellsAxisItems.length) {
            var cellsAxisItem = cellsAxisItems[cellsAxisItemIndex];
            labelText = QueryAxisItem.getCaptionForQueryAxisItem(cellsAxisItem);
          }
          else {
            labelText = '';
          }
        }
        
        label.innerText = labelText;
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
    var axisId = QueryModel.AXIS_ROWS;
    var tupleIndexInfo = this.#getTupleIndexForPhysicalIndex(axisId, physicalRowsAxisTupleIndex);
    var rowsAxisSizeInfo = this.#getRowsAxisSizeInfo();
    var columnsAxisSizeInfo = this.#getColumnsAxisSizeInfo();
    var count = rowsAxisSizeInfo.rows.rowCount;
    var tupleCount = Math.ceil(count / tupleIndexInfo.factor);
    var tupleSet = this.#rowsTupleSet;
    var tuples = await tupleSet.getTuples(tupleCount, tupleIndexInfo.tupleIndex);

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
      
      for (var j = 0; j < columnsAxisSizeInfo.headers.columnCount; j++){
        var cell = cells.item(j);        
        var label = getChildWithClassName(cell, 'pivotTableUiCellLabel');
  
        var labelText;
        var tupleValue;
        if (tuple && j < tuple.values.length) {
          tupleValue = tuple.values[j];         

          if (cellsAxisItemIndex === 0 || i === 0) {
            labelText = String(tupleValue);
          }
          else {
            labelText = '';
          }
        }
        else
        if (doCellHeaders) {
          var cellsAxisItem = cellsAxisItems[cellsAxisItemIndex];
          labelText = QueryAxisItem.getCaptionForQueryAxisItem(cellsAxisItem);
        }
        
        label.innerText = labelText;
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
  
  async #updateCellData(physicalColumnsAxisTupleIndex, physicalRowsAxisTupleIndex){
    var tableBodyDom = this.#getTableBodyDom();
    var tableBodyRows = tableBodyDom.childNodes;

    var tableHeaderDom = this.#getTableHeaderDom();
    var tableHeaderRows = tableHeaderDom.childNodes;
    var firstTableHeaderRow = tableHeaderRows.item(0);
    var firstTableHeaderRowCells = firstTableHeaderRow.childNodes;
    
    var queryModel = this.#queryModel;
    var cellHeadersAxis = queryModel.getCellHeadersAxis();
    
    var rowsAxis = queryModel.getRowsAxis();
    var rowsAxisItems = rowsAxis.getItems();
    var columnsAxis = queryModel.getColumnsAxis();
    var columnsAxisItems = columnsAxis.getItems();
    var cellsAxis = queryModel.getCellsAxis();
    var cellsAxisItems = cellsAxis.getItems();
    
    var columnTupleIndexInfo = this.#getTupleIndexForPhysicalIndex(QueryModel.AXIS_COLUMNS, physicalColumnsAxisTupleIndex);
    var columnsAxisSizeInfo = this.#getColumnsAxisSizeInfo();
    var headerColumnCount = columnsAxisSizeInfo.headers.columnCount;

    var rowTupleIndexInfo = this.#getTupleIndexForPhysicalIndex(QueryModel.AXIS_ROWS, physicalRowsAxisTupleIndex);
    var rowsAxisSizeInfo = this.#getRowsAxisSizeInfo();

    var rowCount = tableBodyRows.length - 1;
    var columnCount = firstTableHeaderRowCells.length - headerColumnCount - 1;

    var columnsAxisTupleIndex = columnTupleIndexInfo.tupleIndex;
    var rowsAxisTupleIndex = rowTupleIndexInfo.tupleIndex;
    var numRowsAxisTuples, numColumnsAxisTuples;
    var columnsTupleRange = [];
    var rowsTupleRange = [];
    switch (cellHeadersAxis){
      case QueryModel.AXIS_COLUMNS:
        numColumnsAxisTuples = columnsAxisItems.length ? Math.ceil(columnCount / columnTupleIndexInfo.factor) : 0;
        numRowsAxisTuples = rowsAxisItems.length ? rowCount : 0;
        break;
      case QueryModel.AXIS_ROWS:
        numColumnsAxisTuples = columnsAxisItems.length ? columnCount : 0;
        numRowsAxisTuples = rowsAxisItems.length ? Math.ceil(rowCount / rowTupleIndexInfo.factor) : 0;
        break;
    }
    columnsTupleRange = [columnsAxisTupleIndex, columnsAxisTupleIndex + numColumnsAxisTuples];
    rowsTupleRange = [rowsAxisTupleIndex, rowsAxisTupleIndex + numRowsAxisTuples];

    var cellsAxisItemIndex;

    var cellsSet = this.#cellsSet;
    var cellValueFields = cellsSet.getCellValueFields();
    var cells = await cellsSet.getCells([rowsTupleRange, columnsTupleRange]);
    
    var cellIndex;
    
    for (var i = 0; i < rowCount; i++){
      var tableRow = tableBodyRows.item(i);
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
        var label = getChildWithClassName(cellElement, 'pivotTableUiCellLabel');
        var labelText = '';
            
        if (cellsAxisItems.length){
          var cellIndex = cellsSet.getCellIndex(rowsAxisTupleIndex, columnsAxisTupleIndex);
          var cell = cells[cellIndex];
          if (cell){
            var values = cell.values;
            var cellsAxisItem = cellsAxisItems[cellsAxisItemIndex];
            var sqlExpression = QueryAxisItem.getSqlForQueryAxisItem(cellsAxisItem);
            var cellValueField = cellValueFields[sqlExpression];
            var cellValueType = String(cellValueField.type);
            cellElement.setAttribute('data-value-type', cellValueType);
            var value = values[sqlExpression];
            labelText = value === null ? '' : String(value);
          }
        }          

        label.innerText = labelText;
        
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
    
    var queryModel = this.#queryModel;
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
        
        // headers for the  row axis columns
        if (i === (numColumnAxisRows - 1)) {
          var columnWidth;
          if (j < rowsAxisItems.length){
            tableCell.className += ' pivotTableUiRowsAxisHeaderCell';
            var rowsAxisItem = rowsAxisItems[j];
            labelText = QueryAxisItem.getCaptionForQueryAxisItem(rowsAxisItem);
            columnWidth = (labelText.length + 1) + 'ch';
            label = createEl('span', {
              "class": 'pivotTableUiCellLabel pivotTableUiAxisHeaderLabel'
            }, labelText);
            tableCell.appendChild(label);
          }
          else 
          if (cellHeadersAxis === QueryModel.AXIS_ROWS) {
            columnWidth = rowsAxisItems.reduce(function(acc, curr){
              labelText = QueryAxisItem.getCaptionForQueryAxisItem(curr);
              columnWidth = labelText.length; 
              return columnWidth > acc ? columnWidth : acc;
            }, 0);
            columnWidth = (columnWidth + 2) + 'ch';
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
        labelText = QueryAxisItem.getCaptionForQueryAxisItem(columnsAxisItem);
        label = createEl('span', {
          "class": 'pivotTableUiCellLabel pivotTableUiAxisHeaderLabel'
        }, labelText);
        tableCell.style.width = (labelText.length + 2) + 'ch';
        tableCell.appendChild(label);
      }
    }

    firstTableHeaderRow = tableHeaderDom.childNodes.item(0);
    
    // if there are cell axis items appearing on the rows axis,
    // but no items on the columns axis, then we need one extra column to make room for the cells
    if (cellHeadersAxis === QueryModel.AXIS_ROWS && !columnsAxisItems.length && cellsAxisItems.length) {
      tableCell = createEl('div', {
        "class": 'pivotTableUiCell pivotTableUiHeaderCell'
      });
      tableRow.appendChild(tableCell);
      tableCell.style.width = '8ch';
      label = createEl('span', {
        "class": 'pivotTableUiCellLabel pivotTableUiAxisHeaderLabel'
      }, '');
      tableCell.appendChild(label);
    }
        
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
    
    var queryModel = this.#queryModel;
    
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
    var firstHeaderRowCells = firstHeaderRow.childNodes;
    var stufferCell = firstHeaderRowCells.item(firstHeaderRowCells.length - 1);
        
    // loop for each row from the column axis query result
    // if there aren't any, but the cells are on the column axis, and there is at least one item on the cell axis, this will still run once.
    for (var i = 0; i < numColumns; i++){
      var tuple;
      if (i < numTuples){
        tuple = tuples[i];
      }
    
      var valuesMaxWidth = 0, columnWidth;
      var values, stringValue;
      if (tuple){
        values = tuple.values;
      }
      
      for (var k = 0; k < numCellHeaders; k++){
        for (var j = 0; j < headerRows.length; j++){
          var headerRow = headerRows.item(j);
          
          var cell = createEl('div', {
            "class": "pivotTableUiCell pivotTableUiHeaderCell"
          });
          
          if (j === headerRows.length - 1 && renderCellHeaders && cellItems.length){
            cell.className += ' pivotTableUiCellAxisHeaderCell';
          }
          
          var labelText;
          if (values && j < values.length) {
            stringValue = String(values[j]);
            if (stringValue.length > valuesMaxWidth){
              valuesMaxWidth = stringValue.length;
              columnWidth = valuesMaxWidth;
            }
            if (k === 0) {
              labelText = stringValue;
            }
            else {
              labelText = String.fromCharCode(160);
            }
          }
          else
          if (renderCellHeaders && k < cellItems.length) {
            var cellItem = cellItems[k];
            labelText = QueryAxisItem.getCaptionForQueryAxisItem(cellItem);
            columnWidth = labelText.length > valuesMaxWidth ? labelText.length : valuesMaxWidth;            
          }
          else {
            labelText = String.fromCharCode(160);
          }
          var label = createEl('span', {
            "class": "pivotTableUiCellLabel"
          }, labelText);
          
          cell.appendChild(label);

          if (j === 0){
            headerRow.insertBefore(cell, stufferCell);
          }
          else {
            headerRow.appendChild(cell);
          }

          if (j === headerRows.length - 1) {
            stufferCell.previousSibling.style.width = (columnWidth + 1) + 'ch';
          }
        }
        
        physicalColumnsAdded += 1;
        //check if the table overshoots the allowable width
        while (tableDom.clientWidth > innerContainerWidth) {
          return;
        }
      }        
    }
  }
  
  #removeExcessColumns(){
    var tableHeaderDom = this.#getTableHeaderDom();
    var headerRows = tableHeaderDom.childNodes;
    var firstHeaderRow = headerRows.item(0);
    var firstHeaderRowCells = firstHeaderRow.childNodes;
    var lastHeaderRowIndex = headerRows.length -1;
    
    var containerDom = this.#getInnerContainerDom();
    var innerContainerWidth = containerDom.clientWidth;
    var tableDom = this.#getTableDom();
    
    var cellIndex;
    while (tableDom.clientWidth > innerContainerWidth) {
      // table exceeds allowed width remove the last column.
      for (var j = lastHeaderRowIndex; j >=0; j--){
        var headerRow = headerRows.item(j);
        var cells = headerRow.childNodes;
        var lastCell = cells.item(firstHeaderRowCells.length - 2);
        if (j === lastHeaderRowIndex && (tableDom.clientWidth - lastCell.clientWidth) < innerContainerWidth) {
          return;
        }
        headerRow.removeChild(lastCell);
      }
    }
  }

  #renderRows(tuples){
    var containerDom = this.#getInnerContainerDom();
    var innerContainerHeight = containerDom.clientHeight;
    var tableDom = this.#getTableDom();
    var initialTableDomHeight = tableDom.clientHeight;
    var physicalRowsAdded = 0;
    
    var queryModel = this.#queryModel;

    var columnsAxis = queryModel.getColumnsAxis();
    var columnAxisItems = columnsAxis.getItems();
    
    var rowsAxis = queryModel.getRowsAxis();
    var rowAxisItems = rowsAxis.getItems();
    var numColumns = rowAxisItems.length;
    
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
    if (numColumns === 0 && columnAxisItems.length){
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
    
    var tableBodyDom = this.#getTableBodyDom();
    var tableBodyDomRows = tableBodyDom.childNodes;
    var stufferRow = tableBodyDomRows.item(0);
    
    for (var i = 0; i < numRows; i++){
      var tuple = tuples[i];
      
      for (var k = 0; k < numCellHeaders; k++){
        var bodyRow = createEl('div', {
          "class": "pivotTableUiRow"
        });
        tableBodyDom.insertBefore(bodyRow, stufferRow);

        for (var j = 0; j < numColumns; j++){
          var cell = createEl('div', {
            "class": "pivotTableUiCell pivotTableUiHeaderCell"
          });
          bodyRow.appendChild(cell);
          
          var labelText;
          if (j < rowAxisItems.length) {
            if (k === 0 && tuple) {
              var value = String(tuple.values[j]);
              labelText = String(value);
            }
            else {
              labelText = String.fromCharCode(160);
            }
          }
          else {
            cell.className += ' pivotTableUiCellAxisHeaderCell';
            if (k < cellAxisItems.length && renderCellHeaders) {
              labelText = QueryAxisItem.getCaptionForQueryAxisItem(cellAxisItems[k]);
            }
            else {
              labelText = String.fromCharCode(160);
            }
          }

          var label = createEl('span', {
            "class": "pivotTableUiCellLabel"
          }, labelText);
          cell.appendChild(label);
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
    var tableHeaderRows = tableHeaderDom.childNodes;
    var firstTableHeaderRow = tableHeaderRows.item(0);
    var firstTableHeaderRowCells = firstTableHeaderRow.cells;
    
    var columnAxisSizeInfo = this.#getColumnsAxisSizeInfo();
    var columnOffset = columnAxisSizeInfo.headers.columnCount;
    var columnCount = columnAxisSizeInfo.headers.columnCount + columnAxisSizeInfo.columns.columnCount;

    var tableBodyDom = this.#getTableBodyDom();
    var tableBodyDomRows = tableBodyDom.childNodes;
    
    for (var i = 0; i < tableBodyDomRows.length - 1; i++){
      var bodyRow = tableBodyDomRows.item(i);
      for (var j = columnOffset; j < columnCount; j++){
        
        var cell = createEl('div', {
          "class": "pivotTableUiCell pivotTableUiValueCell"
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
  
  async #updatePivotTableUi(){
    this.#setBusy(true);
    this.clear();

    var columnsTupleSet = this.#columnsTupleSet;
    var rowsTupleSet = this.#rowsTupleSet;
    
    this.#renderHeader();

    var tableDom = this.#getTableDom();
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
        
    Promise.all(renderAxisPromises)
    .then(function(results){
      var columnTuples = results[0];
      
      this.#setHorizontalSize(0);
      this.#renderColumns(columnTuples);
      var rowTuples = results[1];
      
      this.#setVerticalSize(0);
      this.#renderRows(rowTuples);

      this.#updateVerticalSizer();      
      this.#removeExcessColumns()
      this.#updateHorizontalSizer();

      this.#renderCells();
      this.#updateCellData(0, 0);
      
    }.bind(this))
    .finally(function(){
      tableDom.style.width = '99.99%';
      this.#setBusy(false);
    }.bind(this))
    ;
  }
  
  clear(){
    var tableHeaderDom = this.#getTableHeaderDom();
    tableHeaderDom.innerHTML = '';
    var tableBodyDom = this.#getTableBodyDom();
    tableBodyDom.innerHTML = '';
    this.#setHorizontalSize(0);
    this.#setVerticalSize(0);
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
    var queryModel = this.#queryModel;
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
      return 0;
    }
    var numberOfPhysicalRows = tupleCount * factor;
    return numberOfPhysicalRows;
  }

  #getColumnsAxisSizeInfo(){
    var tableHeaderDom = this.#getTableHeaderDom();
    var firstHeaderRow = tableHeaderDom.childNodes.item(0);
    var cells = firstHeaderRow.childNodes;

    var queryModel = this.#queryModel;
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
    if (numHeaderItems === 0 && columnsAxisItems.length) {
      numHeaderItems += 1;
    }
    
     var sizeInfo = {
      headers: {
        width: 0,
        columnCount: numHeaderItems
      },
      columns: {
        width: 0,
        columnCount: 0
      }
    };
    
    for (var i = 0; i < cells.length - 1; i++){
      var cell = cells.item(i);
      if (i < numHeaderItems) {
        sizeInfo.headers.width += cell.clientWidth;
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
    var physicalColumnWidth = sizeInfo.columns.width / sizeInfo.columns.columnCount;
    var requiredWidth = physicalColumnWidth * numberOfPhysicalTuples;
    var totalWidth = sizeInfo.headers.width + requiredWidth;
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
        rowCount: tableBodyDom.childNodes.length
      }
    };
  }

  #updateVerticalSizer(){
    var numberOfPhysicalTuples = this.#getNumberOfPhysicalTuplesForAxis(QueryModel.AXIS_ROWS);
    var sizeInfo = this.#getRowsAxisSizeInfo();
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
}

var pivotTableUi;
function initPivotTableUi(){
  pivotTableUi = new PivotTableUi({
    id: 'pivotTableUi',
    queryModel: queryModel
  });  
}