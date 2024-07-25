function bufferEvents(eventEmitter, eventId, handler, scope, timeout){
  var defaultTimeout = 100;

  if (typeof eventEmitter === 'string'){
    eventEmitter = byId(eventEmitter);
  }
  if (typeof eventEmitter !== 'object') {
    throw new Error(`Invalid argument 1: eventEmitter should be an object, not "${typeof eventEmitter}".`);
  }
  if (typeof eventEmitter.addEventListener !== 'function') {
    throw new Error(`Invalid argument 1: eventEmitter should implement method addEventListener, not "${typeof eventEmitter.addEventListener}".`);
  }
  if (typeof eventId !== 'string'){
    throw new Error(`Invalid argument 2: event id should be a string, not "${eventId}".`);
  }
  if (typeof handler !== 'function') {
    throw new Error(`Invalid argument 3: handler should be a function, not "${typeof handler}".`);
  }
  
  var typeofScope = typeof scope;
  switch (typeofScope) {
    case 'object':
      break;
    case 'number':
      if (arguments.length === 4) {
        timeout = scope;
      }
      else {
        throw new Error(`Invalid argument 4: should either be scope or timeout, got ${scope}`);
      }
    case 'undefined':
      scope = null;
      break;
    default:
      throw new Error(`Invalid argument 4: should either be scope or timeout, got ${scope}`);
  }
  
  if (timeout === undefined) {
    timeout = defaultTimeout;
  }
  
  var timeoutId = undefined;
  var count = 0;
  
  var listener = function(event){
    if (timeoutId === undefined){
      count = 0;
    }
    else {
      count += 1;
      clearTimeout(timeoutId);
    }
    handler.call(scope ? scope : null, event, count);
    timeoutId = setTimeout(function(){
      timeoutId = undefined;
      handler.call(scope ? scope : null, event);
    }, timeout);
  };
  
  eventEmitter.addEventListener(eventId, listener);
  
  return listener;
}