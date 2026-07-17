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
    if (!this.#supportedEvents.includes(eventType)) {
      throw new Error(`Unrecognized event type ${eventType}`);
    }
  }
  
  checkListenerType(listener){
    const typeOfListener = typeof listener;
    if (typeOfListener !== 'function'){
      throw new Error(`Listener should be of type 'function', not '${typeOfListener}'`);
    }
  }
  
  addEventListener(eventType, listener){
    this.checkEventType(eventType);
    this.checkListenerType(listener);    
    
    let eventListeners = this.#eventListeners[eventType];
    if (!eventListeners) {
      this.#eventListeners[eventType] = eventListeners = [];
    }
    
    if ( eventListeners.includes(listener) ) {
      return;
    }
    eventListeners.push(listener);
  }
  
  removeEventListener(eventType, listener){
    this.checkEventType(eventType);
    this.checkListenerType(listener);    
    
    const eventListeners = this.#eventListeners[eventType];
    if (!eventListeners) {
      return 0;
    }
    
    let count = 0;
    let index;
    while ((index = eventListeners.indexOf(listener)) !== -1){
      eventListeners.splice(index, 1);
      count += 1;
    };
    return count;
  }
  
  fireEvent(eventType, eventData, target) {
    const eventListeners = this.#eventListeners[eventType];
    if (!eventListeners) {
      return;
    }
    target = target || this;
    const event = new Event(eventType);
    //https://stackoverflow.com/questions/37456443/how-set-the-eventtarget-of-an-event
    const targetPropertyDefinition = {
      writable: false,
      value: target
    };
    Object.defineProperty(event, 'target', targetPropertyDefinition);
    Object.defineProperty(event, 'currentTarget', targetPropertyDefinition);
    event.eventData = eventData;
    eventData.emitter = target;
    
    if (this.#emitEvents) {
      eventListeners.forEach(listener => {
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