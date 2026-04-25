function getDataTypeNameFromColumnType(columnType){
  return /^[^\(]+/.exec(columnType)[0];
}

function decodeDuckDBBignum(uint8Array) {
  if (uint8Array.length < 4) return 0n;

  const isPositive = uint8Array[0] >= 128;
  
  // 1. Extract Length (Bytes 1 & 2)
  let length;
  if (isPositive) {
    length = (uint8Array[1] << 8) | uint8Array[2];
  } else {
    // Invert the length bytes for negative numbers
    length = ((uint8Array[1] ^ 0xFF) << 8) | (uint8Array[2] ^ 0xFF);
  }

  // 2. Extract Magnitude (Byte 3 and any subsequent bytes)
  // Your samples show 4 bytes total, meaning 1 byte of magnitude
  let magnitude = 0n;
  for (let i = 0; i < length; i++) {
    const byteIndex = 3 + i;
    let byte = uint8Array[byteIndex];
    
    if (!isPositive) {
      byte = byte ^ 0xFF; // Flip bits back for negative numbers
    }
    
    magnitude = (magnitude << 8n) | BigInt(byte);
  }

  return isPositive ? magnitude : -magnitude;
}
// lookup table for bit strings. Using this for BIT to string rendering
const bitStrings = (function(){
  const BIT_BASE = 2;
  const BYTE_WIDTH = 8;
  
  const array = new Array(
    Math.pow(BIT_BASE,BYTE_WIDTH)
  ).fill(null)
  .map((element, index, array) => (index).toString(BIT_BASE).padStart(BYTE_WIDTH, '0'));
  return array;
}());

function duckdbBITtoString(uInt8Array){
  const strings = new Array(uInt8Array.length - 1);
  uInt8Array
  .subarray(1)
  .forEach((byte, index) => strings[index] = bitStrings[byte]);
  
  strings[0] = strings[0].slice(uInt8Array[0]);
  return strings.join('');
}

function getNullString(){
  const generalSettings = settings.getSettings('localeSettings');
  const nullString = generalSettings.nullString;
  return nullString;
}

function getLocales(){
  const localeSettings = settings.getSettings('localeSettings');
  const locales = localeSettings.locale;
  return locales;
}

function getArrowDecimalAsString(value, type){
  if (value === null) {
    return 'NULL';
  }
  const strValue = String(value);
  const isNegative = strValue.startsWith('-') ;
  let absValue = isNegative ? strValue.substr(1) : strValue;
  absValue = new Array(type.scale).fill('0').join('') + absValue;
  const decimalPlace = absValue.length - type.scale;
  let fractionalPart = absValue.slice(decimalPlace);
  fractionalPart = fractionalPart.replace(/0+$/, '');
  let integerPart = absValue.slice(0, decimalPlace);
  integerPart = integerPart.replace(/^0+/, '');
  let str = `${isNegative ? '-' : ''}${integerPart}.${fractionalPart}`;
  if (str === '.'){
    str = '0';
  }
  return str;
}

function createStringTypeFormatter(){
  return function(value){
    if (value === null){
      return getNullString();
    }
    if (typeof value === 'string'){
      value = value.replace(/\r\n|\n|\r/g, ' ');
    }
    return String(value);
  }
}

function createNumberFormatter(fractionDigits){
  const localeSettings = settings.getSettings('localeSettings');
  let options = {
    minimumIntegerDigits: localeSettings.minimumIntegerDigits,
  };
  
  let locales = getLocales();
  if (fractionDigits){
    options.minimumFractionDigits = localeSettings.minimumFractionDigits;
    options.maximumFractionDigits = localeSettings.linkMinimumAndMaximumDecimals ? localeSettings.minimumFractionDigits : localeSettings.maximumFractionDigits;
    if (options.maximumFractionDigits < options.minimumFractionDigits) {
      options.maximumFractionDigits = options.minimumFractionDigits;
    }
  }
  let formatter;
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
  
  function formatArrowDecimal(value, type){
    const decimalString = getArrowDecimalAsString(value, type);
    return formatter.format(decimalString);
  }    
  
  return {
    format: function(value, field){
      switch (value) {
        case null:
          return getNullString();
      }
      
      switch (typeof value){
        case 'bigint':
        case 'number':
          return formatter.format(value);
      }
      
      let strValue;
      if (field) {
        const fieldType = field.type;
        switch (fieldType.typeId){
          case 7: // arrrow decimal
            return formatArrowDecimal(value, fieldType);
          default:
        }
      }
      else {
        strValue = String(value);
      }
      
      // fallback
      console.warn(`Using fallback formatter for number "${strValue}" (${typeof value}; ${field ? field.type.typeId : ''}).`);
      return strValue;
    }
  };
}

function createTimestampFormatter(withTimeZone){
  // we will receive the value as a javascript Number, representing the milliseconds since Epoch,
  // allowing us to use the value directly as argument to the Date constructor.
  // the number may (will) have decimal digits, representing any bit of time beyond the milliseconds resolution
  // and since the Duckdb TIMESTAMP is measured in microseconds, there will be 3 such decimal digits
  const localeSettings = settings.getSettings('localeSettings');
  let locales = localeSettings.locale;      
  let formatter = new Intl.DateTimeFormat(locales, {
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
    const date = new Date(value);
    let parts = String(value).split('.');
    let micros;
    if (parts.length === 2) {
      micros = parseInt( parts[1], 10 );
    }
    const dateTimeString = formatter.format(date);
    
    if (!micros) {
      return dateTimeString;
    }
    
    return `${dateTimeString} ${micros}μs`;
  };
}

function createTimestampLiteralWriter(timezoneDatatypeName){
  if (timezoneDatatypeName === undefined){
    timezoneDatatypeName = 'TIMESTAMP';
  }
  return function(value, field){
    return value === null ? `NULL::${timezoneDatatypeName}` : `to_timestamp( ${value}::DOUBLE / 1000 )`;
  };
}

function createTimeFormatter(withTimeZone){
  // we will receive the value as a javascript Number, representing the milliseconds since Epoch,
  // allowing us to use the value directly as argument to the Date constructor.
  // the number may (will) have decimal digits, representing any bit of time beyond the milliseconds resolution
  // and since the Duckdb TIME is measured in microseconds, there will be 3 such decimal digits
  const localeSettings = settings.getSettings('localeSettings');
  let locales = localeSettings.locale;      
  let formatter = new Intl.DateTimeFormat(locales, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  });
  return function(value, field){
    if (value === null ){
      return getNullString();
    }
    // interestingly, duckdb TIME is returned as bigint value
    // this is quite different from timestamps / dates, where the value is a number.
    console.log(value)
    value = parseInt(value, 10) / 1000;
    let date = new Date(value);
    let parts = String(value).split('.');
    let micros;
    if (parts.length === 2) {
      micros = parseInt( parts[1], 10 );
    }
    const dateTimeString = formatter.format(date);
    
    if (!micros) {
      return dateTimeString;
    }
    
    return `${dateTimeString} ${micros}μs`;
  };
}

function createTimeLiteralWriter(timezoneDatatypeName){
  if (timezoneDatatypeName === undefined){
    timezoneDatatypeName = 'TIME';
  }
  return function(value, field){
    const number = parseInt(value, 10) / 1000;
    const date = new Date(number);
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const seconds = date.getUTCSeconds();
    const millis = date.getUTCMilliseconds();
    const micros = String(number).split('.')[1] || '';
    const expression = `make_time( ${hours}, ${minutes}, ${seconds}.${millis}${micros} )`;
    return value === null ? `NULL::${timezoneDatatypeName}` : expression;
  };
}

function fallbackFormatter(value){
  if (value === null || value === undefined){
    return getNullString();
  }
  return String(value);
}

function createDecimalLiteralWriter(precision, scale){
  let typeDef = 'DECIMAL';
  if (precision !== undefined) {
    const typeOfPrecision = typeof precision;
    if (typeOfPrecision !== 'number') {
      throw new Error('Precision must be a number, not "${typeOfPrecision}"');
    }
    if (precision !== parseInt(precision, 10)){
      throw new Error(`Precision must be an integer value, got ${precision}`)
    }
    
    if (scale === undefined) {
      scale = 0;
    }
    else {
      if ( typeof scale !== 'number') {
        throw new Error('Scale must be a number, not "${typeOfScale}"');
      }
      if (scale !== parseInt(scale, 10)){
        throw new Error(`Scale must be an integer value, got ${scale}`);
      }
    }
    
    if (scale > precision){
      throw new Error(`Scale must not exceed precision.`);
    }
    
    typeDef += '(' + precision;
    if (scale !== undefined){
      typeDef += ',' +  scale;
    }
    typeDef += ')';
    
  }
  else 
  if (scale){
    throw new Error(`Cannot specify scale without specifying precision`);
  }
  
  const formatter = new Intl.NumberFormat(undefined, {
    useGrouping: false,
    signDisplay: 'negative',
    minimumIntegerDigits: 1,
    maximumFractionDigits: scale || 0,
    minimumSignificantDigits: 1
  });
  
  return function(value, valueField){
    const decimalString = getArrowDecimalAsString(value, valueField.type);
    // this is mostly to lose the leading zeroes
    const formattedDecimalString = formatter.format(decimalString)
    return `${formattedDecimalString}::${typeDef}`;
  }
}

function createDefaultLiteralWriter(type){
  return function(value, field){
    return `${value === null ? 'NULL' : String(value)}::${type}`;
  }
}

function createDateFormatter(options){
  const locales = getLocales();
  const dateFormatter = new Intl.DateTimeFormat(locales, options);
  return dateFormatter;
}

function createLocalDateFormatter(){
  const dateFormatter = createDateFormatter({
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

function createMonthNameList(modifier){
  const dateFormatter = createDateFormatter({
    month: modifier || 'long'
  });
  const monthNames = [null];
  let date;
  for (let i = 0; i < 12; i++){
    if (date){
      date.setMonth(i);
    }
    else{
      date = new Date(2000, i, 1);
    }
    const dateString = dateFormatter.format(date);
    const monthName = dateString.replace(/[^\d\w]/g, '');
    monthNames.push(monthName);
  }
  return monthNames;
}

function createMonthNameFormatter(modifier){
  const monthNames = createMonthNameList(modifier);
  return function(value){
    if (value === null) {
      return getNullString();
    }
    return monthNames[value];
  }
}

function createMonthNameParser(modifier){
  const monthNames = createMonthNameList(modifier);
  return function(monthNameValue){
    if (!monthNameValue) {
      return null;
    }
    const upperMonthNameValue = monthNameValue.toUpperCase();
    return monthNames.findIndex(listedName => {
      if (listedName === null) {
        return false;
      }
      return listedName.toUpperCase() === upperMonthNameValue;
    });
  };
}

function createMonthShortNameFormatter(){
  return createMonthNameFormatter('short');
}

function createMonthShortNameParser(){
  return createMonthNameParser('short');
}

function createMonthFullNameFormatter(){
  return createMonthNameFormatter('long');
}

function createMonthFullNameParser(){
  return createMonthNameParser('long');
}

function createDayNameList(modifier){
  const dateFormatter = createDateFormatter({
    weekday: modifier || 'long'
  });
  const dayNames = [];
  let date;
  for (let i = 1; i < 8; i++){
    if (date){
      date.setDate(i);
    }
    else {
      // 2023-01-01 started on a sunday
      date = new Date(2023, 0, 1);
    }
    const dateString = dateFormatter.format(date);
    const dayName = dateString.replace(/[^\d\w]/g, '');
    dayNames.push(dayName);
  }
  return dayNames;
}

function createDayNameFormatter(modifier){
  const dayNames = createDayNameList(modifier);
  return function(value){
    if (value === null) {
      return getNullString();
    }
    return dayNames[value];
  }
}

function createDayNameParser(modifier){
  const dayNames = createDayNameList(modifier);
  return function(dayNameValue){
    if (!dayNameValue) {
      return null;
    }
    const upperDayNameValue = dayNameValue.toUpperCase();
    return dayNames.findIndex(listedName =>{
      if (listedName === null) {
        return false;
      }
      return listedName.toUpperCase() === upperDayNameValue;
    });
  };
}

function createDayShortNameFormatter(){
  return createDayNameFormatter('short');
}

function createDayShortNameParser(){
  return createDayNameParser('short');
}

function createDayFullNameFormatter(){
  return createDayNameFormatter('long');
}

function createDayFullNameParser(){
  return createDayNameParser('long');
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
  let literal = '';
  const typeId = type.typeId;
  // see: https://github.com/apache/arrow-js/blob/main/src/enum.ts
  switch (typeId){
    case 1:   // Null
      literal = 'NULL';
      break;
    case 7:   // Decimal
      const decimalString = getArrowDecimalAsString(value, type);
      literal = `${decimalString}::DECIMAL`;
      break;
    case 2:   // Int
    case 3:   // float
    case 6:   // Bool
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
    // case 4: // array of uint8. Used for BLOB, BITSTRING
      
    case 5:   // Utf8 (string)
      literal = quoteStringLiteral(value); 
      break;
    case 8:   // Date
      switch (typeof value) {
        case 'number':
          value = new Date(value);
        case 'object':
          if (value === null) {
            literal = 'NULL::DATE';
            break;
          }
          else 
          if (value instanceof Date) {
            literal = `DATE'${value.toISOString().split('T')[0]}'`;
            break;
          }
        default:
          literal = '';
          console.error(`Error rendering value "${String(value)}" (typeId: ${typeId}).`);
      }
      break;
    case 10:   // Timestamp
      literal = `to_timestamp( ${value}::DOUBLE / 1000)`;
      break;
    case 12:  // LIST
    case 16:  // fixed size list
      const elementType = type.children[0].type;
      for (let i = 0; i < value.length; i++){
        if (i) {
          literal += ',';
        }
        const elementValue = value.get(i);
        literal += getDuckDbLiteralForValue(elementValue, elementType)
      }
      literal = `[${literal}]`;
      break;
    case 13:  // Struct
      literal = type.children.map(entry =>{
        const entryName = entry.name;
        const entryValue = value[entryName];
        const entryType = entry.type;
        const entryValueLiteral = getDuckDbLiteralForValue(entryValue, entryType);
        const entryLiteral = `${quoteStringLiteral(entryName)}: ${entryValueLiteral}`;
        return entryLiteral;
      }).join(',');
      literal = `{${literal}}`;
      break;
    case 17:  // Map
      const mapEntryType = type.children[0].type;
      const keyType = mapEntryType.children[0].type;
      const valueType = mapEntryType.children[1].type;
      const entries = Object.entries(value);
      literal = 'MAP{' + entries.map(entry => {
        const keyLiteral = getDuckDbLiteralForValue(entry[0], keyType);
        const valueLiteral = getDuckDbLiteralForValue(entry[1], valueType);
        return `${keyLiteral}: ${valueLiteral}`;
      }).join(',') + '}';
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
    case -1:  // Dictionary - this is what duckdb uses for ENUM Type
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
      console.warn(new Error(`Unrecognized arrow type ${typeId}`));
      console.log(value);
      //throw new Error(`Unrecognized arrow type ${typeId}`);
      switch (typeof value) {
        case 'object':
          literal = value === null? 'null' : value.toString();
          break;
        default: 
          literal = value;
      }
  }
  return literal;
}

const dataTypes = {
  'DECIMAL': {
    defaultAnalyticalRole: 'measure',
    isNumeric: true,
    createFormatter: function(){
      const formatter = createNumberFormatter(true);
      return function(value, field){
        return formatter.format(value, field)
      };
    },
    createLiteralWriter: function(dataTypeInfo, dataType){
      const typeParts = /DECIMAL\((\d+)(,(\d+))?\)?/.exec(dataType);
      if (!typeParts){
        throw new Error(`Couldn't match ${dataType} against regex for DECIMAL`);
      }
      let precision, scale;
      if (typeParts[1]){
        precision = parseInt(typeParts[1], 10);
        
        if(typeParts[3]){
          scale = parseInt(typeParts[3], 10);
        }
      }
      return createDecimalLiteralWriter(precision, scale);
    }
  },
  'DOUBLE': {
    defaultAnalyticalRole: 'measure',
    isNumeric: true,
    createFormatter: function(){
      const formatter = createNumberFormatter(true);
      return function(value, field){
        return formatter.format(value, field);
      };
    },
    createLiteralWriter: function(dataTypeInfo, dataType){
      return createDefaultLiteralWriter('DOUBLE');
    }    
  },
  'FLOAT': {
    defaultAnalyticalRole: 'measure',
    isNumeric: true,
    greaterPrecisionAlternative: "DOUBLE",
    createFormatter: function(){
      const formatter = createNumberFormatter(true);
      return function(value, field){
        return formatter.format(value, field);
      };
    },
    createLiteralWriter: function(dataTypeInfo, dataType){
      return createDefaultLiteralWriter('FLOAT');
    }
  },
  'REAL': {
    defaultAnalyticalRole: 'measure',
    isNumeric: true,
    greaterPrecisionAlternative: "DOUBLE",
    createFormatter: function(){
      const formatter = createNumberFormatter(true);
      return function(value, field){
        return formatter.format(value, field);
      };
    },
    createLiteralWriter: function(dataTypeInfo, dataType){
      return createDefaultLiteralWriter('REAL');
    }
  },
  'BIGNUM': {
    defaultAnalyticalRole: 'measure',
    isNumeric: true,
    isInteger: true,
    createFormatter: function(){
      return function(value, field){
        if (value === null) {
          return null;
        }
        return decodeDuckDBBignum(value).toString();
      };
    },
    createLiteralWriter: function(dataTypeInfo, dataType){
      return function(value, field){
        if (value === null) {
          return 'NULL::BIGNUM';
        }
        return decodeDuckDBBignum(value).toString() + '::BIGNUM' 
      };
    }
  },
  'BIGINT': {
    defaultAnalyticalRole: 'measure',
    isNumeric: true,
    isInteger: true,
    greaterPrecisionAlternative: "HUGEINT",
    createFormatter: function(){
      const formatter = createNumberFormatter(false);
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
      const formatter = createNumberFormatter(false);
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
      const formatter = createNumberFormatter(false);
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
      const formatter = createNumberFormatter(false);
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
      const formatter = createNumberFormatter(false);
      return function(value, field){
        return formatter.format(value, field);
      };
    },
    createLiteralWriter: function(dataTypeInfo, dataType){
      return createDefaultLiteralWriter('TINYINT');
    }    
  },
  'UBIGINT': {
    defaultAnalyticalRole: 'measure',
    isNumeric: true,
    isInteger: true,
    isUnsigned: true,
    greaterPrecisionAlternative: "UHUGEINT",
    createFormatter: function(){
      const formatter = createNumberFormatter(false);
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
      const formatter = createNumberFormatter(false);
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
      const formatter = createNumberFormatter(false);
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
      const formatter = createNumberFormatter(false);
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
      const formatter = createNumberFormatter(false);
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
    createLiteralWriter: function(dataTypeInfo, dataType){
      return function(value) {
        if (value === null) {
          return 'NULL::BIT';
        }
        return `'${duckdbBITtoString(value)}'::BIT`;
      }
    },
    createFormatter: function(){
      return function(value){
        if (value === null){
          return getNullString();
        }
        return duckdbBITtoString(value);
      }
    }
  },
  'BOOLEAN': {
    defaultAnalyticalRole: 'attribute',
    createLiteralWriter: function(dataTypeInfo, dataType){
      return function(value, field){
        return `${value === null ? 'NULL::BOOLEAN' : Boolean(value)}`;
      }
    }
  },
  'BLOB': {
    defaultAnalyticalRole: 'attribute',
    hasBlobDerivations: true,    
    createLiteralWriter: function(dataTypeInfo, dataType){
      return function(value, field){
        if (value === null) {
          return 'NULL::BLOB';
        }
        return `from_hex( '${value.toHex()}' )`;
      }
    },
    createFormatter(){
      return function(value, field){
        if (value === null){
          return getNullString();
        }
        return value.toHex();
      }
    }
  },
  'DATE': {
    defaultAnalyticalRole: 'attribute',
    hasDateFields: true,
    hasTimestampFields: true,
    createFormatter: function(){
      const localeSettings = settings.getSettings('localeSettings');
      const locales = localeSettings.locale;
      const formatter = new Intl.DateTimeFormat(locales, {
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
        if (value === null) {
          return 'NULL::DATE';
        }
        const dateValue = new Date(value);
        const monthNum = monthNumFormatter(1 + dateValue.getUTCMonth());
        const dayNum = dayNumFormatter(dateValue.getUTCDate());
        return `DATE'${dateValue.getUTCFullYear()}-${monthNum}-${dayNum}'`;
      };
    }
  },
  'TIME': {
    defaultAnalyticalRole: 'attribute',
    hasTimeFields: true,
    hasTimestampFields: true,
    createFormatter: function(){
      return createTimeFormatter(false);
    },
    createLiteralWriter: function(dataTypeInfo, dataType){
      return createTimeLiteralWriter('TIMESTAMP');
    }
  },
  'TIME_NS': {
    defaultAnalyticalRole: 'attribute',
    hasTimeFields: true,
    hasTimestampFields: true,
    createFormatter: function(){
      return createTimeFormatter(false);
    },
    createLiteralWriter: function(dataTypeInfo, dataType){
      return createTimeLiteralWriter('TIMESTAMP');
    }
  },
  'TIME WITH TIME ZONE': {
    defaultAnalyticalRole: 'attribute',
    hasTimeFields: true,
    hasTimestampFields: true,
    hasTimezone: true,
    createFormatter: function(){
      return createTimeFormatter(true);
    },
    createLiteralWriter: function(dataTypeInfo, dataType){
      return createTimeLiteralWriter('TIMESTAMPTZ');
    }
  },
  'TIMESTAMP': {
    defaultAnalyticalRole: 'attribute',
    hasDateFields: true,
    hasTimestampFields: true,
    hasTimeFields: true,
    createFormatter: function(){
      return createTimestampFormatter(false);
    },
    createLiteralWriter: function(dataTypeInfo, dataType){
      return createTimestampLiteralWriter('TIMESTAMP');
    }
  },
  'TIMESTAMP WITH TIME ZONE': {
    defaultAnalyticalRole: 'attribute',
    hasDateFields: true,
    hasTimestampFields: true,
    hasTimeFields: true,
    hasTimezone: true,
    //TODO: find a way to pass thetime zone into the formatter
    createFormatter: function(){
      return createTimestampFormatter(true);
    },
    createLiteralWriter: function(dataTypeInfo, dataType){
      return createTimestampLiteralWriter('TIMESTAMPTZ');
    }
  },
  'INTERVAL': {
    defaultAnalyticalRole: 'measure'
  },
  'UUID': {
    defaultAnalyticalRole: 'attribute',
    hasUUIDDerivations: true
  },
  'ENUM': {
    defaultAnalyticalRole: 'attribute',
    hasTextDerivations: true,
    hasEnumDerivations: true,
    createFormatter: createStringTypeFormatter,
    createLiteralWriter(dataTypeInfo, dataType){
      return function(value, field){
        return value === null ? 'NULL::VARCHAR' : `${quoteStringLiteral(value)}::${dataType}`;
      };
    }
  },
  'VARCHAR': {
    defaultAnalyticalRole: 'attribute',
    hasTextDerivations: true,
    createFormatter: createStringTypeFormatter,
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
        const type = field.type;
        const duckdbValue = getDuckDbLiteralForValue(value, type);
        const duckdbValueExpression = `CAST( ${duckdbValue} AS ${dataType} )`;
        return duckdbValueExpression;
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
        const type = field.type;
        const duckdbValue = getDuckDbLiteralForValue(value, type);
        const duckdbValueExpression = `CAST( ${duckdbValue} AS ${dataType} )`;
        return duckdbValueExpression;
      }
    }
  },
  'JSON': {
    defaultAnalyticalRole: 'attribute',
    createLiteralWriter: function(dataTypeInfo, dataType){
      return function(value, field){
        return `${quoteStringLiteral(String(value))}::JSON`;
      }
    }
  },
  'UNION': {
    defaultAnalyticalRole: 'attribute'
  },
  'GEOMETRY': {
    defaultAnalyticalRole: 'attribute',
    createLiteralWriter: function(dataTypeInfo, dataType){
      const crs = getCRSFromGeometryType(dataType);
      return function(value, field){
        if (value === null){
          return `NULL::${dataType}`;
        }
        const hex = value.toHex().replace(/../g, '\\x$&');
        let expression = `ST_GeomFromWKB('${hex}')`;
        if (crs){
          expression += `::${dataType}`;
        }
        return expression;
      }
    }
  }
};

function getDataTypeInfo(columnType){
  if (isArrayType(columnType)) {
    return dataTypes['ARRAY'];
  }
  if (isGeometryType(columnType)){
    return dataTypes['GEOMETRY'];
  }
  const columnTypeUpper = columnType.toUpperCase();
  const typeNames = Object.keys(dataTypes).filter(function(dataTypeName){
    return columnTypeUpper.startsWith(dataTypeName.toUpperCase());
  });
  if (typeNames.length === 0) {
    return undefined;
  }
  
  // check if there exists a type with exactly the given name
  const dataTypeInfo = dataTypes[columnTypeUpper];
  if (dataTypeInfo) {
    return dataTypeInfo;
  }
  
  // no. This means the type is in some way modified/parameterized, like DECIMAL(nn, nn)
  // try to find the "best" match.
  typeNames.sort((a, b) => {
    if (a.length > b.length) {
      return 1;
    }
    else
    if (a.length < b.length) {
      return -1;
    }
    return 0;
  });
  const typeName = typeNames[0];
  return dataTypes[typeName];
}

function quoteStringLiteral(str){
  return typeof str === 'string'  ? `'${str.replace(/'/g, "''")}'` : str; 
}

function isQuoted(str, startQuote, endQuote){
  if (!str.startsWith(startQuote)){
    return false;
  }
  if (!endQuote) {
    endQuote = startQuote;
  }
  return str.endsWith(endQuote);
}

function isQuotedIdentifier(str){
  return isQuoted(str, '"');
}

function unQuote(str, startQuote, endQuote){
  if (!endQuote) {
    endQuote = startQuote;
  }
  if (!str.startsWith(startQuote)){
    throw new Error(`Cannot unquote value: ${str}`);
  }
  if (!str.endsWith(endQuote)){
    throw new Error(`Cannot unquote value: ${str} must end with ${endQuote}`);
  }
  return str.slice(startQuote.length, -endQuote.length);
}

function unQuoteStringLiteral(str){
  return unQuote(str, '\'');
}

function unQuoteIdentifier(str){
  return unQuote(str, '"');
}

function identifierRequiresQuoting(identifier){
  return window.hueyDb.reservedWords.includes(identifier.toLowerCase()) || 
    /^\d|[\s\[\]\{\}\(\)\.\/\+\-\&\*\^\?\\<>'"%=~!:;@#]/.test(identifier)
  ;
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
  if (typeof identifier !== 'string'){
    identifier = String(identifier);
  }
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
  let sqlOptions = normalizeSqlOptions();
  switch (arguments.length) {
    case 0:
      throw new Error(`Invalid number of arguments.`);
    case 1:
      const arg = arguments[0];
      return getQualifiedIdentifier(arg, sqlOptions);
    case 2:
      switch (typeof arguments[1]) {
        case 'object':  //2nd argument is sqlOptions
          switch (typeof arguments[0]) {
            case 'string':
              return getQualifiedIdentifier([arguments[0]], sqlOptions);
            case 'object':
              if (arguments[0] instanceof Array ) {
                return arguments[0]
                .map(identifier => getIdentifier(identifier, sqlOptions.alwaysQuoteIdentifiers))
                .join('.')
                ;
              }
            default:
              throw new Error(`Invalid argument`);
          }
        case 'string':
          return getQualifiedIdentifier([arguments[0], arguments[1]]);
        case 'undefined':
          return getQualifiedIdentifier(arguments[0], sqlOptions);
        default:
          throw new Error(`Invalid argument type ${typeof arguments[1]}`);
      }
    default:
      let n = arguments.length;
      const lastArgument = arguments[n - 1];
      if (typeof lastArgument === 'object') {
        sqlOptions = lastArgument;
        n -= 1;
      }
      sqlOptions = normalizeSqlOptions(sqlOptions);
      
      const args = [];
      for (let i = 0; i < n; i++){
        const identifier = arguments[i];
        args.push(identifier);
      }
      return getQualifiedIdentifier(args, sqlOptions);
  }
}

async function ensureDuckDbExtensionLoadedAndInstalled(extensionName, repositoryName){
  const connection = hueyDb.connection;
  let sql = `SELECT * FROM duckdb_extensions() WHERE extension_name = ?`;
  const statement = await connection.prepare(sql);
  let result = await statement.query(extensionName);
  statement.close();
  if (result.numRows === 0) {
    return;
  }

  let row = result.get(0);
  const loaded = row.loaded;
  const installed = row.installed;
  
  if (!installed) {
    sql = `INSTALL ${extensionName}`;
    if (repositoryName) {
      sql += ` FROM ${repositoryName}`;
    }
    result = await connection.query(sql);
  }
  
  if (!loaded){
    sql = `LOAD ${extensionName}`;
    result = await connection.query(sql);
  }
  return true;
}

function getCopyToStatement(selectStatement, fileName, options){
  const optionsString = Object.keys(options)
  .map(option => {
    return `${option} ${options[option]}`
  }).join('\n, ');
  
  const copyStatement = [
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
  let prefix = '', postfix = ''
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
  const defaultSqlSettings = settings.getSettings('sqlSettings');
  return Object.assign({}, defaultSqlSettings, sqlOptions);
}

function getSqlValuesClause(valueLiterals, tableAlias, columnAlias){
  let valuesClause = `(VALUES (${valueLiterals.join('),(')}) )`;
  if (tableAlias){
    valuesClause += ` AS ${tableAlias}`;
    if (columnAlias){
      valuesClause += `(${columnAlias})`;
    }
  }
  return valuesClause;
}

function getStructTypeDescriptor(structColumnType){
  let index = 0;
  const keyword = 'STRUCT';
  if (!structColumnType.startsWith(keyword)){
    throw new Error(`Type "${structColumnType}" is not a STRUCT: expected keyword ${keyword} at position ${index}`);
  }
  index = keyword.length;
  if (structColumnType.charAt(index) !== '(') {
    throw new Error(`Type "${structColumnType}" is not a STRUCT: expected "("  at position ${index} `);
  }
  index += 1;
  const structure = {};
  
  function parseMemberName(){
    let memberName;
    let startOfMemberName = index;
    let endOfMemberName;
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
    const startOfMemberType = index;
    let endOfMemberType;
    let level = 0;
    _loop: while (index < structColumnType.length){
      const ch = structColumnType.charAt(index);
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
    const memberType = structColumnType.substring(startOfMemberType, endOfMemberType);
    return memberType;
  }
  
  _loop: while (index < structColumnType.length) {

    const memberName = parseMemberName();
    if (structColumnType.charAt(index) !== ' '){
      throw new Error(`Error parsing STRUCT ${structColumnType}: expected "  "  at ${index}`);
    }
    index += 1;
    const type = parseMemberType();
    structure[memberName] = type;
    
    const ch = structColumnType.charAt(index);
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

function getMapKeyValueType(mapType){
  if (!isMapType(mapType)){
    throw new Error(`Expected a MAP type`)
  }
  
  let level = 0;
  let i;
  const elementTypes = unQuote(mapType, 'MAP(', ')');
  _loop: for (i = 0; i < elementTypes.length; i++){
    const ch = elementTypes.charAt(i);
    switch (ch){
      case '(':
        level += 1;
        break;
      case ')':
        level -= 1;
        break;
      case ',':
        if (level === 0) {
          break _loop;
        }
    }
  }
  const keyType = elementTypes.slice(0, i).trim();
  const valueType = elementTypes.slice(i + 1).trim();
  return {
    keyType: keyType,
    valueType: valueType
  };
}

function getMapKeyType(mapType){
  const keyValueType = getMapKeyValueType(mapType);
  return keyValueType.keyType;
}

function getMapValueType(mapType){
  const keyValueType = getMapKeyValueType(mapType);
  return keyValueType.valueType;
}

// argument should be a MAP(<keyType>, <valueType>) typedescriptor.
// this function will return the type that results from calling map_entries(<map>),
// which would be: STRUCT(key <keyType>, value <valueType>)[]
function getMapEntriesType(mapType){
  const entryType = getMapEntryType(mapType)
  return getArrayType(entryType);
}

function getMapEntryType(mapType){
  const keyType = getMemberExpressionType(mapType, 'key');
  const valueType = getMemberExpressionType(mapType, 'value');
  return `STRUCT(key ${keyType}, value ${valueType})`;
}

function getArrayElementType(arrayType){
  if (!isArrayType(arrayType)){
    throw new Error(`Expected an array type`);
  }
  const match = /\[\d*\]$/.exec(arrayType);
  return arrayType.slice(0, -match[0].length);
}

function getArrayType(elementType){
  return elementType + '[]';
}

function isArrayType(dataType){
  return /\[\d*\]$/.test( dataType );
}

function isGeometryType(dataType){
  return /^GEOMETRY(?:\('[^']+'\))?$/.test(dataType);
}

function getCRSFromGeometryType(dataType){
  return /^GEOMETRY(?:\('(?<crs>[^']+)'\))?$/.exec(dataType).groups.crs;
}

function isMapType(dataType) {
  return dataType.startsWith('MAP(') && dataType.endsWith(')');
}

function isStructType(dataType) {
  return dataType.startsWith('STRUCT(') && dataType.endsWith(')');
}

function isStringType(dataType){
  return dataType === 'VARCHAR' || dataType === 'BLOB';
}

function getMemberExpressionType(type, memberExpressionPath){
  if (memberExpressionPath.length) {
    const typeOfMemberExpressionPath = typeof memberExpressionPath;
    switch (typeOfMemberExpressionPath) {
      case 'object':
        //TODO: 
        // for all the cases where the member expression path element has parenthesis, 
        // we should be looking up the corresponding derivation
        // and extract the type info from there.
        const memberExpression = memberExpressionPath[0];
        let memberExpressionType;
        switch (memberExpression) {
          case 'unnest()':
            memberExpressionType = getArrayElementType(type);
            break;
          case 'generate_subscripts()':
            memberExpressionType = 'BIGINT';
            break;
          case 'map_entries()':
            memberExpressionType = getMapEntriesType(type);
            break;
          case 'map_keys()':
            //memberExpressionType = getArrayElementType(type);
            //memberExpressionType = getMapKeyType(memberExpressionType);
            memberExpressionType = getMapKeyType(type);
            memberExpressionType = getArrayType(memberExpressionType);
            break;
          case 'map_values()':
            //memberExpressionType = getArrayElementType(type);
            //memberExpressionType = getMapValueType(memberExpressionType);
            memberExpressionType = getMapValueType(type);
            memberExpressionType = getArrayType(memberExpressionType);
            break;
          default:
            const typeDescriptor = getStructTypeDescriptor(type);
            memberExpressionType = typeDescriptor[memberExpression];
        }
        return getMemberExpressionType(memberExpressionType, memberExpressionPath.slice(1));
      case 'string':
        if (!isMapType(type)){
          throw new Error(`Expected a MAP type`);
        }
        switch (memberExpressionPath){
          case 'key':
            return getMapKeyType(type);
          case 'value':
            return getMapValueType(type);
          default:
            throw new Error(`Don't know how to handle memerExpressionPath "${memberExpressionPath}"`);
        }
      default:
        throw new Error(`Don't know how to handle memerExpressionPath of type "${typeOfMemberExpressionPath}"`);
    }
  }
  else {
    return type;
  }
}

function extrapolateColumnExpression(expressionTemplate, columnExpression){
  return expressionTemplate.replace(/\$\{columnExpression\}/g, `${columnExpression}`);
}

function getUsingSampleClause(samplingConfig, useTableSample){
  const size = samplingConfig.size || 100;
  const unit = samplingConfig.unit || 'ROWS';
  const method = samplingConfig.method || 'SYSTEM';
  let sampleClause;
  if (method === 'LIMIT'){
    sampleClause = `LIMIT ${size}`;
  }
  else {
    const sampleKeyword = useTableSample ? 'TABLESAMPLE' : 'USING SAMPLE';
    sampleClause = `${sampleKeyword} ${size} ${unit} ( ${method}${samplingConfig.seed === undefined ? '' : ', ' + samplingConfig.seed} )`;
  }
  return sampleClause;
}

function getMedianReturnDataTypeForArgumentDataType(argumentDataType){
  const argumentTypeInfo = getDataTypeInfo(argumentDataType);
  let returnDataType;
  if (argumentTypeInfo.isInteger) {
    returnDataType = 'DOUBLE';
  }
  else {
    returnDataType = argumentDataType;
  }
  return returnDataType;
}
