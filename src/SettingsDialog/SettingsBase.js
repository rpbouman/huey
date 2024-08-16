class SettingsBase extends EventEmitter {

  #settings = undefined;
  
  constructor(config){
    config = config || {};
    var events = ['change'];
    if (config.events instanceof Array){
      events = events.concat(config.events);
    }
    super(events);
    this.#settings = SettingsBase.updateDataFromTemplate({}, config.template || this.getTemplate());
  }
  
  getTemplate(){
    return {};
  }
  
  getTemplateClone(obj){
    var template = this.getTemplate();
    var clone = SettingsBase.updateDataFromTemplate(obj || {}, template);
    return clone;
  }
  
  restoreToDefault(){
    this.#settings = SettingsBase.updateDataFromTemplate({}, this.getTemplate());
  }
  
  static #normalizePath(path){
    switch (typeof path){
      case 'string':
        path = path.split('/');
        break;
      case 'object':
        if (path === null){
          path = [];
        }
        break;
      case 'undefined':
        path = [];
        break;
    }
    if (!(path instanceof Array)) {
      throw new Error('Invalid path');
    }
    return path;
  }
  
  #getSettings(path){
    var settings = this.#settings;
    path = SettingsBase.#normalizePath(path);
    var value = settings;
    for (var i = 0; i < path.length; i++) {
      var pathElement = path[i];
      value = value[pathElement];
      if (value === undefined){
        return undefined;
      }
    }
    return value;
  }
  
  // return a safe copy of a setting (one that can be abused by the receiver without messing up the actual settings)
  getSettings(path){
    var value = this.#getSettings(path);
    if (typeof value === 'object'){
      value = JSON.parse(JSON.stringify(value));
    }
    return value;
  }

  assignSettings(path, value){ 
    function deepAssign(target, source){
      for (var property in source){
        var sourceValue = source[property];
        if (typeof sourceValue === 'object') {
          deepAssign(target[property], sourceValue);
        }
        else {
          target[property] = sourceValue;
        }
      }
    }

    path = SettingsBase.#normalizePath(path);
  
    var settings;
    if (path.length) {
      var property = path.pop();
      settings = this.#getSettings(path);
    }
    else {
      deepAssign(this.#settings, value);
      return;
    }
    
    if (value === null || value === undefined){
      settings[property] = value;
    }
    else {
      var currentValue = settings[property];
      switch (typeof(currentValue)) {
        case 'object':
          if (currentValue === null){
            // fallthrough
          }
          else {
            deepAssign(currentValue, value);
            break;
          }
        case 'undefined':
        case 'string':
        case 'number':
        case 'boolean':
        case 'bigint':
          settings[property] = value;
      }
    }
  }  
    
  #updateSettingsFromDialog(){
    this.#synchronize('settings');
  }
  
  #updateDialogFromSettings(){
    this.#synchronize('dialog');
  }
  
  #synchronize(settingsOrDialog, dialogClass){
    var settings = this.#settings;
    Settings.synchronize(dialog, settings, settingsOrDialog);
    if (settingsOrDialog === 'settings') {
      var settingsCopy = Object.assign({}, settings);
      this.#examineChangesAndSendEvent(settingsCopy);
    }
  }
    
  #examineChangesAndSendEvent(oldSettings){
    // TODO: 
    // figure out exactly what changed and prepare a change reccord
    // send the change record along with the change event.
    
    this.fireEvent('change', this);
  }
  
  static updateDataFromTemplate(data, template){
    //harmonize data retrieved from storage with the template.
    //goal is "upgrade" the data so that all new features in the template are added,
    //but without destroying any of the data, ever.      
    if (data === null) {
      data = {};
    }
    if (template === null) {
      template = {};
    }
    
    //make some copies to work on so we don't mess up the originals in case something goes wrong in this method.
    data = Object.assign({}, data);
    template = Object.assign({}, template);
    
    //now, copy stuff from data to the template
    
    function copyData(source, target){
      var keys = Object.keys(source);
      keys.forEach(function(propertyName){
        var sourceValue = source[propertyName];
        var targetValue = target[propertyName];          
        if (targetValue === undefined || targetValue === null || targetValue === '') {
          //target either does not have this key at all, or it is null or the empty string (which we deem safe to overwrite)
          //so we create it and simply assign the value.
          if (typeof sourceValue === "object" && sourceValue !== null) {              
            // object is non-null reference type, we can use Object.assign. 
            // first, instantiate a new value of the right reference type
            targetValue = sourceValue instanceof Array ? [] : {};
            
            // then, do the deep assignment
            Object.assign(targetValue, sourceValue);
          }
          else {
            //value is either null or not a reference type - safe to simply assign.
            targetValue = sourceValue;
          }
          
          //do the actual assignment to the missing key.
          target[propertyName] = targetValue;
        }
        else if (sourceValue === null) {
          // we won't overwrite with null from template.
        }
        else if (typeof targetValue === 'object' && targetValue.constructor === sourceValue.constructor){
          // only if the sourceValue is not null, and both targetValue and sourceValue are reference types, copy the contents.
          copyData(sourceValue, targetValue);
        }
        else if (typeof sourceValue !== typeof targetValue){
          console.error('Property ' + propertyName + ' exists in source and target but have different types (' + (typeof sourceValue) + ';' + (typeof targetValue) +')');
        }
        else {
          //target has this property, and has a value. we do not overwrite the exiting value
        }
      });
    }
    copyData(template, data);      
    return data;
  }  

}
