class AttributeUi {

  #id = undefined;
  #queryModel = undefined;

  static aggregators = {
    'count': {
      isNumeric: true,
      isInteger: true,
      expressionTemplate: 'COUNT( ${columnExpression} )',
      columnType: 'HUGEINT'
    },
    'distinct count': {
      isNumeric: true,
      isInteger: true,
      expressionTemplate: 'COUNT( DISTINCT ${columnExpression} )',
      columnType: 'HUGEINT'
    },
    'min': {
      folder: "statistics",
      preservesColumnType: true,
      expressionTemplate: 'MIN( ${columnExpression} )'
    },
    'max': {
      folder: "statistics",
      preservesColumnType: true,
      expressionTemplate: 'MAX( ${columnExpression} )'
    },
    'list': {
      folder: "list aggregators",
      expressionTemplate: 'LIST( ${columnExpression} )',
      isArray: true
    },
    'distinct list': {
      folder: "list aggregators",
      expressionTemplate: 'LIST( DISTINCT ${columnExpression} )',
      isArray: true
    },
    'histogram': {
      folder: "list aggregators",
      expressionTemplate: 'HISTOGRAM( ${columnExpression} )',
      isStruct: true,
    },
    'sum': {
      isNumeric: true,
      forNumeric: true,
      expressionTemplate: 'SUM( ${columnExpression} )',
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
      expressionTemplate: 'AVG( ${columnExpression} )',
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
      expressionTemplate: 'GEOMEAN( ${columnExpression} )',
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
      expressionTemplate: 'MAD( ${columnExpression} )'
    },
    'median': {
      folder: "statistics",
      expressionTemplate: 'MEDIAN( ${columnExpression} )',
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
      expressionTemplate: 'MODE( ${columnExpression} )'
    },
    'stdev': {
      folder: "statistics",
      isNumeric: true,
      isInteger: false,
      forNumeric: true,
      expressionTemplate: 'STDDEV_SAMP( ${columnExpression} )',
      columnType: 'DOUBLE'
    },
    'variance': {
      folder: "statistics",
      isNumeric: true,
      isInteger: false,
      forNumeric: true,
      expressionTemplate: 'VAR_SAMP( ${columnExpression} )',
      columnType: 'DOUBLE'
    },
    'entropy': {
      folder: "statistics",
      isNumeric: true,
      isInteger: false,
      expressionTemplate: 'ENTROPY( ${columnExpression} )',
      columnType: 'DOUBLE'
    },
    'kurtosis': {
      folder: "statistics",
      isNumeric: true,
      isInteger: false,
      forNumeric: true,
      expressionTemplate: 'KURTOSIS( ${columnExpression} )',
      columnType: 'DOUBLE'
    },
    'skewness': {
      folder: "statistics",
      isNumeric: true,
      isInteger: false,
      forNumeric: true,
      expressionTemplate: 'SKEWNESS( ${columnExpression} )',
      columnType: 'DOUBLE'
    },
    'and': {
      forBoolean: true,
      expressionTemplate: 'BOOL_AND( ${columnExpression} )',
      columnType: 'BOOLEAN'
    },
    'or': {
      forBoolean: true,
      expressionTemplate: 'BOOL_OR( ${columnExpression} )',
      columnType: 'BOOLEAN'
    },
    'count if true': {
      forBoolean: true,
      expressionTemplate: 'COUNT( ${columnExpression} ) FILTER( ${columnExpression} )',
      columnType: 'HUGEINT'
    },
    'count if false': {
      forBoolean: true,
      expressionTemplate: 'COUNT( ${columnExpression} ) FILTER( NOT( ${columnExpression} ) )',
      columnType: 'HUGEINT'
    }
  };
  
  static tupleNumberDerivations = {
    rownumber: {
      expressionTemplate: "ROW_NUMBER() OVER ()::INTEGER",
      columnType: 'INTEGER',
      isWindowFunction: true
    }
  };

  static dateFields = {
    'iso-date': {
      folder: 'date fields',
      // %x is isodate,
      // see: https://duckdb.org/docs/sql/functions/dateformat.html
      expressionTemplate: "strftime( ${columnExpression}, '%x' )",
      columnType: 'VARCHAR'
    },
    'local-date': {
      folder: 'date fields',
      // %x is isodate,
      // see: https://duckdb.org/docs/sql/functions/dateformat.html
      expressionTemplate: "${columnExpression}::DATE",
      columnType: 'DATE',
      createFormatter: createLocalDateFormatter
    },
    'year': {
      folder: 'date fields',
      expressionTemplate: "CAST( YEAR( ${columnExpression} ) AS INT)",
      columnType: 'INTEGER',
      createFormatter: function(){
        return fallbackFormatter;
      }
    },
    'quarter': {
      folder: 'date fields',
      expressionTemplate: "'Q' || QUARTER( ${columnExpression} )",
      columnType: 'VARCHAR'
    },
    'month num': {
      folder: 'date fields',
      expressionTemplate: "CAST( MONTH( ${columnExpression} ) AS UTINYINT) /* month num */ ",
      columnType: 'UTINYINT',
      createFormatter: function(){
        return monthNumFormatter
      }
    },
    'month name': {
      folder: 'date fields',
      expressionTemplate: "CAST( MONTH( ${columnExpression} ) AS UTINYINT) /* month name */ ",
      columnType: 'UTINYINT',
      createFormatter: createMonthNameFormatter
    },
    'week num': {
      folder: 'date fields',
      expressionTemplate: "CAST( WEEK( ${columnExpression} ) AS UTINYINT)",
      columnType: 'UTINYINT',
      createFormatter: function(){
        return weekNumFormatter
      },
    },
    'day of year': {
      folder: 'date fields',
      expressionTemplate: "CAST( DAYOFYEAR( ${columnExpression} ) as USMALLINT)",
      columnType: 'USMALLINT'
    },
    'day of month': {
      folder: 'date fields',
      expressionTemplate: "CAST( DAYOFMONTH( ${columnExpression} ) AS UTINYINT)",
      columnType: 'UTINYINT',
      createFormatter: function(){
        return dayNumFormatter
      },
    },
    'day of week num': {
      folder: 'date fields',
      expressionTemplate: "CAST( DAYOFWEEK( ${columnExpression} ) as UTINYINT) /* day of week num */",
      columnType: 'UTINYINT',
    },
    'day of week name': {
      folder: 'date fields',
      expressionTemplate: "CAST( DAYOFWEEK( ${columnExpression} ) as UTINYINT) /* day of week name */",
      columnType: 'UTINYINT',
      createFormatter: createDayNameFormatter
    }
  };

  static timeFields = {
    'iso-time': {
      folder: 'time fields',
      expressionTemplate: "strftime( ${columnExpression}, '%H:%M:%S' )",
      columnType: 'VARCHAR'
    },
    'hour': {
      folder: 'time fields',
      expressionTemplate: "CAST( HOUR( ${columnExpression} ) as UTINYINT)",
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
      expressionTemplate: "CAST( MINUTE( ${columnExpression} ) as UTINYINT)",
      columnType: 'UTINYINT'
    },
    'second': {
      folder: 'time fields',
      expressionTemplate: "CAST( SECOND( ${columnExpression} ) as UTINYINT)",
      columnType: 'UTINYINT'
    }
  };

  static textDerivations = {
    'NOACCENT': {
      folder: 'string operations',
      expressionTemplate: "${columnExpression} COLLATE NOACCENT",
      preservesColumnType: true
    },
    'NOCASE': {
      folder: 'string operations',
      expressionTemplate: "${columnExpression} COLLATE NOCASE",
      preservesColumnType: true
    },
    'lowercase': {
      folder: 'string operations',
      expressionTemplate: "LOWER( ${columnExpression} )",
      preservesColumnType: true
    },
    'uppercase': {
      folder: 'string operations',
      expressionTemplate: "UPPER( ${columnExpression} )",
      preservesColumnType: true
    },
    "first letter": {
      folder: 'string operations',
      expressionTemplate: "upper( ${columnExpression}[1] )",
      preservesColumnType: true
    },
    "length": {
      folder: 'string operations',
      expressionTemplate: "length( ${columnExpression} )",
      columnType: 'BIGINT'
    }
  }

  static arrayDerivations = {
    "length": {
      folder: 'array operations',
      expressionTemplate: "length( ${columnExpression} )",
      columnType: 'BIGINT'
    },
    "element indices": {
      folder: 'array operations',
      columnType: 'BIGINT',
      expressionTemplate: "generate_subscripts( case len( coalesce( ${columnExpression}, []) ) when 0 then [ NULL ] else ${columnExpression} end, 1 )",
      unnestingFunction: 'generate_subscripts'
    },
    "elements": {
      folder: 'array operations',
      hasElementDataType: true,
      expressionTemplate: "unnest( case len( coalesce( ${columnExpression}, []) ) when 0 then [ NULL ] else ${columnExpression} end )",
      unnestingFunction: 'unnest'
    }
  }

  static getApplicableDerivations(typeName){
    var typeInfo = getDataTypeInfo(typeName);

    var hasTimeFields = Boolean(typeInfo.hasTimeFields);
    var hasDateFields = Boolean(typeInfo.hasDateFields);
    var hasTextDerivations = Boolean(typeInfo.hasTextDerivations);

    var applicableDerivations = Object.assign({},
      hasDateFields ? AttributeUi.dateFields : undefined,
      hasTimeFields ? AttributeUi.timeFields : undefined,
      hasTextDerivations ? AttributeUi.textDerivations : undefined,
    );
    return applicableDerivations;
  }

  static getDerivationInfo(derivationName){
    var derivations = Object.assign({},
      AttributeUi.tupleNumberDerivations,
      AttributeUi.dateFields,
      AttributeUi.timeFields,
      AttributeUi.textDerivations,
      AttributeUi.arrayDerivations
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

  static getArrayDerivations(typeName){
    return AttributeUi.arrayDerivations;
  }

  static #getUiNodeCaption(config){
    switch (config.type){
      case 'column':
        return config.profile.column_name;
      case 'member':
        var memberExpressionPath = config.profile.memberExpressionPath;
        var tmp = [].concat(memberExpressionPath);
        return tmp.pop();
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
    dom.addEventListener('dragstart', this.#dragStartHandler.bind(this));
    this.#queryModel.addEventListener('change', this.#queryModelChangeHandler.bind(this));
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

  #clickHandler(event){
    event.stopPropagation();
    var target = event.target;
    var node = getAncestorWithTagName(target, 'details');
    if (!node) {
      return;
    }

    var classNames = getClassNames(target);
    if (!classNames) {
      return;
    }
    if (classNames.indexOf('attributeUiAxisButton') === -1){
      return;
    }
    var input = target.getElementsByTagName('input').item(0);
    var axisId = target.getAttribute('data-axis');
    setTimeout(function(){
      this.#axisButtonClicked(node, axisId, input.checked);
    }.bind(this), 0);
  }
  
  #createQueryAxisItemForAttributeUiNode(node){
    var columnName = node.getAttribute('data-column_name');
    var columnType = node.getAttribute('data-column_type');

    var memberExpressionPath = node.getAttribute('data-member_expression_path');
    if (memberExpressionPath) {
      memberExpressionPath = JSON.parse(memberExpressionPath);
    }

    var derivation = node.getAttribute('data-derivation');
    var aggregator = node.getAttribute('data-aggregator');

    var itemConfig = {
      columnName: columnName,
      columnType: columnType,
      derivation: derivation,
      aggregator: aggregator,
      memberExpressionPath: memberExpressionPath
    };
    return itemConfig;
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

    var itemConfig = this.#createQueryAxisItemForAttributeUiNode(node);
    itemConfig.axis = axis;

    if (aggregator) {
      itemConfig.aggregator = aggregator;
    }

    var queryModel = this.#queryModel;
    if (checked) {
      await queryModel.addItem(itemConfig);
    }
    else {
      queryModel.removeItem(itemConfig);
    }
  }

  #renderAttributeUiNodeAxisButton(config, head, axisId){
    var columnExpression = config.profile.column_name;
    var memberExpressionPath = config.profile.memberExpressionPath;
    if (memberExpressionPath){
      columnExpression = `${columnExpression}.${memberExpressionPath.join('.')}`;
    }

    var name = `${config.type}_${columnExpression}`;
    var id = `${name}`;

    var analyticalRole = 'attribute';
    var aggregator = config.aggregator;

    var createInput;
    switch (config.type) {
      case 'column':
      case 'member':
        var profile = config.profile;
        var columnType = config.columnType || config.profile.column_type;
        var dataTypeInfo = getDataTypeInfo(columnType);
        analyticalRole = dataTypeInfo && dataTypeInfo.defaultAnalyticalRole ? dataTypeInfo.defaultAnalyticalRole : analyticalRole;
      case 'derived':
        switch (axisId){
          case QueryModel.AXIS_FILTERS:
          case QueryModel.AXIS_COLUMNS:
          case QueryModel.AXIS_ROWS:
            switch (config.type) {
              case 'derived':
                var derivation = config.derivation;
                id += `_${derivation}`;
                break;
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
    var columnExpression = config.profile.column_name;
    var memberExpressionPath = config.profile.memberExpressionPath;
    if (memberExpressionPath){
      columnExpression = `${columnExpression}.${memberExpressionPath.join('.')}`;
    }

    var head = createEl('summary', {
    });

    var title = config.title;
    if (!title){
      switch (config.type) {
        case 'column':
          title = `"${columnExpression}": ${config.profile.column_type}`;
          break;
        case 'member':
          title = `${columnExpression}: ${config.columnType}`;
          break;
        case 'aggregate':
        case 'derived':
          var expressionTemplate = config.expressionTemplate;
          title = extrapolateColumnExpression(expressionTemplate, columnExpression);
          break;
      }
    }

    var caption = AttributeUi.#getUiNodeCaption(config);
    var label = createEl('span', {
      "class": 'label',
      "title": title,
      "draggable": true
    }, caption);
    head.appendChild(label);

    this.#renderAttributeUiNodeAxisButtons(config, head);

    return head;
  }

  #dragStartHandler(event){
    var dataTransfer = event.dataTransfer;
    var data = {};
    
    var element = event.target;
    var summary = element.parentNode;
    var details = summary.parentNode;
    var queryAxisItem = this.#createQueryAxisItemForAttributeUiNode(details);
        
    var itemId = QueryAxisItem.getIdForQueryAxisItem(queryAxisItem);
    // if this is an aggregat item, mark that
    if (queryAxisItem.aggregator) {
      data.aggregator = {key: queryAxisItem.aggregator, value: queryAxisItem.aggregator};
    }
    else {
      // if this is not an aggregate item, then this attribute ui item could have a default aggregator
      var defaultAggregatorInput = summary.querySelector('label[data-axis=cells] > input[type=checkbox]');
      if (defaultAggregatorInput) {
        var defaultAggregator = defaultAggregatorInput.getAttribute('data-aggregator');
        // since this item could be dropped on the cells axis,
        // we should check if the cells axis already contains an item that would result from applying the default aggregator
        var copyOfQueryAxisItem = Object.assign({}, queryAxisItem);
        copyOfQueryAxisItem.axis = QueryModel.AXIS_CELLS;
        copyOfQueryAxisItem.aggregator = defaultAggregator;
        var cellsAxisItem = this.#queryModel.findItem(copyOfQueryAxisItem);
        itemId = cellsAxisItem ? QueryAxisItem.getIdForQueryAxisItem(cellsAxisItem) : '';
        data.defaultaggregator = {key: itemId, value: defaultAggregator};
      }
    }
     
    // see if this item is already part of the query model
    var queryModelItem = this.#queryModel.findItem(queryAxisItem);
    if (queryModelItem) {
      queryAxisItem.axis = queryModelItem.axis;
      data.axis = {key: queryAxisItem.axis, value: queryAxisItem.axis};
      queryAxisItem.index = queryModelItem.index;
      data.index = {key: queryAxisItem.index, value: queryAxisItem.index};
      data.id = {key: itemId, value: itemId};
    }
    
    var filtersAxis = this.#queryModel.getFiltersAxis();
    var filtersAxisItem = filtersAxis.findItem(queryAxisItem);
    if (filtersAxisItem){
      data.filters = {key: filtersAxisItem.index, value: filtersAxisItem.index};
      if (!queryModelItem) {
        itemId = QueryAxisItem.getIdForQueryAxisItem(queryAxisItem);
        data.id = {key: itemId, value: itemId};
      }
    }
    var csvData = [['Name', 'Value']];
    for (var property in queryAxisItem){
      var value = queryAxisItem[property];
      if (typeof value === 'object') {
        continue;
      }
      csvData.push([property, value]);
    }
    csvData = getCsv(csvData);
    
    data['text/plain'] = csvData;
    data['text/csv'] = new File([csvData], `${itemId}.csv`);
    data['application/json'] = queryAxisItem;
    
    DragAndDropHelper.setData(event, data);
    dataTransfer.dropEffect = dataTransfer.effectAllowed = queryModelItem ? 'move' : 'all';
    dataTransfer.setDragImage(element, -20, 0);
  }

  #renderAttributeUiNode(config){
    var columnType = config.profile.column_type;
    var attributes = {
      role: 'treeitem',
      'data-nodetype': config.type,
      'data-column_name': config.profile.column_name,
      'data-column_type': columnType
    };
    var memberExpressionPath = config.profile.memberExpressionPath;
    if (memberExpressionPath) {
      attributes['data-member_expression_path'] = JSON.stringify(memberExpressionPath);
      attributes['data-member_expression_type'] = config.profile.memberExpressionType;
    }

    var node = createEl('details', attributes);

    var derivation = config.derivation;
    switch (config.type){
      case 'column':
      case 'member':
        node.addEventListener('toggle', this.#toggleNodeState.bind(this) );
        break;
      case 'aggregate':
        node.setAttribute('data-aggregator', config.aggregator);
        break;
      case 'derived':
        node.setAttribute('data-derivation', config.derivation);
        //if (derivation === 'elements') {
        //  var elementType = memberExpressionPath ? config.profile.memberExpressionType : columnType;
          // remove the trailing '[]' to get the element type.
        //  elementType = elementType.slice(0, -2);
        //  node.setAttribute('data-element_type', elementType);
        //}
        break;
    }

    var head = this.#renderAttributeUiNodeHead(config);
    node.appendChild(head);

    // for STRUCT columns and members, preload the child nodes (instead of lazy load)
    // this is necessary so that a search will always find all applicable attributes
    // with lazy load it would only find whatever happens to be visited/browsed already.
    switch (config.type){
      case 'derived':
        if (derivation !== 'elements') {
          break;
        }
      case 'column':
      case 'member':
        if (columnType.startsWith('STRUCT')) {
          this.#loadChildNodes(node);
        }
        break;
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

    // generic count(*) node
    var countAllNode = this.#renderAttributeUiNode({
      type: 'aggregate',
      aggregator: 'count',
      title: 'Generic rowcount',
      profile: {
        column_name: '*',
        column_type: 'INTEGER'
      }
    });
    attributesUi.appendChild(countAllNode);
    
    // nodes for each column
    for (var i = 0; i < columnSummary.numRows; i++){
      var row = columnSummary.get(i);
      var node = this.#renderAttributeUiNode({
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

  #loadMemberChildNodes(node, typeName, profile){
    var folderNode = this.#renderFolderNode({caption: 'structure'});
    var columnType = profile.memberExpressionType || profile.column_type;
    var memberExpressionPath = profile.memberExpressionPath || [];
    var structure = getStructTypeDescriptor(columnType);
    var columnName = profile.column_name
    for (var memberName in  structure){
      var memberType = structure[memberName];
      var config = {
        type: 'member',
        columnType: memberType,
        profile: {
          column_name: profile.column_name,
          column_type: profile.column_type,
          memberExpressionPath: memberExpressionPath.concat([memberName]),
          memberExpressionType: memberType
        }
      }
      var memberNode = this.#renderAttributeUiNode(config);
      folderNode.appendChild(memberNode);
    }
    node.appendChild(folderNode);
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

  #loadArrayChildNodes(node, typeName, profile){
    var arrayDerivations = AttributeUi.getArrayDerivations(typeName);
    var folders = this.#createFolders(arrayDerivations, node);
    var memberExpressionPath = profile.memberExpressionPath || [];
    for (var derivationName in arrayDerivations) {
      var derivation = arrayDerivations[derivationName];
      var nodeProfile;
      if (derivation.unnestingFunction) {
        nodeProfile = JSON.parse(JSON.stringify(profile));
        var memberExpressionPath = nodeProfile.memberExpressionPath || [];
        memberExpressionPath.push(derivation.unnestingFunction + '()');
        nodeProfile.memberExpressionPath = memberExpressionPath;
        var memberExpressionType = derivation.columnType;
        if (!memberExpressionType){
          memberExpressionType = profile.memberExpressionType || profile.column_type;
          memberExpressionType = memberExpressionType.slice(0, -2);
        }
        nodeProfile.column_type = profile.column_type;
        nodeProfile.memberExpressionType = memberExpressionType;
      }
      else {
        nodeProfile = profile;
      }
      var config = {
        type: 'derived',
        derivation: derivationName,
        title: derivation.title,
        expressionTemplate: derivation.expressionTemplate,
        profile: nodeProfile
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

  #loadChildNodes(node){
    var columnName = node.getAttribute('data-column_name');
    var columnType = node.getAttribute('data-column_type');

    var memberExpressionPath;
    var memberExpressionType = node.getAttribute('data-member_expression_type');
    if (memberExpressionType) {
      memberExpressionPath = node.getAttribute('data-member_expression_path');
      memberExpressionPath = JSON.parse(memberExpressionPath);
    }

    var elementType = node.getAttribute('data-element_type');

    var profile = {
      column_name: columnName,
      column_type: columnType,
      memberExpressionType: memberExpressionType,
      memberExpressionPath: memberExpressionPath
    };

    var expressionType = memberExpressionType || columnType;
    var typeName = getDataTypeNameFromColumnType(expressionType);

    if (expressionType.endsWith('[]')){
      this.#loadArrayChildNodes(node, typeName, profile);
    }
    else
    if (expressionType.startsWith('STRUCT')){
      this.#loadMemberChildNodes(node, typeName, profile);
    }

    var nodeType = node.getAttribute('data-nodetype');

    switch (nodeType) {
      case 'column':
      case 'member':
        this.#loadDerivationChildNodes(node, typeName, profile);
        this.#loadAggregatorChildNodes(node, typeName, profile);
    }
  }

  #toggleNodeState(event){
    var node = event.target;
    if (event.newState === 'open'){
      if (node.childNodes.length === 1){
        this.#loadChildNodes(node);
        this.#updateState();
      }
    }
  }

  #updateState(){
    var queryModel = this.#queryModel;

    // to satisfy https://github.com/rpbouman/huey/issues/220, 
    // we need to ensure derivations and aggregates are loaded.
    
    // First we get the column names of those query items that have a derivation or aggregator
    var referencedColumns = {};
    var axisIds = queryModel.getAxisIds();
    for (var i = 0; i < axisIds.length; i++) {
      var axisId = axisIds[i];
      var queryAxis = queryModel.getQueryAxis(axisId);
      var items = queryAxis.getItems();
      for (var j = 0; j < items.length; j++){
        var item = items[j];
        if (!item.derivation && !item.aggregator){
          continue;
        }
        referencedColumns[item.columnName] = true;
      }
    }
    
    // then, check all top-level attribute nodes that don't have child nodes
    // if the associated column name is referenced in the query, then load its childnodes.
    var attributeNodes = this.getDom().childNodes;
    for (var i = 0; i < attributeNodes.length; i++){
      var attributeNode = attributeNodes.item(i);
      if (attributeNode.nodeType !== 1 || attributeNode.nodeName !== 'DETAILS') {
        continue;
      }
      var columnName = attributeNode.getAttribute('data-column_name');
      if (referencedColumns[columnName] === undefined) {
        continue;
      }
      var descendants = attributeNode.childNodes;
      if (descendants.length > 1) {
        continue;
      }
      this.#loadChildNodes(attributeNode);
    }
    
    // make sure all the selectors checkboxes are (un)checked according to the query state.
    var inputs = this.getDom().getElementsByTagName('input');
    for (var i = 0; i < inputs.length; i++){
      var input = inputs.item(i);
      var axisId = input.getAttribute('data-axis');

      var node = getAncestorWithTagName(input, 'details')
      var columnName = node.getAttribute('data-column_name');
      var aggregator = input.getAttribute('data-aggregator');
      var derivation = node.getAttribute('data-derivation');
      var memberExpressionPath = node.getAttribute('data-member_expression_path');

      var item = queryModel.findItem({
        columnName: columnName,
        axis: axisId,
        aggregator: aggregator,
        derivation: derivation,
        memberExpressionPath: memberExpressionPath
      });

      input.checked = Boolean(item);
    }
  }

  revealAllQueryAttributes() {
    // TODO: ensure all query attributes are rendered
    var dom = this.getDom();
    var detailsList = document.querySelectorAll('.attributeUi details:has( details > summary > label > input[type=checkbox]:checked )');
    for (var i = 0; i < detailsList.length; i++){
      var details = detailsList.item(i);
      details.setAttribute('open', 'true');
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