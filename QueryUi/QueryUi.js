
function flipQueryUiAxisButtonClicked(queryAxisUi){
  var axisId = queryAxisUi.getAttribute('data-axis');
  var withAxisId;
  switch(axisId) {
    case QueryModel.AXIS_COLUMNS:
      queryModel.flipAxes(QueryModel.AXIS_COLUMNS, QueryModel.AXIS_ROWS);
      break;
    case QueryModel.AXIS_ROWS:
      queryModel.flipAxes(QueryModel.AXIS_ROWS, QueryModel.AXIS_COLUMNS);
      break;
    case QueryModel.AXIS_CELLS:
      var queryUi = queryAxisUi.parentNode.parentNode;
      var cellheadersaxis = queryUi.getAttribute('data-cellheadersaxis');
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
      queryUi.setAttribute('data-cellheadersaxis', cellheadersaxis);
      queryMode.setCellHeadersAxis(cellheadersaxis);
      break;
  }
}

function clearQueryUiAxisButtonClicked(queryAxisUi){
  var axisId = queryAxisUi.getAttribute('data-axis');
  queryModel.clear(axisId);
}

function getQueryModelItem(queryAxisItemUi){
  var searchItem = {
    columnName: queryAxisItemUi.getAttribute('data-column_name'),
    derivation: queryAxisItemUi.getAttribute('data-derivation'),
    aggregator: queryAxisItemUi.getAttribute('data-aggregator')
  };
  var item = queryModel.findItem(searchItem);
  if (!item) {
    throw new Error(`Unexpected error: could not find item ${JSON.stringify(searchItem)} in query model`);
  }
  return item;
}

function moveQueryAxisItemUi(queryAxisItemUi, direction) {
  var item = getQueryModelItem(queryAxisItemUi);
  var itemIndex = item.index;
  var removedItem = queryModel.removeItem(item);
  itemIndex += direction;
  removedItem.index = itemIndex;
  queryModel.addItem(removedItem);
}

function queryAxisUiItemMoveLeftClicked(queryAxisItemUi){
  moveQueryAxisItemUi(queryAxisItemUi, -1);
}

function queryAxisUiItemMoveRightClicked(queryAxisItemUi){
  moveQueryAxisItemUi(queryAxisItemUi, 1);
}

function queryAxisUiItemRemoveClicked(queryAxisItemUi){
  var item = getQueryModelItem(queryAxisItemUi);
  queryModel.removeItem(item);
}

function queryAxisUiItemMoveToAxisClicked(queryAxisItemUi){
  var item = getQueryModelItem(queryAxisItemUi);
  delete item.index;
  switch (item.axis) {
    case QueryModel.AXIS_COLUMNS:
      item.axis = QueryModel.AXIS_ROWS;
      break;
    case QueryModel.AXIS_ROWS:
      item.axis = QueryModel.AXIS_COLUMNS;
      break;
  }
  queryModel.addItem(item);
}

function queryUiClickHandler(event){
  // setup the event context (element that was clicked and top element of this component)
  var queryUi = event.currentTarget;
  var target = event.target;
  
  // establish the element hierarchy
  var queryAxisItemUi, queryAxisUi;
  var classNames, node = target;
  while (node && node !== queryUi){
    
    classNames = getClassNames(node);
    if (!queryAxisItemUi && classNames.indexOf('queryUiAxisItem') !== -1) {
      queryAxisItemUi = node;
    }
    else
    if (!queryAxisUi && classNames.indexOf('queryUiAxis') !== -1) {
      queryAxisUi = node;
    }
    node = node.parentNode;
  }
  
  // determine the appropriate action and call the corresponding handler.
  classNames = getClassNames(target);
  if (classNames.indexOf('axisIcon') !== -1){
    flipQueryUiAxisButtonClicked(queryAxisUi);
  }
  else
  if (classNames.indexOf('clearAxisButton') !== -1) {
    clearQueryUiAxisButtonClicked(queryAxisUi);
  }
  else
  if (classNames.indexOf('queryAxisItemUiMoveLeftButton') !== -1){
    queryAxisUiItemMoveLeftClicked(queryAxisItemUi);
  }
  else
  if (classNames.indexOf('queryAxisItemUiMoveRightButton') !== -1){
    queryAxisUiItemMoveRightClicked(queryAxisItemUi);
  }
  else
  if (classNames.indexOf('queryAxisItemUiRemoveButton') !== -1){
    queryAxisUiItemRemoveClicked(queryAxisItemUi);
  }
  else 
  if (classNames.indexOf('queryAxisItemUiMoveToAxisButton') !== -1) {
    queryAxisUiItemMoveToAxisClicked(queryAxisItemUi);
  }
}

function getQueryAxisItemUiCaption(item){
  return item.columnName;
}

function createQueryAxisItemUi(item){
  var queryAxisItemUi = createEl('div', {
    'class': 'queryUiAxisItem',
    'data-column_name': item.columnName
  });
  
  var derivation = item.derivation;
  if (derivation) {
    queryAxisItemUi.setAttribute('data-derivation', derivation);
  }
  
  var aggregator = item.aggregator;
  if (aggregator) {
    queryAxisItemUi.setAttribute('data-aggregator', aggregator);
  }

  var moveLeftButton = createEl('span', {
    "class": ['button', 'queryAxisItemUiMoveLeftButton'] 
  });
  queryAxisItemUi.appendChild(moveLeftButton);
  
  if (aggregator || derivation) {
    var icon = createEl('span', {
      "class": ['icon', 'queryAxisItemUiIcon'],
      "title": aggregator || derivation
    });
    queryAxisItemUi.appendChild(icon);
  }
  
  var caption = getQueryAxisItemUiCaption(item);
  var label = createEl('span', {
    "class": 'queryAxisItemUiLabel' 
  }, caption);
  queryAxisItemUi.appendChild(label);

  if (!aggregator){
    var moveToAxisButton = createEl('span', {
      "class": ['button', 'queryAxisItemUiMoveToAxisButton'],
      title: "Move this item to the other axis"
    });
    queryAxisItemUi.appendChild(moveToAxisButton);
  }

  var removeButton = createEl('span', {
    "class": ['button', 'queryAxisItemUiRemoveButton'] 
  });
  queryAxisItemUi.appendChild(removeButton);

  var moveRightButton = createEl('span', {
    "class": ['button', 'queryAxisItemUiMoveRightButton'] 
  });
  queryAxisItemUi.appendChild(moveRightButton);
  
  return queryAxisItemUi;
}

function updateQueryAxisUi(queryUiAxis, queryModelAxis){
  var itemsCell = queryUiAxis.cells.item(2);
  itemsCell.innerHTML = '';
  var items = queryModelAxis.getItems();
  for (var i = 0; i < items.length; i++){
    var item = items[i];
    var queryAxisItemUi = createQueryAxisItemUi(item);
    itemsCell.appendChild(queryAxisItemUi);
  }
}

function updateQueryUi(queryModel){
  var queryUi = byId('queryUi');
  var queryUiAxes = queryUi.rows;
  for (var i = 0; i < queryUiAxes.length; i++){
    var queryUiAxis = queryUiAxes.item(i);
    var axisId = queryUiAxis.getAttribute('data-axis');
    var queryModelAxis = queryModel.getQueryAxis(axisId);
    updateQueryAxisUi(queryUiAxis, queryModelAxis);
  }
}

function initQueryUi(){
  var queryUi = byId('queryUi');
  queryUi.addEventListener('click', queryUiClickHandler);
  
  queryModel.addEventListener('change', function(event){
    updateQueryUi(queryModel);
  });
}