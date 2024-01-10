class Settings extends EventEmitter {

  static localStorageKey = 'settings';
  
  #id = undefined;
  
  #settingsTemplate = {
    fileSettings: {
      registeredFileTypes: {
        options: [
          {value: ".csv", label: "Comma seperated (*.csv)"},
          {value: ".json", label: "JSON (*.json)"},
          {value: ".parquet", label: "Parquet (*.parquet)"},
          {value: ".txt", label: "Text (*.txt)"}
        ],
        value: '.csv'
      },
      defaultActionForFileType: {
        options: [
          {value: "SelectFrom", label: "SELECT FROM"},
          {value: "csvWizard", label: "csv wizard"},
          {value: "jsonWizard", label: "json wizard"},
          {value: "parquetWizard", label: "parquet wizard"}
        ],
        value: '.csv'
      }
    },
    localeSettings: {
      useDefaultLocale: true,
      locale: navigator.languages,
      minimumIntegerDigits: 1.,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    },
    themeSettings: {
      themes: {
        options: [
          {
            value: {
              "--huey-text-font-family": "Verdana",
              "--huey-text-font-size": "10pt",
              "--huey-mono-font-family": "Monospace",
              "--huey-foreground-color": "rgb(50,50,50)",
              "--huey-placeholder-color": "rgb(180,180,180)",
              "--huey-light-background-color": "rgb(255,255,255)",
              "--huey-medium-background-color": "rgb(250,250,250)",
              "--huey-dark-background-color": "rgb(222,222,222)",
              "--huey-light-border-color": "rgb(222,222,222)",
              "--huey-dark-border-color": "rgb(200,200,200)",
              "--huey-icon-color-subtle": "rgb(200,200,200)",
              "--huey-icon-color": "rgb(50,50,50)",
              "--huey-icon-color-highlight": "rgb(0,0,0)"
            },
            label: "Whio"
          },
          {
            value: {
              "--huey-text-font-family": "Verdana",
              "--huey-text-font-size": "10pt",
              "--huey-mono-font-family": "Monospace",
              "--huey-foreground-color": "rgb(50,50,50)",
              "--huey-placeholder-color": "rgb(180,180,180)",
              "--huey-light-background-color": "rgb(222,227,233)",
              "--huey-medium-background-color": "rgb(182,139,70)",
              "--huey-dark-background-color": "rgb(182,139,70)",
              "--huey-light-border-color": "rgb(203,140,96)",
              "--huey-dark-border-color": "rgb(95,37,13)",
              "--huey-icon-color-subtle": "rgb(200,200,200)",
              "--huey-icon-color": "rgb(79,107,172)",
              "--huey-icon-color-highlight": "rgb(188,101,120)"
            },
            label: "Mandarin"
          },
        ],
        value: {
          "--huey-text-font-family": "Verdana",
          "--huey-text-font-size": "10pt",
          "--huey-mono-font-family": "Monospace",
          "--huey-foreground-color": "rgb(50,50,50)",
          "--huey-placeholder-color": "rgb(180,180,180)",
          "--huey-light-background-color": "rgb(255,255,255)",
          "--huey-medium-background-color": "rgb(250,250,250)",
          "--huey-dark-background-color": "rgb(222,222,222)",
          "--huey-light-border-color": "rgb(222,222,222)",
          "--huey-dark-border-color": "rgb(200,200,200)",
          "--huey-icon-color-subtle": "rgb(200,200,200)",
          "--huey-icon-color": "rgb(50,50,50)",
          "--huey-icon-color-highlight": "rgb(0,0,0)"
        }
      }
    }
  };
  
  #settings = undefined;
  
  constructor(id){
    super();
    this.#id = id;
    this.#loadFromLocalStorage();
    this.#initDialog();
  }
  
  getSettings(path){
    var settings = this.#settings;
    if (typeof path === 'string'){
      path = [path];
    }
    if (!(path instanceof Array)) {
      throw new Error('Invalid path');
    }
    var value = settings;
    for (var i = 0; i < path.length; i++) {
      var pathElement = path[i];
      value = value[pathElement];
      if (value === undefined){
        return undefined;
      }
    }
    if (typeof value === 'object'){
      value = Object.assign({}, value);
    }
    return value;
  }
  
  #getDialog(){
    var settingsDialog = byId(this.#id);
    return settingsDialog;
  }
  
  #initDialog(){
    var settingsDialog = this.#getDialog();
    
    byId('settingsDialogOkButton').addEventListener('click', function(event){
      event.cancelBubble = true;
      this.#updateSettingsFromDialog();
      this.#storeToLocalStorage();
      settingsDialog.close();
    }.bind(this));

    byId('settingsDialogCancelButton').addEventListener('click', function(event){
      event.cancelBubble = true;
      settingsDialog.close();
    }.bind(this));

    byId('settingsButton').addEventListener('click', function(){
      this.#updateDialogFromSettings();
      settingsDialog.showModal();
    }.bind(this));
  }
  
  #updateSettingsFromDialog(){
    this.#synchronize('settings');
  }
  
  #updateDialogFromSettings(){
    this.#synchronize('dialog');
  }
  
  #synchronize(settingsOrDialog){
    var dialog = this.#getDialog();
    var settings = this.#settings;
    var settingsCopy = Object.assign({}, settings);
    for (var sectionName in settings) {
      var section = settings[sectionName];
      for (var property in section) {
        var control = byId(property);
        if (!control){
          continue;
        }
        if (settingsOrDialog === 'settings' && typeof control.checkValidity === 'function' && !control.checkValidity()){
          console.error(`Settings persistence issue: ${control.nodeName} for property ${property} in section ${sectionName} has invalid value.`);
          continue;
        }
        switch (control.nodeName){
          case 'INPUT':
            this.#synchronizeInput(settingsOrDialog, section, property, control);
            break;
          case 'SELECT':
            this.#synchronizeSelect(settingsOrDialog, section, property, control);
            break;
          default:
            break;
        }
      }
    }
    if (settingsOrDialog === 'settings') {
      this.#examineChangesAndSendEvent(settingsCopy);
    }
  }
  
  #examineChangesAndSendEvent(oldSettings){
    // TODO: 
    // figure out exactly what changed and prepare a change reccord
    // send the change record along with the change event.
    
    this.fireEvent('change', this);
  }
  
  #synchronizeInput(settingsOrDialog, settings, property, control){
    var valueProperty = 'value';
    var defaultValueGetter, defaultValueSetter;
    switch (control.type) {
      case 'checkbox':
        valueProperty = 'checked';
        break;
      case 'text':
        break;
      case 'number':
        defaultValueGetter = function(control){var num = parseFloat(control.value, 10); return isNaN(num) ? undefined : num;}
        break;
      default:
        console.error(`Don't know how to get value from INPUT of type ${control.type}, defaulting to "value".`);
        break;
    }
    
    var value;
    switch (settingsOrDialog){
      case 'settings':
        if (control.validityState && control.valid === false){
          break;
        }
        var valueGetter = control.getAttribute('data-value-getter');
        if (valueGetter){
          valueGetter = eval(valueGetter);
          value = valueGetter.call(null, control, this);
        }
        else 
        if (defaultValueGetter) {
          value = defaultValueGetter.call(null, control, this);
        }
        else {
           value = control[valueProperty];
        }
        settings[property] = value;
        break;
      case 'dialog':
        value = settings[property];
        var valueSetter = control.getAttribute('data-value-setter');
        if (valueSetter){
          valueSetter = eval(valueSetter);
          valueSetter.call(null, control, value, this);
        }
        else 
        if (defaultValueSetter) {
          value = defaultValueSetter.call(null, control, value, this);
        }
        else {
          control[valueProperty] = value;
        }
        break;
    }
  }

  #synchronizeSelect(settingsOrDialog, settings, property, control){
    switch (settingsOrDialog) {
      case 'settings':
        var optionsFromSettings = [];
        var optionsFromControl = control.options;
        
        var valueGetter = control.getAttribute('data-value-getter');
        if (valueGetter){
          valueGetter = eval(valueGetter);
        }
        
        for (var i = 0; i < optionsFromControl.length; i++){
          var optionFromControl = optionsFromControl[i];
          var value = optionFromControl.value;
          var label = optionFromControl.label || value;
          if (valueGetter){
            value = valueGetter.call(null, optionFromControl, this);
          }
          optionsFromSettings.push({value: value, label: label}); 
        }
        settings[property].options = optionsFromSettings;
        if (valueGetter) {
          settings[property].value = valueGetter.call(null, control, this);
        }
        else {
          settings[property].value = control.value;
        }
        break;
      case 'dialog':
        var optionsFromSettings = settings[property].options;
        var valueFromSettings = settings[property].value;

        var valueSetter = control.getAttribute('data-value-setter');
        if (valueSetter){
          valueSetter = eval(valueSetter);          
        }
        
        control.options.length = 0;
        for (var i = 0; i < optionsFromSettings.length; i++){
          var optionFromSettings = optionsFromSettings[i];
          var value = optionFromSettings.value;
          var label = optionFromSettings.label || value;
          var option = createEl('option', {
            label: label
          }, label);
          
          if (valueSetter) {
            valueSetter.call(null, option, value, this);
          }
          else {
            option.value = value;
          }
          control.appendChild(option);
        }
        
        if (valueSetter) {
          valueSetter.call(null, control, valueFromSettings, this);
        }
        else {
          control.value = valueFromSettings;
        }
        
        break;
    }
  }
  
  #init(settings){
    if (settings.localeSettings.useDefaultLocale) {
      settings.localeSettings.locale = navigator.languages;
    }
    this.#settings = settings;
  }
  
  #updateDataFromTemplate(data, template){
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
  
  #loadFromLocalStorage(){
    var settingsTemplate = this.#settingsTemplate;
    var storedSettingsJSON = localStorage.getItem(Settings.localStorageKey);
    var storedSettings = JSON.parse(storedSettingsJSON);
    var settings = this.#updateDataFromTemplate(storedSettings, settingsTemplate);
    this.#init(settings);
  }

  #storeToLocalStorage(){
    var settings = this.#settings;
    var settingsJSON = JSON.stringify(settings);
    localStorage.setItem(Settings.localStorageKey, settingsJSON);
  }
}

var settings = new Settings('settingsDialog');
