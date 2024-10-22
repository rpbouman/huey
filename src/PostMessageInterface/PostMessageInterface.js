class PostMessageInterface {
    
  constructor(){
    this.#init();
  }

  #init(){
    window.addEventListener('message', this.#messageHandler.bind(this));
  }
  
  async #messageHandler(event){
    var request = event.data;
    var requestType = request.requestType;
    var requestId = request.requestId;
    var response = {
      messageType: PostMessageProtocol.RESPONSE,
      request: {
        messageType: requestType,
        requestId: requestId,
        received: Date.now()
      },
      status: {
        code: undefined,
        message: undefined,
        sent: undefined
      }
    };
    
    switch (requestType){
      case PostMessageProtocol.REQUEST_PING:
        this.#handlePingRequest(request, response);
        break;
      case PostMessageProtocol.REQUEST_CREATE_DATASOURCE:
        await this.#handleCreateDatasourceRequest(request, response);
        break;
      default:
        response.status.code = PostMessageProtocol.STATUS_BAD_REQUEST;
        response.status.message = `Unrecognized requestType`;
    }

    response.status.sent = Date.now();
    event.source.postMessage(response, {targetOrigin: '*'});
    return response;
  }
    
  #initInternalErrorResponse(error, response){
    response.status.code = PostMessageProtocol.STATUS_INTERNAL_ERROR;
    response.status.message = error.message;
    response.body = {
      stack: error.stack
    }
  }

  #initBadRequestResponse(error, response){
    response.status.code = PostMessageProtocol.STATUS_BAD_REQUEST;
    response.status.message = error.message;
    if (error.cause){
      response.body = {
        details: error.cause
      }
    }
  }
  
  async #handleCreateDatasourceRequest(request, response){
    try {
      var body;
      var duckDbDataSource;
      try {
        body = request.body;
        if (typeof body !== 'object' || body === null) {
          throw new Error('Request body is mandatory', {cause: 'body is null or not an object'});
        }
        
        var duckdb = window.hueyDb.duckdb;
        var duckDbInstance = window.hueyDb.instance;
        var datasourceConfig = body.datasourceConfig;
        duckDbDataSource = new DuckDbDataSource(duckdb, duckDbInstance, datasourceConfig);

      }
      catch (error){
        this.#initBadRequestResponse(error, response);
        return;
      }
      
      var datasources = [duckDbDataSource];
      datasourcesUi.addDatasources(datasources);
      response.status.code = PostMessageProtocol.STATUS_OK;
      response.status.message = `Datasource '${duckDbDataSource.getId()}' created.`;
      response.body = {
        datasource: {
          id: duckDbDataSource.getId(),
          type: duckDbDataSource.getType()
        }
      }
    }
    catch (error){
      this.#initInternalErrorResponse(error, response);
    }
  }

  #handlePingRequest(){
    response.status.code = PostMessageProtocol.STATUS_OK;
    response.status.message = 'pong';
  }
  
  sendReadyMessage(){
    if (window.parent === window) {
      console.warn('This is a standalone Huey instance - There is no parent window to send the ready message to.');
      return;
    }
    window.parent.postMessage({
      status: {
        code: PostMessageProtocol.STATUS_READY,
        message: 'Huey PostMessageInterface ready for requests.',
        sent: Date.now()
      },
    }, {targetOrigin: '*'});
  }
  
}

var postMessageInterface = undefined;
function initPostMessageInterface(){
  if (window.parent === window) {
    return;
  }
  postMessageInterface = new PostMessageInterface();
}