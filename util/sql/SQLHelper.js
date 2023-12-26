function getQuotedIdentifier(identifier){
  return `"${identifier}"`;
}

function getQualifiedIdentifier(){
  var identifiers = [];
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
                  return getQualifiedIdentifier(element);
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
      args = [];
      for (var i = 0; i < arguments.length; i++){
        var identifier = arguments[i];
        if (!identifier.startsWith('"') && !identifier.endsWith('"')){
          identifier = getQuotedIdentifier(identifier);
        }
        identifiers.push(identifier);
      }
      return getQualifiedIdentifier(args);
  }
  throw new Error(`Invalid arguments`);
}

function getSQLFromClauseForDatasource(datasource) {
  var sqlDatasource;
  switch (datasource.type) {
    case 'file':
      var fileName = datasource.fileName;
      sqlDatasource = getQuotedIdentifier(fileName);
      break;
    case 'table':
      var schemaName = datasource.schemaName;
      var tableName = datasource.tableName;
      sqlDatasource = getQualifiedIdentifier(schemaName, tableName);
      break;
    case 'view':
      var schemaName = datasource.schemaName;
      var viewName = datasource.viewName;
      sqlDatasource = getQualifiedIdentifier(schemaName, viewName);
      break;
    case 'tableFunction':
      var schemaName = datasource.schemaName;
      var functionName = datasource.functionName;
      sqlDatasource = getQualifiedIdentifier(schemaName, functionName);
      // TODO: handle parameters
      sqlDatasource += '()';
      break;
  }
  var sql = `FROM ${sqlDatasource}`;
  return sql;
}

function getSQLForDataProfile(datasource, sampleSize) {
  var fromClause = getSQLFromClauseForDatasource(datasource);
  var sql = `SUMMARIZE SELECT * ${fromClause}`;
  if (sampleSize) {
    var sampleSpecification;
    switch (typeof sampleSize){
      case 'number':
        var iSampleSize = parseInt(sampleSize, 10);
        if (iSampleSize === sampleSize){
          sampleSpecification = `${sampleSize} ROWS`;
        }
        else 
        if (sampleSize < 1 && sampleSize >= 0) {
          sampleSpecification = `${sampleSize * 100} PERCENT`;
        }
        else {
          throw new Error(`Invalid value for sampleSize ${sampleSize}`);
        }
        break;
      default:
        throw new Error(`Invalid type for sampleSize`);
    }
    sql += ` USING SAMPLE ${sampleSpecification}`;
    return sql;
  }
  
}

function getSQLForQueryModelAxis(queryAxis){
  var items = queryAxis;
}

function getSQLForQueryModel(){
}