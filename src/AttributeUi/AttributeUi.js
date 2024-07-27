class AttributeUi {
  
  #id = undefined;
  #queryModel = undefined;
  
  static aggregators = {
    'count': {
      isNumeric: true,
      isInteger: true,
      expressionTemplate: 'COUNT( ${columnName} )',
      columnType: 'HUGEINT'
    },
    'distinct count': {
      isNumeric: true,
      isInteger: true,
      expressionTemplate: 'COUNT( DISTINCT ${columnName} )',
      columnType: 'HUGEINT'
    },
    'min': {
      folder: "statistics",
      preservesColumnType: true,
      expressionTemplate: 'MIN( ${columnName} )'
    },
    'max': {
      folder: "statistics",
      preservesColumnType: true,
      expressionTemplate: 'MAX( ${columnName} )'
    },
    'list': {
      folder: "list aggregators",
      expressionTemplate: 'LIST( ${columnName} )',
      isArray: true
    },
    'distinct list': {
      folder: "list aggregators",
      expressionTemplate: 'LIST( DISTINCT ${columnName} )',
      isArray: true      
    },
    'histogram': {
      folder: "list aggregators",
      expressionTemplate: 'HISTOGRAM( ${columnName} )',
      isStruct: true,
    },
    'sum': {
      isNumeric: true,
      forNumeric: true,
      expressionTemplate: 'SUM( ${columnName} )',
      createFormatter: function(axisItem){
        var columnType = axisItem.columnType;
        var dataTypeInfo = getDataTypeInfo(columnType);
        var isInteger = dataTypeInfo.isInteger;
        var formatter = createNumberFormatter(isInteger !== true);
        
        return function(value, field){
          return formatter.format(value, field);
        };
      }
    },
    'avg': {
      folder: "statistics",
      isNumeric: true,
      isInteger: false,
      forNumeric: true,
      expressionTemplate: 'AVG( ${columnName} )',
      createFormatter: function(axisItem){
        var formatter = createNumberFormatter(true);
        return function(value, field){
          return formatter.format(value, field);
        };
      }
    },
    'geomean': {
      folder: "statistics",
      isNumeric: true,
      isInteger: false,
      forNumeric: true,
      expressionTemplate: 'GEOMEAN( ${columnName} )',
      createFormatter: function(axisItem){
        var formatter = createNumberFormatter(true);
        return function(value, field){
          return formatter.format(value, field);
        };
      }
    },
    'mad': {
      folder: "statistics",
      columnType: 'INTERVAL',
      forNumeric: true,
      expressionTemplate: 'MAD( ${columnName} )'
    },
    'median': {
      folder: "statistics",
      expressionTemplate: 'MEDIAN( ${columnName} )',
      createFormatter: function(axisItem){
        var columnType = axisItem.columnType;
        var dataTypeInfo = getDataTypeInfo(columnType);
        var formatter;
        if (dataTypeInfo.isNumeric) {
          formatter = createNumberFormatter(dataTypeInfo.isInteger !== true);
          return function(value, field){
            return formatter.format(value, field);
          };
        }
        else {
          return function(value, field){
            return fallbackFormatter(value);
          };
        }
      }
    },
    'mode': {
      folder: "statistics",
      preservesColumnType: true,
      expressionTemplate: 'MODE( ${columnName} )'
    },
    'stdev': {
      folder: "statistics",
      isNumeric: true,
      isInteger: false,
      forNumeric: true,
      expressionTemplate: 'STDDEV_SAMP( ${columnName} )',
      columnType: 'DOUBLE'
    },
    'variance': {
      folder: "statistics",
      isNumeric: true,
      isInteger: false,
      forNumeric: true,
      expressionTemplate: 'VAR_SAMP( ${columnName} )',
      columnType: 'DOUBLE'
    },
    'entropy': {
      folder: "statistics",
      isNumeric: true,
      isInteger: false,
      expressionTemplate: 'ENTROPY( ${columnName} )',
      columnType: 'DOUBLE'
    },
    'kurtosis': {
      folder: "statistics",
      isNumeric: true,
      isInteger: false,
      forNumeric: true,
      expressionTemplate: 'KURTOSIS( ${columnName} )',
      columnType: 'DOUBLE'
    },
    'skewness': {
      folder: "statistics",
      isNumeric: true,
      isInteger: false,
      forNumeric: true,
      expressionTemplate: 'SKEWNESS( ${columnName} )',
      columnType: 'DOUBLE'
    },
    'and': {
      forBoolean: true,
      expressionTemplate: 'BOOL_AND( ${columnName} )',
      columnType: 'BOOLEAN'
    },
    'or': {
      forBoolean: true,
      expressionTemplate: 'BOOL_OR( ${columnName} )',
      columnType: 'BOOLEAN'
    },
    'count if true': {  
      forBoolean: true,
      expressionTemplate: 'COUNT( ${columnName} ) FILTER( ${columnName} )',
      columnType: 'HUGEINT'
    },
    'count if false': {  
      forBoolean: true,
      expressionTemplate: 'COUNT( ${columnName} ) FILTER( NOT( ${columnName} ) )',
      columnType: 'HUGEINT'
    }
  };

  static dateFields = {
    'iso-date': {
      folder: 'date fields',
      // %x is isodate,
      // see: https://duckdb.org/docs/sql/functions/dateformat.html
      expressionTemplate: "strftime( ${columnName}, '%x' )",
      columnType: 'VARCHAR'
    },
    'local-date': {
      folder: 'date fields',
      // %x is isodate,
      // see: https://duckdb.org/docs/sql/functions/dateformat.html
      expressionTemplate: "${columnName}::DATE",
      columnType: 'DATE',
      createFormatter: createLocalDateFormatter
    },
    'year': {
      folder: 'date fields',
      expressionTemplate: "CAST( YEAR( ${columnName} ) AS INT)",
      columnType: 'INTEGER',
      createFormatter: function(){
        return fallbackFormatter;
      }
    },
    'quarter': {
      folder: 'date fields',
      expressionTemplate: "'Q' || QUARTER( ${columnName} )",
      columnType: 'VARCHAR'
    },    
    'month num': {
      folder: 'date fields',
      expressionTemplate: "CAST( MONTH( ${columnName} ) AS UTINYINT)",
      columnType: 'UTINYINT',
      createFormatter: function(){
        return monthNumFormatter
      },
      formats: {
        'long': {
        },
        'short': {
        },
        'narrow': {
        }
      }
    },
    'month name': {
      folder: 'date fields',
      expressionTemplate: "CAST( MONTH( ${columnName} ) AS UTINYINT)",
      columnType: 'UTINYINT',
      createFormatter: createMonthNameFormatter
    },
    'week num': {
      folder: 'date fields',
      expressionTemplate: "CAST( WEEK( ${columnName} ) AS UTINYINT)",
      columnType: 'UTINYINT',
      createFormatter: function(){
        return weekNumFormatter
      },
    },
    'day of year': {
      folder: 'date fields',
      expressionTemplate: "CAST( DAYOFYEAR( ${columnName} ) as USMALLINT)",
      columnType: 'USMALLINT'
    },
    'day of month': {
      folder: 'date fields',
      expressionTemplate: "CAST( DAYOFMONTH( ${columnName} ) AS UTINYINT)",
      columnType: 'UTINYINT',
      createFormatter: function(){
        return dayNumFormatter
      },
    },
    'day of week': {
      folder: 'date fields',
      expressionTemplate: "CAST( DAYOFWEEK( ${columnName} ) as UTINYINT)",
      columnType: 'UTINYINT',
    },
    'day of week name': {
      folder: 'date fields',
      expressionTemplate: "CAST( DAYOFWEEK( ${columnName} ) as UTINYINT)",
      columnType: 'UTINYINT',
      createFormatter: createDayNameFormatter
    }
  };

  static timeFields = {
    'iso-time': {
      folder: 'time fields',
      expressionTemplate: "strftime( ${columnName}, '%H:%M:%S' )",
      columnType: 'VARCHAR'
    },
    'hour': {
      folder: 'time fields',
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
      folder: 'time fields',
      expressionTemplate: "CAST( MINUTE( ${columnName} ) as UTINYINT)",
      columnType: 'UTINYINT'
    },
    'second': {
      folder: 'time fields',
      expressionTemplate: "CAST( SECOND( ${columnName} ) as UTINYINT)",
      columnType: 'UTINYINT'
    }
  };

  static getApplicableDerivations(typeName){
    var typeInfo = getDataTypeInfo(typeName);
    
    var hasTimeFields = Boolean(typeInfo.hasTimeFields);
    var hasDateFields = Boolean(typeInfo.hasDateFields);
    
    var applicableDerivations = Object.assign({}, 
      hasDateFields ? AttributeUi.dateFields : undefined, 
      hasTimeFields ? AttributeUi.timeFields : undefined
    );
    return applicableDerivations;
  }

  static getDerivationInfo(derivationName){
    var derivations = Object.assign({}, 
      AttributeUi.dateFields, 
      AttributeUi.timeFields
    );
    var derivationInfo = derivations[derivationName];
    return derivationInfo;
  }

  static getAggregatorInfo(aggregatorName){
    var aggregatorInfo = AttributeUi.aggregators[aggregatorName];
    return aggregatorInfo;
  }
  
  static getApplicableAggregators(typeName) {
    var typeInfo = getDataTypeInfo(typeName);
    
    var isNumeric = Boolean(typeInfo.isNumeric);
    var isInteger = Boolean(typeInfo.isInteger);
            
    var applicableAggregators = {};
    for (var aggregationName in AttributeUi.aggregators) {
      var aggregator = AttributeUi.aggregators[aggregationName];
      if (aggregator.forNumeric && !isNumeric) {
        continue;
      }
      if (aggregator.forBoolean && typeName !== 'BOOLEAN' ){
        continue;
      }
      applicableAggregators[aggregationName] = aggregator;
    }
    return applicableAggregators;
  }
  
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

    var dom = this.getDom();
    dom.addEventListener('click', this.#clickHandler.bind(this));
    this.#queryModel.addEventListener('change', this.#queryModelChangeHandler.bind(this));
  }
    
  #renderAttributeUiNodeAxisButton(config, head, axisId){
    var name = `${config.type}_${config.profile.column_name}`;
    var id = `${name}`;

    var analyticalRole = 'attribute';
    var aggregator = config.aggregator;
        
    var createInput;
    switch (config.type) {
      case 'column':
        var profile = config.profile;
        var columnType = profile.column_type;
        var dataTypeInfo = getDataTypeInfo(columnType);
        analyticalRole = dataTypeInfo.defaultAnalyticalRole || analyticalRole;
      case 'derived':
        switch (axisId){
          case QueryModel.AXIS_FILTERS:
          case QueryModel.AXIS_COLUMNS:
          case QueryModel.AXIS_ROWS:
            if (config.type === 'derived') {
              var derivation = config.derivation;
              id += `_${derivation}`;
            }
            id += `_${axisId}`;
            createInput = 'radio';
            break;
          default:
        }
        if (analyticalRole === 'attribute'){
          break;
        }
        else
        if (analyticalRole === 'measure' && config.type === 'column'){
          aggregator = aggregator || 'sum';
        }
      case 'aggregate':
        switch (axisId){
          case QueryModel.AXIS_CELLS:
            id += `_${aggregator}`;
            createInput = 'checkbox';
            break;
          default:
        }
        break;
      default:
    }

    var axisButton = createEl(createInput ? 'label' : 'span', {
      'data-axis': axisId,
      "class": 'attributeUiAxisButton'
    });
    
    if (!createInput){
      return axisButton;
    }

    axisButton.setAttribute('title', `Toggle to add or remove this attribute on the ${axisId} axis.`);
    
    axisButton.setAttribute('for', id);
    var axisButtonInput = createEl('input', {
      type: 'checkbox',
      id: id,
      'data-nodetype': config.type,
      'data-column_name': config.profile.column_name,
      'data-axis': axisId
    });
    
    if (aggregator && axisId === QueryModel.AXIS_CELLS) {
      axisButtonInput.setAttribute('data-aggregator', aggregator);
    }
    
    if (config.derivation){      
      axisButtonInput.setAttribute('data-derivation', config.derivation);
    }
    
    axisButton.appendChild(axisButtonInput);
    
    return axisButton;
  }

  #renderAttributeUiNodeAxisButtons(config, head){
    var filterButton = this.#renderAttributeUiNodeAxisButton(config, head, 'filters');
    head.appendChild(filterButton);

    var cellsButton = this.#renderAttributeUiNodeAxisButton(config, head, 'cells');
    head.appendChild(cellsButton);

    var columnButton = this.#renderAttributeUiNodeAxisButton(config, head, 'columns');
    head.appendChild(columnButton);

    var rowButton = this.#renderAttributeUiNodeAxisButton(config, head, 'rows');
    head.appendChild(rowButton);
  }

  #renderAttributeUiNodeHead(config) {
    var head = createEl('summary', {
    });
    
    var icon = createEl('span', {
      'class': 'icon',
      'role': 'img'
    });
    switch (config.type) {
      case 'column':
        icon.setAttribute('title', config.title || config.profile.column_type);
        break;
      case 'aggregate':
      case 'derived':
        icon.setAttribute('title', config.title || config.expressionTemplate);
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
    var node = createEl('details', {
      role: 'treeitem',      
      'data-nodetype': config.type,
      'data-column_name': config.profile.column_name,
      'data-column_type': config.profile.column_type
    });
    switch (config.type){
      case 'column':
        node.addEventListener('toggle', this.#toggleNodeState.bind(this) );
        break;
      case 'aggregate':
        node.setAttribute('data-aggregator', config.aggregator);
        break;
      case 'derived':
        var derivation = config.derivation;
        node.setAttribute('data-derivation', config.derivation);
        if (derivation.formats) {
          node.addEventListener('toggle', this.#toggleNodeState.bind(this) );
        }
        break;
    }
    
    var head = this.#renderAttributeUiNodeHead(config);
    node.appendChild(head);

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
    
    // generic count(*) node
    var node = this.#renderAttributeUiNode({
      type: 'aggregate',
      aggregator: 'count',
      title: 'Generic rowcount',
      profile: {
        column_name: '*',
        column_type: 'INTEGER'
      }
    });
    attributesUi.appendChild(node);
    
    // nodes for each column
    for (var i = 0; i < columnSummary.numRows; i++){
      var row = columnSummary.get(i);
      node = this.#renderAttributeUiNode({
        type: 'column',
        profile: row.toJSON()
      });
      attributesUi.appendChild(node);
    }
  }

  #renderFolderNode(config){
    var node = createEl('details', {
      role: 'treeitem',      
      'data-nodetype': 'folder',
    });
    
    var head = createEl('summary', {
    });
    
    var icon = createEl('span', {
      'class': 'icon',
      'role': 'img'
    });
    head.appendChild(icon);
    
    var label = createEl('span', {
      "class": 'label'
    }, config.caption);
    head.appendChild(label);
    node.appendChild(head);
    return node;
  }

  #createFolders(itemsObject, node){
    var folders = Object.keys(itemsObject).reduce(function(acc, curr){
      var object = itemsObject[curr];
      var folder = object.folder;
      if (!folder) {
        return acc;
      }
      if (acc[folder]) {
        return acc;
      }
      var folderNode = this.#renderFolderNode({caption: folder});
      acc[folder] = folderNode;

      var childNodes = node.childNodes;
      if (childNodes.length) {
        // folders got before any other child, 
        for (var i = 0; i < childNodes.length ; i++){
          var childNode = childNodes.item(i);
          if (childNode.nodeType !== 1) {
            continue;
          }
          if (childNode.getAttribute('data-nodetype') === 'folder'){
            continue;
          }
          node.appendChild(folderNode);
          return acc;
        }
      }
      
      node.appendChild(folderNode);
      return acc;      
    }.bind(this), {});
    return folders;
  }

  #loadDerivationChildNodes(node, typeName, profile){
    var applicableDerivations = AttributeUi.getApplicableDerivations(typeName);
    var folders = this.#createFolders(applicableDerivations, node);
    for (var derivationName in applicableDerivations) {
      var derivation = applicableDerivations[derivationName];
      var config = {
        type: 'derived',
        derivation: derivationName,
        title: derivation.title,
        expressionTemplate: derivation.expressionTemplate,
        profile: profile
      };
      var childNode = this.#renderAttributeUiNode(config);
      if (derivation.folder) {
        folders[derivation.folder].appendChild(childNode);
      }
      else {
        node.appendChild(childNode);    
      }
    }
  }
    
  #loadAggregatorChildNodes(node, typeName, profile) {
    var applicableAggregators = AttributeUi.getApplicableAggregators(typeName);
    var folders = this.#createFolders(applicableAggregators, node);
    for (var aggregationName in applicableAggregators) {
      var aggregator = applicableAggregators[aggregationName];
      var config = {
        type: 'aggregate',
        aggregator: aggregationName,
        title: aggregator.title,
        expressionTemplate: aggregator.expressionTemplate,
        profile: profile
      };
      var childNode = this.#renderAttributeUiNode(config);
      if (aggregator.folder) {
        folders[aggregator.folder].appendChild(childNode);
      }
      else {
        node.appendChild(childNode);    
      }
    }    
  }
  
  #loadChildNodesForColumnNode(node){    
    var columnName = node.getAttribute('data-column_name');
    var columnType = node.getAttribute('data-column_type');
    var profile = {
      column_name: columnName,
      column_type: columnType 
    };
    var typeName = getDataTypeNameFromColumnType(columnType);
            
    this.#loadDerivationChildNodes(node, typeName, profile);
    this.#loadAggregatorChildNodes(node, typeName, profile);
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
  
  #toggleNodeState(event){
    var node = event.target;
    if (event.newState === 'open'){ 
      if (node.childNodes.length === 1){
        this.#loadChildNodes(node);
      }
    }
  }
  
  async #axisButtonClicked(node, axis, checked){
    var head = node.childNodes.item(0);
    var inputs = head.getElementsByTagName('input');
    var aggregator;
    switch (axis){
      case QueryModel.AXIS_ROWS:
      case QueryModel.AXIS_COLUMNS:
      case QueryModel.AXIS_CELLS:
        // implement mutual exclusive axes (either rows or columns, not both)
        for (var i = 0; i < inputs.length; i++){
          var input = inputs.item(i);
          var inputAxis = input.getAttribute('data-axis');
          if (input.checked && inputAxis !== axis) {
            input.checked = false;
          }
          
          if (axis === QueryModel.AXIS_CELLS && inputAxis === QueryModel.AXIS_CELLS) {
            aggregator = input.getAttribute('data-aggregator');
          }
        }
        break;
    }
    var columnName = node.getAttribute('data-column_name');
    var columnType = node.getAttribute('data-column_type');
    var derivation = node.getAttribute('data-derivation');
    var aggregator = aggregator || node.getAttribute('data-aggregator');

    
    var itemConfig = {
      axis: axis,
      columnName: columnName,
      columnType: columnType,
      derivation: derivation,
      aggregator: aggregator
    };
    
    var formatter = QueryAxisItem.createFormatter(itemConfig);
    if (formatter){
      itemConfig.formatter = formatter;
    }

    if (itemConfig.aggregator) {
      //noop
    }
    else {
      var literalWriter = QueryAxisItem.createLiteralWriter(itemConfig);
      if (literalWriter){
        itemConfig.literalWriter = literalWriter;
      }
    }
    
    if (checked) {
      await this.#queryModel.addItem(itemConfig);
      
      if (axis === QueryModel.AXIS_FILTERS) {
        queryUi.openFilterDialogForQueryModelItem(itemConfig);
      }
    }
    else {
      this.#queryModel.removeItem(itemConfig);
    }
  }
  
  #clickHandler(event) {
    var target = event.target;
    var classNames = getClassNames(target);
    event.stopPropagation();
    
    var node = getAncestorWithTagName(target, 'details');
    if (!node) {
      return;
    }
    
    if (classNames.indexOf('attributeUiAxisButton') !== -1){
      var input = target.getElementsByTagName('input').item(0);
      var axisId = target.getAttribute('data-axis');
      setTimeout(function(){
        this.#axisButtonClicked(node, axisId, input.checked);
      }.bind(this), 0);
    }    
  }
 
  #updateState(){
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
  
  async #queryModelChangeHandler(event){
    var eventData = event.eventData;
    if (eventData.propertiesChanged) {
      if (eventData.propertiesChanged.datasource) {
        var searchAttributeUiDisplay;
        if (eventData.propertiesChanged.datasource.newValue) {
          this.clear(true);          
          var datasource = eventData.propertiesChanged.datasource.newValue;
          var columnMetadata = await datasource.getColumnMetadata();
          this.render(columnMetadata);
          searchAttributeUiDisplay = '';
        }
        else {
          this.clear(false);
          searchAttributeUiDisplay = 'none';
        }
        byId('searchAttributeUi').style.display = searchAttributeUiDisplay;
      }
    }
    this.#updateState();
  }
  
  getDom(){
    return byId(this.#id);
  }
  
}

var attributeUi;
function initAttributeUi(){
  attributeUi = new AttributeUi('attributeUi', queryModel); 
}