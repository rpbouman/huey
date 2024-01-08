
function renderAttributeUiNodeAxisButton(config, head, axis){
  var name = `${config.type}_${config.profile.column_name}`;
  var id = `${name}`;
  
  var axisButton = createEl('label', {
    'data-axis': axis,
    "class": ['attributeUiAxisButton']
  });

  var createInput;
  switch (config.type) {
    case 'column':
    case 'derived':
      switch (axis){
        case 'columns':
        case 'rows':
          if (config.type === 'derived') {
            var derivation = config.derivation;
            id += `_${derivation}`;
          }
          id += `_${axis}`;
          createInput = true;
          break;
        default:
          createInput = false;
      }
      break;
    case 'aggregate':
      switch (axis){
        case 'cells':
          id += `_${config.aggregator}`;
          createInput = true;
          break;
        default:
          createInput = false;
      }
      break;
    default:
      createInput = false;
  }
  
  if (createInput){
    axisButton.setAttribute('title', `Toggle place this item on the ${axis} axis .`);
    
    axisButton.setAttribute('for', id);
    var axisButtonInput = createEl('input', {
      type: 'checkbox',
      id: id,
      'data-nodetype': config.type,
      'data-column_name': config.profile.column_name,
      'data-axis': axis
    });
    if (config.aggregator) {
      axisButtonInput.setAttribute('data-aggregator', config.aggregator);
    }
    if (config.derivation){      
      axisButtonInput.setAttribute('data-derivation', config.derivation);
    }
    
    axisButton.appendChild(axisButtonInput);
  }
  
  return axisButton;
}

function renderAttributeUiNodeAxisButtons(config, head){
  var cellsButton = renderAttributeUiNodeAxisButton(config, head, 'cells');
  head.appendChild(cellsButton);

  var columnButton = renderAttributeUiNodeAxisButton(config, head, 'columns');
  head.appendChild(columnButton);

  var rowButton = renderAttributeUiNodeAxisButton(config, head, 'rows');
  head.appendChild(rowButton);
}

function getUiNodeCaption(config){
  switch (config.type){
    case 'column':
      return config.profile.column_name;
    case 'derived':
      return config.derivation;
    case 'aggregate':
      return config.aggregator;
  }
}

function renderAttributeUiNodeHead(config) {
  var head = createEl('div', {
    "class": 'attributeUiNodeHead'
  });
  var expander = createEl('span', {
    'class': 'expander'
  });
  head.appendChild(expander);

  var icon = createEl('span', {
    "class": 'icon'
  });
  switch (config.type) {
    case 'column':
      icon.setAttribute('title', config.profile.column_type);
      break;
  }
  head.appendChild(icon);
  
  var caption = getUiNodeCaption(config);
  var label = createEl('span', {
    "class": 'label'
  }, caption);
  head.appendChild(label);
  
  renderAttributeUiNodeAxisButtons(config, head);
  return head;
}

function renderAttributeUiNode(config){
  var node = createEl('div', {
    "class": ['attributeUiNode', config.type],
    'data-nodetype': config.type
  });
  node.setAttribute('data-column_name', config.profile.column_name);
  
  switch (config.type){
    case 'column':
      var profile = config.profile;
      for (var property in profile){
        node.setAttribute(`data-${property}`, String(profile[property]));
      }
      node.setAttribute('data-state', 'collapsed');
      break;
    case 'aggregate':
      node.setAttribute('data-aggregator', config.aggregator);
      break;
    case 'derived':
      node.setAttribute('data-derivation', config.derivation);
      break;
  }
  
  var head = renderAttributeUiNodeHead(config);
  node.appendChild(head);

  if (config.type !== 'aggregate') {
    var body = createEl('div', {
      "class": 'attributeUiNodeBody'
    });
    node.appendChild(body);
  }
  return node;
}

function clearAttributeUi(showBusy){
  var attributesUi = byId('attributeUi');
  var content;
  if (showBusy) {
    content = '<div class="loader loader-medium"></div>';
  }
  else {
    content = '';
  }
  attributesUi.innerHTML = content;
}

function renderAttributeUi(columnSummary){
  clearAttributeUi();
  var attributesUi = byId('attributeUi');
  
  var node = renderAttributeUiNode({
    type: 'aggregate',
    aggregator: 'count',
    profile: {
      column_name: '*',
      column_type: 'INTEGER'
    }
  });
  attributesUi.appendChild(node);
  
  
  for (var i = 0; i < columnSummary.numRows; i++){
    var row = columnSummary.get(i);
    node = renderAttributeUiNode({
      type: 'column',
      profile: row.toJSON()
    });
    attributesUi.appendChild(node);
  }
}

var aggregators = {
  'count': {
    isNumeric: true,
    isInteger: true,
    expressionTemplate: 'COUNT( ${columnName} )'
  },
  'distinct count': {
    isNumeric: true,
    isInteger: true,
    expressionTemplate: 'COUNT( DISTINCT ${columnName} )'
  },
  'min': {
    preservesColumnType: true,
    expressionTemplate: 'MIN( ${columnName} )'
  },
  'max': {
    preservesColumnType: true,
    expressionTemplate: 'MAX( ${columnName} )'
  },
  'list': {
    expressionTemplate: 'LIST( ${columnName} )'
  },
  'distinct list': {
    expressionTemplate: 'LIST( DISTINCT ${columnName} )'
  },
  'sum': {
    isNumeric: true,
    expressionTemplate: 'SUM( ${columnName} )'
  },
  'avg': {
    isNumeric: true,
    isInteger: false,
    expressionTemplate: 'AVG( ${columnName} )'
  },
  'median': {
    isNumeric: true,
    isInteger: false,
    expressionTemplate: 'MEDIAN( ${columnName} )'
  },
  'mode': {
    isNumeric: true,
    preservesColumnType: true,
    expressionTemplate: 'MODE( ${columnName} )'
  },
  'stdev': {
    isNumeric: true,
    isInteger: false,
    expressionTemplate: 'STDDEV_SAMP( ${columnName} )'
  }
}

var dateFields = {
  'year': {
    expressionTemplate: "CAST( YEAR( ${columnName} ) AS INT)",
    columnType: 'INT'
  },
  'quarter': {
    expressionTemplate: "'Q' || QUARTER( ${columnName} )",
    columnType: 'VARCHAR'
  },
  'month': {
    expressionTemplate: "CAST( MONTH( ${columnName} ) AS UTINYINT)",
    columnType: 'UTINYINT'
  },
  'week': {
    expressionTemplate: "CAST( WEEK( ${columnName} ) AS UTINYINT)",
    columnType: 'UTINYINT'
  },
  'day of year': {
    expressionTemplate: "CAST( DAYOFYEAR( ${columnName} ) as USMALLINT)",
    columnType: 'USMALLINT'
  },
  'day of month': {
    expressionTemplate: "CAST( DAYOFMONTH( ${columnName} ) AS UTINYINT)",
    columnType: 'UTINYINT'
  },
  'day of week': {
    expressionTemplate: "CAST( DAYOFWEEK( ${columnName} ) as UTINYINT)",
    columnType: 'UTINYINT'
  }
};

var timeFields = {
  'hour': {
    expressionTemplate: "CAST( HOUR( ${columnName} ) as UTINYINT)",
    columnType: 'UTINYINT'
  },
  'minute': {
    expressionTemplate: "CAST( MINUTE( ${columnName} ) as UTINYINT)",
    columnType: 'UTINYINT'
  },
  'second': {
    expressionTemplate: "CAST( SECOND( ${columnName} ) as UTINYINT)",
    columnType: 'UTINYINT'
  }
};

function loadChildNodesForColumnNode(node){
  
  var nodeBody = node.childNodes.item(1);
  
  var columnName = node.getAttribute('data-column_name');
  var columnType = node.getAttribute('data-column_type');
  var profile = {
    column_name: columnName,
    column_type: columnType 
  };
  var typeName = /^[^\(]+/.exec(columnType)[0];
  
  var derived = [];
  var aggregates = [];

  var typeInfo = dataTypes[columnType];
  
  var isisNumeric = Boolean(typeInfo.isisNumeric);
  var isInteger = Boolean(typeInfo.isInteger);
  var hasTimeFields = Boolean(typeInfo.hasTimeFields);
  var hasDateFields = Boolean(typeInfo.hasDateFields);
  
  var applicableDerivations = Object.assign({}, 
    hasDateFields ? dateFields : undefined, 
    hasTimeFields ? timeFields : undefined
  );
  
  var childNode, config;
  
  for (var derivationName in applicableDerivations) {
    var derivation = applicableDerivations[derivationName];
    config = {
      type: 'derived',
      derivation: derivationName,
      profile: profile
    };
    childNode = renderAttributeUiNode(config);
    nodeBody.appendChild(childNode);
  }
  
  for (var aggregationName in aggregators) {
    var aggregator = aggregators[aggregationName];
    if (aggregator.isisNumeric && !isisNumeric) {
      continue;
    }
    config = {
      type: 'aggregate',
      aggregator: aggregationName,
      profile: profile
    };
    childNode = renderAttributeUiNode(config);
    nodeBody.appendChild(childNode);    
  }
  
}

function loadChildNodesForDerivedNode(node){
}

function loadChildNodes(node){
  var nodeType = node.getAttribute('data-nodetype');
  switch (nodeType){
    case 'column':
      loadChildNodesForColumnNode(node);
      break;
    case 'derived':
      loadChildNodesForDerivedNode(node);
      break;
    default:
      throw new Error(`Unrecognized nodetype ${nodeType}`);
  }
}

function toggleNodeState(node){
  var stateAttributeName = 'data-state';
  var state = node.getAttribute(stateAttributeName);
  var newState;
  switch (state) {
    case 'expanded':
      newState = 'collapsed';
      break;
    case 'collapsed':
      var loaded = node.getAttribute('data-loaded');
      if (!loaded){
        loadChildNodes(node);
        node.setAttribute('data-loaded', String(true));
      }
      newState = 'expanded';
      break;
    default:
  }
  if (!newState) {
    return;
  }
  node.setAttribute(stateAttributeName, newState);
}

function axisButtonClicked(node, axis, checked){
  var head = node.childNodes.item(0);
  var inputs = head.getElementsByTagName('input');
  switch (axis){
    case 'columns':
    case 'rows':
      // implement mutual exclusive axes (either rows or columns, not both)
      for (var i = 0; i < inputs.length; i++){
        var input = inputs.item(i);
        if (input.checked && input.parentNode.getAttribute('data-axis') !== axis) {
          input.checked = false;
        }
      }
      break;
  }
  var columnName = node.getAttribute('data-column_name');
  var columnType = node.getAttribute('data-column_type');
  var derivation = node.getAttribute('data-derivation');
  var aggregator = node.getAttribute('data-aggregator');

  
  var itemConfig = {
    axis: axis,
    columnName: columnName,
    columnType: columnType,
    derivation: derivation,
    aggregator: aggregator,
  };
  
  var formatter = QueryAxisItem.createFormatter(itemConfig);
  if (formatter){
    itemConfig.formatter = formatter;
  }
  
  if (checked) {
    queryModel.addItem(itemConfig);
  }
  else {
    queryModel.removeItem(itemConfig);
  }
}

function attributeUiClickHandler(event){
  var target = event.target;
  var classNames = getClassNames(target);
  
  var node = getAncestorWithClassName(target, 'attributeUiNode');
  if (!node) {
    return;
  }
  
  if (classNames.indexOf('expander') !== -1) {
    toggleNodeState(node);
  }
  else 
  if (classNames.indexOf('attributeUiAxisButton') !== -1){
    var input = target.getElementsByTagName('input').item(0);
    setTimeout(function(){
      axisButtonClicked(node, target.getAttribute('data-axis'), input.checked);
    }, 0);
  }
  // todo: specific handlers
}

function updateAttributeUi(queryModel){
  var attributeUi = byId('attributeUi');
  var inputs = attributeUi.getElementsByTagName('input');
  for (var i = 0; i < inputs.length; i++){
    var input = inputs.item(i);
    var columnName = input.getAttribute('data-column_name');
    var axis = input.getAttribute('data-axis');
    var aggregator = input.getAttribute('data-aggregator');
    var derivation = input.getAttribute('data-derivation');
    
    var item = queryModel.findItem({
      columnName: columnName,
      axis: axis,
      aggregator: aggregator,
      derivation: derivation
    });
    
    input.checked = Boolean(item);
  }
}

function initAttributeUi(){
  var attributeUi = byId('attributeUi');
  attributeUi.addEventListener('click', attributeUiClickHandler);
  
  queryModel.addEventListener('change', function(event){
    updateAttributeUi(queryModel);
  });

}