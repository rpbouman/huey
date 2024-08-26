class SettingsDialogBase {

  #id = undefined;
  #settings = undefined;
  
  constructor(config){
    this.#id = config.id;
    this.#initDialog();
  }

  restoreToDefaultHandler(event){
    this.#settings.restoreToDefault();    
    this.updateDialogFromSettings();
  }
  
  getDialog(){
    var settingsDialog = byId(this.#id);
    return settingsDialog;
  }
  
  updateSettingsFromDialog(){
    this.#synchronize('settings');
  }
  
  updateDialogFromSettings(){
    this.#synchronize('dialog');
  }
    
  #synchronize(settingsOrDialog){
    var dialog = this.getDialog();
    var settings = this.#settings;
    var settingsObject;
    if (settings instanceof SettingsBase){
      settingsObject = settings;
      settings = settings.getSettings();
    }
    SettingsDialogBase.synchronize(dialog, settings, settingsOrDialog);
    if (settingsObject && settingsOrDialog === 'settings'){
      settingsObject.assignSettings([], settings);
    }
  }
    
  #initDialog(){
    var settingsDialog = this.getDialog();
    
    settingsDialog.querySelector('footer[role=toolbar] > button[value=Ok]')
    .addEventListener('click', function(event){
      event.cancelBubble = true;
      this.updateSettingsFromDialog();
      this.getDialog().close();
    }.bind(this));

    settingsDialog.querySelector('footer[role=toolbar] > button[value=Cancel]')
    .addEventListener('click', function(event){
      event.cancelBubble = true;
      this.getDialog().close();
    }.bind(this));

  }
  
  open(settings){
    this.#settings = settings;
    this.updateDialogFromSettings();
    var dialog = this.getDialog();
    dialog.showModal();
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
            SettingsDialogBase.#synchronizeInput(settingsOrDialog, section, property, control);
            break;
          case 'SELECT':
            SettingsDialogBase.#synchronizeSelect(settingsOrDialog, section, property, control);
            break;
          default:
            break;
        }
      }
    }
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
        else
        if (control.multiple) {
          var value = [];
          for (var i = 0; i < optionsFromControl.length; i++){
            var optionFromControl = optionsFromControl[i];
            var selected = optionFromControl.selected;
            if (selected) {
              value.push(optionFromControl.value);
            }
          }
          settings[property].value = value;
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
          if (control.multiple && valueFromSettings instanceof Array) {
            for (var i = 0; i < control.options.length; i++){
              var optionFromSettings = control.options[i];
              var value = optionFromSettings.value;
              var index = valueFromSettings.indexOf(value);
              var selected = index !== -1;
              optionFromSettings.selected = selected;
            }
          }
          else {
            control.value = valueFromSettings;
          }
        }
        
        break;
    }
  }  

}