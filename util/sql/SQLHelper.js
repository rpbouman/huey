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


/**

This is what we'd like to return here:

with 
datasource as (
  select *
  from read_parquet('C:\roland\projects\QuaQuery\files\poplegales2017-2021.parquet')
)
,columns_axis as (
  SELECT    DISTINCT "ANNEE_RP"
  FROM      data
  ORDER BY  "ANNEE_RP" ASC
)
,rows_axis as (
  SELECT    DISTINCT "CODDEP"
  ,         "CODGEO"
  FROM      data
  ORDER BY  "CODDEP" ASC
  ,         "CODGEO" ASC
)
,cells as (
  select     {"ANNEE_RP": columns_axis."ANNEE_RP"} as column_tuple
  ,          {"CODDEP": rows_axis."CODDEP", "CODGEO": rows_axis."CODGEO"} as row_tuple
  ,          PMUN 
  from       columns_axis
  cross join rows_axis
  left join  data
  on         columns_axis."ANNEE_RP" = data."ANNEE_RP"
  and        rows_axis."CODDEP"      = data."CODDEP"
)
pivot cells 
on column_tuple
using 
  sum(PMUN)         as "PMUN sum"
, count(PMUN)       as "PMIN count"
group by row_tuple


*/

function getSqlFragmentsForTupleAxis(queryModel, axisId, aliasForMapping){
  var queryAxis = queryModel.getQueryAxis(axisId);
  var queryAxisItems = queryAxis.getItems();
  if (queryAxisItems.length === 0) {
    return undefined;
  }
  var selectStatement = TupleSet.getSqlSelectStatement(queryModel, axisId);
  var cteName = axisId;
  var cte = `${getQuotedIdentifier(cteName)} AS (\n${selectStatement}\n)`;
  var joinConditions = {};
  var tupleMembers = queryAxisItems.map(function(queryAxisItem){
    var queryAxisItemCaption = QueryAxisItem.getCaptionForQueryAxisItem(queryAxisItem);
    joinConditions[getQualifiedIdentifier(cteName, queryAxisItemCaption)] = QueryAxisItem.getSqlForQueryAxisItem(queryAxisItem, aliasForMapping);
    return `${getQuotedIdentifier(queryAxisItemCaption)}: ${getQualifiedIdentifier(axisId, queryAxisItemCaption)}`;
  });
  var tupleName = `${axisId}_tuple`;
  var tupleDefinition = `{${tupleMembers.join('\n,')}} AS ${getQuotedIdentifier(tupleName)}`;
  return {
    cte: cte, 
    cteName: cteName,
    tupleName: tupleName,
    tupleDefinition: tupleDefinition,
    joinConditions: joinConditions
  }
}

function getDuckDbPivotSqlStatementForQueryModel(queryModel){
  var aliasForCells = 'datasource';
  var datasource = queryModel.getDatasource();
  
  var columnsAxisFragments = getSqlFragmentsForTupleAxis(queryModel, QueryModel.AXIS_COLUMNS, aliasForCells);

  var rowsAxisFragments = getSqlFragmentsForTupleAxis(queryModel, QueryModel.AXIS_ROWS, aliasForCells);

  var cellsAxis = queryModel.getCellsAxis();
  var cellsAxisItems = cellsAxis.getItems();
  var cellsAxisColumnNames = [];
  var cellsAxisAggregateExpressions = [];
  cellsAxisItems.forEach(function(cellsAxisItem){
    var cellsAxisItemCaption = QueryAxisItem.getCaptionForQueryAxisItem(cellsAxisItem);
    var cellsAxisExpression;

    var cellsAxisItemExpression;
    var cellsAxisItemColumnName = cellsAxisItem.columnName;
    if (cellsAxisItemColumnName === '*' && cellsAxisItem.aggregator === 'count') {
      // count(*) is special, we need to count an actual column, not *
      for (var joinCol in columnsAxisFragments.joinConditions){
        cellsAxisItemExpression = columnsAxisFragments.joinConditions[joinCol];
        break;
      }
      var aliasForStar = getQuotedIdentifier('*');
      cellsAxisItemExpression = `${cellsAxisItemExpression} AS ${aliasForStar}`;
      cellsAxisExpression = `COUNT( ${aliasForStar} )`;
    }
    else{
      cellsAxisExpression = QueryAxisItem.getSqlForQueryAxisItem(cellsAxisItem);
      cellsAxisItemExpression = getQualifiedIdentifier(aliasForCells, cellsAxisItemColumnName);
    }
    cellsAxisColumnNames.push(cellsAxisItemExpression);
    cellsAxisAggregateExpressions.push(`${cellsAxisExpression} AS ${getQuotedIdentifier(cellsAxisItemCaption)}`);
  });
  
  var cellsSelectList = [].concat([
    columnsAxisFragments.tupleDefinition,
    rowsAxisFragments.tupleDefinition,
  ], cellsAxisColumnNames);
  
  var columnsJoinConditions = Object.keys(columnsAxisFragments.joinConditions).map(function(tupleExpression){
    var mappedExpression = columnsAxisFragments.joinConditions[tupleExpression];
    return `${tupleExpression} = ${mappedExpression}`;
  });
  var rowsJoinConditions = Object.keys(rowsAxisFragments.joinConditions).map(function(tupleExpression){
    var mappedExpression = rowsAxisFragments.joinConditions[tupleExpression];
    return `${tupleExpression} = ${mappedExpression}`;
  });
  var joinConditions = [].concat(columnsJoinConditions, rowsJoinConditions);
  
  var cellsCteName = 'cells';
  var cellsCte = [
    `SELECT ${cellsSelectList.join('\n,')}`,
    `FROM ${getQuotedIdentifier(columnsAxisFragments.cteName)}`,
    `CROSS JOIN ${getQuotedIdentifier(rowsAxisFragments.cteName)}`,
    `LEFT JOIN ${datasource.getRelationExpression(aliasForCells)}`,
    `ON ${joinConditions.join('\nAND ')}`
  ].join('\n');
  cellsCte = `${getQuotedIdentifier(cellsCteName)} AS (\n${cellsCte}\n)`
  
  var pivotStatement = [
    `PIVOT ${getQuotedIdentifier(cellsCteName)}`,
    `ON ${getQuotedIdentifier(columnsAxisFragments.tupleName)}`,
    `USING ${cellsAxisAggregateExpressions.join('\n')}`,
    `GROUP BY ${getQuotedIdentifier(rowsAxisFragments.tupleName)}`,
    `ORDER BY ${getQuotedIdentifier(rowsAxisFragments.tupleName)}`
  ].join('\n');
  
  var sql = [
    `WITH ${columnsAxisFragments.cte}`,
    `,${rowsAxisFragments.cte}`,
    `,${cellsCte}`,
    pivotStatement
  ].join('\n');
  return sql;
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
    `* DuckDB query generated ${new Date(Date.now())} by Huey`,
    `* https://github.com/rpbouman/huey`,
    `**********************************/`
  ].join('\n');
}

function getDuckDbTableSqlStatementForQueryModel(queryModel){
  var datasource = queryModel.getDatasource();

  var rowsAxisItems = queryModel.getRowsAxis().getItems();
  var columnsAxisItems = queryModel.getColumnsAxis().getItems();
  var cellsAxisItems = queryModel.getCellsAxis().getItems();
  var queryAxisItems = [].concat(rowsAxisItems, columnsAxisItems, cellsAxisItems);
  
  var selectList = {}, groupBy = [], orderBy = [];
  for (var i = 0; i < queryAxisItems.length; i++){
    var queryAxisItem = queryAxisItems[i];
    var caption = QueryAxisItem.getCaptionForQueryAxisItem(queryAxisItem);
    var sqlExpression = QueryAxisItem.getSqlForQueryAxisItem(queryAxisItem);
    selectList[caption] = sqlExpression;
    
    if (i < rowsAxisItems.length + columnsAxisItems.length) {
      groupBy.push(sqlExpression);
      orderBy.push(sqlExpression);
    }
  }
  var selectList = Object.keys(selectList).map(function(caption){
    var sqlExpression = selectList[caption];
    return `${sqlExpression} AS ${getQuotedIdentifier(caption)}`;
  })
    
  var sql =  [
    getSqlHeader(),
    `SELECT ${selectList.join('\n, ')}`,
    datasource.getFromClauseSql(),
  ];
  var filterSql = queryModel.getFilterConditionSql();
  if (filterSql) {
    sql.push('WHERE ${filterSql}');
  }
  if (groupBy.length) {
    sql.push(`GROUP BY ${groupBy.join('\n, ')}`);
  }
  if (orderBy.length) {
    sql.push(`ORDER BY ${orderBy.join('\n, ')}`);
  }
  sql = sql.join('\n');
  return sql;
}

function getDuckDbPivotSqlStatementForQueryModel(queryModel){
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
    aggregateExpressions[' '] = 'ANY_VALUE( NULL )';
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
      return `${expression} AS ${getQuotedIdentifier(expressionId)}`;
    }),
    Object.keys(rowsExpressions).map(function(expressionId){
      var expression = rowsExpressions[expressionId];
      return `${expression} AS ${getQuotedIdentifier(expressionId)}`;
    }),
    Object.keys(cellColumnExpressions).map(function(expressionId){
      var expression = cellColumnExpressions[expressionId];
      return `${expression} AS ${getQuotedIdentifier(expressionId)}`;
    })
  );
  
  var aggregates = Object.keys(aggregateExpressions).map(function(expressionId){
    var aggregateExpression = aggregateExpressions[expressionId];
    return `${aggregateExpression} AS ${getQuotedIdentifier(expressionId)}`;
  });

  var datasource = queryModel.getDatasource();
  
  var cteName = 'data';
  var sql = [
    getSqlHeader(),
    `WITH ${cteName} AS (`,
    `SELECT ${columns.join('\n,')}`,
    `${datasource.getFromClauseSql()}`,
    `)`,
    `PIVOT ${cteName}`,
    `ON ${Object.keys(columnsExpressions).map(getQuotedIdentifier)}`,
    `USING ${aggregates.join('\n,')}`,
    `GROUP BY ${Object.keys(rowsExpressions).map(getQuotedIdentifier)}`,
    `ORDER BY ${Object.keys(rowsExpressions).map(getQuotedIdentifier)}`
  ].join('\n');
  return sql;
}