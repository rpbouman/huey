class DuckDbConnection {
  
  #duckDbInstance = undefined;
  #physicalConnection = undefined;
  #state = 'unconnected';
  
  constructor(duckDbInstance) {
    this.#duckDbInstance = duckDbInstance;
  }

  async #getPhysicalConnection(){
    if (this.#physicalConnection === undefined) {
      this.#state = 'connecting';
      this.#physicalConnection = await this.#duckDbInstance.connect();
      this.#state = 'connected';
    }
    return this.#physicalConnection;
  }
  
  async prepareStatement(sql){
    var connection = await this.#getPhysicalConnection();
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
    var connection = await this.#getPhysicalConnection();
    this.#state = 'querying';
    console.time(`Executing ${sql} on connection ${this.getConnectionId()}`);
    var result = await connection.query(sql);
    console.timeEnd(`Executing ${sql} on connection ${this.getConnectionId()}`);
    this.#state = 'queried';
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
  
  getState(){
    return this.#state;
  }
}
