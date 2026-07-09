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

  #getDatasouceManagedConnection(){
    const queryModel = this.#queryModel;
    const datasource = queryModel.getDatasource();
    if (!datasource){
      return undefined;
    }
    const managedConnection = datasource.getManagedConnection();
    return managedConnection;
  }
  
  getQueryModel(){
    return this.#queryModel;
  }

  getManagedConnection(){
    if (this.#managedConnection === undefined) {
      this.#managedConnection = this.#getDatasouceManagedConnection();
    }
    return this.#managedConnection;
  }
  
  async cancelPendingQuery(){
    const connection = this.getManagedConnection();
    return await connection.cancelPendingQuery();
  }  
}