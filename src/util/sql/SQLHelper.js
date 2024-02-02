function createNumberFormatter(fractionDigits){
  var localeSettings = settings.getSettings('localeSettings');
  var locales = localeSettings.locale;
  var options = {
    minimumIntegerDigits: localeSettings.minimumIntegerDigits,
  };
  if (fractionDigits){
    options.minimumFractionDigits = localeSettings.minimumFractionDigits;
    options.maximumFractionDigits = localeSettings.maximumFractionDigits;       
  }
  var formatter = new Intl.NumberFormat(locales, options);
  return formatter;
}

function createDefaultLiteralWriter(type){
  return function(value, field){
    return `${value === null ? 'NULL' : String(value)}::${type}`;
  }
}

var dataTypes = {
  'DECIMAL': {
    isNumeric: true,
    createFormatter: function(){
      var formatter = createNumberFormatter(true);
      var decimalSeparator = formatter.formatToParts(123.456)['decimal'];
      
      return function(value, field){
        switch (typeof value){
          case 'bigint':
          case 'number':
            break;
          default:
            var stringValue = String(value);
            if (field.type.scale === 0) {
              value = BigInt(stringValue);
            }
            else {
              var parts = stringValue.split('.');
              var integerPart = formatter.formatToParts(BigInt(parts[0]))['integer'];
              var fractionPart = part[1];
              return `${integerPart}${decimalSeparator}${fractionPart}`;
            }
        }
        return formatter.format(value)
      };
    },
    createLiteralWriter: function(value, field){
      return createDefaultLiteralWriter('DECIMAL');
    }
  },
  'DOUBLE': {
    isNumeric: true,
    createFormatter: function(){
      var formatter = createNumberFormatter(true);
      return function(value, field){
        return formatter.format(value);
      };
    },
    createLiteralWriter: function(value, field){
      return createDefaultLiteralWriter('DOUBLE');
    }    
  },
  'REAL': {
    isNumeric: true,
    createFormatter: function(){
      var formatter = createNumberFormatter(true);
      return function(value, field){
        return formatter.format(value);
      };
    },
    createLiteralWriter: function(value, field){
      return createDefaultLiteralWriter('REAL');
    }    
  },
  'BIGINT': {
    isNumeric: true,
    isInteger: true,
    createFormatter: function(){
      var formatter = createNumberFormatter(false);
      return function(value, field){
        return formatter.format(value);
      };
    },
    createLiteralWriter: function(value, field){
      return createDefaultLiteralWriter('BIGINT');
    }    
  },
  'HUGEINT': {
    isNumeric: true,
    isInteger: true,
    createFormatter: function(){
      var formatter = createNumberFormatter(false);
      return function(value, field){
        return formatter.format(value);
      };
    },
    createLiteralWriter: function(value, field){
      return createDefaultLiteralWriter('BIGINT');
    }    
  },
  'INTEGER': {
    isNumeric: true,
    isInteger: true,
    createFormatter: function(){
      var formatter = createNumberFormatter(false);
      return function(value, field){
        return formatter.format(value);
      };
    },
    createLiteralWriter: function(value, field){
      return createDefaultLiteralWriter('BIGINT');
    }    
  },
  'SMALLINT': {
    isNumeric: true,
    isInteger: true,
    createFormatter: function(){
      var formatter = createNumberFormatter(false);
      return function(value, field){
        return formatter.format(value);
      };
    },
    createLiteralWriter: function(value, field){
      return createDefaultLiteralWriter('BIGINT');
    }    
  },
  'TINYINT': {
    isNumeric: true,
    isInteger: true,
    createFormatter: function(){
      var formatter = createNumberFormatter(false);
      return function(value, field){
        return formatter.format(value);
      };
    },
    createLiteralWriter: function(value, field){
      return createDefaultLiteralWriter('BIGINT');
    }    
  },
  'UBIGINT': {
    isNumeric: true,
    isInteger: true,
    isUnsigned: true,
    createFormatter: function(){
      var formatter = createNumberFormatter(false);
      return function(value, field){
        return formatter.format(value);
      };
    },
    createLiteralWriter: function(value, field){
      return createDefaultLiteralWriter('BIGINT');
    }    
  },
  'UINTEGER': {
    isNumeric: true,
    isInteger: true,
    isUnsigned: true,
    createFormatter: function(){
      var formatter = createNumberFormatter(false);
      return function(value, field){
        return formatter.format(value);
      };
    },
    createLiteralWriter: function(value, field){
      return createDefaultLiteralWriter('BIGINT');
    }    
  },
  'USMALLINT': {
    isNumeric: true,
    isInteger: true,
    isUnsigned: true,
    createFormatter: function(){
      var formatter = createNumberFormatter(false);
      return function(value, field){
        return formatter.format(value);
      };
    },
    createLiteralWriter: function(value, field){
      return createDefaultLiteralWriter('BIGINT');
    }    
  },
  'UTINYINT': {
    isNumeric: true,
    isInteger: true,
    isUnsigned: true,
    createFormatter: function(){
      var formatter = createNumberFormatter(false);
      return function(value, field){
        return formatter.format(value);
      };
    },
    createLiteralWriter: function(value, field){
      return createDefaultLiteralWriter('BIGINT');
    }    
  },
  'BIT': {
  },
  'BOOLEAN': {
  },
  'BLOB': {
  },
  'DATE': {
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
        return formatter.format(value);
      };
    },
    createLiteralWriter: function(){
      return function(value, field){
        var monthNum = String(1 + value.getUTCMonth());
        if (monthNum.length === 1) {
          monthNum = '0' + monthNum;
        }
        var dayNum = value.getUTCDate();
        if (dayNum.length === 1) {
          dayNum = '0' + dayNum;
        }
        return value === null ? 'NULL::DATE' : `DATE'${value.getUTCFullYear()}-${monthNum}-${dayNum}'`;
      };
    }
  },
  'TIME': {
    hasTimeFields: true,
    
  },
  'TIMESTAMP': {
    hasDateFields: true,
    hasTimeFields: true,
    createLiteralWriter: function(){
      return function(value, field){
        return value === null ? 'NULL::TIMESTAMP' : `to_timestamp(${value}::DOUBLE / 1000)`;       
      };
    }
  },
  'TIMESTAMP WITH TIME ZONE': {
    hasDateFields: true,
    hasTimeFields: true,
    hasTimezone: true,
    createLiteralWriter: function(){
      return function(value, field){
        return value === null ? 'CAST(NULL AS TIMESTAMP WITH TIME ZONE)' : `to_timestamp(${value}::DOUBLE / 1000)`;       
      };
    }
  },
  'INTERVAL': {
  },
  'UUID': {
  },
  'ENUM': {
  },
  'VARCHAR': {
    createFormatter: function(){
      return function(value){
        return value;
      }
    },
    createLiteralWriter: function(){
      return function(value, field){
        return value === null ? 'NULL::VARCHAR' : `'${value.replace(/"'"/g, '\'\'')}'`;       
      };
    }
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
  for (var i = 0; i < queryAxisItems.length; i++){
    var queryAxisItem = queryAxisItems[i];
    var caption = QueryAxisItem.getCaptionForQueryAxisItem(queryAxisItem);
    var sqlExpression = QueryAxisItem.getSqlForQueryAxisItem(queryAxisItem, undefined, sqlOptions);
    selectList[caption] = sqlExpression;
    
    if (i < rowsAxisItems.length + columnsAxisItems.length) {
      groupBy.push(sqlExpression);
      orderBy.push(sqlExpression);
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
    aggregateExpressions[' '] = `${keywordFormatter('any_value')}( keywordFormatter('null') )`;
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