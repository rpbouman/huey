class DuckDbConnection extends EventEmitter {
  
  #duckDbInstance = undefined;
  #physicalConnection = undefined;
  #state = 'unconnected';
  
  constructor(duckDbInstance) {
    super(['beforequery','afterquery']);
    this.#duckDbInstance = duckDbInstance;
  }

  async getPhysicalConnection(){
    if (this.#physicalConnection === undefined) {
      this.#state = 'connecting';
      this.#physicalConnection = await this.#duckDbInstance.connect();
      this.#state = 'connected';
    }
    return this.#physicalConnection;
  }
  
  async prepareStatement(sql){
    var connection = await this.getPhysicalConnection();
    this.#state = 'preparing';
    var preparedStatement = await connection.prepare(sql);
    this.#state = 'prepared';
    return preparedStatement;
  }
  
  getConnectionId(){
    if (this.#physicalConnection === undefined){
      return undefined;
    }
    return this.#physicalConnection._conn;
  }
  
  async query(sql){
    var connection = await this.getPhysicalConnection();
    
    // TODO: allow query to be canceled?
    this.fireEvent('beforequery', {
      physicalConnection: connection,
      sql: sql
    });
    
    this.#state = 'querying';
    var msg = `Executing ${sql} on connection ${this.getConnectionId()}`;
    console.time(msg);
    var result = await connection.query(sql);
    console.timeEnd(msg);
    this.#state = 'queried';
    
    this.fireEvent('afterquery', {
      physicalConnection: connection,
      sql: sql,
      result: result
    });
    
    return result;
  }

  async cancelPendingQuery(){
    if (this.#physicalConnection === undefined){
      return this.#state;
    }
    console.log(`canceling pending queries for ${this.getConnectionId()}, current state: ${this.#state}.`);
    this.#state = 'canceling';
    try {
      var canceled = await this.#duckDbInstance.cancelPendingQuery(this.#physicalConnection);
      console.log(`canceled pending queries for ${this.getConnectionId()}, result: ${canceled}.`);
      if (canceled) {
        this.#state = 'canceled';
      }
      else {
        this.#state = 'cancelingerror';
      }
    }
    catch(e){
      this.#state = 'cancelingerror';
      console.log(`Error encountered while canceling pending queries on connection ${this.getConnectionId()}.`);
      console.log(e.message);
      console.log(e.stack);
    }
    return this.#state;
  }
  
  registerFile(file, protocol){
    if (! (file instanceof File)){
      throw new Error(`Invalid argument! Need instance of File.`);
    }
    var protocol = protocol || window.hueyDb.duckDb.DuckDBDataProtocol.BROWSER_FILEREADER;
    return this.#duckDbInstance.registerFileHandle(
      file.name, 
      file, 
      protocol
    );
  }
 
  copyFileToBuffer(fileName){
    return this.#duckDbInstance.copyFileToBuffer(fileName);
  }
  
  dropFile(fileName){
    return this.#duckDbInstance.dropFile(fileName);
  }
  
  async close(){
    if (this.#physicalConnection){
      try {
        this.#state = 'closing';        
        var result = await this.#physicalConnection.close();
        this.#state = 'closed';
        return result;
      }
      catch(e){
        console.error(e);
      }
      finally {
        this.#state = 'destroyed';
        this.#physicalConnection = null;
        this.#duckDbInstance = null;
      }
    }
    else {
      return null;
    }
  }
  
  async destroy(){
    if (this.#physicalConnection){
      try {
        await this.close();
      }
      catch(e){
        console.error(e);
      }
    }
    this.#state = 'destroyed';
    this.#physicalConnection = null
  }
 
  getState(){
    return this.#state;
  }
}
