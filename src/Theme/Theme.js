class Theme {

  static #variablePrefix = '--huey-';

  static #getRootStyle(){
    return document.querySelector(':root').style;
  }

  static #setCssVariable(variableName, variableValue){
    const style = Theme.#getRootStyle();
    style.setProperty(variableName, variableValue);
  }

  static #setCssVariables(themeVariables) {
    for (let property in themeVariables){
      if (!property.startsWith(Theme.#variablePrefix)){
        continue;
      }
      Theme.#setCssVariable(property, themeVariables[property]);
    }
  }

  static getAllThemeCSSVariables(){
    const variables = {};
    const rootStyle = this.#getRootStyle();
    for (let property in rootStyle){
      if (!property.startsWith(Theme.#variablePrefix)){
        continue;
      }
      variables[property] = rootStyle[property];
    }
    return variables;
  }

  static applyTheme(themeId){
    const theme = settings.getSettings(['themeSettings', 'themes', 'options', themeId]);
    const themeVariables = theme.value;
    Theme.#setCssVariables(themeVariables);
  }

  static updateCssVariable(control){
    const id = control.id;
    const previousIndex = 0;
    const variableName = id.split('').reduce((acc, curr) => {
      const lowerCase = curr.toLowerCase();
      if (curr !== lowerCase){
        acc.push('');
      }
      acc[acc.length - 1] += lowerCase;
      return acc;
    }, [Theme.#variablePrefix]).join('-');

    Theme.#setCssVariable(variableName, control.value);
  }

  static {
    const themeVariables = settings.getSettings(['themeSettings', 'themes', 'value']);
    Theme.#setCssVariables(themeVariables);
  }
}

settings.addEventListener('change', function(event){
  const themes = byId('themes');
  Theme.applyTheme( themes.selectedIndex );
});



