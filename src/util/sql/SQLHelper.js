function getDataTypeNameFromColumnType(columnType){
  return /^[^\(]+/.exec(columnType)[0];
}

function getNullString(){
  var generalSettings = settings.getSettings('localeSettings');
  var nullString = generalSettings.nullString;
  return nullString;
}

function getTotalsString(axisItem){
  var generalSettings = settings.getSettings('localeSettings');
  var totalsString = generalSettings.totalsString;
  return totalsString;
}

function getLocales(){
  var localeSettings = settings.getSettings('localeSettings');
  var locales = localeSettings.locale;
  return locales;
}

function createNumberFormatter(fractionDigits){
  var localeSettings = settings.getSettings('localeSettings');
  var options = {
    minimumIntegerDigits: localeSettings.minimumIntegerDigits,
  };
  
  var intFormatter, decimalSeparator;
  var locales = getLocales();
  intFormatter = new Intl.NumberFormat(locales, Object.assign({maximumFractionDigits: 0}, options));
  if (fractionDigits){
    options.minimumFractionDigits = localeSettings.minimumFractionDigits;
    options.maximumFractionDigits = localeSettings.linkMinimumAndMaximumDecimals ? localeSettings.minimumFractionDigits : localeSettings.maximumFractionDigits;
    if (options.maximumFractionDigits < options.minimumFractionDigits) {
      options.maximumFractionDigits = options.minimumFractionDigits;
    }
  }
  var formatter;
  try {
    formatter = new Intl.NumberFormat(locales, options);
  }
  catch (e){
    // if the settings from the options somehow lead to an invalid format, we log it, 
    // but we will recover by creating a formatter that at least works.
    console.error(`Error creating number formatter using locales ${JSON.stringify(locales)} and options ${JSON.stringify(options)}`);
    console.error(e);
    locales = navigator.languages;
    options = {};
    if (!fractionDigits){
      options.minimumFractionDigits = 0;
    }
    console.error(`Falling back to default ${JSON.stringify(locales)} and options ${JSON.stringify(options)}`);
    formatter = new Intl.NumberFormat(locales, options);
  }
  if (fractionDigits){
    decimalSeparator = (new Intl.NumberFormat(locales, {minFractionDigits: 1})).formatToParts(123.456).find(function(part){
      return part.type === 'decimal';
    })['value'];
  }
  return {
    format: function(value, field){
      if (value === null) {
        return getNullString();
      }
      
      if (field) {
        switch (typeof value){
          case 'bigint':
          case 'number':
            break;
          default:
            var stringValue = String(value);
            var fieldType = field.type;
            var fieldTypeId, fieldTypeScale;
            
            if(fieldType) {
              fieldTypeId = fieldType.typeId;
              fieldTypeScale = fieldType.scale;
            }
            
            var integerPart, fractionalPart;
            // arrow decimal
            if (fieldTypeScale === 0) {
              integerPart = stringValue;
            }
            else {
              var parts = stringValue.split('.');
              integerPart = parts[0];
              if (parts.length === 2){
                fractionalPart = parts[1];
              }
              else {
                var fractionalPartIndex = integerPart.length - fieldTypeScale;
                fractionalPart = integerPart.slice(fractionalPartIndex);
                integerPart = integerPart.slice(0, fractionalPartIndex);
                if (integerPart === '-') {
                  integerPart = '-0';
                }
              }
            }

            var integerPart = BigInt(integerPart);

            if (fractionalPart) {
              if (fractionalPart.length > options.maximumFractionDigits) {
                fractionalPart = parseFloat('0.' + fractionalPart).toFixed(options.maximumFractionDigits);
                if (parseFloat(fractionalPart) >= 1) {
                  integerPart += (integerPart >= 0n ? 1n : -1n);
                }
                fractionalPart = String(fractionalPart).split('.')[1];
              }
              
              if (decimalSeparator === undefined) {
                decimalSeparator = '.';
              }
            }
            
            stringValue = intFormatter.format(integerPart);
            if (fractionalPart) {
              stringValue = `${stringValue}${decimalSeparator}${fractionalPart}`;
            }
            
            return stringValue;
        }
      }
      
      return formatter.format(value);
    }
  };
}

function fallbackFormatter(value){
  if (value === null || value === undefined){
    return getNullString();
  }
  return String(value);
}

function createDefaultLiteralWriter(type){
  return function(value, field){
    return `${value === null ? 'NULL' : String(value)}::${type}`;
  }
}

function createDateFormatter(options){
  var locales = getLocales();
  var dateFormatter = new Intl.DateTimeFormat(locales, options);
  return dateFormatter;
}

function createLocalDateFormatter(){
  var dateFormatter = createDateFormatter({
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  return function(value){
    if (value === null) {
      return getNullString();
    }
    return dateFormatter.format(value);
  }
}

function createMonthNameFormatter(){
  var dateFormatter = createDateFormatter({
    month: 'long'
  });
  var monthNames = [null];
  var date;
  for (var i = 0; i < 12; i++){
    if (date){
      date.setMonth(i);
    }
    else{
      date = new Date(2000, i, 01);
    }
    var dateString = dateFormatter.format(date);
    var monthName = dateString.replace(/[^\d\w]/g, '');
    monthNames.push(monthName);
  }
  return function(value){
    if (value === null) {
      return getNullString();
    }
    return monthNames[value];
  }
}

function createDayNameFormatter(){
  var dateFormatter = createDateFormatter({
    weekday: 'long'
  });
  var dayNames = [];
  var date;
  for (var i = 1; i < 8; i++){
    if (date){
      date.setDate(i);
    }
    else {
      // 2023-01-01 started on a sunday
      date = new Date(2023, 0, 01);
    }
    var dateString = dateFormatter.format(date);
    var dayName = dateString.replace(/[^\d\w]/g, '');
    dayNames.push(dayName);
  }
  return function(value){
    if (value === null) {
      return getNullString();
    }
    return dayNames[value];
  }
}

function monthNumFormatter(monthNum){
  if (monthNum === null){
    return getNullString();
  }
  monthNum = String(monthNum);
  if (monthNum.length === 1) {
    monthNum = '0' + monthNum;
  }
  return monthNum;
}

function dayNumFormatter(dayNum){
  if (dayNum === null){
    return getNullString();
  }
  dayNum = String(dayNum);
  if (dayNum.length === 1) {
    dayNum = '0' + dayNum;
  }
  return dayNum;
}

function weekNumFormatter(weekNum){
  if (weekNum === null){
    return getNullString();
  }
  weekNum = String(weekNum);
  if (weekNum.length === 1) {
    weekNum = '0' + weekNum;
  }
  return weekNum;
}

// value: arrow value.
// type: arrow type
function getDuckDbLiteralForValue(value, type){
  if (value === null){
    return 'NULL';
  }
  var literal = '';
  var typeId = type.typeId;
  // see: https://github.com/apache/arrow/blob/main/js/src/enum.ts
  switch (typeId){
    case 1:   // Null
      literal = 'NULL';
      break;
    case 2:   // Int
    case 3:   // float
    case 6:   // Bool
    case 7:   // Decimal
    case -2:  // Int8
    case -3:  // Int16
    case -4:  // Int32
    case -5:  // Int64
    case -6:  // UInt8
    case -7:  // UInt16
    case -8:  // UInt32
    case -9:  // UInt64
    case -10: // Float16
    case -11: // Float32
    case -12: // Float64
      literal = String(value);
      break;
    case 5:   // Utf8 (string)
      literal = quoteStringLiteral(value); 
      break;
    case 8:   // Date
      literal = `DATE'${value.getUTCFullYear()}-${value.getUTCMonth() + 1}-${value.getUTCDate()}'`;
      break;
    case 10:   // Timestamp
      literal = `to_timestamp( ${value}::DOUBLE / 1000)`;
      break;
    case 12:  // LIST
    case 16:  // fixed size list
      var literal;
      var elementType = type.children[0].type;
      for (var i = 0; i < value.length; i++){
        if (i) {
          literal += ',';
        }
        var elementValue = value.get(i);
        literal += getDuckDbLiteralForValue(elementValue, elementType)
      }
      literal = `[${literal}]`;
      break;
    case 13:  // Struct
    case 17:  // Map
      literal = type.children.map(function(entry){
        var entryName = entry.name;
        var entryValue = value[entryName];
        var entryType = entry.type;
        var entryValueType = entryValue.type;
        var entryValueLiteral = getDuckDbLiteralForValue(entryValue, entryType);
        var entryLiteral = `${quoteStringLiteral(entryName)}: ${entryValueLiteral}`;
        return entryLiteral;
      }).join(',');            
      literal = `{${literal}}`;
      break;
    case 0:   // None
    case 4:   // Binary
    case 9:   // Time
    case 11:  // Interval
    case 14:  // union
    case 15:  // fixed size binary
    case 18:  // duration
    case 19:  // large binary
    case 20:  // large utf8
    case -1:  // Dictionary
    case -13: // DateDay
    case -14: // DateMillisecond
    case -15: // TimestampSecond
    case -16: // TimestampMillisecond
    case -17: // TimestampMicrosecond
    case -18: // TimestampNanosecond
    case -19: // TimeSecond
    case -20: // TimeMilliSecond
    case -21: // TimeMicrosecond
    case -22: // TimeNanosecond
    case -23: // DenseUnion
    case -24: // SparseUnion
    case -25: // IntervalDayTime
    case -26: // IntervalYearMonth
    case -27: // DurationSecond
    case -28: // DurationMillisecond
    case -29: // DurationMicrosecond
    case -30: // DurationNanosecond
    default:
      throw new Error(`Unrecognized arrow type ${typeId}`);
  }
  return literal;
}

var dataTypes = {
  'DECIMAL': {
    defaultAnalyticalRole: 'measure',
    isNumeric: true,
    createFormatter: function(){
      var formatter = createNumberFormatter(true);
      return function(value, field){
        return formatter.format(value, field)
      };
    },
    createLiteralWriter: function(dataTypeInfo, dataType){
      return createDefaultLiteralWriter('DECIMAL');
    }
  },
  'DOUBLE': {
    defaultAnalyticalRole: 'measure',
    isNumeric: true,
    createFormatter: function(){
      var formatter = createNumberFormatter(true);
      return function(value, field){
        return formatter.format(value, field);
      };
    },
    createLiteralWriter: function(dataTypeInfo, dataType){
      return createDefaultLiteralWriter('DOUBLE');
    }    
  },
  'REAL': {
    defaultAnalyticalRole: 'measure',
    isNumeric: true,
    greaterPrecisionAlternative: "DOUBLE",
    createFormatter: function(){
      var formatter = createNumberFormatter(true);
      return function(value, field){
        return formatter.format(value, field);
      };
    },
    createLiteralWriter: function(dataTypeInfo, dataType){
      return createDefaultLiteralWriter('REAL');
    }    
  },
  'BIGINT': {
    defaultAnalyticalRole: 'attribute',
    isNumeric: true,
    isInteger: true,
    greaterPrecisionAlternative: "HUGEINT",
    createFormatter: function(){
      var formatter = createNumberFormatter(false);
      return function(value, field){
        return formatter.format(value, field);
      };
    },
    createLiteralWriter: function(dataTypeInfo, dataType){
      return createDefaultLiteralWriter('BIGINT');
    }    
  },
  'HUGEINT': {
    defaultAnalyticalRole: 'attribute',
    isNumeric: true,
    defaultAnalyticalRole: 'attribute',
    isInteger: true,
    createFormatter: function(){
      var formatter = createNumberFormatter(false);
      return function(value, field){
        return formatter.format(value, field);
      };
    },
    createLiteralWriter: function(dataTypeInfo, dataType){
      return createDefaultLiteralWriter('HUGEINT');
    }    
  },
  'INTEGER': {
    defaultAnalyticalRole: 'attribute',
    isNumeric: true,
    isInteger: true,
    greaterPrecisionAlternative: "BIGINT",
    createFormatter: function(){
      var formatter = createNumberFormatter(false);
      return function(value, field){
        return formatter.format(value, field);
      };
    },
    createLiteralWriter: function(dataTypeInfo, dataType){
      return createDefaultLiteralWriter('INTEGER');
    }    
  },
  'SMALLINT': {
    defaultAnalyticalRole: 'attribute',
    isNumeric: true,
    isInteger: true,
    greaterPrecisionAlternative: "INTEGER",
    createFormatter: function(){
      var formatter = createNumberFormatter(false);
      return function(value, field){
        return formatter.format(value, field);
      };
    },
    createLiteralWriter: function(dataTypeInfo, dataType){
      return createDefaultLiteralWriter('SMALLINT');
    }    
  },
  'TINYINT': {
    defaultAnalyticalRole: 'attribute',
    isNumeric: true,
    isInteger: true,
    greaterPrecisionAlternative: "SMALLINT",
    createFormatter: function(){
      var formatter = createNumberFormatter(false);
      return function(value, field){
        return formatter.format(value, field);
      };
    },
    createLiteralWriter: function(dataTypeInfo, dataType){
      return createDefaultLiteralWriter('TINYINT');
    }    
  },
  'UBIGINT': {
    defaultAnalyticalRole: 'attribute',
    isNumeric: true,
    isInteger: true,
    isUnsigned: true,
    greaterPrecisionAlternative: "UHUGEINT",
    createFormatter: function(){
      var formatter = createNumberFormatter(false);
      return function(value, field){
        return formatter.format(value, field);
      };
    },
    createLiteralWriter: function(dataTypeInfo, dataType){
      return createDefaultLiteralWriter('UBIGINT');
    }    
  },
  'UHUGEINT': {
    defaultAnalyticalRole: 'attribute',
    isNumeric: true,
    isInteger: true,
    createFormatter: function(){
      var formatter = createNumberFormatter(false);
      return function(value, field){
        return formatter.format(value, field);
      };
    },
    createLiteralWriter: function(dataTypeInfo, dataType){
      return createDefaultLiteralWriter('UHUGEINT');
    }    
  },
  'UINTEGER': {
    defaultAnalyticalRole: 'attribute',
    isNumeric: true,
    isInteger: true,
    isUnsigned: true,
    greaterPrecisionAlternative: "UBIGINT",
    createFormatter: function(){
      var formatter = createNumberFormatter(false);
      return function(value, field){
        return formatter.format(value, field);
      };
    },
    createLiteralWriter: function(dataTypeInfo, dataType){
      return createDefaultLiteralWriter('UINTEGER');
    }    
  },
  'USMALLINT': {
    defaultAnalyticalRole: 'attribute',
    isNumeric: true,
    isInteger: true,
    isUnsigned: true,
    greaterPrecisionAlternative: "UINTEGER",
    createFormatter: function(){
      var formatter = createNumberFormatter(false);
      return function(value, field){
        return formatter.format(value, field);
      };
    },
    createLiteralWriter: function(dataTypeInfo, dataType){
      return createDefaultLiteralWriter('USMALLINT');
    }    
  },
  'UTINYINT': {
    defaultAnalyticalRole: 'attribute',
    isNumeric: true,
    isInteger: true,
    isUnsigned: true,
    greaterPrecisionAlternative: "USMALLINT",
    createFormatter: function(){
      var formatter = createNumberFormatter(false);
      return function(value, field){
        return formatter.format(value, field);
      };
    },
    createLiteralWriter: function(dataTypeInfo, dataType){
      return createDefaultLiteralWriter('UTINYINT');
    }    
  },
  'BIT': {
    defaultAnalyticalRole: 'attribute',
  },
  'BOOLEAN': {
    defaultAnalyticalRole: 'attribute',
    createLiteralWriter: function(dataTypeInfo, dataType){
      return createDefaultLiteralWriter('BOOLEAN');
    }    
  },
  'BLOB': {
    defaultAnalyticalRole: 'attribute',
  },
  'DATE': {
    defaultAnalyticalRole: 'attribute',
    hasDateFields: true,
    createFormatter: function(){
      var localeSettings = settings.getSettings('localeSettings');
      var locales = localeSettings.locale;      
      var formatter = new Intl.DateTimeFormat(locales, {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      });
      return function(value, field){
        if (value === null){
          return getNullString();
        }
        return formatter.format(value);
      };
    },
    createLiteralWriter: function(dataTypeInfo, dataType){
      return function(value, field){
        var monthNum = monthNumFormatter(1 + value.getUTCMonth())
        var dayNum = dayNumFormatter(value.getUTCDate());
        return value === null ? 'NULL::DATE' : `DATE'${value.getUTCFullYear()}-${monthNum}-${dayNum}'`;
      };
    }
  },
  'TIME': {
    defaultAnalyticalRole: 'attribute',
    hasTimeFields: true,
    
  },
  'TIMESTAMP': {
    defaultAnalyticalRole: 'attribute',
    hasDateFields: true,
    hasTimeFields: true,
    createFormatter: function(){
      // we will receive the value as a javascript Number, representing the milliseconds since Epoch,
      // allowing us to use the value directly as argumnet to the Date constructor.
      // the number may (will) have decimal digits, representing any bit of time beyond the milliseconds resolution
      // and since the Duckdb TIMESTAMP is measured in microseconds, there will be 3 such decimal digits
      var localeSettings = settings.getSettings('localeSettings');
      var locales = localeSettings.locale;      
      var formatter = new Intl.DateTimeFormat(locales, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
      });
      return function(value, field){
        if (value === null ){
          return getNullString();
        }
        var date = new Date(value);
        var parts = String(value).split('.');
        var micros;
        if (parts.length === 2) {
          micros = parseInt( parts[1], 10 );
        }
        var dateTimeString = formatter.format(date);
        
        if (!micros) {
          return dateTimeString;
        }
        
        return `${dateTimeString} ${micros}μs`;
      };
    },
    createLiteralWriter: function(dataTypeInfo, dataType){
      return function(value, field){
        return value === null ? 'NULL::TIMESTAMP' : `to_timestamp(${value}::DOUBLE / 1000)`;
      };
    }
  },
  'TIMESTAMP WITH TIME ZONE': {
    defaultAnalyticalRole: 'attribute',
    hasDateFields: true,
    hasTimeFields: true,
    hasTimezone: true,
    createLiteralWriter: function(dataTypeInfo, dataType){
      return function(value, field){
        return value === null ? 'CAST(NULL AS TIMESTAMP WITH TIME ZONE)' : `to_timestamp(${value}::DOUBLE / 1000)`;
      };
    }
  },
  'INTERVAL': {
    defaultAnalyticalRole: 'measure'
  },
  'UUID': {
    defaultAnalyticalRole: 'attribute'
  },
  'ENUM': {
    defaultAnalyticalRole: 'attribute'
  },
  'VARCHAR': {
    defaultAnalyticalRole: 'attribute',
    hasTextDerivations: true,
    createFormatter: function(){
      return function(value){
        if (value === null){
          return getNullString();
        }
        if (typeof value === 'string'){
          value = value.replace(/\r\n|\n|\r/g, ' ');
        }
        return String(value);
      }
    },
    createLiteralWriter: function(dataTypeInfo, dataType){
      return function(value, field){
        return value === null ? 'NULL::VARCHAR' : quoteStringLiteral(value);
      };
    }
  },
  'ARRAY': {
    defaultAnalyticalRole: 'attribute',
    createLiteralWriter: function(dataTypeInfo, dataType){      
      return function(value, field){
        var type = field.type;
        var duckdbValue = getDuckDbLiteralForValue(value, type);
        duckdbValue = `CAST( ${duckdbValue} AS ${dataType} )`;
        return duckdbValue;
      }
    }
  },
  'LIST': {
    defaultAnalyticalRole: 'attribute'
  },
  'MAP': {
    defaultAnalyticalRole: 'attribute'
  },
  'STRUCT': {
    defaultAnalyticalRole: 'attribute',
    createLiteralWriter: function(dataTypeInfo, dataType){      
      return function(value, field){
        var type = field.type;
        var duckdbValue = getDuckDbLiteralForValue(value, type);
        duckdbValue = `CAST( ${duckdbValue} AS ${dataType} )`;
        return duckdbValue;
      }
    }
  },
  'JSON': {
  },
  'UNION': {
    defaultAnalyticalRole: 'attribute'
  }
};

function getDataTypeInfo(columnType){
  if (columnType.endsWith('[]')) {
    return dataTypes['ARRAY'];
  }
  var columnTypeUpper = columnType.toUpperCase();
  var typeNames = Object.keys(dataTypes).filter(function(dataTypeName){
    return columnTypeUpper.startsWith(dataTypeName.toUpperCase());
  });
  if (typeNames.length === 0) {
    return undefined;
  }
  
  // check if there exists a type with exactly the given name
  var dataTypeInfo = dataTypes[columnTypeUpper];
  if (dataTypeInfo) {
    return dataTypeInfo;
  }
  
  // no. This means the type is in some way modified/parameterized, like DECIMAL(nn, nn)
  // try to find the "best" match.
  typeNames.sort(function(a, b){
    if (a.length > b.length) {
      return 1;
    }
    else
    if (a.length < b.length) {
      return -1;
    }
    return 0;
  });
  var typeName = typeNames[0];
  return dataTypes[typeName];
}

function quoteStringLiteral(str){
  return typeof str === 'string'  ? `'${str.replace(/'/g, "''")}'` : str; 
}

function identifierRequiresQuoting(identifier){
  return /[\s"]/.test(identifier);
}

function quoteIdentifierWhenRequired(identifier){
  if (identifier.startsWith('"') && identifier.endsWith('"')) {
    return identifier;
  }
  else 
  if (identifierRequiresQuoting(identifier)) {
    return getQuotedIdentifier(identifier);
  }
  return identifier;
}

function getQuotedIdentifier(identifier){
  return `"${identifier.replace(/"/g, '""')}"`;
}

function getIdentifier(identifier, quoteAlways){
  if (quoteAlways || identifierRequiresQuoting(identifier)){
    return getQuotedIdentifier(identifier);
  } 
  return identifier;
}

function formatKeyword(keyword, letterCase){
  switch(letterCase){
    case 'initialCapital':
      return keyword.charAt(0).toUpperCase() + keyword.slice(1).toLowerCase();
    case 'lowerCase':
      return keyword.toLowerCase();
    case 'upperCase':
      return keyword.toUpperCase();
  }
}

function getQualifiedIdentifier(){
  var sqlOptions;
  switch (arguments.length) {
    case 0:
      throw new Error(`Invalid number of arguments.`);
    case 1:
      sqlOptions = normalizeSqlOptions(sqlOptions);
      var arg = arguments[0];
      return getQualifiedIdentifier(arg, sqlOptions);
      break;
    case 2:
      switch (typeof arguments[1]) {
        case 'object':  //2nd argument is sqlOptions
          sqlOptions = normalizeSqlOptions(sqlOptions);
          switch (typeof arguments[0]) {
            case 'string':
              return getQualifiedIdentifier([arguments[0]], sqlOptions);
              break;
            case 'object':
              if (arguments[0] instanceof Array ) {
                function identifierQuoter (identifier){
                  return getIdentifier(identifier, sqlOptions.alwaysQuoteIdentifiers);
                };
                
                return arguments[0]
                .map(identifierQuoter)
                .join('.')
                ;
              }
            default:
              throw new Error(`Invalid argument`);
          }
          break;
        case 'string':
          return getQualifiedIdentifier([arguments[0], arguments[1]]);
          break;
        case 'undefined':
          return getQualifiedIdentifier(arguments[0], normalizeSqlOptions());
          break;
        default:
          throw new Error(`Invalid argument type ${typeof arguments[1]}`);
      }
      break;
    default:
      var n = arguments.length;
      var lastArgument = arguments[n - 1];
      var sqlOptions;
      if (typeof lastArgument === 'object') {
        sqlOptions = lastArgument;
        n -= 1;
      }
      sqlOptions = normalizeSqlOptions(sqlOptions);
      
      var args = [];
      for (var i = 0; i < n; i++){
        var identifier = arguments[i];
        args.push(identifier);
      }
      return getQualifiedIdentifier(args, sqlOptions);
  }
  throw new Error(`Invalid arguments`);
}

async function ensureDuckDbExtensionLoadedAndInstalled(extensionName){
  var connection = hueyDb.connection;
  var sql = `SELECT * FROM duckdb_extensions() WHERE extension_name = ?`;
  var statement = await connection.prepare(sql);
  var result = await statement.query(extensionName);
  statement.close();
  var loaded, installed;
  if (result.numRows !== 0) {
    loaded = result.loaded;
    installed = result.installed;
    return;
  }
  
  if (!installed) {
    sql = `INSTALL ${extensionName}`;
    result = await connection.query(sql);
  }
  
  if (!loaded){
    sql = `LOAD ${extensionName}`;
    result = await connection.query(sql);
  }
  return true;
}

function getCopyToStatement(selectStatement, fileName, options){
  var optionsString = Object
  .keys(options)
  .map(function(option){
    return `${option} ${options[option]}`
  }).join('\n, ');
  
  var copyStatement = [
    'COPY (',
    selectStatement,
    `) TO '${fileName}' WITH (`,
    optionsString,
    ')'
  ];
  return copyStatement.join('\n');
}

function getSqlHeader(){
  return [
    `/*********************************`,
    `* DuckDB query generated by Huey`,
    `* ${new Date(Date.now())}`,
    `* https://github.com/rpbouman/huey`,
    `**********************************/`
  ].join('\n');
}

function getComma(commaStyle) {
  var prefix = '', postfix = ''
  switch(commaStyle){
    case 'spaceAfter':
      postfix = ' ';
      break;
    case 'newlineAfter':
      postfix = '\n';
      break;
    case 'newlineBefore':
      prefix = '\n';
    default:
  }
  return `${prefix},${postfix}`;
}

function normalizeSqlOptions(sqlOptions){
  var defaultSqlSettings = settings.getSettings('sqlSettings');
  return Object.assign({}, defaultSqlSettings, sqlOptions);
}

function getDuckDbTableSqlStatementForQueryModel(queryModel, sqlOptions){
  sqlOptions = normalizeSqlOptions(sqlOptions);
  var comma = getComma(sqlOptions.commaStyle);
  function keywordFormatter(keyword){
    return formatKeyword(keyword, sqlOptions.keywordLetterCase);
  }

  var datasource = queryModel.getDatasource();

  var rowsAxisItems = queryModel.getRowsAxis().getItems();
  var columnsAxisItems = queryModel.getColumnsAxis().getItems();
  var cellsAxisItems = queryModel.getCellsAxis().getItems();
  var queryAxisItems = [].concat(rowsAxisItems, columnsAxisItems, cellsAxisItems);
  
  var selectList = {}, groupBy = [], orderBy = [];
  var rowsGroupingSets = [[]], columnsGroupingSets = [[]];
  
  for (var i = 0; i < queryAxisItems.length; i++){
    var queryAxisItem = queryAxisItems[i];
    var caption = QueryAxisItem.getCaptionForQueryAxisItem(queryAxisItem);
    var sqlExpression = QueryAxisItem.getSqlForQueryAxisItem(queryAxisItem, undefined, sqlOptions);
    selectList[caption] = sqlExpression;
    
    if (queryAxisItem.axis !== QueryModel.AXIS_CELLS) {
      if (i == rowsAxisItems.length) {
        perAxisGroupBy = [];
      }
      var groupingSets = (i < rowsAxisItems.length) ? rowsGroupingSets : columnsGroupingSets;
      if (queryAxisItem.includeTotals) {
        groupingSets.push( [].concat(groupingSets[0]) );
      }
      groupingSets[0].push(sqlExpression);
      
      groupBy.push(sqlExpression);
      orderBy.push(sqlExpression);
    }
  }
  
  var groupingSets = []
  if (rowsGroupingSets.length > 1 || columnsGroupingSets > 1) {
    for (var i = 0; i < rowsGroupingSets.length; i++){
      var rowsGroupingSet = rowsGroupingSets[i];
      for (var j = 0; j < columnsGroupingSets.length; j++){
        var columnsGroupingSet = columnsGroupingSets[j];
        var groupingSet = [].concat(rowsGroupingSet, columnsGroupingSet);
        groupingSets.push(groupingSet);
      }
    }
  }    
    
  var selectList = Object.keys(selectList).map(function(caption){
    var sqlExpression = selectList[caption];
    var asKeyword = keywordFormatter('as');
    var columnAlias = getIdentifier(caption, sqlOptions.alwaysQuoteIdentifiers);
    return `${sqlExpression} ${asKeyword} ${columnAlias}`;
  });
    
  var sql =  [
    getSqlHeader(),
    `${keywordFormatter('select')} ${selectList.join(comma)}`,
    datasource.getFromClauseSql(undefined, sqlOptions),
  ];
  var filterSql = queryModel.getFilterConditionSql();
  if (filterSql) {
    sql.push(`${keywordFormatter('where')} ${filterSql}`);
  }
  var byKeyword = keywordFormatter('by');
  
  if (groupingSets.length) {
    sql.push(`${keywordFormatter('group')} ${byKeyword} ${keywordFormatter('grouping')} ${keywordFormatter('sets')} (`);
    sql.push(
      '  ' + groupingSets.map(function(groupingSet){
        return `( ${groupingSet.join(', ')} )`;
      }).join('\n, ')
    );
    sql.push(')');
  }
  else
  if (groupBy.length) {
    sql.push(`${keywordFormatter('group')} ${byKeyword} ${groupBy.join(comma)}`);
  }
  
  if (orderBy.length) {
    sql.push(`${keywordFormatter('order')} ${byKeyword} ${orderBy.join(comma)}`);
  }
  sql = sql.join('\n');
  return sql;
}

function getDuckDbPivotSqlStatementForQueryModel(queryModel, sqlOptions){
  sqlOptions = normalizeSqlOptions(sqlOptions);  
  var comma = getComma(sqlOptions.commaStyle);
  var identifierQuoter = function(identifier){
    return getIdentifier(identifier, sqlOptions.alwaysQuoteIdentifiers);
  }  
  function keywordFormatter(keyword){
    return formatKeyword(keyword, sqlOptions.keywordLetterCase);
  }
  
  var asKeyword = keywordFormatter('as');
  
  var columnsExpressions = TupleSet.getSqlSelectExpressions(queryModel, QueryModel.AXIS_COLUMNS);
  if (columnsExpressions === undefined) {
    columnsExpressions = {"columns":  `''`};
  }

  var rowsExpressions = TupleSet.getSqlSelectExpressions(queryModel, QueryModel.AXIS_ROWS);
  if (rowsExpressions === undefined) {
    rowsExpressions = {"rows":  `''`};
  }

  var cellsAxis = queryModel.getCellsAxis();
  var cellsAxisItems = cellsAxis.getItems();

  var cellColumnExpressions = {};
  var aggregateExpressions = {};
  
  if (cellsAxisItems.length === 0){
    aggregateExpressions[' '] = `${keywordFormatter('any_value')}( ${keywordFormatter('null')} )`;
  }
  else {
    cellsAxisItems.forEach(function(cellsAxisItem){
      if (cellsAxisItem.columnName === '*') {
        // the COUNT(*) expression is special, we don't need to have a column for it
      }
      else {
        cellColumnExpressions[cellsAxisItem.columnName] = getQuotedIdentifier(cellsAxisItem.columnName);
      }
      
      var caption = QueryAxisItem.getCaptionForQueryAxisItem(cellsAxisItem);
      var selectListExpression = QueryAxisItem.getSqlForQueryAxisItem(cellsAxisItem);
      aggregateExpressions[caption] = selectListExpression;
    });
  }
  
  var columns = [].concat(
    Object.keys(columnsExpressions).map(function(expressionId){
      var expression = columnsExpressions[expressionId];
      return `${expression} ${asKeyword} ${getQuotedIdentifier(expressionId)}`;
    }),
    Object.keys(rowsExpressions).map(function(expressionId){
      var expression = rowsExpressions[expressionId];
      return `${expression} ${asKeyword} ${getQuotedIdentifier(expressionId)}`;
    }),
    Object.keys(cellColumnExpressions).map(function(expressionId){
      var expression = cellColumnExpressions[expressionId];
      return `${expression} ${asKeyword} ${getQuotedIdentifier(expressionId)}`;
    })
  );
  
  var aggregates = Object.keys(aggregateExpressions).map(function(expressionId){
    var aggregateExpression = aggregateExpressions[expressionId];
    return `${aggregateExpression} ${asKeyword} ${getQuotedIdentifier(expressionId)}`;
  });

  var datasource = queryModel.getDatasource();
    
  var cteName = identifierQuoter('data');
  var sql = [
    getSqlHeader(),
    `${keywordFormatter('with')} ${cteName} ${asKeyword} (`,
    `${keywordFormatter('select')} ${columns.join(comma)}`,
    `${datasource.getFromClauseSql(undefined, sqlOptions)}`
  ];

  var filterSql = queryModel.getFilterConditionSql();
  if (filterSql) {
    sql.push(`${formatKeyword('where', sqlOptions.keywordLetterCase)} ${filterSql}`);
  }
  
  sql = [].concat(sql, [
    `)`,
    `${keywordFormatter('pivot')} ${cteName}`,
    `${keywordFormatter('on')} ${Object.keys(columnsExpressions).map(identifierQuoter).join(comma)}`,
    `${keywordFormatter('using')} ${aggregates.join(comma)}`,
    `${keywordFormatter('group')} ${keywordFormatter('by')} ${Object.keys(rowsExpressions).map(identifierQuoter).join(comma)}`,
    `${keywordFormatter('order')} ${keywordFormatter('by')} ${Object.keys(rowsExpressions).map(identifierQuoter).join(comma)}`
  ]).join('\n');
  return sql;
}

function getSqlValuesClause(valueLiterals, tableAlias, columnAlias){
  var valuesClause = `(VALUES (${valueLiterals.join('),(')}) )`;
  if (tableAlias){
    valuesClause += ` AS ${tableAlias}`;
    if (columnAlias){
      valuesClause += `(${columnAlias})`;
    }
  }
  return valuesClause;
}

function getStructTypeDescriptor(structColumnType){
  var index = 0;
  var keyword = 'STRUCT';
  if (!structColumnType.startsWith(keyword)){
    throw new Error(`Type "${structColumnType}" is not a STRUCT: expected keyword ${keyword} at position ${index}`);
  }
  index = keyword.length;
  if (structColumnType.charAt(index) !== '(') {
    throw new Error(`Type "${structColumnType}" is not a STRUCT: expected "("  at position ${index} `);
  }
  index += 1;
  var structure = {};
  
  function parseMemberName(){
    var memberName;
    var startOfMemberName = index;
    var endOfMemberName;
    if (structColumnType.charAt(index) === '"') {
      startOfMemberName += 1;
      endOfMemberName = structColumnType.indexOf('"', startOfMemberName);
      index = endOfMemberName + 1;
    }
    else {
      endOfMemberName = structColumnType.indexOf(' ', startOfMemberName);
      index = endOfMemberName;
    }
    memberName = structColumnType.substring(startOfMemberName, endOfMemberName);
    return memberName;
  }
  
  function parseMemberType(){
    var startOfMemberType = index;
    var level = 0;
    _loop: while (index < structColumnType.length){
      var ch = structColumnType.charAt(index);
      switch (ch) {
        case '(':
          level++;
          break;
        case ')':
        case ',':
          if (level === 0) {
            endOfMemberType = index;
            break _loop;
          }
          else
          if (ch === ')'){
            level--;
          }
      }
      index++;
    }
    var memberType = structColumnType.substring(startOfMemberType, endOfMemberType);
    return memberType;
  }
  
  _loop: while (index < structColumnType.length) {

    var memberName = parseMemberName();
    if (structColumnType.charAt(index) !== ' '){
      throw new Error(`Error parsing STRUCT ${structColumnType}: expected "  "  at ${index}`);
    }
    index += 1;
    var type = parseMemberType();
    structure[memberName] = type;
    
    var ch = structColumnType.charAt(index);
    switch(ch) {
      case ',':
        index += 1;
        if (structColumnType.charAt(index) !== ' ') {
          throw new Error(`Error parsing STRUCT ${structColumnType}: expected " " at ${index}`);
        }
        index += 1;
        continue _loop;
      case ')':
        break _loop;
    }
  }
  return structure;
}

function getMemberExpressionType(type, memberExpressionPath){
  if (memberExpressionPath.length) {
    var typeDescriptor = getStructTypeDescriptor(type);
    var memberExpression = memberExpressionPath[0];
    var memberExpressionType;
    if (memberExpression === 'unnest()'){
      memberExpressionType = type.slice(0, -2);
    }
    else {
      memberExpressionType = typeDescriptor[memberExpression];
    }
    return getMemberExpressionType(memberExpressionType, memberExpressionPath.slice(1));
  }
  else {
    return type;
  }
}

function extrapolateColumnExpression(expressionTemplate, columnExpression){
  return expressionTemplate.replace(/\$\{columnExpression\}/g, `${columnExpression}`);
}
