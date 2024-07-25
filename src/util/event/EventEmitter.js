class EventEmitter {
  
  #emitEvents = true;
  #queuedEvents = undefined;
  #eventListeners = {};
  #supportedEvents = undefined;
  
  constructor(supportedEvents){
    switch (typeof supportedEvents) {
      case 'string':
        supportedEvents = [supportedEvents];
      case 'undefined':
      case 'object':
        if (supportedEvents instanceof Array){
          this.#supportedEvents = supportedEvents;
          break;
        }
      default:
        throw new Error(`Supported events should be an array`);
    }
    this.#supportedEvents = supportedEvents || [];
  }
  
  destroy(){
    this.#eventListeners = null;
  }
  
  checkEventType(eventType){
    if (this.#supportedEvents.indexOf(eventType) === -1) {
      throw new Error(`Unrecognized event type ${eventType}`);
    }
  }
  
  checkListenerType(listener){
    var typeOfListener = typeof listener;
    if (typeOfListener !== 'function'){
      throw new Error(`Listener should be of type 'function', not '${typeOfListener}'`);
    }
  }
  
  addEventListener(eventType, listener){
    this.checkEventType(eventType);
    this.checkListenerType(listener);    
    
    var eventListeners = this.#eventListeners[eventType];
    if (!eventListeners) {
      this.#eventListeners[eventType] = eventListeners = [];
    }
    
    if (eventListeners.indexOf(listener) !== -1) {
      return;
    }
    eventListeners.push(listener);
  }
  
  removeEventListener(eventType, listener){
    this.checkEventType(eventType);
    this.checkListenerType(listener);    
    
    var eventListeners = this.#eventListeners[eventType];
    if (!eventListeners) {
      return 0;
    }
    
    var count = 0;
    var index;
    while ((index = eventListeners.indexOf(listener)) !== -1){
      eventListeners.splice(index, 1);
      count += 1;
    };
    return count;
  }
  
  fireEvent(eventType, eventData, target) {
    var eventListeners = this.#eventListeners[eventType];
    if (!eventListeners) {
      return;
    }
    var target = target || this;
    var event = new Event(eventType);
    //https://stackoverflow.com/questions/37456443/how-set-the-eventtarget-of-an-event
    var targetPropertyDefinition = {
      writable: false,
      value: target
    };
    Object.defineProperty(event, 'target', targetPropertyDefinition);
    Object.defineProperty(event, 'currentTarget', targetPropertyDefinition);
    event.eventData = eventData;
    eventData.emitter = target;
    
    if (this.#emitEvents) {
      eventListeners.forEach(function(listener){
        listener.call(null, event);
      });
    }
    else {
      this.#queuedEvents.push(event);
    }
  }

  emitEvents(trueOrFalse) {
    switch(trueOrFalse) {
      case true:
        if (this.#queuedEvents && this.#queuedEvents.length) {
          debugger;
        }
        break;
      case false:
        this.#queuedEvents = [];
        break;
      default:
        throw new Error(`Invalid argument, should be true or false`);
    }
    this.#emitEvents = trueOrFalse;
  }
}