class DuckDbDataSource extends EventEmitter {
  
  static #defaultNumberOfAccessAttempts = 1;

  static types = {
    "DUCKDB": 'duckdb',
    "FILE": 'file',
    "FILES": 'files',
    "SQLITE": 'sqlite',
    "SQLQUERY": 'sql',
    "TABLE": 'table',
    "TABLEFUNCTION": 'table function',
    "URL": 'url',
    "VIEW": 'view'
  };

  static fileTypes = {
    "csv": {
      datasourceType: DuckDbDataSource.types.FILE,
      duckdb_reader: 'read_csv',
      duckdb_sniffer: 'sniff_csv',
      reader_arguments_settings_key: 'csvReader',
      mimeType: 'text/csv'
    },
    "tsv": {
      datasourceType: DuckDbDataSource.types.FILE,
      duckdb_reader: 'read_csv',
      duckdb_sniffer: 'sniff_csv',
      reader_arguments_settings_key: 'csvReader',
      mimeType: 'text/tab-separated-values'
    },
    "txt": {
      datasourceType: DuckDbDataSource.types.FILE,
      duckdb_reader: 'read_csv',
      duckdb_sniffer: 'sniff_csv',
      reader_arguments_settings_key: 'csvReader',
      mimeType: 'text/plain'
    },
    "json": {
      datasourceType: DuckDbDataSource.types.FILE,
      duckdb_reader: 'read_json_auto',
      duckdb_extension: 'json',
      mimeType: 'application/json'
    },
    "jsonl": {
      datasourceType: DuckDbDataSource.types.FILE,
      duckdb_reader: 'read_json_auto',
      duckdb_extension: 'json',
      mimeType: 'application/json'
    },
    "parquet": {
      datasourceType: DuckDbDataSource.types.FILE,
      duckdb_reader: 'read_parquet',
      mimeType: 'application/vnd.apache.parquet'
    },
    "xlsx": {
      datasourceType: DuckDbDataSource.types.FILE,
      duckdb_reader: 'read_xlsx',
      duckdb_extension: 'excel',
      //duckdb_extension_repository: 'core_nightly',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    "duckdb": {
      datasourceType: DuckDbDataSource.types.DUCKDB,
      mimeType: 'application/duckdb'
    },
    "sqlite": {
      datasourceType: DuckDbDataSource.types.SQLITE,
      duckdb_extension: 'sqlite_scanner',
      mimeType: 'application/sqlite'
    }
  };

  static duckdb_reader_arguments = {
    read_csv: {
      // https://duckdb.org/docs/data/csv/reading_faulty_csv_files.html#retrieving-faulty-csv-lines
      //"ignore_errors" : true,
      "store_rejects" : false
      //"rejects_scan": 'reject_scans',
      //"rejects_table": 'reject_errors',
      //"rejects_limit": 0
    },
    sniff_csv: {
      "sample_size": 20480
    },
    read_json_auto: {
      "ignore_errors": true,
      "maximum_object_size": 16777216
    }
  };

  // this is a crutch for reading from url.
  // basically this lets us find out what reader duckdb chose to read the url
  static async #whatFileType(url, connection, contentType){
    var fileTypes = DuckDbDataSource.fileTypes;
    var candidateFileTypes = {};
    
    for (var fileTypeName in fileTypes){
      var fileType = fileTypes[fileTypeName];
      if (fileType.mimeType === contentType){
        candidateFileTypes[fileTypeName] = fileType;
        continue;
      }
      
      switch (contentType){
        case 'binary/octet-stream':
          if (!fileType.mimeType.startsWith('text/') && !fileType.mimeType.startsWith('application/json')) {
            candidateFileTypes[fileTypeName] = fileType;
          }
          continue;
        case 'text/plain':
          if (fileType.mimeType.startsWith('text/') || fileType.mimeType.startsWith('application/json')) {
            candidateFileTypes[fileTypeName] = fileType;
          }
          continue;
      }
    }
    
    if (Object.keys(candidateFileTypes).length){
      fileTypes = candidateFileTypes;
    }
    
    var readers = Object.keys(fileTypes).reduce(function(acc, curr, index){
      var fileType = fileTypes[curr];
      var reader = fileType.duckdb_reader;
      if (reader !== undefined && acc.indexOf(reader) === -1){
        acc.push(reader);
      }
      return acc;
    }, []);

    var statementLines = [
      'SELECT *',
      'FROM',
      '',
      'LIMIT 0'
    ];
    var possibleTypes = [];
    try {
      var promises = readers.map(async function(reader){
        var readerCall = `${reader}( ${quoteStringLiteral(url)} )`;
        statementLines[2] = readerCall;
        var sql = statementLines.join('\n');
        // create a new connection for each try. 
        // see: issue https://github.com/rpbouman/huey/issues/536.
        // if we hit the xlsx reader and that runs into issues, the connection is borked and we get uncaught errors.
        // this does not appear to happen when we create a new connection.
        var connection = await window.hueyDb.instance.connect();
        var promise = connection.query(sql);
        promise.finally(function(){
          try {
            connection.close();
          }
          catch(e){
          }
        });
        return promise;
      });

      var reader;
      var promiseResults = await Promise.allSettled(promises);
      var fulfilled = [];
      promiseResults.forEach(function(promiseResult, index){
        if (promiseResult.status === 'fulfilled'){
          fulfilled.push(index);
        }
      });
      switch (fulfilled.length) {
        case 0:
          return null;
        case 1:
        default:
          for (var i = 0; i < fulfilled.length; i++){
            var index = fulfilled[i];
            var reader = readers[index];
            for (var fileTypeKey in fileTypes){
              var fileType = fileTypes[fileTypeKey];
              if (fileType.duckdb_reader === reader) {
                possibleTypes.push( fileTypeKey );
              }
            }
          }
          break;
      }
    }
    catch (e){
      return null;
    }
    if (possibleTypes.length){
      return possibleTypes;
    }
    return null;
  }

  static #datasource_uid_generator = 0;
  #datasource_uid = undefined;
  #rejects_tables = undefined;
  #rejects_balance = 0n;
  #reject_count = 0n;

  #originalConfig = undefined;

  #defaultSampleSize = 100;

  #duckDb = undefined;
  #duckDbInstance = undefined;
  #connection = undefined;
  #managedConnection = undefined;
  #catalogName = undefined;
  #schemaName = undefined;
  #objectName = undefined;
  #url = undefined;
  #contentType = undefined;
  #file = undefined;
  #fileRegistered = undefined;
  #fileNames = undefined;
  #fileType = undefined;
  #fileProtocol = undefined;
  #type = undefined;
  #columnMetadata = undefined;
  #alias = undefined;
  #sqlQuery = undefined;

  #settings = new DatasourceSettings();

  constructor(duckDb, duckDbInstance, config){
    super(['destroy', 'rejectsdetected', 'change']);
    this.#originalConfig = Object.assign({}, config);
    this.#datasource_uid = ++DuckDbDataSource.#datasource_uid_generator;
    this.#duckDb = duckDb;
    this.#duckDbInstance = duckDbInstance;
    this.#init(config);
  }

  getOriginalConfig(){
    return this.#originalConfig;
  }

  getSettings(){
    return this.#settings;
  }

  get isUrl(){
    return Boolean(this.#url);
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

  static async getResourceInfoForUrl(url, httpMethod, requestHeaders){
    return new Promise(function(resolve, reject){
      try {
        var xhr = new XMLHttpRequest();
        xhr.addEventListener("error", function(progressEvent){
          // note: the error event is still an event, not an Error object.
          // The problem here is that some errors will actually leave some useful information in the status and response,
          // (e.g, HTTP status in the 400 and 500 ranges)
          // but there are also errors where the response is useless.
          // Unfortunately, failure to load doc due to CORS headers is one such case.
          var status = xhr.status;
          var message = 'XHR emitted error event.'
          if (status === 0){
            message += [
              '',
              'The server may not be available, or the request may have failed due to same origin policy / missing CORS header.',
              'The network tab in your browser\'s development tools may reveal additional information.'
            ].join(' ')
            ;
          }
          else {
            message += ` HTTP ${xhr.status} - ${xhr.statusText}`;
          }
          var error = new Error(message, {
            cause: progressEvent
          });
          reject(error);
        });

        xhr.addEventListener("load", function(){
          var allResponseHeaders = xhr.getAllResponseHeaders();
          var headersArray = allResponseHeaders.split('\r\n');
          var headers = headersArray.reduce(function(headers, header){
            var nameValue = header.split(':');
            var name = nameValue.shift().trim();
            if (name.length) {
              name = name.toLowerCase();
              var value = nameValue.join(':').trim();
              headers[name] = value;
            }
            return headers;
          }, {});
          resolve({
            headers: headers,
            status: xhr.status,
            statusText: xhr.statusText,
            responseType: xhr.responseType,
            responseText: xhr.responseText
          });
        });

        xhr.open(httpMethod || 'GET', url);
        if (requestHeaders){
          for (var requestHeader in requestHeaders){
            xhr.setRequestHeader(requestHeader, requestHeaders[requestHeader]);
          }
        }
        xhr.send();
      }
      catch(e){
        reject(e);
      }
    });
  }

  // this is a light weight method that should produce the id of a datasource that would be created for the given file.
  // this should not actually instantiate a datasource, merely its identifier.
  // It is a service to easily create UI elements that may refer to a datasource without having to actually create one.
  static getDatasourceIdForFileName(fileName){
    return `${this.types.FILE}:${getQuotedIdentifier(fileName)}`;
  }

  static getFileTypeInfo(fileType){
    var fileTypeInfo = DuckDbDataSource.fileTypes[fileType];
    return fileTypeInfo;
  }

  static async createFromUrl(duckdb, instance, url) {
    if (!(typeof url === 'string')){
      throw new Error(`The url should be of type string`);
    }

    var config = {
      type: DuckDbDataSource.types.FILE,
      fileName: url,
      url: url
    };

    var response = await DuckDbDataSource.getResourceInfoForUrl(url, 'HEAD');
    var contentType = response.headers['content-type'];
    if (contentType){
      config.contentType = contentType;
      var contentTypes = contentType.split(';');
      _outer: for (var i = 0; i < contentTypes.length; i++){
        contentType = contentTypes[i];
        for (var fileType in DuckDbDataSource.fileTypes){
          var fileTypeInfo = DuckDbDataSource.getFileTypeInfo(fileType);
          var mimeType = fileTypeInfo.mimeType;
          if (contentType === mimeType) {
            config.fileType = fileType;
            break _outer;
          }
        }
      }
      // if we couldn't identify a file type then we can try to examine the file to read a magic number.
      if (!config.fileType){
        switch (response.headers['accept-ranges']) {
          case 'bytes':
            var response = await DuckDbDataSource.getResourceInfoForUrl(url, 'GET', {
              "Accept": contentType,
              "Range": 'bytes=0-16'
            });
            var responseText = response.responseText;
            if (responseText.startsWith('SQLite format 3\0')) {
              config.type = DuckDbDataSource.types.SQLITE;
            }
            else
            if (responseText.substring(7, 7 + 'DUCK'.length) === 'DUCK') {
              config.type = DuckDbDataSource.types.DUCKDB;
            }
            if (config.type) {
              delete config.url;
            }
            break;
          case 'none':
          case undefined:
          default:
            // alas
        }
      }
    }

    var dsInstance = new DuckDbDataSource(duckdb, instance, config);
    return dsInstance;
  }

  static createFromFile(duckdb, instance, file) {
    if (!(file instanceof File)){
      throw new Error(`The file argument must be an instance of File`);
    }

    var fileName = file.name;
    var fileNameParts = DuckDbDataSource.getFileNameParts(fileName);
    var fileExtension = fileNameParts.lowerCaseExtension;
    var fileType = DuckDbDataSource.getFileTypeInfo(fileExtension);

    if (!fileType){
      throw new Error(`Could not determine filetype of file "${fileName}".`);
    }
    var config = {
      type: fileType.datasourceType,
      file: file,
      fileType: fileType
    };
    var dsInstance = new DuckDbDataSource(duckdb, instance, config);
    return dsInstance;
  }

  static createFromSql(duckdb, instance, sql){
    var config = {
      type: DuckDbDataSource.types.SQLQUERY,
      sql: sql
    };
    var dsInstance = new DuckDbDataSource(duckdb, instance, config);
    return dsInstance;
  }

  setSqlQuery(sqlQuery){
    // TODO: verify if this is a "query" - a statement that yields a resultset
    // also, verify that this uses existing datasources.
    var oldSqlQuery = this.#sqlQuery;

    //TODO: compare normalized versions of the query
    if (oldSqlQuery === sqlQuery) {
      return;
    }

    this.#sqlQuery = sqlQuery;
    this.fireEvent('change', {
      'propertiesChanged': {
        previousValue: oldSqlQuery,
        newValue: sqlQuery
      }
    });
  }

  #init(config){
    var type = config.type;
    switch (type) {
      case DuckDbDataSource.types.DUCKDB:
      case DuckDbDataSource.types.SQLITE:
      case DuckDbDataSource.types.FILE:
        this.#fileRegistered = false;
        if (config.url){
          this.#url = config.url;
          this.#objectName = config.url;
          this.#fileType = config.fileType;
          this.#contentType = config.contentType;
        }
        else {
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
          var parts = DuckDbDataSource.getFileNameParts(this.#objectName);
          this.#fileType = parts.lowerCaseExtension;
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
          if (DuckDbDataSource.getFileTypeInfo(config.fileType) === undefined) {
            throw new Error(`Invalid config: fileType ${config.fileType} is not recognized.`);
          }
          this.#fileType = config.fileType;
        }
        else {
          throw new Error(`Invalid config: fileType is mandatory`);
        }
        break;
      case DuckDbDataSource.types.TABLE:
        this.#catalogName = config.catalogName;
        this.#schemaName = config.schemaName;
        this.#objectName = config.tableName || config.objectName;
        break;
      case DuckDbDataSource.types.VIEW:
        this.#catalogName = config.catalogName;
        this.#schemaName = config.schemaName;
        this.#objectName = config.viewName || config.objectName;
        break;
      case DuckDbDataSource.types.TABLEFUNCTION:
        this.#catalogName = config.catalogName;
        this.#schemaName = config.schemaName;
        this.#objectName = config.functionName || config.objectName;
        break;
      case DuckDbDataSource.types.SQLQUERY:
        this.#sqlQuery = config.sql;
        break;
      default:
        throw new Error(`Could not initialize the datasource: unrecognized type "${type}"`);
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
      case DuckDbDataSource.types.FILE:
        var fileName = this.getFileName();
        var id = DuckDbDataSource.getDatasourceIdForFileName(fileName);
        return id;
      case DuckDbDataSource.types.FILES:
        postFix = JSON.stringify(this.#fileNames);
        break;
      case DuckDbDataSource.types.SQLQUERY:
        postFix = this.#sqlQuery;
        break;
      default:
        postFix = this.getQualifiedObjectName();
    }
    return `${type}:${postFix}`;
  }

  static parseId(datasourceId) {
    var parts = datasourceId.split(':');
    var type = parts.shift();
    var localId = parts.join(':');
    var unQuoted;
    var isUrl = false;
    if (isQuotedIdentifier(localId)){
      unQuoted = unQuoteIdentifier(localId);
      try {
        var url = new URL(unQuoted);
        isUrl = true;
      }
      catch(e){
      }
    }
    return {
      type: type,
      localId: localId,
      isUrl: isUrl,
      resource: unQuoted
    };
  }

  get isFileRegistered(){
    return Boolean(this.#fileRegistered);
  }

  async registerFile(){
    if (this.isFileRegistered === true) {
      return true;
    }

    var url = this.#url;
    var file = this.#file;
    var promise;
    if (url){
      var protocol = this.#fileProtocol || this.#duckDb.DuckDBDataProtocol.HTTP;
      if (!this.#fileType){
        var connection = await this.getConnection();
        var fileTypes = await DuckDbDataSource.#whatFileType(url, connection, this.#contentType);
        if (fileTypes) {
          if (fileTypes.length === 1){
            this.#fileType = fileTypes[0];
          }
          else {
            console.warn(`Found multiple possible filetypes for url "${url}": ${fileTypes.join(';')}`);
            this.#fileType = fileTypes[0];
          }
        }
      }
    }
    else
    if (file){
      if (!(file instanceof File)){
        throw new Error(`Configuration error: datasource of type ${DuckDbDataSource.types.FILE} needs to have a file handle set in order to register it.`);
      }
      var type = this.getType();
      switch (type){
        case DuckDbDataSource.types.DUCKDB:
        case DuckDbDataSource.types.FILE:
        case DuckDbDataSource.types.SQLITE:
          break;
        default:
          throw new Error(`Registerfile is not appropriate for datasources of type ${type}.`);
      }
      var protocol = this.#fileProtocol || this.#duckDb.DuckDBDataProtocol.BROWSER_FILEREADER;
      await this.#duckDbInstance.registerFileHandle(
        file.name,
        file,
        protocol
      );
    }

    this.#fileRegistered = true;
    return true;
  }

  #getRejectsCountSql(rejects_count_column){
    if (!this.#rejects_tables){
      return undefined;
    }
    var sql = `SELECT COUNT(*) as ${rejects_count_column} FROM ${this.#getRejectsTableName()}`;
    return sql;
  }

  #getRejectsSql(){
    if (!this.#rejects_tables){
      return undefined;
    }
    var rejectsScanTable = this.#getRejectsScanTableName();
    var rejectsTable = this.#getRejectsTableName();
    var sql = [
      'SELECT      row_number() over ()                             AS id',
      ',           max(s.scan_id)                                   AS max_scan_id',
      ',           s.file_path                                      AS filename',
      ',           r.line                                           AS line_position',
      ',           r.column_idx                                     AS column_position',
      ',           any_value(r.column_name)                         AS column_name',
      ',           byte_position - line_byte_position               AS error_position',
      ',           list(distinct error_type||\': \'||error_message) AS errors',
      ',           any_value(r.csv_line)                            AS csv_line',
      `FROM        ${rejectsScanTable}                              AS s`,
      `INNER JOIN  ${rejectsTable}                                  AS r`,
      'ON          s.scan_id = r.scan_id',
      'AND         s.file_id = r.file_id',
      'GROUP BY    s.file_path',
      ',           r.line',
      ',           byte_position',
      ',           line_byte_position',
      ',           r.column_idx',
      'ORDER BY    filename',
      ',           line_position',
      ',           column_position',
      ',           error_position'
    ].join('\n');
    return sql;
  }

  async getRejects(){
    var sql = this.#getRejectsSql();
    if (!sql){
      return undefined;
    }
    try {
      var connection = await this.getManagedConnection();
      var physicalConnection = await connection.getPhysicalConnection();

      var result = await physicalConnection.query(sql);
      return result;
    }
    catch (e){
      return undefined;
    }
  }

  async clearRejects(){
    if (!this.#rejects_tables){
      return undefined;
    }
    try {
      var connection = await this.getManagedConnection();
      var physicalConnection = await connection.getPhysicalConnection();

      var promises = [];
      for (var i = 0; i < this.#rejects_tables.length; i++){
        var rejectsTable = this.#rejects_tables[i];
        var sql = `TRUNCATE TABLE ${getQuotedIdentifier(rejectsTable)}`;
        promises.push( physicalConnection.query(sql) );
      }
      await Promise.all( promises );

      this.#rejects_balance = 0n;
    }
    catch(e){
      //
    }
  }

  async destroy(){
    var id = this.getId();
    try {
      this.fireEvent('destroy', {});

      if (this.#file) {
        await this.#duckDbInstance.dropFile(this.#file.name);
      }

      if (this.#rejects_tables){
        var connection = await this.getConnection();

        while(this.#rejects_tables.length) {
          var rejectsTable = this.#rejects_tables.pop();
          var sql = `DROP TABLE IF EXISTS ${getQuotedIdentifier(rejectsTable)}`;
          await connection.query(sql);
        }
      }

      if (this.#connection){
        await this.#connection.close();
      }
    }
    catch (error){
      console.error(`Error destroying datasource ${id}: ${error.message}`);
      console.error(error.stack);
    }
    finally {
      super.destroy();
      this.#duckDb = undefined;
      this.#duckDbInstance = undefined;

      this.#connection = undefined;
      this.#catalogName = undefined;
      this.#schemaName = undefined;
      this.#objectName = undefined;
      this.#file = undefined;
      this.#fileProtocol = undefined;
      this.#type = undefined;
      this.#columnMetadata = undefined;
      this.#alias = undefined;
      this.#sqlQuery = undefined;
      this.#rejects_tables = undefined;
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
      await this.registerFile();
      var resultSet = await connection.query(sql);
      result = true;
    }
    catch(error){
      result = error;
    }
    return result;
  }
  
  async tryAccess(maxAttempts){
    switch (typeof maxAttempts){
      case undefined:
        maxAttempts = DuckDbDataSource.#defaultNumberOfAccessAttempts;
    }
    var done = false;
    var success = false;
    var attempts = 0;
    var attempt;
    var datasourceType = this.getType();
    _attempts: while (attempts++ <= maxAttempts) {
      attempt = await this.validateAccess();
      if (attempt === true) {
        success = true;
        break;
      }
      var message = attempt.message;
      if (/^Out of Memory Error: failed to allocate data of size/.test(message)){
        break _attempts;
      }
      
      switch (datasourceType){
        case DuckDbDataSource.types.FILE:
        case DuckDbDataSource.types.FILES:
          var fileType = this.getFileType();
          var fileTypeInfo = DuckDbDataSource.getFileTypeInfo(fileType);
          var reader = fileTypeInfo.duckdb_reader;
          switch (reader){
            case 'read_json_auto':
              if (/"maximum_object_size" of \d+ bytes exceeded/.test(message)){
                var parts = /\(>(\d+) bytes\)/.exec(message);
                var newObjectSize = parseInt(parts[1], 10);
                this.#settings.assignSettings(['jsonReader', 'jsonReaderMaximumObjectSize'], newObjectSize);
              }
              else {
                // all adaptive measures failed, time to throw in the towel.
                break _attempts;
              }
              break;
            case 'read_csv':
            case 'read_parquet':
            case 'read_xlsx':
            default:
              // no adaptive measures implemented, time to throw in the towel.
              break _attempts;
          }
          break;
        default:
          break _attempts;
      }
    };
    return {
      success: success,
      attempts: attempts,
      maxAttempts: maxAttempts,
      lastAttempt: attempt
    };
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
        var catalogName = this.#catalogName;
        var schemaName = this.#schemaName;
        var tableName = this.#objectName;
        qualifiedObjectName = getQualifiedIdentifier(catalogName, schemaName, tableName);
        break;
      case DuckDbDataSource.types.VIEW:
        var catalogName = this.#catalogName;
        var schemaName = this.#schemaName;
        var viewName = this.#objectName;
        qualifiedObjectName = getQualifiedIdentifier(catalogName, schemaName, viewName);
        break;
      case DuckDbDataSource.types.TABLEFUNCTION:
        var catalogName = this.#catalogName;
        var schemaName = this.#schemaName;
        var functionName = this.#objectName;
        qualifiedObjectName = getQualifiedIdentifier(catalogName, schemaName, functionName);
        break;
      default:
        throw new Error(`Invalid datasource type ${type} for getting a qualified object name.`);
    }
    return qualifiedObjectName;
  }

  #getRejectsScanTableName(quote){
    var tableName = this.#rejects_tables[0];
    if (quote){
      tableName = getQuotedIdentifier(tableName);
    }
    return tableName;
  }

  #getRejectsTableName(quote){
    var tableName = this.#rejects_tables[1];
    if (quote){
      tableName = getQuotedIdentifier(tableName);
    }
    return tableName;
  }

  #getDuckDbFileReaderCall(duckdb_reader, fileNames, settings){
    if (settings === undefined) {
      settings = this.#settings.getSettings();
    }
    var fileName;
    var duckdbReaderArguments = Object.assign({},
      DuckDbDataSource.duckdb_reader_arguments[duckdb_reader]
    );
    
    if (duckdbReaderArguments.rejects_scan && duckdbReaderArguments.rejects_table){
      this.#rejects_tables = [
        duckdbReaderArguments.rejects_scan,
        duckdbReaderArguments.rejects_table
      ];
    }

    if (fileNames instanceof Array) {
      fileName = '[' + fileNames.map(function(fileName){
        return quoteStringLiteral(fileName);
      })
      .join(', ') + ']';
      duckdbReaderArguments.filename = true;
    }
    else
    if (typeof fileNames === 'string'){
      fileName = quoteStringLiteral(fileNames);
    }

    var readerArgumentsSql = DatasourceSettings.getReaderArgumentsSql(settings);
    if (readerArgumentsSql && readerArgumentsSql.length){
      readerArgumentsSql = `${fileName}, ${readerArgumentsSql}`;
    }
    else {
      readerArgumentsSql = fileName;
    }
    var readerSql = `${duckdb_reader}( ${readerArgumentsSql} )`;
    return readerSql;
  }

  getRelationExpression(alias, sqlOptions){
    sqlOptions = normalizeSqlOptions(sqlOptions);
    var comma = getComma(sqlOptions.commaStyle);

    var identifierQuoter = function(identifier){
      return getIdentifier(identifier, sqlOptions.alwaysQuoteIdentifiers);
    }

    var sql = '';
    switch (this.getType()) {
      case DuckDbDataSource.types.FILES:
        var fileType = DuckDbDataSource.getFileTypeInfo(this.#fileType);
        var duckdb_reader = fileType.duckdb_reader;
        var readerSettings = this.#settings.getReaderArguments(duckdb_reader);
        sql = this.#getDuckDbFileReaderCall(duckdb_reader, this.#fileNames, readerSettings);
        break;
      case DuckDbDataSource.types.FILE:
        if (!this.#fileType) {
          var fileExtension = this.getFileExtension();
          this.#fileType = fileExtension;
        }
        var fileType = DuckDbDataSource.getFileTypeInfo(this.#fileType);
        var fileName = this.getFileName();
        if (fileType) {
          var duckdb_reader = fileType.duckdb_reader;
          var readerSettings = this.#settings.getReaderArguments(duckdb_reader);
          sql = this.#getDuckDbFileReaderCall(duckdb_reader, fileName, readerSettings);
        }
        else {
          sql = getQuotedIdentifier(fileName);
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
      sql = `${sql} AS ${identifierQuoter(alias)}`;
    }
    return sql;
  }

  getFromClauseSql(alias, sqlOptions){
    sqlOptions = normalizeSqlOptions(sqlOptions);
    var sql = this.getRelationExpression(alias, sqlOptions);
    sql = `${formatKeyword('from', sqlOptions.keywordLetterCase)} ${sql}`;
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
        throw new Error(`getFileName() is not appropriate for datasources of type ${type}.`);
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

  // this gets the datasource's own connection
  async getConnection(){
    if (this.#connection === undefined) {
      this.#connection = await this.createNewConnection();
    }
    return this.#connection;
  }

  // this creates a new connection.
  // the difference with getConnection is that createNewConnection is not cached and meant to be managed by the caller
  async createNewConnection(){
    return this.#duckDbInstance.connect();
  }

  createManagedConnection(){
    var managedConnection = new DuckDbConnection(this.#duckDbInstance);
    return managedConnection;
  }

  async #queryExecutionListener(event){
    var managedConnection = event.currentTarget;
    var eventData = event.eventData;
    switch (event.type){
      case 'beforequery':

        break;
      case 'afterquery':
        var rejects_count_column = 'rejects_count';
        var sql = this.#getRejectsCountSql(rejects_count_column);
        if (sql === undefined) {
          return;
        }
        var physicalConnection = eventData.physicalConnection;
        var result = await physicalConnection.query(sql);
        var new_reject_count = result.get(0)[rejects_count_column];
        if (new_reject_count !== this.#reject_count ) {
          var new_reject_balance = new_reject_count - this.#reject_count;
          this.fireEvent('rejectsdetected', {
            old_reject_count: this.#reject_count,
            new_reject_count: new_reject_count,
            old_reject_balance: this.#rejects_balance,
            new_reject_balance: new_reject_balance,
          });
          this.#reject_count = new_reject_count;
          this.#rejects_balance = new_reject_balance;
        }
        break;
    }
  }

  supportsRejectsDetection(){
    switch (this.getType()){
      case DuckDbDataSource.types.FILES:
      case DuckDbDataSource.types.FILE:
        break;
      default:
        return false;
    }
    var fileExtension = this.#fileType;
    var fileType = DuckDbDataSource.getFileTypeInfo(fileExtension);
    var duckdb_reader = fileType.duckdb_reader;
    var reader_arguments = DuckDbDataSource.duckdb_reader_arguments[duckdb_reader];
    if (!reader_arguments){
      return false;
    }
    return Boolean(reader_arguments.store_rejects);
  }

  getFileType(){
    return this.#fileType;
  }

  getFileSize(){
    if (!this.#file){
      throw new Error(`Not a file!`);
    }
    var fileSize = this.#file.size;
    return fileSize;
  }

  async getFileStatistics(){
    var type = this.getType();
    var expectedType = DuckDbDataSource.types.FILE;
    if (type !== expectedType){
      throw new Error(`Cannot get file statistics from datasource of type "${type}", expected type "${expectedType}".`);
    }
    if (this.isFileRegistered !== true){
      await this.registerFile();
    }
    var duckDbInstance = this.#duckDbInstance;
    var fileName = this.#objectName;
    return duckDbInstance.exportFileStatistics(fileName);
  }

  getManagedConnection(){
    if (this.#managedConnection === undefined){
      this.#managedConnection = this.createManagedConnection();
      if (this.supportsRejectsDetection()){
        this.#managedConnection.addEventListener('beforequery', this.#queryExecutionListener.bind(this));
        this.#managedConnection.addEventListener('afterquery', this.#queryExecutionListener.bind(this));
      }
    }
    return this.#managedConnection;
  }

  async query(sql){
    var connection = await this.getConnection();
    var result = await connection.query(sql);
    return result;
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

  getSqlForTableSchema(){
    var fromClause = this.getFromClauseSql();
    var sql = `DESCRIBE SELECT * ${fromClause}`;
    return sql;
  }

  async getColumnMetadata(){
    if (this.#columnMetadata) {
      return this.#columnMetadata;
    }

    var sql = this.getSqlForTableSchema();
    var connection = await this.getConnection();
    await this.registerFile();
    var columnMetadata;
    try {
      columnMetadata = await connection.query(sql);
    }
    catch (e) {
      showErrorDialog(e);
      throw e;
    }
    this.#columnMetadata = columnMetadata;
    return columnMetadata;
  }
}