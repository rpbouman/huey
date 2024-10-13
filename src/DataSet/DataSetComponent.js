class DataSetComponent {

  #queryModel = undefined;
  #managedConnection = undefined;
  
  constructor(queryModel){
    this.#queryModel = queryModel;
  }

  async #getDatasouceManagedConnection(){
    var queryModel = this.#queryModel;
    var datasource = queryModel.getDatasource();
    if (!datasource){
      return undefined;
    }
    var managedConnection = await datasource.getManagedConnection();
    return managedConnection;
  }
  
  getQueryModel(){
    return this.#queryModel;
  }

  async getManagedConnection(){
    if (this.#managedConnection === undefined) {
      this.#managedConnection = await this.#getDatasouceManagedConnection();
    }
    return this.#managedConnection;
  }
  
  async cancelPendingQuery(){
    var connection = await this.getManagedConnection();
    return await connection.cancelPendingQuery();
  }  
}