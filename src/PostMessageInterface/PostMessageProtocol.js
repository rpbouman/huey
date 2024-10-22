class PostMessageProtocol {
  
  // Values for messageType: requests:
  
  // basic request to ensure communication is established
  static REQUEST_PING = 'ping';
  // create a datasource
  // in this case, a body should be present with a datasourceConfig property.
  // (the datasourceConfig is passed as config argument to the DuckDbDataSource constructor) 
  // optionally a boolean selectForAnalysis property maybe present that indicates whether the datasource will be selected
  // (selecting the datasource means that the attribute ui will be activated showing the properties of this datasource)
  static REQUEST_CREATE_DATASOURCE = 'createDatasource';
  // set the route.
  // this is a high level method to set the state of the page.
  // (the details of how the state of the page is set is left to the router.)
  static REQUEST_SET_ROUTE = 'setRoute'; 
  // send a batch of multiple requests to be executed in sequence.
  // in this case, the body should be prsent with a requests property.
  // The requests property should hold an array of request messages which are to be executed sequentially
  // (Details: 
  // - what to do when it contains a request that would normally respond with STATUS_DEFERRED?
  // - what to do when one of the requests in the sequence responds with STATUS_BAD_REQUEST or STATUS_INTERNAL_ERROR?
  // )
  static REQUEST_MULTI = 'multi';

  // Values for messageType: response:
  
  static RESPONSE = 'response';
  
  // Values for status.code:  
  
  // ready is sent by huey to the opener or parent when the app's posting interface is ready to receive requests
  static STATUS_READY = 'Ready';  
  // ok is sent when a request was succesfully received and immediately handled
  static STATUS_OK = 'Ok';
  // deferred is sent when a request is successfully recieved, but will be handled in the near future. 
  // such a request will receive at least a subsequent response when it is actually handled.
  static STATUS_DEFERRED = 'Deferred';
  // bad request is sent when the request was received but was malformed or did not contain enough information to be completed
  static STATUS_BAD_REQUEST = 'Bad Request';
  // internal error is sent when the request was received, but an internal error was encountered during handling.
  static STATUS_INTERNAL_ERROR = 'Internal Error';

}