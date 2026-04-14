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
    const settingsDialog = byId(this.#id);
    return settingsDialog;
  }

  updateSettingsFromDialog(){
    this.#synchronize('settings');
  }

  updateDialogFromSettings(){
    this.#synchronize('dialog');
  }

  #synchronize(settingsOrDialog){
    const dialog = this.getDialog();
    let settings = this.#settings;
    let settingsObject;
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
    const settingsDialog = this.getDialog();

    settingsDialog.querySelector('footer[role=toolbar] > button[value=Ok]')
    .addEventListener('click', event => {
      event.cancelBubble = true;
      this.updateSettingsFromDialog();
      this.getDialog().close();
    });

    settingsDialog.querySelector('footer[role=toolbar] > button[value=Cancel]')
    .addEventListener('click', event => {
      event.cancelBubble = true;
      this.getDialog().close();
    });

  }

  open(settings){
    this.#settings = settings;
    this.updateDialogFromSettings();
    const dialog = this.getDialog();
    dialog.showModal();
  }

  static synchronize(dialog, settings, settingsOrDialog){
    for (let sectionName in settings) {
      const section = settings[sectionName];
      for (let property in section) {
        const control = byId(property);
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
    let valueProperty = 'value';
    let defaultValueGetter, defaultValueSetter;
    switch (control.type) {
      case 'radio':
      case 'checkbox':
        valueProperty = 'checked';
        break;
      case 'text':
        break;
      case 'number':
        defaultValueGetter = function(control){
          const num = parseFloat(control.value, 10); 
          return isNaN(num) ? undefined : num;
        }
        break;
      default:
        console.error(`Don't know how to get value from INPUT of type ${control.type}, defaulting to "value".`);
        break;
    }

    let value;
    switch (settingsOrDialog){
      case 'settings':
        if (control.validityState && control.valid === false){
          break;
        }
        let valueGetter = control.getAttribute('data-value-getter');
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
        let valueSetter = control.getAttribute('data-value-setter');
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
    let optionsFromSettings;
    switch (settingsOrDialog) {
      case 'settings':
        optionsFromSettings = [];
        const optionsFromControl = control.options;

        let valueGetter = control.getAttribute('data-value-getter');
        if (valueGetter){
          valueGetter = eval(valueGetter);
        }

        for (let i = 0; i < optionsFromControl.length; i++){
          const optionFromControl = optionsFromControl[i];
          let value = optionFromControl.value;
          const label = optionFromControl.label || value;
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
          const value = [];
          for (let i = 0; i < optionsFromControl.length; i++){
            const optionFromControl = optionsFromControl[i];
            const selected = optionFromControl.selected;
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
        optionsFromSettings = settings[property].options;
        const valueFromSettings = settings[property].value;

        let valueSetter = control.getAttribute('data-value-setter');
        if (valueSetter){
          valueSetter = eval(valueSetter);
        }

        control.options.length = 0;
        for (let i = 0; i < optionsFromSettings.length; i++){
          const optionFromSettings = optionsFromSettings[i];
          const value = optionFromSettings.value;
          const label = optionFromSettings.label || value;
          const title = optionFromSettings.title || label;
          const option = createEl('option', {
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
            for (let i = 0; i < control.options.length; i++){
              const optionFromSettings = control.options[i];
              const value = optionFromSettings.value;
              const index = valueFromSettings.indexOf(value);
              const selected = index !== -1;
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