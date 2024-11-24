class DragAndDropHelper {
  
  /**
  * Utility for stuffing data into DataTransfer keys.
  *
  * Drag events have a dataTransfer property that points to a DataTransfer instance.
  * These objects are the recommended interface to store whatever data needs to be communicated between the drag source and drop area.
  *
  * Data is stored using the setData(key, value) method
  * Stored data can be retrieved using the getData(key) method, but this only returns a useful value inside a drop hanlder.
  * 
  * Any data that should be available during the drag, and which should be readable when handling dragEnter, dragOver, dragLeave events,
  * cannot be retrieved with getData(). During these events, handlers can inspect the keys held by the DataTransfer object.
  * So, we can abuse the keys and store data in there.
  *
  * The keys are intended to be used as mimetype identifiers, like application/json, text/plain etc.
  * To store data in there, we can create keys like: <key>/<data>.
  *
  * For some reason, browsers will normalize the keys and only store lower cased letters.
  * So we must use some kind of encoding if we want to store arbitrary data in there.
  * 
  * the encodeDataTransferKey function takes a string, and turns it into a comma-separated string of character codes.
  * the decodeDataTransferKey function takes a string created by encodeDataTransferKey and returns the decoded data.
  * the setData function takes an event (or DataTransfer instance), and an object representing the data. 
  */
  
  /*
  * pass in a string, returns it as a comma-separated string of character codes. 
  * for example:
  *
  * DragAndDropHelper.encodeDataTransferKey('ABC') === '65,66,67'
  */
  static encodeDataTransferKey(string){
    return string.split('').map(function(ch){
      return ch.charCodeAt(0);
    }).join(',');    
  }
  
  /*
  * pass in a a comma-separated string of character codes. 
  * for example:
  *
  * DragAndDropHelper.decodeDataTransferKey('65,66,67') === 'ABC'
  */
  static decodeDataTransferKey(string){
    return string.split(',').map(function(charCode){
        return String.fromCharCode(charCode);
    }).join('');
  }
  
  static #getDataTransferInstance(event){
    var dataTransfer;
    if (event instanceof Event) {
      dataTransfer = event.dataTransfer;
    }
    else
    if (event instanceof DataTransfer){
      dataTransfer = event;
    }
    if (dataTransfer === undefined) {
      throw new Error(`Invalid argument: could not find DataTransfer instance.`);
    }
    return dataTransfer;
  }
  
  static setData(event, data){
    var dataTransfer = DragAndDropHelper.#getDataTransferInstance(event);
    for (var property in data) {
      if (property !== property.toLowerCase()){
        throw new Error(`Invalid property "${property}": name should be lower-case`);
      }

      var value = data[property];
      var keys;
      if (value instanceof File){
        dataTransfer.setData(property, value);
        continue;
      }
      else
      if (
        typeof value === 'object' && 
        (keys = Object.keys(value)).length === 2 && 
        keys.indexOf('key') !== -1 && 
        keys.indexOf('value') !== -1
      ){
        if (property.indexOf('/') !== -1){
          throw new Error(`Invalid property value "${property}" for keyed values - the property should not contain a slash.`);
        }
        var key = value['key'];
        key = JSON.stringify(key);
        key = DragAndDropHelper.encodeDataTransferKey(key);
        property = `${property}/${key}`;
        value = value['value'];
      }
      
      if (property.startsWith('text/')){
        if (typeof value !== 'string') {
          throw new Error(`Expected string type data for type ${property}`);
        }
        // noop. text types are passed as is.
      } 
      else {
        value = JSON.stringify(value);
      }
      dataTransfer.setData(property, value);
    }
    return dataTransfer;
  }
  
  static getData(event){
    var dataTransfer = DragAndDropHelper.#getDataTransferInstance(event);
    var types = dataTransfer.types;
    var data = {};
    for (var i = 0; i < types.length; i++){
      var type = types[i];
      var match = /^(?<property>[^\/]+)((\/(?<keydata>\d+(,\d+)*)?)|(?<noKeydata>.+))?$/.exec(type);
      if (match === null){
        throw new Error(`Invalid DataTransfer type key "${type}".`);
      }
      var property = match.groups.property;
      var keydata = match.groups.keydata;
      var noKeydata = match.groups.noKeydata || '';
      
      var storedValue;
      switch(event.type){
        case 'dragstart':
        case 'drop':
          var rawData = dataTransfer.getData(type);
          if (rawData instanceof File){
            // noop
            storedValue = rawData;
          }
          else 
          if (property.startsWith('text') && noKeydata) {
            storedValue = rawData;
          }
          else {
            storedValue = JSON.parse(rawData);
          }
          break;
        default:
          storedValue = undefined;
      }
      
      var value;
      if (keydata){
        var decodedKeydata = JSON.parse(DragAndDropHelper.decodeDataTransferKey(keydata));
        value = {
          key: decodedKeydata,
          value: storedValue
        };
      }
      else {
        property += noKeydata;
        value = storedValue;
      }
      data[property] = value;
    }
    return data;
  }
  
  static getEncodedQueryAxisItemId(queryAxisItem) {
    var id = QueryAxisItem.getIdForQueryAxisItem(queryAxisItem);
    return DragAndDropHelper.encodeDataTransferKey(id);
  }
  
}