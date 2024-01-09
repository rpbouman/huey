class AttributeUi {
  
  #id = undefined;
  #queryModel = undefined;
  
  static aggregators = {
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
  };

  static dateFields = {
    'year': {
      expressionTemplate: "CAST( YEAR( ${columnName} ) AS INT)",
      columnType: 'INT', 
      formats: {
        'yyyy': {
        },
        'yy': {
        }
      }
    },
    'quarter': {
      expressionTemplate: "'Q' || QUARTER( ${columnName} )",
      columnType: 'VARCHAR'    
    },
    'month num': {
      expressionTemplate: "CAST( MONTH( ${columnName} ) AS UTINYINT)",
      columnType: 'UTINYINT',
      formats: {
        'long': {
        },
        'short': {
        },
        'narrow': {
        }
      }
    },
    'week num': {
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
      columnType: 'UTINYINT',
      formats: {
        'long': {
        },
        'short': {
        },
        'narrow': {
        }
      }
    }
  };

  static timeFields = {
    'hour': {
      expressionTemplate: "CAST( HOUR( ${columnName} ) as UTINYINT)",
      columnType: 'UTINYINT',
      formats: {
        'short': {
        },
        'long': {
        }
      }
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
  
  static #getUiNodeCaption(config){
    switch (config.type){
      case 'column':
        return config.profile.column_name;
      case 'derived':
        return config.derivation;
      case 'aggregate':
        return config.aggregator;
    }
  }
  
  constructor(id, queryModel){
    this.#id = id;
    this.#queryModel = queryModel;
    
    this.getDom().addEventListener('click', this.#clickHandler.bind(this));

    this.#queryModel.addEventListener('change', this.#queryModelChangeHandler.bind(this));
    
  }
  
  #renderAttributeUiNodeAxisButton(config, head, axis){
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

  #renderAttributeUiNodeAxisButtons(config, head){
    var cellsButton = this.#renderAttributeUiNodeAxisButton(config, head, 'cells');
    head.appendChild(cellsButton);

    var columnButton = this.#renderAttributeUiNodeAxisButton(config, head, 'columns');
    head.appendChild(columnButton);

    var rowButton = this.#renderAttributeUiNodeAxisButton(config, head, 'rows');
    head.appendChild(rowButton);
  }

  #renderAttributeUiNodeHead(config) {
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
    
    var caption = AttributeUi.#getUiNodeCaption(config);
    var label = createEl('span', {
      "class": 'label'
    }, caption);
    head.appendChild(label);
    
    this.#renderAttributeUiNodeAxisButtons(config, head);
    return head;
  }

  #renderAttributeUiNode(config){
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
    
    var head = this.#renderAttributeUiNodeHead(config);
    node.appendChild(head);

    if (config.type !== 'aggregate') {
      var body = createEl('div', {
        "class": 'attributeUiNodeBody'
      });
      node.appendChild(body);
    }
    return node;
  }
    
  clear(showBusy){
    var attributesUi = this.getDom();
    var content;
    if (showBusy) {
      content = '<div class="loader loader-medium"></div>';
    }
    else {
      content = '';
    }
    attributesUi.innerHTML = content;
  }
  
  render(columnSummary){
    this.clear();
    var attributesUi = this.getDom();
    
    var node = this.#renderAttributeUiNode({
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
      node = this.#renderAttributeUiNode({
        type: 'column',
        profile: row.toJSON()
      });
      attributesUi.appendChild(node);
    }
  }
  
  #loadChildNodesForColumnNode(node){
    
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
    
    var isNumeric = Boolean(typeInfo.isNumeric);
    var isInteger = Boolean(typeInfo.isInteger);
    var hasTimeFields = Boolean(typeInfo.hasTimeFields);
    var hasDateFields = Boolean(typeInfo.hasDateFields);
    
    var applicableDerivations = Object.assign({}, 
      hasDateFields ? AttributeUi.dateFields : undefined, 
      hasTimeFields ? AttributeUi.timeFields : undefined
    );
    
    var childNode, config;
    
    for (var derivationName in applicableDerivations) {
      var derivation = applicableDerivations[derivationName];
      config = {
        type: 'derived',
        derivation: derivationName,
        profile: profile
      };
      childNode = this.#renderAttributeUiNode(config);
      nodeBody.appendChild(childNode);
    }
    
    for (var aggregationName in AttributeUi.aggregators) {
      var aggregator = AttributeUi.aggregators[aggregationName];
      if (aggregator.isNumeric && !isNumeric) {
        continue;
      }
      config = {
        type: 'aggregate',
        aggregator: aggregationName,
        profile: profile
      };
      childNode = this.#renderAttributeUiNode(config);
      nodeBody.appendChild(childNode);    
    }    
  }
  
  #loadChildNodes(node){
    var nodeType = node.getAttribute('data-nodetype');
    switch (nodeType){
      case 'column':
        this.#loadChildNodesForColumnNode(node);
        break;
      case 'derived':
        // TODO
        break;
      default:
        throw new Error(`Unrecognized nodetype ${nodeType}`);
    }
  }  
  
  #toggleNodeState(node){
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
          this.#loadChildNodes(node);
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
  
  #axisButtonClicked(node, axis, checked){
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
      this.#queryModel.addItem(itemConfig);
    }
    else {
      this.#queryModel.removeItem(itemConfig);
    }
  }
  
  
  #clickHandler(event) {
    var target = event.target;
    var classNames = getClassNames(target);
    
    var node = getAncestorWithClassName(target, 'attributeUiNode');
    if (!node) {
      return;
    }
    
    if (classNames.indexOf('expander') !== -1) {
      this.#toggleNodeState(node);
    }
    else 
    if (classNames.indexOf('attributeUiAxisButton') !== -1){
      var input = target.getElementsByTagName('input').item(0);
      var axisId = target.getAttribute('data-axis');
      setTimeout(function(){
        this.#axisButtonClicked(node, axisId, input.checked);
      }.bind(this), 0);
    }    
  }
  
  #queryModelChangeHandler(event){
    var inputs = this.getDom().getElementsByTagName('input');
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
  
  getDom(){
    return byId(this.#id);
  }
  
}



var attributeUi;
function initAttributeUi(){
  attributeUi = new AttributeUi('attributeUi', queryModel); 
}