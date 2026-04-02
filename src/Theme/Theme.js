class Theme {

  static #variablePrefix = '--huey-';

  static #getRootStyle(){
    return document.querySelector(':root').style;
  }

  static #setCssVariable(variableName, variableValue){
    var style = Theme.#getRootStyle();
    style.setProperty(variableName, variableValue);
  }
  
  static #setCssVariables(themeVariables) {
    for (var property in themeVariables){ 
      if (!property.startsWith(Theme.#variablePrefix)){
        continue;
      }
      Theme.#setCssVariable(property, themeVariables[property]);
    }
  }

  static getAllThemeCSSVariables(){
    var variables = {};
    var rootStyle = this.#getRootStyle();
    for (var property in rootStyle){ 
      if (!property.startsWith(Theme.#variablePrefix)){
        continue;
      }
      variables[property] = rootStyle[property];
    }
    return variables;
  }

  static applyTheme(themeId){
    var theme = settings.getSettings(['themeSettings', 'themes', 'options', themeId]);
    var themeVariables = theme.value;
    Theme.#setCssVariables(themeVariables);
  }
  
  static updateCssVariable(control){
    var id = control.id;
    var previousIndex = 0;
    var variableName = id.split('').reduce(function(acc, curr){
      var lowerCase = curr.toLowerCase();
      if (curr !== lowerCase){
        acc.push('');
      }
      acc[acc.length - 1] += lowerCase;
      return acc;
    }, [Theme.#variablePrefix]).join('-');
    
    Theme.#setCssVariable(variableName, control.value);
  }
    
  static {
    var themeVariables = settings.getSettings(['themeSettings', 'themes', 'value']);
    Theme.#setCssVariables(themeVariables);
  }
  
}

settings.addEventListener('change', function(event){
  var themes = byId('themes');
  Theme.applyTheme( themes.selectedIndex );  
});



