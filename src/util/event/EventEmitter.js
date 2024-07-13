class EventEmitter {
  
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
    while (eventListeners.indexOf(listener) !== -1){
      eventListeners.splice(index, 1);
      count += 1;
    };
    return count;
  }
  
  fireEvent(eventType, eventData) {
    var eventListeners = this.#eventListeners[eventType];
    if (!eventListeners) {
      return;
    }
    var event = new Event(eventType);
    event.eventData = eventData;
    eventListeners.forEach(function(listener){
      listener.call(null, event);
    });
  }
  
}