class DataSetComponent {

  #queryModel = undefined;
  #managedConnection = undefined;
  #settings = undefined;
  
  constructor(queryModel, settings){
    this.#queryModel = queryModel;
    this.#settings = settings;
  }
  
  getSettings(){
    return this.#settings;
  }

  async #getDatasouceManagedConnection(){
    const queryModel = this.#queryModel;
    const datasource = queryModel.getDatasource();
    if (!datasource){
      return undefined;
    }
    const managedConnection = await datasource.getManagedConnection();
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
    const connection = await this.getManagedConnection();
    return await connection.cancelPendingQuery();
  }  
}