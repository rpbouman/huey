class SessionCloner {

  constructor(){
    this.#init();
  }

  #init(){
    window.addEventListener('message', this.#messageHandler.bind(this));
    this.#initCloneHueySession();
  }
  
  #messageHandler(event){
    var request = event.data;
    var requestType = request.messageType;
    
    if (requestType) {
      return;
    }
    
    if (
      !request.status ||
      request.status.code !== PostMessageProtocol.STATUS_READY ||
      !request.body ||
      !request.body.params ||
      !request.body.params.cloneHueySession ||
      request.body.params.cloneHueySession !== 'true'
    ){
      return;
    }
    this.#copyWindowStateToHueyClone(event.source);
  }
  
  #copyWindowStateToHueyClone(clonedWindow){
    var datasourceIds = datasourcesUi.getDatasourceIds();
    for (var i = 0; i < datasourceIds.length; i++) {
      var datasourceId = datasourceIds[i];
      var datasource = datasourcesUi.getDatasource(datasourceId);
      var originalConfig = datasource.getOriginalConfig();
      var request = {
        requestId: i,
        messageType: PostMessageProtocol.REQUEST_CREATE_DATASOURCE,
        body: {
          datasourceConfig: originalConfig
        }        
      };
      clonedWindow.postMessage(request, {targetOrigin: '*'});
    }
    var route = Routing.getCurrentRoute();
    if (route) {
      var request = {
        requestId: i+1,
        messageType: PostMessageProtocol.REQUEST_SET_ROUTE,
        body: {
          route: route
        }        
      };
      clonedWindow.postMessage(request, {targetOrigin: '*'});
    }
  }

  #initCloneHueySession(){
    byId('cloneHueySession').addEventListener('click', function(event){
      var location = document.location;
      var url = `${location.protocol}//${location.pathname}?cloneHueySession=true`;
      
      if (!postMessageInterface) {
        initPostMessageInterface(true);
      }
      
      var windowProxy = window.open(url);
    });
  }

}

var sessionCloner = undefined;
function initSessionCloner() {
  sessionCloner = new SessionCloner();
}