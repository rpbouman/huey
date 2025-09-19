class AttributeUi {

  #id = undefined;
  #queryModel = undefined;

  static aggregators = {
    'and': {
      forBoolean: true,
      expressionTemplate: 'BOOL_AND( ${columnExpression} )',
      columnType: 'BOOLEAN'
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
    'count': {
      isNumeric: true,
      isInteger: true,
      expressionTemplate: 'COUNT( ${columnExpression} )',
      columnType: 'HUGEINT'
    },
    'count if false': {
      forBoolean: true,
      expressionTemplate: 'COUNT( ${columnExpression} ) FILTER( NOT( ${columnExpression} ) )',
      columnType: 'HUGEINT'
    },
    'count if true': {
      forBoolean: true,
      expressionTemplate: 'COUNT( ${columnExpression} ) FILTER( ${columnExpression} )',
      columnType: 'HUGEINT'
    },
    'distinct count': {
      isNumeric: true,
      isInteger: true,
      expressionTemplate: 'COUNT( DISTINCT ${columnExpression} )',
      columnType: 'HUGEINT'
    },
    'entropy': {
      folder: "statistics",
      isNumeric: true,
      isInteger: false,
      expressionTemplate: 'ENTROPY( ${columnExpression} )',
      columnType: 'DOUBLE'
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
    'histogram': {
      folder: "list aggregators",
      expressionTemplate: 'HISTOGRAM( ${columnExpression} )',
      isStruct: true,
    },
    'kurtosis': {
      folder: "statistics",
      isNumeric: true,
      isInteger: false,
      forNumeric: true,
      expressionTemplate: 'KURTOSIS( ${columnExpression} )',
      columnType: 'DOUBLE'
    },
    'list': {
      folder: "list aggregators",
      expressionTemplate: 'LIST( ${columnExpression} )',
      isArray: true
    },
    'unique values': {
      folder: "list aggregators",
      expressionTemplate: 'LIST( DISTINCT ${columnExpression} ORDER BY ${columnExpression} )',
      isArray: true
    },
    'mad': {
      folder: "statistics",
      columnType: 'INTERVAL',
      forNumeric: true,
      expressionTemplate: 'MAD( ${columnExpression} )'
    },
    'max': {
      folder: "statistics",
      preservesColumnType: true,
      expressionTemplate: 'MAX( ${columnExpression} )'
    },
    'median': {
      folder: "statistics",
      expressionTemplate: 'MEDIAN( ${columnExpression} )',
      getReturnDataTypeForArgumentDataType: getMedianReturnDataTypeForArgumentDataType,
      createFormatter: function(axisItem){
        var columnType = QueryAxisItem.getQueryAxisItemDataType(axisItem);
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
    'min': {
      folder: "statistics",
      preservesColumnType: true,
      expressionTemplate: 'MIN( ${columnExpression} )'
    },
    'mode': {
      folder: "statistics",
      preservesColumnType: true,
      expressionTemplate: 'MODE( ${columnExpression} )'
    },
    'or': {
      forBoolean: true,
      expressionTemplate: 'BOOL_OR( ${columnExpression} )',
      columnType: 'BOOLEAN'
    },
    'skewness': {
      folder: "statistics",
      isNumeric: true,
      isInteger: false,
      forNumeric: true,
      expressionTemplate: 'SKEWNESS( ${columnExpression} )',
      columnType: 'DOUBLE'
    },
    'stdev': {
      folder: "statistics",
      isNumeric: true,
      isInteger: false,
      forNumeric: true,
      expressionTemplate: 'STDDEV_SAMP( ${columnExpression} )',
      columnType: 'DOUBLE'
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
    'variance': {
      folder: "statistics",
      isNumeric: true,
      isInteger: false,
      forNumeric: true,
      expressionTemplate: 'VAR_SAMP( ${columnExpression} )',
      columnType: 'DOUBLE'
    }
  };
  
  static arrayStatisticsDerivations = Object
  .keys(AttributeUi.aggregators)
  .filter(function(aggregator){
    var aggregatorInfo = AttributeUi.aggregators[aggregator];
    return aggregatorInfo.folder !== 'list aggregators';
  })
  .reduce(function(arrayStatisticsDerivations, aggregator){
    var aggregatorInfo = AttributeUi.aggregators[aggregator];
    var aggregateFunction = aggregatorInfo.expressionTemplate.split('(')[0];
    var derivationInfo = Object.assign({}, aggregatorInfo);
    if (derivationInfo.preservesColumnType){
      derivationInfo.hasElementDataType = true; 
      delete derivationInfo.preservesColumnType;
    }
    derivationInfo.folder = `array statistics`;
    var expressionTemplate;
    switch (aggregator) {
      case 'distinct count':
        expressionTemplate = 'list_unique( ${columnExpression} )';
        break;
      default:
        expressionTemplate = `list_aggregate( \${columnExpression}, '${aggregateFunction}' )`;
    }
    derivationInfo.expressionTemplate = expressionTemplate;
    arrayStatisticsDerivations[aggregator] = derivationInfo;
    return arrayStatisticsDerivations;
  }, {});
  
  static tupleNumberDerivations = {
    "row number": {
      expressionTemplate: "ROW_NUMBER() OVER ()::INTEGER",
      columnType: 'INTEGER',
      isWindowFunction: true
    }
  };

  static dateFields = {
    'iso-date': {
      // %x is isodate,
      // see: https://duckdb.org/docs/sql/functions/dateformat.html
      expressionTemplate: "strftime( ${columnExpression}, '%x' )",
      columnType: 'VARCHAR'
    },
    'local-date': {
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
      // fallback formatter to suppress group separator in year
      createFormatter: function(){
        return fallbackFormatter;
      }
    },
    'iso-year': {
      folder: 'date fields',
      expressionTemplate: "CAST( ISOYEAR( ${columnExpression} ) AS INT)",
      columnType: 'INTEGER',
      // fallback formatter to suppress group separator in year
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
      expressionTemplate: "CAST( MONTH( ${columnExpression} ) AS UTINYINT)",
      columnType: 'UTINYINT',
      createFormatter: function(){
        return monthNumFormatter
      }
    },
    'month name': {
      folder: 'date fields',
      expressionTemplate: "CAST( MONTH( ${columnExpression} ) AS UTINYINT)",
      columnType: 'UTINYINT',
      createFormatter: createMonthFullNameFormatter,
      createParser: createMonthFullNameParser,
      dataValueTypeOverride: 'Utf8'
    },
    'month shortname': {
      folder: 'date fields',
      expressionTemplate: "CAST( MONTH( ${columnExpression} ) AS UTINYINT)",
      columnType: 'UTINYINT',
      createFormatter: createMonthShortNameFormatter,
      createParser: createMonthShortNameParser,
      dataValueTypeOverride: 'Utf8'
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
      expressionTemplate: "CAST( DAYOFWEEK( ${columnExpression} ) as UTINYINT)",
      columnType: 'UTINYINT',
    },
    'iso-day of week': {
      folder: 'date fields',
      expressionTemplate: "CAST( ISODOW( ${columnExpression} ) as UTINYINT)",
      columnType: 'UTINYINT',
    },
    'day of week name': {
      folder: 'date fields',
      expressionTemplate: "CAST( DAYOFWEEK( ${columnExpression} ) as UTINYINT)",
      columnType: 'UTINYINT',
      createFormatter: createDayFullNameFormatter,
      createParser: createDayFullNameParser,
      dataValueTypeOverride: 'Utf8'
    },
    'day of week shortname': {
      folder: 'date fields',
      expressionTemplate: "CAST( DAYOFWEEK( ${columnExpression} ) as UTINYINT)",
      columnType: 'UTINYINT',
      createFormatter: createDayShortNameFormatter,
      createParser: createDayShortNameParser,
      dataValueTypeOverride: 'Utf8'
    },
    'timestamp (secs)': {
      folder: 'timestamps',
      expressionTemplate: 'epoch( ${columnExpression} )',
      columnType: 'DOUBLE'
    },
    'timestamp (millis)': {
      folder: 'timestamps',
      expressionTemplate: 'epoch_ms( ${columnExpression} )',
      columnType: 'BIGINT'
    },
    'timestamp (micros)': {
      folder: 'timestamps',
      expressionTemplate: 'epoch_us( ${columnExpression} )',
      columnType: 'BIGINT'
    },
    'timestamp (nanos)': {
      folder: 'timestamps',
      expressionTemplate: 'epoch_ns( ${columnExpression} )',
      columnType: 'BIGINT'
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
  
  static hashDerivations = {
    "hash": {
      folder: 'hashes',
      expressionTemplate: 'hash( ${columnExpression} )',
      columnType: 'UBIGINT'
    },
    "md5 (hex)": {
      folder: 'hashes',
      expressionTemplate: 'md5( ${columnExpression} )',
      columnType: 'VARCHAR',
      forString: true
    },
    "md5": {
      folder: 'hashes',
      expressionTemplate: 'md5_number( ${columnExpression} )',
      columnType: 'HUGEINT',
      forString: true
    },
    "md5 low": {
      folder: 'hashes',
      expressionTemplate: 'md5_number_lower( ${columnExpression} )',
      columnType: 'UBIGINT',
      forString: true
    },
    "md5 high": {
      folder: 'hashes',
      expressionTemplate: 'md5_number_upper( ${columnExpression} )',
      columnType: 'UBIGINT',
      forString: true
    },
    "sha-1": {
      folder: 'hashes',
      expressionTemplate: 'sha1( ${columnExpression} )',
      columnType: 'VARCHAR',
      forString: true
    },
    "sha-256": {
      folder: 'hashes',
      expressionTemplate: 'sha256( ${columnExpression} )',
      columnType: 'VARCHAR',
      forString: true
    }
  };

  static textDerivations = {
    "first letter": {
      folder: 'string operations',
      expressionTemplate: "upper( ${columnExpression}[1] )",
      columnType: 'VARCHAR'
    },
    "length": {
      folder: 'string operations',
      expressionTemplate: "length( ${columnExpression} )",
      columnType: 'BIGINT'
    },
    'lowercase': {
      folder: 'string operations',
      expressionTemplate: "LOWER( ${columnExpression} )",
      columnType: 'VARCHAR'
    },
    'NOACCENT': {
      folder: 'string operations',
      expressionTemplate: "${columnExpression} COLLATE NOACCENT",
      columnType: 'VARCHAR'
    },
    'NOCASE': {
      folder: 'string operations',
      expressionTemplate: "${columnExpression} COLLATE NOCASE",
      columnType: 'VARCHAR'
    },
    'uppercase': {
      folder: 'string operations',
      expressionTemplate: "UPPER( ${columnExpression} )",
      columnType: 'VARCHAR'
    }
  };
  
  /* https://github.com/rpbouman/huey/issues/612 */
  static uuidDerivations = {
    "UUID version": {
      folder: 'UUID',
      expressionTemplate: "uuid_extract_version( ${columnExpression} )",
      columnType: 'INTEGER'
    },
    "UUIDv7 timestamp": {
      folder: 'UUID',
      expressionTemplate: "CASE uuid_extract_version( ${columnExpression} ) WHEN 7 THEN uuid_extract_timestamp( ${columnExpression} ) END",
      columnType: 'TIMESTAMP WITH TIME ZONE'
    },
  };

  static arrayDerivations = {
    "elements": {
      folder: 'array operations',
      hasElementDataType: true,
      expressionTemplate: "unnest( case len( coalesce( ${columnExpression}, []) ) when 0 then [ NULL ] else ${columnExpression} end )",
      unnestingFunction: 'unnest'
    },
    "element indices": {
      folder: 'array operations',
      columnType: 'BIGINT',
      expressionTemplate: "generate_subscripts( case len( coalesce( ${columnExpression}, []) ) when 0 then [ NULL ] else ${columnExpression} end, 1)",
      unnestingFunction: 'generate_subscripts'
    },
    "length": {
      folder: 'array operations',
      expressionTemplate: "length( ${columnExpression} )",
      columnType: 'BIGINT'
    },
    "sort values": {
      folder: 'array operations',
      expressionTemplate: "list_sort( ${columnExpression} )",
      preservesColumnType: true
    },
    "unique values":{
      folder: 'array operations',
      expressionTemplate: "list_sort( list_distinct( ${columnExpression} ) )",
      preservesColumnType: true
    },
    "unique values length":{
      folder: 'array operations',
      expressionTemplate: "length( list_distinct( ${columnExpression} ) )",
      columnType: 'BIGINT'
    }
  };

  static mapDerivations = {
    "entries": {
      folder: 'map operations',
      expressionTemplate: "unnest( map_entries( ${columnExpression} ) )",
      unnestingFunction: 'unnest',
      hasEntryArrayDataType: true
    },
    "entry count": {
      folder: 'map operations',
      expressionTemplate: "cardinality( ${columnExpression} )",
      columnType: 'BIGINT'
    },
    "keyset": {
      folder: 'map operations',
      expressionTemplate: "list_sort( map_keys( ${columnExpression} ) )",
      hasKeyArrayDataType: true
    },
    "valuelist": {
      folder: 'map operations',
      expressionTemplate: "list_sort( map_values( ${columnExpression} ) )",
      hasValueArrayDataType: true
    }
  };
    
  static getApplicableDerivations(typeName){
    var typeInfo = getDataTypeInfo(typeName);

    var hasTimeFields = Boolean(typeInfo.hasTimeFields);
    var hasDateFields = Boolean(typeInfo.hasDateFields);
    var hasTextDerivations = Boolean(typeInfo.hasTextDerivations);
    var hasUUIDDerivations = Boolean(typeInfo.hasUUIDDerivations);
    
    var hashDerivations = Object.assign({}, AttributeUi.hashDerivations);
    
    var arrayType = typeName === 'ARRAY';
    var mapType = typeName === 'MAP';
    var structType = typeName === 'STRUCT';
    // note: for this purpose, JSON is treated as string.
    var stringType = isStringType(typeName) || typeName === 'JSON';
    var objectType;
    if (!stringType) {
      objectType =  arrayType || mapType || structType;
    }
    
    if (objectType){
      Object.keys(hashDerivations).forEach(function(hashDerivationKey){
        var hashDerivation = hashDerivations[hashDerivationKey];
        if (hashDerivation.forString) {
          delete hashDerivations[hashDerivationKey];
        }
      });
    }
    
    var needHashDerivations = stringType || objectType;

    var applicableDerivations = Object.assign({},
      hasDateFields ? AttributeUi.dateFields : undefined,
      hasTimeFields ? AttributeUi.timeFields : undefined,
      hasTextDerivations ? AttributeUi.textDerivations : undefined,
      hasUUIDDerivations ? AttributeUi.uuidDerivations : undefined,
      needHashDerivations ? hashDerivations : undefined
    );
    return applicableDerivations;
  }

  static getDerivationInfo(derivationName){
    var derivations = Object.assign({},
      AttributeUi.tupleNumberDerivations,
      AttributeUi.dateFields,
      AttributeUi.timeFields,
      AttributeUi.textDerivations,
      AttributeUi.hashDerivations,
      AttributeUi.uuidDerivations,
      AttributeUi.arrayDerivations,
      AttributeUi.arrayStatisticsDerivations,
      AttributeUi.mapDerivations
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
    var arrayDerivations = Object.assign(AttributeUi.arrayDerivations);
    var arrayStatisticsDerivations = AttributeUi.arrayStatisticsDerivations;
    var applicableAggregators = AttributeUi.getApplicableAggregators(typeName);
    Object.keys(applicableAggregators).forEach(function(aggregator){
      var arrayStatisticsDerivation = arrayStatisticsDerivations[aggregator];
      if (!arrayStatisticsDerivation) {
        return;
      }
      arrayDerivations[aggregator] = arrayStatisticsDerivations[aggregator];
    });
    return arrayDerivations;
  }
  
  static getMapDerivations(typeName){
    var mapDerivations = Object.assign(AttributeUi.mapDerivations);
    return mapDerivations;
  }

  static #getUiNodeCaption(config){
    var nodeType = config.type; 
    var caption;
    switch ( nodeType ){
      case 'column':
        caption = config.profile.column_name;
        break;
      case 'member':
        var memberExpressionPath = config.profile.memberExpressionPath;
        var tmp = [].concat(memberExpressionPath);
        caption = tmp.pop();
        break;
      case 'derived':
        caption = config.derivation;
        break;
      case 'aggregate':
        caption = config.aggregator;
        break;
      default:
        console.warn(`Don't know how to create caption for node of type ${nodeType}`)
    }
    return caption;
  }
  
  static #getUiNodeColumnExpression(config){
    var columnExpression = config.profile.column_name;
    columnExpression = quoteIdentifierWhenRequired(columnExpression);
    var memberExpressionPath = config.profile.memberExpressionPath;
    if (memberExpressionPath){
      columnExpression = `${columnExpression}.${memberExpressionPath.join('.')}`;
    }
    return columnExpression;
  }
  
  static #getUiNodeTitle(config){
    var columnExpression = AttributeUi.#getUiNodeColumnExpression(config);
    
    var title = config.title;
    if (title){
      return title;
    }
    
    switch (config.type) {
      case 'column':
        title = `${config.profile.column_type}`;
        break;
      case 'member':
        title = `${config.columnType} ${columnExpression}`;
        break;
      case 'aggregate':
      case 'derived':
        title = columnExpression;
        var expressionTemplate;
        var derivation = config.derivation;
        if (derivation) {
          var derivationInfo = AttributeUi.getDerivationInfo(derivation);
          expressionTemplate = derivationInfo.expressionTemplate;
          title = extrapolateColumnExpression(expressionTemplate, title);
        }
        var aggregator = config.aggregator;
        if (aggregator){
          var aggregatorInfo = AttributeUi.getAggregatorInfo(aggregator);
          expressionTemplate = aggregatorInfo.expressionTemplate;
          title = extrapolateColumnExpression(expressionTemplate, title);
        }
        break;
    }
    return title;
  }
  
  static #getAttributeCaptionForAxisButton(config, aggregator){
    if (aggregator && !config.aggregator) {
      var aggregatorInfo = AttributeUi.aggregators[aggregator];
      config = Object.assign({}, config);
      config.aggregator = aggregator;
      config.expressionTemplate = aggregatorInfo.expressionTemplate;
      config.type = 'aggregate';
    }
    var caption;
    switch (config.type) {
      case 'column':
      case 'member':
        caption = AttributeUi.#getUiNodeColumnExpression(config);
        break;
      default:
        caption = AttributeUi.#getUiNodeTitle(config);
    }
    return caption;
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
    try {
      var eventData = event.eventData;
      var propertiesChanged = eventData.propertiesChanged;
      if (!propertiesChanged) {
        return;
      }
      var datasourceChanged = eventData.propertiesChanged.datasource;
      if (!datasourceChanged){
        return;
      }
      var newDatasource = eventData.propertiesChanged.datasource.newValue;
      if (newDatasource) {
        this.clear(true);
        var columnMetadata = await newDatasource.getColumnMetadata();
        this.render(columnMetadata);
      }
      else {
        this.clear(false);
      }
    }
    catch(e){
      showErrorDialog(e);
      this.clear();
    }
    finally {
      this.#updateState();
    }
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

  #updateAxisButtonTitle(input){
    var label = input.parentNode;
    var title = label.getAttribute(`data-title-${input.checked ? '' : 'un'}checked`);
    label.setAttribute('title', title);
  }

  async #axisButtonClicked(node, axis, checked){
    var head = node.querySelector('summary');
    var inputs = head.querySelectorAll('input');
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
  
          this.#updateAxisButtonTitle(input);
  
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
    var title;
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

    var derivation = config.derivation;
    if (derivation){
      id += `_${derivation}`;
    }
    var aggregator = config.aggregator;
    if (aggregator){
      id += `_${aggregator}`;
    }

    var analyticalRole = 'attribute';

    var dummyButtonTemplate = 'attribute-node-axis-dummybutton';
    var axisButtonTemplate = dummyButtonTemplate;
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
            id += `_${axisId}`;
            axisButtonTemplate = 'attribute-node-axis-checkbox';
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
            axisButtonTemplate = 'attribute-node-axis-checkbox';
            break;
          default:
        }
        break;
      default:
    }

    var axisButton = instantiateTemplate(axisButtonTemplate);
    axisButton.setAttribute('data-axis', axisId);
    if (axisButtonTemplate === dummyButtonTemplate){
      return axisButton;
    }

    var attributeCaption = AttributeUi.#getAttributeCaptionForAxisButton(config, aggregator);
    
    var translatedAttributeCaption = Internationalization.getText(attributeCaption) || attributeCaption;
    
    var checkedTitleKey = `Click to remove {1} from the ${axisId}-axis`;
    var checkedTitle = Internationalization.getText(checkedTitleKey, translatedAttributeCaption);
    axisButton.setAttribute('data-title-checked', checkedTitle);
    
    var uncheckedTitleKey = `Click to add {1} to the ${axisId}-axis`;
    var uncheckedTitle = Internationalization.getText(uncheckedTitleKey, translatedAttributeCaption);
    axisButton.setAttribute('data-title-unchecked', uncheckedTitle);
    
    axisButton.setAttribute('title', uncheckedTitle);

    axisButton.setAttribute('for', id);
    var axisButtonInput = axisButton.querySelector('input');
    axisButtonInput.setAttribute('id', id);
    axisButtonInput.setAttribute('data-axis', axisId);

    if (aggregator && axisId === QueryModel.AXIS_CELLS) {
      axisButtonInput.setAttribute('data-aggregator', aggregator);
    }

    if (config.derivation){
      axisButtonInput.setAttribute('data-derivation', config.derivation);
    }
    return axisButton;
  }

  #renderAttributeUiNodeAxisButtons(config, head){
    var rowButton = this.#renderAttributeUiNodeAxisButton(config, head, 'rows');
    head.appendChild(rowButton);

    var columnButton = this.#renderAttributeUiNodeAxisButton(config, head, 'columns');
    head.appendChild(columnButton);

    var cellsButton = this.#renderAttributeUiNodeAxisButton(config, head, 'cells');
    head.appendChild(cellsButton);

    var filterButton = this.#renderAttributeUiNodeAxisButton(config, head, 'filters');
    head.appendChild(filterButton);
  }

  #renderAttributeUiNodeHead(node, config) {
    var head = node.querySelector('summary');

    var caption = AttributeUi.#getUiNodeCaption(config);
    var title = AttributeUi.#getUiNodeTitle(config);
    
    var label = head.querySelector('span');
    switch (config.type) {
      case 'derived':
      case 'aggregate':
        Internationalization.setTextContent(label, caption);
        caption = Internationalization.getText(caption) || caption;
        break;
      default:
        label.textContent = caption;
    }
    setAttributes(label, {
      "class": 'label',
      "title": `${caption}: ${title}`,
      "draggable": true
    });

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
    data['application/json'] = queryAxisItem;
    DragAndDropHelper.addTextDataForQueryItem(queryAxisItem, data);
    
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
    var node = instantiateTemplate('attribute-node', attributes);

    var derivation = config.derivation;
    switch (config.type){
      case 'column':
      case 'member':
        node.addEventListener('toggle', this.#toggleNodeState.bind(this) );
        break;
      case 'aggregate':
        node.setAttribute('data-aggregator', config.aggregator);
        if (derivation){
          node.setAttribute('data-derivation', derivation);
        }
        break;
      case 'derived':
        node.setAttribute('data-derivation', derivation);
        node.addEventListener('toggle', this.#toggleNodeState.bind(this) );
        break;
      default:
        throw new Error(`Invalid node type "${config.type}".`);
    }

    this.#renderAttributeUiNodeHead(node, config);

    // for STRUCT columns and members, preload the child nodes (instead of lazy load)
    // this is necessary so that a search will always find all applicable attributes
    // with lazy load it would only find whatever happens to be visited/browsed already.
    var typeToCheckIfChildnodesAreNeeded;
    switch (config.type){
      case 'derived':
        if (['elements'].indexOf(derivation) === -1) {
          break;
        }
        typeToCheckIfChildnodesAreNeeded = config.profile.memberExpressionType;
        break;
      case 'column':
        typeToCheckIfChildnodesAreNeeded = columnType;
        break;
      case 'member':
        typeToCheckIfChildnodesAreNeeded = config.profile.memberExpressionType;
        break;
    }
    if (
      typeToCheckIfChildnodesAreNeeded && (
        isStructType(typeToCheckIfChildnodesAreNeeded) || 
        isMapType(typeToCheckIfChildnodesAreNeeded) ||
        isArrayType(typeToCheckIfChildnodesAreNeeded)
      )
    ) {
      this.#loadChildNodes(node);
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
    
    // generic rownum
    var rownumNode = this.#renderAttributeUiNode({
      type: 'derived',
      title: 'row number',
      derivation: 'row number',
      profile: {
        column_name: '',
        column_type: 'INTEGER'
      }
    });
    attributesUi.appendChild(rownumNode);
    
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
    var node = instantiateTemplate('attribute-node', {
      'data-nodetype': 'folder'
    });
    var label = node.querySelector('span.label');
    Internationalization.setTextContent(label, config.caption);

    var filler = instantiateTemplate('attribute-node-axis-dummybutton', {
      'data-axis': 'none'
    });
    node.querySelector('summary').appendChild(filler);

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

      var afterLastFolder = node.querySelector(':scope > [data-nodetype=folder] + *:not( [data-nodetype=folder] )');
      if (afterLastFolder){
        node.insertBefore(folderNode, afterLastFolder);
      }
      else {
        node.appendChild(folderNode);
      }
      return acc;
    }.bind(this), {});
    return folders;
  }

  #loadMemberChildNodes(node, typeName, profile, noFolder){
    var folderNode = noFolder ? undefined : this.#renderFolderNode({caption: 'structure'});
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
      (folderNode || node).appendChild(memberNode);
    }
    if (folderNode) {
      node.appendChild(folderNode);
    }
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
          memberExpressionType = getArrayElementType(memberExpressionType);
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

  #loadMapChildNodes(node, typeName, profile){
    var mapDerivations = AttributeUi.getMapDerivations(typeName);
    var folders = this.#createFolders(mapDerivations, node);
    for (var derivationName in mapDerivations) {
      var derivation = mapDerivations[derivationName];
      var nodeProfile; 
      var memberExpressionType = profile.memberExpressionType || profile.column_type;
      var memberExpressionPath;
      switch (derivationName) {
        case 'entries':
        case 'entry keys':
        case 'keyset':
        case 'entry values':
          nodeProfile = JSON.parse(JSON.stringify(profile));
          if (!nodeProfile.memberExpressionPath) {
            nodeProfile.memberExpressionPath = [];
          }
          break;
        default:
          nodeProfile = profile;
      }

      switch (derivationName) {
        case 'entries':
          nodeProfile.memberExpressionType = getArrayElementType(getMapEntriesType(memberExpressionType));
          nodeProfile.memberExpressionPath.push('map_entries()');
          nodeProfile.memberExpressionPath.push(derivation.unnestingFunction + '()');
          break;
        case 'entry keys':
          nodeProfile.memberExpressionType = getMemberExpressionType(memberExpressionType, 'key');
          nodeProfile.memberExpressionPath.push('map_keys()');
          nodeProfile.memberExpressionPath.push(derivation.unnestingFunction + '()');
          break;
        case 'entry values':
          nodeProfile.memberExpressionType = getMemberExpressionType(memberExpressionType, 'value');
          nodeProfile.memberExpressionPath.push('map_values()');
          nodeProfile.memberExpressionPath.push(derivation.unnestingFunction  + '()');
          break;
        case 'keyset':
          nodeProfile.memberExpressionType = getMemberExpressionType(memberExpressionType, 'key') + '[]';
          break;
        case 'valuelist':
          nodeProfile.memberExpressionType = getMemberExpressionType(memberExpressionType, 'value') + '[]';
          break;
      }

      var config = {
        type: 'derived',
        derivation: derivationName,
        title: derivation.title,
        profile: nodeProfile
      };
      var childNode = this.#renderAttributeUiNode(config);
      if (derivationName === 'entries'){
        this.#loadMemberChildNodes(childNode, nodeProfile.memberExpressionType, nodeProfile, true);
      }
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
        derivation: profile.derivation,
        title: aggregator.title,
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

    var nodeType = node.getAttribute('data-nodetype');
    var derivation;
    if (nodeType === 'derived'){
      derivation = node.getAttribute('data-derivation');
      profile.derivation = derivation;
    }

    var expressionType = memberExpressionType || columnType;
    var typeName = getDataTypeNameFromColumnType(expressionType);

    if (
      nodeType !== 'derived' ||
      ['elements'].indexOf(derivation) !== -1
    ){
      // only load these derivations if we're not ourself a derived node.
      if (isArrayType(expressionType)){
        this.#loadArrayChildNodes(node, typeName, profile);
      }
      else
      if (isMapType(expressionType)){ 
        this.#loadMapChildNodes(node, typeName, profile);
      }
      else
      if (isStructType(expressionType)){
        this.#loadMemberChildNodes(node, typeName, profile);
      }
    }

    switch (nodeType){
      case 'derived':
        if (['elements'].indexOf(derivation) === -1){
          break;
        }
      case 'column':
      case 'member':
        this.#loadDerivationChildNodes(node, typeName, profile);
    }

    switch (nodeType) {
      case 'derived':
      case 'column':
      case 'member':
        this.#loadAggregatorChildNodes(node, typeName, profile);
    }
    
  }

  #toggleNodeState(event){
    var node = event.target;
    if (event.newState !== 'open'){
      return;
    }
    if (node.querySelector('details') !== null){
      return;
    }
    this.#loadChildNodes(node);
    this.#updateState();
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
        if (!item.columnName) {
          continue;
        }
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
      var descendants = attributeNode.querySelectorAll('details');
      if (descendants.length > 0) {
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
      this.#updateAxisButtonTitle(input);
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