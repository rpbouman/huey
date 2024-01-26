class DataSetComponent {

  #queryModel = undefined;
  #managedConnection = undefined;
  
  constructor(queryModel){
    this.#queryModel = queryModel;
  }

  #createManagedConnection(){
    var queryModel = this.#queryModel;
    var datasource = queryModel.getDatasource();
    var managedConnection = datasource.createManagedConnection();
    return managedConnection;
  }
  
  getQueryModel(){
    return this.#queryModel;
  }

  getManagedConnection(){
    if (this.#managedConnection === undefined) {
      this.#managedConnection = this.#createManagedConnection();
    }
    return this.#managedConnection;
  }
  
  async cancelPendingQuery(){
    var connection = this.getManagedConnection();
    return await connection.cancelPendingQuery();
  }
  
}