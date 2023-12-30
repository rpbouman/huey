class PivotTableUi {
  
  static #getCaptionForAxisItem(axisItem){
    return axisItem.columnName;
  }
  
  #id = undefined;
  #queryModel = undefined;
  
  #tuples = {
    columns: {
      pageSize: 50,
      count: 0,
      data: []
    },
    rows: {
      pageSize: 50,
      count: 0,
      data: []
    }
  };
  
  #rowIndex = 0;
  #columnIndex = 0;
    
  constructor(config){
    this.#id = config.id;
    
    var queryModel = config.queryModel;
    this.#queryModel = queryModel;
   
    queryModel.addEventListener('change', function(event){
      this.updatePivotTableUi();
    }.bind(this));
    
    var container = this.#getInnerContainerDom();
    bufferEvents(
      container,
      'scroll',
      this.#handleInnerContainerScrolled,
      this,
      100
    );
  }

  #handleInnerContainerScrolled(event, count){
    if (count === undefined){
      // this is the last scroll event, update the table contents.
      this.#updateDataToScrollPosition()
      .then(function(){
      }.bind(this))
      .catch(function(error){
        debugger;
      }.bind(this))
      .finally(function(){
        var dom = this.getDom();
        // for some reason, the attribute doesn't get updated unless we apply timeout.
        setTimeout(function(){
          dom.setAttribute('data-updating', String(false));
        }, 1);
      }.bind(this));
    }
    else 
    if (count !== 0) {
      return;
    }
    // this is the first scroll event, set the busy indicator
    var dom = this.getDom();
    dom.setAttribute('data-updating', String(true));
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
    
    return Promise.all([columnAxisPromise, rowAxisPromise]);
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
    var cellAxisItemIndex = Math.round(fraction * factor);
    
    return {
      physicalIndex: physicalIndex,
      axisId: axisId,
      factor: factor,
      tupleIndex: tupleIndex,
      cellAxisItemIndex: cellAxisItemIndex
    };
  }
  
  async #updateColumnsAxisTupleData(physicalColumnsAxisTupleIndex){
    var axisId = QueryModel.AXIS_COLUMNS;
    var tupleIndexInfo = this.#getTupleIndexForPhysicalIndex(axisId, physicalColumnsAxisTupleIndex);
    var columnsAxisSizeInfo = this.#getColumnsAxisSizeInfo();
    var count = columnsAxisSizeInfo.columns.columnCount;
    var tupleCount = Math.ceil(count / tupleIndexInfo.factor);
    var tuples = await this.#getTuples(axisId, tupleCount, tupleIndexInfo.tupleIndex);
    
    //debugger;
  }
  
  async #updateRowsAxisTupleData(physicalRowsAxisTupleIndex){
    var axisId = QueryModel.AXIS_ROWS;
    var tupleIndexInfo = this.#getTupleIndexForPhysicalIndex(axisId, physicalRowsAxisTupleIndex);
    var rowsAxisSizeInfo = this.#getRowsAxisSizeInfo();
    var count = rowsAxisSizeInfo.rows.rowCount;
    var tupleCount = Math.ceil(count / tupleIndexInfo.factor);
    
    var tuples = await this.#getTuples(axisId, tupleCount, tupleIndexInfo.tupleIndex);

    var cellHeadersAxis = queryModel.getCellHeadersAxis();
    var cellsAxisItems;
    var doCellHeaders = (cellHeadersAxis === axisId);
    if (doCellHeaders) {
      var cellsAxis = queryModel.getCellsAxis();
      cellsAxisItems = cellsAxis.getItems();
    }

    var tupleIndex = 0;
    var cellAxisItemIndex = tupleIndexInfo.cellAxisItemIndex;
    
    var tableBodyDom = this.#getTableBodyDom();
    var rows = tableBodyDom.childNodes;
    
    for (var i = 0; i < rows.length - 1; i++) {
      var row = rows.item(i);
      var cells = row.childNodes;
      
      var tuple = tuples[tupleIndex];
      var tupleValues = tuple.values;
      
      for (var j = 0; j < cells.length; j++){
        var cell = cells.item(j);        
        var label = this.#getChildWithClassName(cell, 'pivotTableUiCellLabel');
  
        var labelText;
        var tupleValue;
        if (j < tupleValues.length) {
          tupleValue = tupleValues[j];         

          if (cellAxisItemIndex === 0 || i === 0) {
            labelText = String(tupleValue);
          }
          else {
            labelText = '';
          }
        }
        else
        if (doCellHeaders) {
          var cellsAxisItem = cellsAxisItems[cellAxisItemIndex];
          labelText = PivotTableUi.#getCaptionForAxisItem(cellsAxisItem);
        }
        
        label.innerText = labelText;
      }
      
      if (doCellHeaders) {
        cellAxisItemIndex += 1;
        if (cellAxisItemIndex === cellsAxisItems.length) {
          cellAxisItemIndex = 0;
          tupleIndex += 1;
        }
      }
      else {
        tupleIndex += 1;
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
      if (columnsAxisItems.length || cellsAxisItems.length) {
        numRowAxisColumns += 1;
      }
    }
    if (numRowAxisColumns === 0){
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
            labelText = PivotTableUi.#getCaptionForAxisItem(rowsAxisItem);
            columnWidth = (labelText.length + 1) + 'ch';
            label = createEl('span', {
              "class": 'pivotTableUiCellLabel pivotTableUiAxisHeaderLabel'
            }, labelText);
            tableCell.appendChild(label);
          }
          else 
          if (cellHeadersAxis === QueryModel.AXIS_ROWS) {
            columnWidth = rowsAxisItems.reduce(function(acc, curr){
              labelText = PivotTableUi.#getCaptionForAxisItem(curr);
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
        labelText = PivotTableUi.#getCaptionForAxisItem(columnsAxisItem);
        label = createEl('span', {
          "class": 'pivotTableUiCellLabel pivotTableUiAxisHeaderLabel'
        }, labelText);
        tableCell.style.width = (labelText.length + 2) + 'ch';
        tableCell.appendChild(label);
      }
    }
    
    var stufferCell, stufferRow;
    firstTableHeaderRow = tableHeaderDom.childNodes.item(0);
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

  #loadTuples(axisId, resultSet, offset) {
    var queryModel = this.#queryModel;
    var queryAxis = queryModel.getQueryAxis(axisId);
    var items = queryAxis.getItems();
    var numRows = resultSet.numRows;
    var fields = resultSet.schema.fields;
    
    var tuples = this.#tuples[axisId];
    // if the offset is 0 we should have included an expression that computes the total count as last
    if (offset === 0) {
      if (numRows === 0){
        tuples.count = 0;
      }
      else {
        var firstRow = resultSet.get(0);
        var lastField = fields[fields.length - 1];
        var totalCount = firstRow[lastField.name];
        tuples.count = parseInt(String(totalCount), 10);
      }
    }
    tuples = tuples.data;
    
    for (var i = 0; i < numRows; i++){
      var row = resultSet.get(i);
      var values = [];
      for (var j = 0; j < items.length; j++){
        var field = fields[j];
        values[j] = row[field.name];
      }
      var tuple = {values: values};
      tuples[offset + i] = tuple;
    }
  }
    
  async #executeAxisQuery(axisId, limit, offset){
    var queryModel = this.#queryModel;
    var includeCountExpression = offset === 0;
    var axisSql = getSQLForQueryModelAxis(queryModel, axisId, includeCountExpression);
    if (axisSql) {
      axisSql = `${axisSql}\nLIMIT ${limit} OFFSET ${offset}`;
    }
    return new Promise(function(resolve, reject){
      if (!axisSql){
        resolve(0);
        return;
      }
      kwikDb.connection.query(axisSql)
      .then(function(resultset){
        this.#loadTuples(axisId, resultset, offset);
        resolve(resultset.numRows);
      }.bind(this))
      .catch(function(error){
        reject(error);
      })
      ;
    }.bind(this));
  }
  
  async #getTuples(axisId, count, offset){
    return new Promise(function(resolve, reject){
      var tuplesInfo = this.#tuples[axisId];
      var data = tuplesInfo.data;
      var tuples = [];
      var i = 0;
      var firstIndexToFetch, lastIndexToFetch;
      while(i < count){
        var tupleIndex = offset + i;
        var tuple = data[tupleIndex];
        tuples[i] = tuple;
        if (tuple === undefined) {
          if (firstIndexToFetch === undefined) {
            firstIndexToFetch = tupleIndex;
            lastIndexToFetch = tupleIndex;
          }
          else 
          if (tupleIndex > lastIndexToFetch) {
            lastIndexToFetch = tupleIndex;
          }
        }
        i += 1;
      }
      if (firstIndexToFetch === undefined) {
        resolve(tuples);
        return;
      }
      lastIndexToFetch += 1;
      var newCount = (lastIndexToFetch - firstIndexToFetch);
      if (newCount < tuplesInfo.pageSize && (offset + count === lastIndexToFetch)) {
        newCount = tuplesInfo.pageSize;
      }        
      this.#executeAxisQuery(axisId, newCount, firstIndexToFetch)
      .then(function(numRows){
        tuples = data.slice(offset, offset + count);
        resolve(tuples);
      })
      .catch(reject)
      ;
    }.bind(this));
  }  
  
  #renderColumns(numTuples, limit){
    
    var containerDom = this.#getInnerContainerDom();
    var innerContainerWidth = containerDom.clientWidth;
    var tableDom = this.#getTableDom();
    tableDom.style.width = '';
    var initialTableDomWidth = tableDom.clientWidth;
    var physicalColumnsAdded = 0;
    
    var queryModel = this.#queryModel;
    
    var numCellHeaders = 0;
    var numColumns = numTuples;
    var cellHeadersPlacement = queryModel.getCellHeadersAxis();
    var renderCellHeaders = (cellHeadersPlacement === QueryModel.AXIS_COLUMNS);
    var cellItems;
    if (renderCellHeaders) {
      var cellsAxis = queryModel.getCellsAxis();
      cellItems = cellsAxis.getItems();
      numCellHeaders = cellItems.length;
      if (numCellHeaders === 0) {
        numCellHeaders = 1;
      }
      
      // if there are no tuples on the column axis, but there are items in the cells axis, 
      // then we still need 1 column
      if (numColumns === 0 && cellItems.length) {
        numColumns = 1;
      }
    }
    else {
      numCellHeaders = 1;
    }
    
    var tableHeaderDom = this.#getTableHeaderDom();
    var headerRows = tableHeaderDom.childNodes;
    var firstHeaderRow = headerRows.item(0);
    var firstHeaderRowCells = firstHeaderRow.childNodes;
    var stufferCell = firstHeaderRowCells.item(firstHeaderRowCells.length - 1);
    
    var tuples = this.#tuples[QueryModel.AXIS_COLUMNS];
    var data = tuples.data;
    
    // loop for each row from the column axis query result
    // if there aren't any, but the cells are on the column axis, and there is at least one item on the cell axis, this will still run once.
    for (var i = 0; i < numColumns; i++){
      var tuple;
      if (i < numTuples){
        tuple = data[i];
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
              labelText = '';
            }
          }
          else
          if (k < cellItems.length) {
            var cellItem = cellItems[k];
            labelText = PivotTableUi.#getCaptionForAxisItem(cellItem);
            columnWidth = labelText.length > valuesMaxWidth ? labelText.length : valuesMaxWidth;            
          }
          else {
            labelText = '';
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
        if (tableDom.clientWidth > innerContainerWidth) {
          // table exceeds allowed width remove the last column.
          for (var j = 0; j < headerRows.length; j++){
            var headerRow = headerRows.item(j);
            var cells = headerRow.childNodes;
            var lastCell = cells.item(physicalColumnsAdded - 1);
            //headerRow.removeChild(lastCell);
          }
          tableDom.style.width = '100%';
          return;
        }
      }        
    }
  }

  #renderRows(numTuples, limit){
    var containerDom = this.#getInnerContainerDom();
    var innerContainerHeight = containerDom.clientHeight;
    var tableDom = this.#getTableDom();
    var initialTableDomHeight = tableDom.clientHeight;
    var physicalRowsAdded = 0;
    
    var queryModel = this.#queryModel;
    
    var rowsAxis = queryModel.getRowsAxis();
    var rowAxisItems = rowsAxis.getItems();
    var numColumns = rowAxisItems.length;
    
    var numCellHeaders = 1;
    var numRows = numTuples;
    var cellHeadersPlacement = queryModel.getCellHeadersAxis();
    var renderCellHeaders = (cellHeadersPlacement === QueryModel.AXIS_ROWS);
    var cellAxisItems;
    if (renderCellHeaders) {
      var cellsAxis = queryModel.getCellsAxis();
      cellAxisItems = cellsAxis.getItems();
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
      
      // if there are no tuples on the rows axis, but there are items in the cells axis, 
      // then we still need 1 row
      if (numRows === 0 && cellAxisItems.length) {
        numRows = 1;
      }
    }
    
    var tableHeaderDom = this.#getTableHeaderDom();
    var tableHeaderRows = tableHeaderDom.childNodes;
    var firstTableHeaderRow = tableHeaderRows.item(0);
    
    var tableBodyDom = this.#getTableBodyDom();
    var tableBodyDomRows = tableBodyDom.childNodes;
    var stufferRow = tableBodyDomRows.item(0);
    
    var tuples = this.#tuples[QueryModel.AXIS_ROWS];
    var data = tuples.data;
    for (var i = 0; i < numRows; i++){
      var tuple = data[i];
      var values = tuple.values;
      
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
            if (k === 0) {
              var value = String(values[j]);
              labelText = String(value);
            }
            else {
              labelText = '';
            }
          }
          else
          if (k < cellAxisItems.length) {
            labelText = PivotTableUi.#getCaptionForAxisItem(cellAxisItems[k]);
          }
          else {
            labelText = '';
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
    
  updatePivotTableUi(){
    this.clear();
    this.#tuples = {
      columns: {
        pageSize: 50,
        count: 0,
        data: []
      },
      rows: {
        pageSize: 50,
        count: 0,
        data: []
      }
    };
    
    this.#renderHeader();
    
    this.#executeAxisQuery(QueryModel.AXIS_COLUMNS, this.#tuples.columns.pageSize, 0)
    .then(function(numRows, totalNumerOfRows){
      this.#renderColumns(Math.min(numRows, this.#tuples.columns.pageSize));
      this.#updateHorizontalSizer(numRows, this.#tuples.columns.pageSize);
    }.bind(this));

    this.#executeAxisQuery(QueryModel.AXIS_ROWS, this.#tuples.rows.pageSize, 0)
    .then(function(numRows, totalNumerOfRows){
      this.#renderRows(Math.min(numRows, this.#tuples.rows.pageSize));
      this.#updateVerticalSizer(numRows, this.#tuples.rows.pageSize);
    }.bind(this));
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
  
  #getChildWithClassName(dom, className){
    var childNodes = dom.childNodes;
    for (var i = 0; i < childNodes.length; i++){
      var childNode = childNodes.item(i);
      if (childNode.nodeType !== 1) {
        continue;
      }
      if (hasClass(childNode,className)){
        return childNode;
      }
    }
    throw new Error(`Couldn't find element with classname ${className}`);
  }

  #getInnerContainerDom(){
    return this.#getChildWithClassName(this.getDom(), 'pivotTableUiInnerContainer');
  }
      
  #getHorizontalSizer() {
    return this.#getChildWithClassName(this.#getInnerContainerDom(), 'pivotTableUiHorizontalSizer');
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
    var columnsAxis = queryModel.getQueryAxis(axisId);
    var tuples = this.#tuples[axisId];
    var tupleCount = tuples.count;
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
    return this.#getChildWithClassName(this.#getInnerContainerDom(), 'pivotTableUiVerticalSizer');
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
    return this.#getChildWithClassName(this.#getInnerContainerDom(), 'pivotTableUiTable');
  }
  
  #getTableHeaderDom(){
    return this.#getChildWithClassName(this.#getTableDom(), 'pivotTableUiTableHeader');
  }
  
  #getTableBodyDom(){
    return this.#getChildWithClassName(this.#getTableDom(), 'pivotTableUiTableBody');
  }
}

var pivotTableUi;
function initPivotTableUi(){
  pivotTableUi = new PivotTableUi({
    id: 'pivotTableUi',
    queryModel: queryModel
  });  
}