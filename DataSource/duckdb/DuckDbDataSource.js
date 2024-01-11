class DuckDbDataSource {
  
  static types = {
    'FILE': 'file',
    'TABLE': 'table',
    'VIEW': 'view',
    'TABLEFUNCTION': 'table function',
    'SQLQUERY': 'sql'
  };
  
  #defaultSampleSize = 100;
  
  #duckDb = undefined;
  #duckDbInstance = undefined;
  #connection = undefined;
  #schemaName = undefined;
  #objectName = undefined;
  #file = undefined;
  #fileProtocol = undefined;
  #type = undefined;
  #columnMetadata = undefined;
  
  constructor(duckDb, duckDbInstance, config){
    this.#duckDb = duckDb;
    this.#duckDbInstance = duckDbInstance;
    this.#init(config);
  }
  
  #init(config){
    var type = config.type;
    switch (type) {
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
      default:
        throw new Error(`Could not initialize the datasource: unrecognized type ${type}`);
    }
    this.#type = type;
  }
    
  getType(){
    return this.#type;
  }
 
  async registerFile(){
    var type = this.getType();
    var requiredType = DuckDbDataSource.types.FILE;
    if (type !== requiredType) {
      throw new Error(`Registerfile is not appropriate for datasources of type ${type}, type ${requiredType} is required.`);
    }
    var file = this.#file;
    if (! (file instanceof File)){
      throw new Error(`Configuration error: datasource of type ${requiredType} needs to have a FILE instance set in order to register it.`);
    }
    var protocol = this.#fileProtocol || this.#duckDb.DuckDBDataProtocol.BROWSER_FILEREADER;
    return this.#duckDbInstance.registerFileHandle(
      file.name, 
      file, 
      protocol
    )
  }
  
  async validateAccess(){
    var connection = await this.getConnection();
    var qualifiedObjectName = this.getQualifiedObjectName();
    var sql = `SELECT * FROM ${qualifiedObjectName} LIMIT 1`;
    var result;
    try{
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
      case DuckDbDataSource.types.FILE:
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
  
  getFileName(){
    var type = this.getType();
    var requiredType = DuckDbDataSource.types.FILE;
    if (type !== requiredType) {
      throw new Error(`getFileName() is not appropriate for datasources of type ${type}, type ${requiredType} is required.`);
    }
    return this.#objectName;
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
    var fromClause = `FROM ${qualifiedObjectName}`;
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
    var qualifiedObjectName = this.getQualifiedObjectName();
    var fromClause = `FROM ${qualifiedObjectName}`;
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