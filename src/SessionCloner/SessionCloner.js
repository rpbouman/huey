class SessionCloner {

  constructor(){
    this.#init();
  }

  #init(){
    window.addEventListener('message', event => this.#messageHandler( event ) );
    this.#initCloneHueySession();
  }
  
  #messageHandler(event){
    const request = event.data;
    const requestType = request.messageType;
    
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
    const datasourceIds = datasourcesUi.getDatasourceIds();
    let i;
    for (i = 0; i < datasourceIds.length; i++) {
      const datasourceId = datasourceIds[i];
      const datasource = datasourcesUi.getDatasource(datasourceId);
      const originalConfig = datasource.getOriginalConfig();
      const request = {
        requestId: i,
        messageType: PostMessageProtocol.REQUEST_CREATE_DATASOURCE,
        body: {
          datasourceConfig: originalConfig
        }
      };
      clonedWindow.postMessage(request, {targetOrigin: '*'});
    }
    const route = Routing.getCurrentRoute();
    if (route) {
      const request = {
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
    byId('cloneHueySession').addEventListener('click', event => {
      const location = document.location;
      const params = new URLSearchParams(location.search);
      params.set('cloneHueySession', 'true');
      const url = `${location.protocol}//${location.hostname}${location.pathname}?${params.toString()}`;
      
      if (!postMessageInterface) {
        initPostMessageInterface(true);
      }
      
      const windowProxy = window.open(url);
    });
  }

}

let sessionCloner = undefined;
function initSessionCloner() {
  sessionCloner = new SessionCloner();
}