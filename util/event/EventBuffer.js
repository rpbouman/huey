function bufferEvents(eventEmitter, eventId, timeout, handler, scope){
  
  var state = {
    timeout: undefined
  };
  eventEmitter.addEventListener(eventId, function(event){
    if (state.timeout !== undefined){
      cancelTimeout(state.timeout);
    }
    state.timeout = setTimeout(function(){
      state.timeout = undefined;
      handler.call(scope ? scope : null, event);
    }, timeout);
  });
}