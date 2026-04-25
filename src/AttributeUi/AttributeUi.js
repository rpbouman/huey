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
        const formatter = createNumberFormatter(true);
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
        const formatter = createNumberFormatter(true);
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
        const columnType = QueryAxisItem.getQueryAxisItemDataType(axisItem);
        const dataTypeInfo = getDataTypeInfo(columnType);
        if (dataTypeInfo.isNumeric) {
          const formatter = createNumberFormatter(dataTypeInfo.isInteger !== true);
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
        const columnType = axisItem.columnType;
        const dataTypeInfo = getDataTypeInfo(columnType);
        const isInteger = dataTypeInfo.isInteger;
        const formatter = createNumberFormatter(isInteger !== true);

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
  .filter(aggregator => {
    const aggregatorInfo = AttributeUi.aggregators[aggregator];
    return aggregatorInfo.folder !== 'list aggregators';
  })
  .reduce((arrayStatisticsDerivations, aggregator) => {
    const aggregatorInfo = AttributeUi.aggregators[aggregator];
    const aggregateFunction = aggregatorInfo.expressionTemplate.split('(')[0];
    const derivationInfo = Object.assign({}, aggregatorInfo);
    if (derivationInfo.preservesColumnType){
      derivationInfo.hasElementDataType = true; 
      delete derivationInfo.preservesColumnType;
    }
    derivationInfo.folder = `array statistics`;
    let expressionTemplate;
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
    }
  };
  
  static geometryDerivations = {
    'Dim. qualifier': {
      folder: 'Geometry',
      expressionTemplate: 'regexp_extract( ST_asWKT( ${columnExpression} ), \'^[^ ]+ ?([ZM]+)? ?\', 1)',
      columnType: 'VARCHAR'
    },
    'Geo Type': {
      folder: 'Geometry',
      expressionTemplate: 'regexp_extract( ST_asWKT( ${columnExpression} ), \'^[^ ]+\' )',
      columnType: 'VARCHAR'
    },
    WKB: {
      folder: 'Geometry',
      expressionTemplate: 'ST_AsWKB( ${columnExpression} )',
      columnType: 'BLOB'
    },
    WKT: {
      folder: 'Geometry',
      expressionTemplate: 'ST_AsWKT( ${columnExpression} )',
      columnType: 'VARCHAR'
    }
  };
  
  static timestampFields = {
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
  }

  static timeFields = {
    'iso-time': {
      folder: 'time fields',
      expressionTemplate: [
        'HOUR( ${columnExpression} )',
        'MINUTE( ${columnExpression} )',
        'SECOND( ${columnExpression} )',
      ].map( expression => `RIGHT( '0'||${expression}, 2 )`).join(`||':'||`),
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
    'hash': {
      folder: 'hashes',
      expressionTemplate: 'hash( ${columnExpression} )',
      columnType: 'UBIGINT'
    },
    'md5 (hex)': {
      folder: 'hashes',
      expressionTemplate: 'md5( ${columnExpression} )',
      columnType: 'VARCHAR',
      forString: true
    },
    'md5': {
      folder: 'hashes',
      expressionTemplate: 'md5_number( ${columnExpression} )',
      columnType: 'HUGEINT',
      forString: true
    },
    'md5 low': {
      folder: 'hashes',
      expressionTemplate: 'md5_number_lower( ${columnExpression} )',
      columnType: 'UBIGINT',
      forString: true
    },
    'md5 high': {
      folder: 'hashes',
      expressionTemplate: 'md5_number_upper( ${columnExpression} )',
      columnType: 'UBIGINT',
      forString: true
    },
    'sha-1': {
      folder: 'hashes',
      expressionTemplate: 'sha1( ${columnExpression} )',
      columnType: 'VARCHAR',
      forString: true
    },
    'sha-256': {
      folder: 'hashes',
      expressionTemplate: 'sha256( ${columnExpression} )',
      columnType: 'VARCHAR',
      forString: true
    }
  };

  static textDerivations = {
    'base64': {
      folder: 'string operations',
      expressionTemplate: "base64( ${columnExpression} )",
      columnType: 'VARCHAR'
    },
    'first letter': {
      folder: 'string operations',
      expressionTemplate: "upper( ${columnExpression}[1] )",
      columnType: 'VARCHAR'
    },
    'length': {
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

  static blobDerivations = {
    'base64': {
      folder: 'BLOB operations',
      expressionTemplate: "base64( ${columnExpression} )",
      columnType: 'VARCHAR'
    },
    'hex': {
      folder: 'BLOB operations',
      expressionTemplate: "hex( ${columnExpression} )",
      columnType: 'VARCHAR'
    },
    'octet-length': {
      folder: 'BLOB operations',
      expressionTemplate: "octet_length( ${columnExpression} )",
      columnType: 'BIGINT'
    },
    'string': {
      folder: 'BLOB operations',
      expressionTemplate: "decode( ${columnExpression} )",
      columnType: 'VARCHAR'
    },
  };

  static enumDerivations = {
    'code': {
      folder: 'enum',
      expressionTemplate: 'enum_code( ${columnExpression} )',
      columnType: 'INTEGER'
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
    const typeInfo = getDataTypeInfo(typeName) || {};
    
    const hashDerivations = Object.assign({}, AttributeUi.hashDerivations);
    
    const geometryType = typeName === 'GEOMETRY';
    const arrayType = typeName === 'ARRAY';
    const mapType = typeName === 'MAP';
    const structType = typeName === 'STRUCT';
    // note: for this purpose, the JSON data type is treated as string.
    const stringType = isStringType(typeName) || typeName === 'JSON';
    let objectType;
    if (!stringType) {
      objectType =  arrayType || mapType || structType;
    }
    
    if (objectType){
      Object.keys(hashDerivations).forEach(function(hashDerivationKey){
        const hashDerivation = hashDerivations[hashDerivationKey];
        if (hashDerivation.forString) {
          delete hashDerivations[hashDerivationKey];
        }
      });
    }
    
    const needHashDerivations = stringType || objectType;
    const applicableDerivations = Object.assign({},
      Boolean(typeInfo.hasDateFields) ? AttributeUi.dateFields : undefined,
      Boolean(typeInfo.hasTimeFields) ? AttributeUi.timeFields : undefined,
      Boolean(typeInfo.hasTimestampFields) ? AttributeUi.timestampFields : undefined,
      Boolean(typeInfo.hasTextDerivations) ? AttributeUi.textDerivations : undefined,
      Boolean(typeInfo.hasBlobDerivations) ? AttributeUi.blobDerivations : undefined,
      Boolean(typeInfo.hasEnumDerivations) ? AttributeUi.enumDerivations : undefined,
      Boolean(typeInfo.hasUUIDDerivations) ? AttributeUi.uuidDerivations : undefined,
      geometryType ? AttributeUi.geometryDerivations : undefined,
      needHashDerivations ? hashDerivations : undefined
    );
    return applicableDerivations;
  }

  static getDerivationInfo(derivationName){
    const derivations = Object.assign({},
      AttributeUi.tupleNumberDerivations,
      AttributeUi.dateFields,
      AttributeUi.timeFields,
      AttributeUi.timestampFields,
      AttributeUi.textDerivations,
      AttributeUi.blobDerivations,
      AttributeUi.enumDerivations,
      AttributeUi.hashDerivations,
      AttributeUi.uuidDerivations,
      AttributeUi.arrayDerivations,
      AttributeUi.arrayStatisticsDerivations,
      AttributeUi.mapDerivations,
      AttributeUi.geometryDerivations
    );
    const derivationInfo = derivations[derivationName];
    return derivationInfo;
  }

  static getAggregatorInfo(aggregatorName){
    const aggregatorInfo = AttributeUi.aggregators[aggregatorName];
    return aggregatorInfo;
  }

  static getApplicableAggregators(typeName) {
    const typeInfo = getDataTypeInfo(typeName) || {};
    const isNumeric = Boolean(typeInfo.isNumeric);

    const applicableAggregators = {};
    for (let aggregationName in AttributeUi.aggregators) {
      const aggregator = AttributeUi.aggregators[aggregationName];
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
    const arrayDerivations = Object.assign({}, AttributeUi.arrayDerivations);
    const arrayStatisticsDerivations = AttributeUi.arrayStatisticsDerivations;
    const applicableAggregators = AttributeUi.getApplicableAggregators(typeName);
    Object.keys(applicableAggregators).forEach(function(aggregator){
      const arrayStatisticsDerivation = arrayStatisticsDerivations[aggregator];
      if (!arrayStatisticsDerivation) {
        return;
      }
      arrayDerivations[aggregator] = arrayStatisticsDerivations[aggregator];
    });
    return arrayDerivations;
  }
  
  static getMapDerivations(typeName){
    const mapDerivations = Object.assign(AttributeUi.mapDerivations);
    return mapDerivations;
  }

  static #getUiNodeCaption(config){
    const nodeType = config.type; 
    let caption;
    switch ( nodeType ){
      case 'column':
        caption = config.profile.column_name;
        break;
      case 'member':
        const memberExpressionPath = config.profile.memberExpressionPath;
        const tmp = [].concat(memberExpressionPath);
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
    let columnExpression = config.profile.column_name;
    columnExpression = quoteIdentifierWhenRequired(columnExpression);
    const memberExpressionPath = config.profile.memberExpressionPath;
    if (memberExpressionPath){
      columnExpression = `${columnExpression}.${memberExpressionPath.join('.')}`;
    }
    return columnExpression;
  }
  
  static #getUiNodeTitle(config){
    const columnExpression = AttributeUi.#getUiNodeColumnExpression(config);
    
    let title = config.title;
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
        let expressionTemplate;
        const derivation = config.derivation;
        if (derivation) {
          const derivationInfo = AttributeUi.getDerivationInfo(derivation);
          expressionTemplate = derivationInfo.expressionTemplate;
          title = extrapolateColumnExpression(expressionTemplate, title);
        }
        const aggregator = config.aggregator;
        if (aggregator){
          const aggregatorInfo = AttributeUi.getAggregatorInfo(aggregator);
          expressionTemplate = aggregatorInfo.expressionTemplate;
          title = extrapolateColumnExpression(expressionTemplate, title);
        }
        break;
    }
    return title;
  }
  
  static #getAttributeCaptionForAxisButton(config, aggregator){
    if (aggregator && !config.aggregator) {
      const aggregatorInfo = AttributeUi.aggregators[aggregator];
      config = Object.assign({}, config);
      config.aggregator = aggregator;
      config.expressionTemplate = aggregatorInfo.expressionTemplate;
      config.type = 'aggregate';
    }
    let caption;
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

    const dom = this.getDom();
    dom.addEventListener('click', event => this.#clickHandler(event) );
    dom.addEventListener('dragstart', event => this.#dragStartHandler(event) );
    dom.addEventListener('toggle', event => this.#toggleNodeState(event), { capture: true });
    this.#queryModel.addEventListener('change', event => this.#queryModelChangeHandler(event) );
  }

  async #queryModelChangeHandler(event){
    try {
      const eventData = event.eventData;
      const propertiesChanged = eventData.propertiesChanged;
      if (!propertiesChanged) {
        return;
      }
      const datasourceChanged = eventData.propertiesChanged.datasource;
      if (!datasourceChanged){
        return;
      }
      const newDatasource = eventData.propertiesChanged.datasource.newValue;
      if (newDatasource) {
        this.clear(true);
        const columnMetadata = await newDatasource.getColumnMetadata();
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
    const target = event.target;
    if (target.tagName !== 'LABEL'){
      return; 
    }
    const node = getAncestorWithTagName(target, 'details');
    if (!node) {
      return;
    }

    const classNames = getClassNames(target);
    if (!classNames) {
      return;
    }
    if ( !classNames.includes('attributeUiAxisButton') ){
      return;
    }
    const input = target.getElementsByTagName('input').item(0);
    const axisId = target.getAttribute('data-axis');
    setTimeout(() => {
      this.#axisButtonClicked(node, axisId, input.checked);
    }, 0);
  }
  
  #createQueryAxisItemForAttributeUiNode(node){
    const columnName = node.getAttribute('data-column_name');
    const columnType = node.getAttribute('data-column_type');

    let memberExpressionPath = node.getAttribute('data-member_expression_path');
    if (memberExpressionPath) {
      memberExpressionPath = JSON.parse(memberExpressionPath);
    }

    const derivation = node.getAttribute('data-derivation');
    const aggregator = node.getAttribute('data-aggregator');

    const itemConfig = {
      columnName: columnName,
      columnType: columnType,
      derivation: derivation,
      aggregator: aggregator,
      memberExpressionPath: memberExpressionPath
    };
    return itemConfig;
  }

  #updateAxisButtonTitle(input){
    const label = input.parentNode;
    const argsAttribute = label.getAttribute('data-i18n-native-title-args');
    const args = JSON.parse(argsAttribute);
    const titleTemplate = label.getAttribute(`data-title-${input.checked ? '' : 'un'}checked`);
    args.unshift(titleTemplate)
    const translatedTitle = Internationalization.getText.apply(Internationalization, args);
    label.setAttribute( 'title', translatedTitle );
  }

  async #axisButtonClicked(node, axis, checked){
    const head = node.querySelector('summary');
    const inputs = head.querySelectorAll('input');
    let aggregator;
    switch (axis){
      case QueryModel.AXIS_ROWS:
      case QueryModel.AXIS_COLUMNS:
      case QueryModel.AXIS_CELLS:
        // implement mutual exclusive axes (either rows or columns, not both)
        for (let i = 0; i < inputs.length; i++){
          const input = inputs.item(i);
          const inputAxis = input.getAttribute('data-axis');
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

    const itemConfig = this.#createQueryAxisItemForAttributeUiNode(node);
    itemConfig.axis = axis;

    if (aggregator) {
      itemConfig.aggregator = aggregator;
    }

    const queryModel = this.#queryModel;
    if (checked) {
      await queryModel.addItem(itemConfig);
    }
    else {
      queryModel.removeItem(itemConfig);
    }
  }

  #renderAttributeUiNodeAxisButton(config, head, axisId){
    let columnExpression = config.profile.column_name;
    const memberExpressionPath = config.profile.memberExpressionPath;
    if (memberExpressionPath){
      columnExpression = `${columnExpression}.${memberExpressionPath.join('.')}`;
    }

    const name = `${config.type}_${columnExpression}`;
    let id = `${name}`;

    const derivation = config.derivation;
    if (derivation){
      id += `_${derivation}`;
    }
    let aggregator = config.aggregator;
    if (aggregator){
      id += `_${aggregator}`;
    }

    let analyticalRole = 'attribute';

    const dummyButtonTemplate = 'attribute-node-axis-dummybutton';
    let axisButtonTemplate = dummyButtonTemplate;
    switch (config.type) {
      case 'column':
      case 'member':
        const columnType = config.columnType || config.profile.column_type;
        const dataTypeInfo = getDataTypeInfo(columnType);
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

    const axisButton = instantiateTemplate(axisButtonTemplate);
    axisButton.setAttribute('data-axis', axisId);
    if (axisButtonTemplate === dummyButtonTemplate){
      return axisButton;
    }

    const attributeCaption = AttributeUi.#getAttributeCaptionForAxisButton(config, aggregator);
    
    const translatedAttributeCaption = Internationalization.getText(attributeCaption) || attributeCaption;
    
    const checkedTitleKey = `Click to remove {1} from the ${axisId}-axis`;
    axisButton.setAttribute('data-title-checked', checkedTitleKey);
    
    const uncheckedTitleKey = `Click to add {1} to the ${axisId}-axis`;
    axisButton.setAttribute('data-title-unchecked', uncheckedTitleKey);

    Internationalization.setAttributes(axisButton, 'title', uncheckedTitleKey, attributeCaption);

    axisButton.setAttribute('for', id);
    const axisButtonInput = axisButton.querySelector('input');
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
    const rowButton = this.#renderAttributeUiNodeAxisButton(config, head, 'rows');
    head.appendChild(rowButton);

    const columnButton = this.#renderAttributeUiNodeAxisButton(config, head, 'columns');
    head.appendChild(columnButton);

    const cellsButton = this.#renderAttributeUiNodeAxisButton(config, head, 'cells');
    head.appendChild(cellsButton);

    const filterButton = this.#renderAttributeUiNodeAxisButton(config, head, 'filters');
    head.appendChild(filterButton);
  }

  #renderAttributeUiNodeHead(node, config) {
    const head = node.querySelector('summary');

    let caption = AttributeUi.#getUiNodeCaption(config);
    const title = AttributeUi.#getUiNodeTitle(config);
    
    const label = head.querySelector('span');
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
    const data = {};
    
    const element = event.target;
    const summary = element.parentNode;
    const details = summary.parentNode;
    const queryAxisItem = this.#createQueryAxisItemForAttributeUiNode(details);
        
    let itemId = QueryAxisItem.getIdForQueryAxisItem(queryAxisItem);
    // if this is an aggregat item, mark that
    if (queryAxisItem.aggregator) {
      data.aggregator = {key: queryAxisItem.aggregator, value: queryAxisItem.aggregator};
    }
    else {
      // if this is not an aggregate item, then this attribute ui item could have a default aggregator
      const defaultAggregatorInput = summary.querySelector('label[data-axis=cells] > input[type=checkbox]');
      if (defaultAggregatorInput) {
        const defaultAggregator = defaultAggregatorInput.getAttribute('data-aggregator');
        // since this item could be dropped on the cells axis,
        // we should check if the cells axis already contains an item that would result from applying the default aggregator
        const copyOfQueryAxisItem = Object.assign({}, queryAxisItem);
        copyOfQueryAxisItem.axis = QueryModel.AXIS_CELLS;
        copyOfQueryAxisItem.aggregator = defaultAggregator;
        const cellsAxisItem = this.#queryModel.findItem(copyOfQueryAxisItem);
        itemId = cellsAxisItem ? QueryAxisItem.getIdForQueryAxisItem(cellsAxisItem) : '';
        data.defaultaggregator = {key: itemId, value: defaultAggregator};
      }
    }
     
    // see if this item is already part of the query model
    const queryModelItem = this.#queryModel.findItem(queryAxisItem);
    if (queryModelItem) {
      queryAxisItem.axis = queryModelItem.axis;
      data.axis = {key: queryAxisItem.axis, value: queryAxisItem.axis};
      queryAxisItem.index = queryModelItem.index;
      data.index = {key: queryAxisItem.index, value: queryAxisItem.index};
      data.id = {key: itemId, value: itemId};
    }
    
    const filtersAxis = this.#queryModel.getFiltersAxis();
    const filtersAxisItem = filtersAxis.findItem(queryAxisItem);
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
    const dataTransfer = event.dataTransfer;
    dataTransfer.dropEffect = dataTransfer.effectAllowed = queryModelItem ? 'move' : 'all';
    dataTransfer.setDragImage(element, -20, 0);
  }

  #renderAttributeUiNode(config){
    const columnType = config.profile.column_type;
    const attributes = {
      role: 'treeitem',
      'data-nodetype': config.type,
      'data-column_name': config.profile.column_name,
      'data-column_type': columnType
    };
    const memberExpressionPath = config.profile.memberExpressionPath;
    if (memberExpressionPath) {
      attributes['data-member_expression_path'] = JSON.stringify(memberExpressionPath);
      attributes['data-member_expression_type'] = config.profile.memberExpressionType;
    }
    const node = instantiateTemplate('attribute-node', attributes);

    const derivation = config.derivation;
    switch (config.type){
      case 'column':
      case 'member':
        break;
      case 'aggregate':
        node.setAttribute('data-aggregator', config.aggregator);
        if (derivation){
          node.setAttribute('data-derivation', derivation);
        }
        break;
      case 'derived':
        node.setAttribute('data-derivation', derivation);
        break;
      default:
        throw new Error(`Invalid node type "${config.type}".`);
    }

    this.#renderAttributeUiNodeHead(node, config);

    // for STRUCT columns and members, preload the child nodes (instead of lazy load)
    // this is necessary so that a search will always find all applicable attributes
    // with lazy load it would only find whatever happens to be visited/browsed already.
    let typeToCheckIfChildnodesAreNeeded;
    switch (config.type){
      case 'derived':
        if ( derivation !== 'elements' ) {
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
    const attributesUi = this.getDom();
    const content = showBusy ? '<div class="loader loader-medium"></div>' : '';
    attributesUi.innerHTML = content;
  }

  render(columnSummary){
    this.clear();
    const attributesUi = this.getDom();

    // generic count(*) node
    const countAllNode = this.#renderAttributeUiNode({
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
    const rownumNode = this.#renderAttributeUiNode({
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
    for (let i = 0; i < columnSummary.numRows; i++){
      const row = columnSummary.get(i);
      const node = this.#renderAttributeUiNode({
        type: 'column',
        profile: row.toJSON()
      });
      attributesUi.appendChild(node);
    }
  }

  #renderFolderNode(config){
    const node = instantiateTemplate('attribute-node', {
      'data-nodetype': 'folder'
    });
    const label = node.querySelector('span.label');
    Internationalization.setTextContent(label, config.caption);

    const filler = instantiateTemplate('attribute-node-axis-dummybutton', {
      'data-axis': 'none'
    });
    node.querySelector('summary').appendChild(filler);

    return node;
  }

  #createFolders(itemsObject, node){
    const folders = Object.keys(itemsObject).reduce((acc, curr) => {
      const object = itemsObject[curr];
      const folder = object.folder;
      if (!folder) {
        return acc;
      }

      if (acc[folder]) {
        return acc;
      }

      const folderNode = this.#renderFolderNode({caption: folder});
      acc[folder] = folderNode;

      const selector = ':scope > [data-nodetype=folder] + *:not( [data-nodetype=folder] )';
      const afterLastFolder = node.querySelector(selector);
      if (afterLastFolder){
        node.insertBefore(folderNode, afterLastFolder);
      }
      else {
        node.appendChild(folderNode);
      }
      return acc;
    }, {});
    return folders;
  }

  #loadMemberChildNodes(node, typeName, profile, noFolder){
    const folderNode = noFolder ? undefined : this.#renderFolderNode({caption: 'structure'});
    const columnType = profile.memberExpressionType || profile.column_type;
    const memberExpressionPath = profile.memberExpressionPath || [];
    const structure = getStructTypeDescriptor(columnType);
    for (let memberName in  structure){
      const memberType = structure[memberName];
      const config = {
        type: 'member',
        columnType: memberType,
        profile: {
          column_name: profile.column_name,
          column_type: profile.column_type,
          memberExpressionPath: memberExpressionPath.concat([memberName]),
          memberExpressionType: memberType
        }
      }
      const memberNode = this.#renderAttributeUiNode(config);
      (folderNode || node).appendChild(memberNode);
    }
    if (folderNode) {
      node.appendChild(folderNode);
    }
  }

  #loadDerivationChildNodes(node, typeName, profile){
    const applicableDerivations = AttributeUi.getApplicableDerivations(typeName);
    const folders = this.#createFolders(applicableDerivations, node);
    for (let derivationName in applicableDerivations) {
      const derivation = applicableDerivations[derivationName];
      const config = {
        type: 'derived',
        derivation: derivationName,
        title: derivation.title,
        profile: profile
      };
      const childNode = this.#renderAttributeUiNode(config);
      if (derivation.folder) {
        folders[derivation.folder].appendChild(childNode);
      }
      else {
        node.appendChild(childNode);
      }
    }
  }

  #loadArrayChildNodes(node, typeName, profile){
    const arrayDerivations = AttributeUi.getArrayDerivations(typeName);
    const folders = this.#createFolders(arrayDerivations, node);
    for (let derivationName in arrayDerivations) {
      const derivation = arrayDerivations[derivationName];
      let nodeProfile;
      if (derivation.unnestingFunction) {
        nodeProfile = JSON.parse(JSON.stringify(profile));
        const memberExpressionPath = nodeProfile.memberExpressionPath || [];
        memberExpressionPath.push(derivation.unnestingFunction + '()');
        nodeProfile.memberExpressionPath = memberExpressionPath;
        let memberExpressionType = derivation.columnType;
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
      const config = {
        type: 'derived',
        derivation: derivationName,
        title: derivation.title,
        profile: nodeProfile
      };
      const childNode = this.#renderAttributeUiNode(config);
      if (derivation.folder) {
        folders[derivation.folder].appendChild(childNode);
      }
      else {
        node.appendChild(childNode);
      }
    }
  }

  #loadMapChildNodes(node, typeName, profile){
    const mapDerivations = AttributeUi.getMapDerivations(typeName);
    const folders = this.#createFolders(mapDerivations, node);
    for (const derivationName in mapDerivations) {
      const derivation = mapDerivations[derivationName];
      let nodeProfile; 
      let memberExpressionType = profile.memberExpressionType || profile.column_type;
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

      const config = {
        type: 'derived',
        derivation: derivationName,
        title: derivation.title,
        profile: nodeProfile
      };
      const childNode = this.#renderAttributeUiNode(config);
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
    const applicableAggregators = AttributeUi.getApplicableAggregators(typeName);
    const folders = this.#createFolders(applicableAggregators, node);
    for (const aggregationName in applicableAggregators) {
      const aggregator = applicableAggregators[aggregationName];
      const config = {
        type: 'aggregate',
        aggregator: aggregationName,
        derivation: profile.derivation,
        title: aggregator.title,
        profile: profile
      };
      const childNode = this.#renderAttributeUiNode(config);
      if (aggregator.folder) {
        folders[aggregator.folder].appendChild(childNode);
      }
      else {
        node.appendChild(childNode);
      }
    }
  }

  #loadChildNodes(node){
    const columnName = node.getAttribute('data-column_name');
    const columnType = node.getAttribute('data-column_type');

    let memberExpressionPath;
    let memberExpressionType = node.getAttribute('data-member_expression_type');
    if (memberExpressionType) {
      memberExpressionPath = node.getAttribute('data-member_expression_path');
      memberExpressionPath = JSON.parse(memberExpressionPath);
    }

    const elementType = node.getAttribute('data-element_type');

    const profile = {
      column_name: columnName,
      column_type: columnType,
      memberExpressionType: memberExpressionType,
      memberExpressionPath: memberExpressionPath
    };

    const nodeType = node.getAttribute('data-nodetype');
    let derivation;
    if (nodeType === 'derived'){
      derivation = node.getAttribute('data-derivation');
      profile.derivation = derivation;
    }

    const expressionType = memberExpressionType || columnType;
    const typeName = getDataTypeNameFromColumnType(expressionType);

    if (
      nodeType !== 'derived' ||
      derivation === 'elements'
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
        if (derivation !== 'elements'){
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
    const node = event.target;
    const nodeType = node.getAttribute?.('data-nodetype');
    if (!['column', 'member', 'derived'].includes( nodeType )) {
      return;
    }  
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
    const queryModel = this.#queryModel;

    // to satisfy https://github.com/rpbouman/huey/issues/220, 
    // we need to ensure derivations and aggregates are loaded.
    
    // First we get the column names of those query items that have a derivation or aggregator
    const referencedColumns = {};
    const axisIds = queryModel.getAxisIds();
    for (const axisId of axisIds) {
      const queryAxis = queryModel.getQueryAxis(axisId);
      const items = queryAxis.getItems();
      for (const item of items) {
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
    const attributeNodes = this.getDom().childNodes;
    for (const attributeNode of attributeNodes) {
      if (attributeNode.nodeType !== 1 || attributeNode.nodeName !== 'DETAILS') {
        continue;
      }
      const columnName = attributeNode.getAttribute('data-column_name');
      if (referencedColumns[columnName] === undefined) {
        continue;
      }
      const descendants = attributeNode.querySelectorAll('details');
      if (descendants.length > 0) {
        continue;
      }
      this.#loadChildNodes(attributeNode);
    }
    
    // make sure all the selectors checkboxes are (un)checked according to the query state.
    const inputs = this.getDom().getElementsByTagName('input');
    for (const input of inputs) {
      const axisId = input.getAttribute('data-axis');

      const node = getAncestorWithTagName(input, 'details')
      const columnName = node.getAttribute('data-column_name');
      const aggregator = input.getAttribute('data-aggregator');
      const derivation = node.getAttribute('data-derivation');
      const memberExpressionPath = node.getAttribute('data-member_expression_path');

      const item = queryModel.findItem({
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
    const dom = this.getDom();
    const detailsList = document.querySelectorAll('.attributeUi details:has( details > summary > label > input[type=checkbox]:checked )');
    for (const details of detailsList) {
      details.setAttribute('open', 'true');
    }
  }

  getDom(){
    return byId(this.#id);
  }
}

let attributeUi;
function initAttributeUi(){
  attributeUi = new AttributeUi('attributeUi', queryModel);
}