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
  var typeOfTimeout = typeof timeout;
  var timeoutGetter;
  switch (typeOfTimeout) {
    case 'number':
      var timeoutValue = timeout;
      timeoutGetter = function(){
        return timeout;
      }
      break;
    case 'function':
      timeoutGetter = timeout;
      break;
    default:
      throw new Error(`Invalid value for timeout: should be a number or callback, not "${typeOfTimeout}".`);
  }
  
  var timeoutId = undefined;
  var count = 0;
  
  var listener = function(event){
    if (timeoutId === undefined){
      count = 0;
    }
    else {
      count += 1;
      // clear the timeout to kick of the final handler call, as we're not done receiving events.
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
    // alwayws call the handler with the event and the event count.
    // This allows the handler to decide after how many events to handle something.
    handler.call(scope ? scope : null, event, count);

    // Set a timeout for the final call to the handler - this kicks in after the timeout after the last event has expired.
    timeoutId = setTimeout(function(){
      timeoutId = undefined;
      handler.call(scope ? scope : null, event, undefined);
    }, timeoutGetter.call());
  };
  
  eventEmitter.addEventListener(eventId, listener);
  
  return listener;
}