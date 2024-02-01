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

/*
Theme editor - put it on ice for now.

              <!-- getComputedStyle(document.body).getPropertyValue('--huey-medium-background-color') -->
              <label for="textFontFamily">Text Font</label>
              <input type="text" id="textFontFamily" value="Verdana" onchange="updateCssVariable(this)"/>
              <label for="monoFontFamily">Monospace Font</label>
              <input type="text" id="monoFontFamily" value="Monospace" onchange="updateCssVariable(this)"/>

              <label for="foregroundColor">Foreground Color</label>
              <input type="color" id="foregroundColor" data-css-var="huey-foreground-color" onchange="updateCssVariable(this)"/>
              <label for="placeholderColor">Placeholder Color</label>
              <input type="color" id="placeholderColor" data-css-var="huey-placeholder-color" onchange="updateCssVariable(this)"/>
              
              <label for="lightBackgroundColor">Light Background Color</label>
              <input type="color" id="lightBackgroundColor" data-css-var="huey-icon-color-subtle" onchange="updateCssVariable(this)"/>
              <label for="mediumBackgroundColor">Medium Background Color</label>
              <input type="color" id="mediumBackgroundColor" onchange="updateCssVariable(this)"/>
              <label for="darkBackgroundColor">Dark Background Color</label>
              <input type="color" id="darkBackgroundColor" onchange="updateCssVariable(this)"/>

              <label for="lightBorderColor">Light Border Color</label>
              <input type="color" id="lightBorderColor" onchange="updateCssVariable(this)"/>
              <label for="darkBorderColor">Dark Border Color</label>
              <input type="color" id="darkBorderColor" onchange="updateCssVariable(this)"/>

              <label for="iconColor">Icon Color</label>
              <input type="color" id="iconColor" onchange="updateCssVariable(this)"/>
              <label for="iconColorSubtle">Icon Color Subtle</label>
              <input type="color" id="iconColorSubtle" onchange="updateCssVariable(this)"/>
              <label for="iconColorHighlight">Icon Color Highlight</label>
              <input type="color" id="iconColorHighlight" onchange="updateCssVariable(this)"/>

*/


