class Settings extends EventEmitter {

  static localStorageKey = 'settings';
  
  #id = undefined;
  
  static #settingsTemplate = {
    datasourceSettings: {
      useLooseColumnTypeComparison: false,
      looseColumnTypes: {
        // loosest numeric class.
        number: [],
        // loosest integer class.
        integer: [],
        // loosest signed integer class
        signed: ['BIGINT', 'INTEGER', 'HUGEINT', 'SMALLINT', 'TINYINT'],
        // loosest unsigned integer class
        unsigned: ['UBIGINT', 'UINTEGER', 'USMALLINT', 'UTINYINT'],
        // loosest fractional number
        fractional: [],
        // loosest approximat (fractional) number
        approximate: ['DOUBLE', 'REAL'],
        // loosest fixed fractional number. 
        fixed: [],
        // loosest date time temporal
        dateTime: [],
        // loosest character string class
        string: [],
        // loosest binary class
        binary: []
      }
    },
    localeSettings: {
      nullString: '␀',
      totalsString: 'Total',
      useDefaultLocale: true,
      locale: navigator.languages,
      minimumIntegerDigits: 1,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      linkMinimumAndMaximumDecimals: true
    },
    sqlSettings: {
      keywordLetterCase: 'upperCase',
      alwaysQuoteIdentifiers: true,
      commaStyle: 'newlineBefore'
    },
    querySettings: {
      autoRunQuery: false,
      filterValuePicklistPageSize: 100,
      filterSearchAutoQueryTimeoutInMilliseconds: 1000
    },
    pivotSettings: {
      maxCellWidth: 30
    },
    exportUi: {
      exportTitleTemplate: '${cells-items} from ${datasource} with ${rows-items} on rows and ${columns-items} on columns',
      // radio
      exportResultShapePivot: true,
      exportResultShapeTable: false,
      // radio
      exportDestinationFile: false,
      exportDestinationClipboard: true,
      // radio
      exportDelimited: true,
      exportJson: false,
      exportParquet: false,
      exportSql: false,
      // options for delimited
      exportDelimitedCompression: {
        value: 'UNCOMPRESSED',
        options: [
          { value: 'UNCOMPRESSED', label: 'uncompressed' , title: 'Uncompressed - no compression will be applied'},
          { value: 'GZIP', label: 'gzip' , title: 'GZIP - applies gzip compression'},
          { value: 'ZTSD', label: 'ztsd' , title: 'ZTSD - applies ztsd compression'}
        ]
      },
      exportDelimitedIncludeHeaders: true,
      exportDelimitedDateFormat: '%x',
      exportDelimitedTimestampFormat: '%c',
      exportDelimitedNullString: '',
      exportDelimitedColumnDelimiter: ',',
      exportDelimitedQuote: '"',
      exportDelimitedEscape: '"',
      // options for json
      exportJsonCompression: {
        value: 'UNCOMPRESSED',
        options: [
          { value: 'UNCOMPRESSED', label: 'uncompressed' , title: 'Uncompressed - no compression will be applied'},
          { value: 'GZIP', label: 'gzip' , title: 'GZIP - applies gzip compression'},
          { value: 'ZTSD', label: 'ztsd' , title: 'ZTSD - applies ztsd compression'}
        ]
      },
      exportJsonDateFormat: '%x',
      exportJsonTimestampFormat: '%c',
      // true for array, false for newline
      exportJsonRowDelimiter: {
        value: "true",
        options: [
          { "value": "false", label: "newline" },
          { "value": "true", label: "array" }
        ]
      },
      exportParquetCompression: {
        value: 'SNAPPY',
        options: [
          { value: 'UNCOMPRESSED', label: 'uncompressed' , title: 'Uncompressed - no compression will be applied'},
          { value: 'GZIP', label: 'gzip' , title: 'GZIP - applies gzip compression'},
          { value: 'SNAPPY', label: 'snappy' , title: 'SNAPPY - applies snappy compression'},
          { value: 'ZTSD', label: 'ztsd' , title: 'ZTSD - applies ztsd compression'}
        ]
      },
      exportSqlKeywordLettercase: {
        value: 'upperCase',
        options: [
          { value: 'initialCapital', label: 'Initial Capital', title: 'Initial capital followed by lowercase'},
          { value: 'lowerCase', label: 'Lower Case', title: 'All lower case'},
          { value: 'upperCase', label: 'Upper Case', title: 'All upper case'}
        ]
      },
      exportSqlAlwaysQuoteIdentifiers: true,
      exportSqlCommaStyle: {
        value: 'newlineBefore',
        options: [
          { value: 'spaceAfter', label: 'Space After' },
          { value: 'newlineAfter', label: 'Newline After' },
          { value: 'newlineBefore', label: 'Newline Before' }
        ]
      }
    },
    filterDialogSettings: {
      filterSearchApplyAll: false,
      filterSearchAutoWildcards: true,
      caseSensitive: true
    },
    themeSettings: {
      themes: {
        options: [
          {
            value: {
              "--huey-text-font-family": "system-ui",
              "--huey-text-font-size": "10pt",
              "--huey-mono-font-family": "monospace",
              "--huey-foreground-color": "rgb(50,50,50)",
              "--huey-placeholder-color": "rgb(180,180,180)",
              "--huey-light-background-color": "rgb(255,255,255)",
              "--huey-medium-background-color": "rgb(245,245,245)",
              "--huey-dark-background-color": "rgb(210,210,210)",
              "--huey-light-border-color": "rgb(222,222,222)",
              "--huey-dark-border-color": "rgb(175,175,175)",
              "--huey-icon-color-subtle": "rgb(185,185,185)",
              "--huey-icon-color": "rgb(50,50,50)",
              "--huey-icon-color-highlight": "rgb(0,0,0)"
            },
            label: "Default"
          },
          {
            value: {
              "--huey-text-font-family": "system-ui",
              "--huey-text-font-size": "10pt",
              "--huey-mono-font-family": "monospace",
              "--huey-foreground-color": "rgb(30,144,255)", // Dodger Blue
              "--huey-placeholder-color": "rgb(173,216,230)", // Light Blue
              "--huey-light-background-color": "rgb(240,248,255)", // Alice Blue
              "--huey-medium-background-color": "rgb(224,255,255)", // Light Cyan
              "--huey-dark-background-color": "rgb(175,238,238)", // Pale Turquoise
              "--huey-light-border-color": "rgb(176,224,230)", // Powder Blue
              "--huey-dark-border-color": "rgb(135,206,250)", // Light Sky Blue
              "--huey-icon-color-subtle": "rgb(173,216,230)", // Light Blue
              "--huey-icon-color": "rgb(30,144,255)", // Dodger Blue
              "--huey-icon-color-highlight": "rgb(0,191,255)" // Deep Sky Blue
            },
            label: "Mint"
          },
          {
            value: {
              "--huey-text-font-family": "system-ui",
              "--huey-text-font-size": "10pt",
              "--huey-mono-font-family": "monospace",
              "--huey-foreground-color": "rgb(70,130,180)", // Steel Blue
              "--huey-placeholder-color": "rgb(176,196,222)", // Light Steel Blue
              "--huey-light-background-color": "rgb(245,245,255)", // Lavender
              "--huey-medium-background-color": "rgb(230,230,250)", // Lavender Blue
              "--huey-dark-background-color": "rgb(173,216,230)", // Light Blue
              "--huey-light-border-color": "rgb(200,220,240)", // Light Sky Blue
              "--huey-dark-border-color": "rgb(135,206,235)", // Sky Blue
              "--huey-icon-color-subtle": "rgb(176,196,222)", // Light Steel Blue
              "--huey-icon-color": "rgb(70,130,180)", // Steel Blue
              "--huey-icon-color-highlight": "rgb(65,105,225)" // Royal Blue
            },
            label: "Lila"
          },
          {
            value: {
              "--huey-text-font-family": "system-ui",
              "--huey-text-font-size": "10pt",
              "--huey-mono-font-family": "monospace",
              "--huey-foreground-color": "#000000", 
              "--huey-placeholder-color": "#A9A9A9",
              "--huey-light-background-color": "#F0E68C", 
              "--huey-medium-background-color": "#A7D3A4", 
              "--huey-dark-background-color": "#5B8266", 
              "--huey-light-border-color": "#A5B479", 
              "--huey-dark-border-color": "#334D56", 
              "--huey-icon-color-subtle": "#B4AA50", 
              "--huey-icon-color": "#8B4513", 
              "--huey-icon-color-highlight": "#FFFFFF"
            },
            label: "Mallard"
          },
          {
            value: {
              "--huey-text-font-family": "system-ui",
              "--huey-text-font-size": "10pt",
              "--huey-mono-font-family": "monospace",
              "--huey-foreground-color": "black",
              "--huey-placeholder-color": "#A9A9A9", 
              "--huey-light-background-color": "#D5D5D5", 
              "--huey-medium-background-color": "#D2B48C", 
              "--huey-dark-background-color": "#008080", 
              "--huey-light-border-color": "#8B4513", 
              "--huey-dark-border-color": "#2F4F4F", 
              "--huey-icon-color-subtle": "##50AEbA", 
              "--huey-icon-color": "#FFFFFF", 
              "--huey-icon-color-highlight": "#8B4513" 
            },
            label: "Teal"
          },
          {
            value: {
              "--huey-text-font-family": "system-ui",
              "--huey-text-font-size": "10pt",
              "--huey-mono-font-family": "monospace",
              "--huey-foreground-color": "rgb(36,36,74)",
              "--huey-placeholder-color": "rgb(180,180,180)",
              "--huey-light-background-color": "rgb(182,187,229)",
              "--huey-medium-background-color": "rgb(108,115,183)",
              "--huey-dark-background-color": "rgb(67,71,119)",
              "--huey-light-border-color": "rgb(99,46,64)",
              "--huey-dark-border-color": "rgb(42,34,55)",
              "--huey-icon-color-subtle": "rgb(67,21,21)",
              "--huey-icon-color": "rgb(36,36,74)",
              "--huey-icon-color-highlight": "rgb(255,243,255)"
            },
            label: "Whio"
          },
          {
            value: {
              "--huey-text-font-family": "system-ui",
              "--huey-text-font-size": "10pt",
              "--huey-mono-font-family": "monospace",
              "--huey-foreground-color": "rgb(220, 220, 220)",
              "--huey-placeholder-color": "rgb(100, 100, 100)",
              "--huey-light-background-color": "rgb(30, 30, 30)",
              "--huey-medium-background-color": "rgb(50, 50, 50)",
              "--huey-dark-background-color": "rgb(110 110, 110)",
              "--huey-light-border-color": "rgb(80, 80, 80)",
              "--huey-dark-border-color": "rgb(110, 110, 110)",
              "--huey-icon-color-subtle": "rgb(150, 150, 150)",
              "--huey-icon-color": "rgb(220, 220, 220)",
              "--huey-icon-color-highlight": "rgb(255, 255, 255)"
            },
            label: "Dark Mode"
          }
        ],
        value: {
          "--huey-text-font-family": "system-ui",
          "--huey-text-font-size": "10pt",
          "--huey-mono-font-family": "monospace",
          "--huey-foreground-color": "rgb(50,50,50)",
          "--huey-placeholder-color": "rgb(180,180,180)",
          "--huey-light-background-color": "rgb(255,255,255)",
          "--huey-medium-background-color": "rgb(245,245,245)",
          "--huey-dark-background-color": "rgb(210,210,210)",
          "--huey-light-border-color": "rgb(222,222,222)",
          "--huey-dark-border-color": "rgb(175,175,175)",
          "--huey-icon-color-subtle": "rgb(185,185,185)",
          "--huey-icon-color": "rgb(50,50,50)",
          "--huey-icon-color-highlight": "rgb(0,0,0)"
        }
      }
    }
  };
  
  #settings = undefined;
  
  constructor(id){
    super('change');
    this.#id = id;
    this.#loadFromLocalStorage();
    this.#initDialog();
    
    window.addEventListener('beforeunload', function(){
      this.#storeToLocalStorage();
    }.bind(this));
  }
  
  #getSettings(path){
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
    return value;
  }
  
  // return a safe copy of a setting (one that can be abused by the receiver without messing up the actual settings)
  getSettings(path){
    var value = this.#getSettings(path);
    if (typeof value === 'object'){
      value = Object.assign({}, value);
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

    if (typeof path === 'string'){
      path = [path];
    }
    if (!(path instanceof Array)) {
      throw new Error('Invalid path');
    }
  
    var property = path.pop();
    var settings = this.#getSettings(path);
    
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

    this.#storeToLocalStorage();    
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
    }.bind(this));

    byId('settingsDialogCancelButton').addEventListener('click', function(event){
      event.cancelBubble = true;
    }.bind(this));

    byId('settingsDialogResetButton').addEventListener('click', function(event){
      this.#resetSettings();
      this.fireEvent('change', this);
    }.bind(this));

    byId('settingsButton').addEventListener('click', function(){
      this.#updateDialogFromSettings();
    }.bind(this));    
  }
  
  #resetSettings(){
    this.#settings = Settings.#settingsTemplate;
    this.#storeToLocalStorage();
    this.#updateDialogFromSettings();
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
    Settings.synchronize(dialog, settings, settingsOrDialog);
    if (settingsOrDialog === 'settings') {
      var settingsCopy = Object.assign({}, settings);
      this.#examineChangesAndSendEvent(settingsCopy);
    }
  }
  
  static synchronize(dialog, settings, settingsOrDialog){
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
            Settings.#synchronizeInput(settingsOrDialog, section, property, control);
            break;
          case 'SELECT':
            Settings.#synchronizeSelect(settingsOrDialog, section, property, control);
            break;
          default:
            break;
        }
      }
    }
  }
  
  #examineChangesAndSendEvent(oldSettings){
    // TODO: 
    // figure out exactly what changed and prepare a change reccord
    // send the change record along with the change event.
    
    this.fireEvent('change', this);
  }
  
  static #synchronizeInput(settingsOrDialog, settings, property, control){
    var valueProperty = 'value';
    var defaultValueGetter, defaultValueSetter;
    switch (control.type) {
      case 'radio':
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

  static #synchronizeSelect(settingsOrDialog, settings, property, control){
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
          var title = optionFromSettings.title || label;
          var option = createEl('option', {
            label: label,
            title: title
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
    var settingsTemplate = Settings.#settingsTemplate;
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