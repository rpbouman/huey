class EventEmitter {
  
  #eventListeners = {};
  
  constructor(){
  }
  
  checkEventType(eventType){
    switch(eventType) {
      case 'change':
        break;
      default:
        throw new Error(`Unrecognized event type ${type}`);
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