var duckdbExtensionForFileExtension = {
  'json': 'json',
  'parquet': 'parquet',
  'sqlite': 'sqlite_scanner',
  'xlsx': 'spatial'
};

var dataTypes = {
  'DECIMAL': {
    isNumeric: true
  },
  'DOUBLE': {
    isNumeric: true
  },
  'REAL': {
    isNumeric: true
  },
  'BIGINT': {
    isNumeric: true,
    isInteger: true
  },
  'HUGEINT': {
    isNumeric: true,
    isInteger: true
  },
  'INTEGER': {
    isNumeric: true,
    isInteger: true
  },
  'SMALLINT': {
    isNumeric: true,
    isInteger: true
  },
  'TINYINT': {
    isNumeric: true,
    isInteger: true
  },
  'UBIGINT': {
    isNumeric: true,
    isInteger: true,
    isUnsigned: true
  },
  'UINTEGER': {
    isNumeric: true,
    isInteger: true,
    isUnsigned: true
  },
  'USMALLINT': {
    isNumeric: true,
    isInteger: true,
    isUnsigned: true
  },
  'UTINYINT': {
    isNumeric: true,
    isInteger: true,
    isUnsigned: true
  },
  'BIT': {
  },
  'BOOLEAN': {
  },
  'BLOB': {
  },
  'DATE': {
    hasDateFields: true
  },
  'TIME': {
    hasTimeFields: true
  },
  'TIMESTAMP': {
    hasDateFields: true,
    hasTimeFields: true
  },
  'TIMESTAMP WITH TIME ZONE': {
    hasDateFields: true,
    hasTimeFields: true,
    hasTimezone: true
  },
  'INTERVAL': {
  },
  'UUID': {
  },
  'ENUM': {
  },
  'VARCHAR': {
  },
  'ARRAY': {
  },
  'LIST': {
  },
  'MAP': {
  },
  'STRUCT': {
  },
  'UNION': {
  }
};

function getQuotedIdentifier(identifier){
  return `"${identifier.replace(/"/g, '""')}"`;
}

function getQualifiedIdentifier(){
  switch (arguments.length) {
    case 0:
      throw new Error(`Invalid number of arguments.`);
    case 1:
      var arg = arguments[0];
      switch (typeof arg) {
        case 'string':
          return getQualifiedIdentifier([arg]);
        case 'object':
          if (arg instanceof Array) {
            if (arg.length) {
              return arg
              .filter(function(element){
                return String(element) === element;
              })
              .map(function(element){
                if (!element.startsWith('"') && !element.endsWith('"')){
                  return getQuotedIdentifier(element);
                }
                return element;
              })
              .join('.');
            }
            else {
              return undefined;
            }
          }
      }
      break;
    default:
      var args = [];
      for (var i = 0; i < arguments.length; i++){
        var identifier = arguments[i];
        args.push(identifier);
      }
      return getQualifiedIdentifier(args);
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
