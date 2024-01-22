class DuckDbDataSource {
  
  static types = {
    'DUCKDB': 'duckdb',
    'FILE': 'file',
    'FILES': 'files',
    'SQLITE': 'sqlite',
    'SQLQUERY': 'sql',
    'TABLE': 'table',
    'TABLEFUNCTION': 'table function',
    'VIEW': 'view'
  };
  
  static fileTypes = {
    'csv': {
      datasourceType: DuckDbDataSource.types.FILE,
      duckdb_reader: 'read_csv_auto',
    },
    'tsv': {
      datasourceType: DuckDbDataSource.types.FILE,
      duckdb_reader: 'read_csv_auto'
    },
    'txt': {
      datasourceType: DuckDbDataSource.types.FILE,
      duckdb_reader: 'read_csv_auto'
    },
    'json': {
      datasourceType: DuckDbDataSource.types.FILE,
      duckdb_reader: 'read_json_auto',
      duckdb_extension: 'json'
    },
    'parquet': {
      datasourceType: DuckDbDataSource.types.FILE,
      duckdb_reader: 'read_parquet'
    },
    'xlsx': {
      datasourceType: DuckDbDataSource.types.FILE,
      duckdb_reader: 'st_read',
      extension: 'spatial'
    },
    'duckdb': {
      datasourceType: DuckDbDataSource.types.DUCKDB
    },
    'sqlite': {
      datasourceType: DuckDbDataSource.types.SQLITE,
      extension: 'sqlite'
    }
  };
  
  #defaultSampleSize = 100;
  
  #duckDb = undefined;
  #duckDbInstance = undefined;
  #connection = undefined;
  #schemaName = undefined;
  #objectName = undefined;
  #file = undefined;
  #fileNames = undefined;
  #fileType = undefined;
  #fileProtocol = undefined;
  #type = undefined;
  #columnMetadata = undefined;
  #alias = undefined;
  #sqlQuery = undefined;
  
  constructor(duckDb, duckDbInstance, config){
    this.#duckDb = duckDb;
    this.#duckDbInstance = duckDbInstance;
    this.#init(config);
  }
  
  static getFileNameParts(fileName){
    if (fileName instanceof File) {
      fileName = fileName.name;
    }
    
    var separator = '.';
    var fileNameParts = fileName.split( separator );
    if (fileNameParts.length < 2){
      return undefined;
    }
    var extension = fileNameParts.pop();
    var lowerCaseExtension = extension.toLowerCase();
    var fileNameWithoutExtension = fileNameParts.join( separator );
    return {
      extension: extension,
      lowerCaseExtension: lowerCaseExtension,
      fileNameWithoutExtension: fileNameWithoutExtension
    };
  }
  
  static createFromFile(duckdb, instance, file) {
    if (!(file instanceof File)){
      throw new Error(`The file argument must be an instance of File`);
    }
    
    var fileName = file.name;
    var fileNameParts = DuckDbDataSource.getFileNameParts(fileName);
    var fileExtension = fileNameParts.lowerCaseExtension;
    var fileType = DuckDbDataSource.fileTypes[fileExtension];
    
    if (!fileType){
      throw new Error(`Could not determine filetype of file "${fileName}".`);
    }
    
    var config = {
      type: fileType.datasourceType,
      file: file 
    };
    var instance = new DuckDbDataSource(duckdb, instance, config);
    return instance;
  }
  
  #init(config){
    var type = config.type;
    switch (type) {
      case DuckDbDataSource.types.DUCKDB:
      case DuckDbDataSource.types.SQLITE:
      case DuckDbDataSource.types.FILE:
        var file = config.file;
        switch (typeof file) {
          case 'string':
            this.#objectName = config.file;
            break;
          case 'object':
            if (file instanceof File) {
              this.#objectName = file.name;
              this.#file = file;
              this.#fileProtocol = config.protocol || this.#duckDb.DuckDBDataProtocol.BROWSER_FILEREADER;
              break;
            }
          case 'undefined':
            if (config.fileName) {
              this.#objectName = config.fileName;
              break;
            }
          default:
            throw new Error(`Could not initialize the datasource of type ${type}: either file or filename must be specified`);
        }
        break;
      case DuckDbDataSource.types.FILES:
        var fileNames = config.fileNames;
        if (!fileNames) {
          throw new Error(`Invalid config: fileNames Array is mandatory`);
        }
        if (fileNames instanceof Array) {
          this.#fileNames = fileNames; 
        }
        else {
          throw new Error(`Invalid config: fileNames must be an array`);
        }
        if (config.fileType){
          if (DuckDbDataSource.fileTypes[config.fileType] === undefined) {
            throw new Error(`Invalid config: fileType ${config.fileType} is not recognized.`);
          }
          this.#fileType = config.fileType;
        }
        else {
          throw new Error(`Invalid config: fileType is mandatory`);
        }
        break;
      case DuckDbDataSource.types.TABLE:
        this.#schemaName = config.schemaName;
        this.#objectName = config.tableName || config.objectName;
        break;
      case DuckDbDataSource.types.VIEW:
        this.#schemaName = config.schemaName;
        this.#objectName = config.viewName || config.objectName;
        break;
      case DuckDbDataSource.types.TABLEFUNCTION:
        this.#schemaName = config.schemaName;
        this.#objectName = config.functionName || config.objectName;
        break;
      case DuckDbDataSource.types.TABLEFUNCTION:
      default:
        throw new Error(`Could not initialize the datasource: unrecognized type ${type}`);
    }
    this.#type = type;
  }
    
  getType(){
    return this.#type;
  }
  
  getId(){
    var type = this.getType();
    var postFix;
    switch (type) {
      case DuckDbDataSource.types.FILES:
        postFix = JSON.stringify(this.#fileNames);
        break;
      default:
        postFix = this.getQualifiedObjectName();
    }
    return `${type}:${postFix}`;
  }
 
  async registerFile(){
    var file = this.#file;
    if (! (file instanceof File)){
      throw new Error(`Configuration error: datasource of type ${requiredType} needs to have a FILE instance set in order to register it.`);
    }
    var type = this.getType();
    switch (type){
      case DuckDbDataSource.types.DUCKDB:
      case DuckDbDataSource.types.FILE:
      case DuckDbDataSource.types.SQLITE:
        break;
      default:
        throw new Error(`Registerfile is not appropriate for datasources of type ${type}, type ${requiredType} is required.`);      
    }
    var protocol = this.#fileProtocol || this.#duckDb.DuckDBDataProtocol.BROWSER_FILEREADER;
    return this.#duckDbInstance.registerFileHandle(
      file.name, 
      file, 
      protocol
    )
  }
  
  async destroy(){
    var id = this.getId();
    try {
      if (this.#file) {
        return this.#duckDbInstance.dropFile(this.#file.name);
      }
    }
    catch (error){
      console.error(`Error destroying datasource ${id}: ${error.message}`);
      console.error(error.stack);
    }
    finally {
      this.#duckDb = undefined;
      this.#duckDbInstance = undefined;
      this.#connection = undefined;
      this.#schemaName = undefined;
      this.#objectName = undefined;
      this.#file = undefined;
      this.#fileProtocol = undefined;
      this.#type = undefined;
      this.#columnMetadata = undefined;
      this.#alias = undefined;
      this.#sqlQuery = undefined;
    }
  }
  
  async validateAccess(){
    var result;
    try{
      var connection = await this.getConnection();
      var type = this.getType();
      switch (type){
        case DuckDbDataSource.types.FILE:
        case DuckDbDataSource.types.TABLE:
        case DuckDbDataSource.types.VIEW:
        case DuckDbDataSource.types.TABLEFUNCTION:
          var fromClause = this.getFromClauseSql();
          var sql = `SELECT * ${fromClause} LIMIT 1`;
          break;
        case DuckDbDataSource.types.DUCKDB:
        case DuckDbDataSource.types.SQLITE:
          var fileName = this.getFileName();
          var alias = this.#alias || this.getFileNameWithoutExtension();
          var quotedAlias = getQuotedIdentifier(alias);
          var sql = `ATTACH '${fileName}' AS ${quotedAlias}`;
          if (type === DuckDbDataSource.types.SQLITE){
            sql += ` (TYPE SQLITE)`;
          }
      }
      var resultSet = await connection.query(sql);
      result = true;
    }
    catch(error){
      result = error;
    }
    return result;
  }
 
  getQualifiedObjectName(){
    var qualifiedObjectName;
    var type = this.getType();
    switch (type) {
      case DuckDbDataSource.types.DUCKDB:
      case DuckDbDataSource.types.FILE:
      case DuckDbDataSource.types.SQLITE:
        var fileName = this.#objectName;
        qualifiedObjectName = getQuotedIdentifier(fileName);
        break;
      case DuckDbDataSource.types.TABLE:
        var schemaName = this.#schemaName;
        var tableName = this.#objectName;
        qualifiedObjectName = getQualifiedIdentifier(schemaName, tableName);
        break;
      case DuckDbDataSource.types.VIEW:
        var schemaName = this.#schemaName;
        var viewName = this.#objectName;
        qualifiedObjectName = getQualifiedIdentifier(schemaName, viewName);
        break;
      case DuckDbDataSource.types.TABLEFUNCTION:
        var schemaName = this.#schemaName;
        var functionName = this.#objectName;
        qualifiedObjectName = getQualifiedIdentifier(schemaName, functionName);
        break;
      default:
        throw new Error(`Invalid datasource type ${type} for getting a qualified object name.`);
    }
    return qualifiedObjectName;
  }
  
  getRelationExpression(alias){
    var sql = '';
    switch (this.getType()) {
      case DuckDbDataSource.types.FILES:
        var fileNames = this.#fileNames.map(function(fileName){
          return getQuotedIdentifier(fileName);
        }.bind(this));
        
        var fileExtension = this.#fileType;
        var fileType = DuckDbDataSource.fileTypes[fileExtension];
        sql = `${fileType.duckdb_reader}( [\n ${fileNames.join('\n,')}\n], filename = TRUE )`;
        
        break;
      case DuckDbDataSource.types.FILE:
        var fileName = this.getFileName();
        var quotedFileName = getQuotedIdentifier(fileName);
        var fileExtension = this.getFileExtension();
        switch (fileExtension) {
          case 'csv':
          case 'tsv':
          case 'txt':
          case 'json':
          case 'parquet':
          case 'xlsx':
            var fileType = DuckDbDataSource.fileTypes[fileExtension];
            sql = `${fileType.duckdb_reader}( ${quotedFileName} )`;
        }
        break;
      case DuckDbDataSource.types.SQLQUERY:
        sql = `( ${this.#sqlQuery} )`;
        break;
      case DuckDbDataSource.types.TABLE:
      case DuckDbDataSource.types.VIEW:
        var qualifiedObjectName = this.getQualifiedObjectName();
        sql = qualifiedObjectName;
        break;
      case DuckDbDataSource.types.TABLEFUNCTION:
        var qualifiedObjectName = this.getQualifiedObjectName();
        sql = qualifiedObjectName;
        // TODO: add parameters
        sql += '()';
        break;
    }
    
    if (!alias) {
      alias = this.#alias;
    }
    
    if (alias) {
      sql = `${sql} AS ${getQuotedIdentifier(alias)}`;      
    }
    return sql;
  }
  
  getFromClauseSql(alias){
    var sql = this.getRelationExpression(alias);
    sql = `FROM ${sql}`;
    return sql;
  }
  
  getFileName(){
    var type = this.getType();
    switch (type){
      case DuckDbDataSource.types.DUCKDB:
      case DuckDbDataSource.types.FILE:
      case DuckDbDataSource.types.SQLITE:
        break;
      default:
        throw new Error(`getFileName() is not appropriate for datasources of type ${type}, type ${requiredType} is required.`);
    }
    return this.#objectName;
  }
    
  #getFileNameParts(){
    var fileName = this.getFileName();
    return DuckDbDataSource.getFileNameParts(fileName);
  }
  
  getFileExtension(){
    var parts = this.#getFileNameParts();
    return parts.lowerCaseExtension;
  }

  getFileNameWithoutExtension(){
    var parts = this.#getFileNameParts();
    return parts.fileNameWithoutExtension;
  }

  getObjectName(){
    return this.#objectName;
  }

  getSchemaName(){
    return this.#schemaName;
  }
  
  async getConnection(){
    if (this.#connection === undefined) {
      this.#connection = await this.#duckDbInstance.connect();
    }
    return new Promise(function(resolve, reject){
      resolve(this.#connection);
    }.bind(this));
  }
  
  async prepareStatement(sql){
    var connection = await this.getConnection();
    var preparedStatement = await connection.prepare(sql);
    return preparedStatement;
  }
  
  #getSqlForDataProfile(sampleSize) {
    var qualifiedObjectName = this.getQualifiedObjectName();
    var fromClause = this.getFromClauseSql();
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
    }
    return sql;
  }

  async getProfileData(sampleSize){
    if (sampleSize === undefined){
      sampleSize = this.#defaultSampleSize;
    }
    var sql = this.#getSqlForDataProfile(sampleSize);
    var connection = await this.getConnection();
    var resultset = connection.query(sql);
    return resultset;
  }
  
  #getSqlForTableSchema(){
    var fromClause = this.getFromClauseSql();
    var sql = `DESCRIBE SELECT * ${fromClause}`;
    return sql;
  }
    
  async getColumnMetadata(){
    if (this.#columnMetadata) {
      return this.#columnMetadata;
    }
    
    var sql = this.#getSqlForTableSchema();
    var connection = await this.getConnection();
    var columnMetadata = connection.query(sql);
    this.#columnMetadata = columnMetadata;
    return columnMetadata;
  }
}