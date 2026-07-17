class DataSetComponent {

  #queryModel = undefined;
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
    return this.#getDatasouceManagedConnection();
  }
  
  async cancelPendingQuery(){
    const connection = this.getManagedConnection();
    return await connection.cancelPendingQuery();
  }  
}