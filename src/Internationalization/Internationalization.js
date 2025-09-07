class Internationalization {
  
  static #texts;
  static #languageIndex = undefined;
  static #hueyNativeLanguage = 'en';
  static #currentLocale = undefined;
  
  static #translateableAttributes = [
    'alt',
    'placeholder',
    'title', 
    'aria-braillelabel',
    'aria-brailleroledescription',
    'aria-description',
    'aria-label', 
    'aria-placeholder',
    'aria-roledescription',
    'aria-valuenow',
    'aria-valuetext'
  ];
  
  static {
    document.addEventListener('DOMContentLoaded', Internationalization.#init);
    window.addEventListener('languagechange', Internationalization.#languageChanged)
  }
    
  static #init(event){
    if (Internationalization.#currentLocale === undefined){
      Internationalization.#setCurrentLocale(Internationalization.#hueyNativeLanguage);
    }
    var languages = navigator.languages;
    Internationalization.#loadTexts();
  }
  
  static #setCurrentLocale(localeName){
    var locale = new Intl.Locale(localeName);
    Internationalization.#currentLocale = locale;
    document.documentElement.setAttribute('lang', Internationalization.getCurrentLanguage());
  }

  static getCurrentLanguage(){
    return Internationalization.#currentLocale.language;
  }

  static #languageChanged(event){
    console.log('Language change occurred, re-initializing Internationalization.');
    Internationalization.#languageIndex = undefined;
    Internationalization.#texts = {};
    Internationalization.#init();
  }
  
  static #getScriptElement(){
    var elementName = 'script';
    var elementId = 'InterationalizationTexts';
    var scripElement = document.querySelector(`${elementName}#${elementId}`);
    if (!scripElement){
      scripElement = document.createElement(elementName);
      scripElement.setAttribute('id', elementId);
      document.body.appendChild(scripElement);
      scripElement.addEventListener('load', Internationalization.textsLoaded);
    }
    return scripElement;
  }
  
  static #loadTexts(){
    if (Internationalization.#languageIndex === undefined) {
      Internationalization.#languageIndex = 0;
    }
    var languages = navigator.languages;
    if (Internationalization.#languageIndex >= languages.length){
      console.log(`Internationalization: No more languages to attempt.`);
    }
    var language = languages[ Internationalization.#languageIndex++ ];
    if (language === Internationalization.#hueyNativeLanguage){
      console.log(`No need to load Internationalization texts for Huey native language "${Internationalization.#hueyNativeLanguage}".`);
      Internationalization.#applyTexts(true);
      Internationalization.#setCurrentLocale(language);
      return;
    }
    
    var url = `Internationalization/i18n/${language}.js`;
    console.log(`Attempt to load Internationzalization texts from "${url}"`);    
    var scriptElement = Internationalization.#getScriptElement();
    scriptElement.src = url;
  }
  
  static textsLoaded(event){
    var scriptElement = event.target;
    var message = `Attempt to load Internationzalization texts from "${scriptElement.src}"`;
    if (Internationalization.#texts === undefined){
      console.log(message + ' failed.');
      Internationalization.#loadTexts();
    }
    else {
      var src = scriptElement.src;
      var parts = src.split('/');
      var resource = parts.pop();
      parts = resource.split('.');
      var language = parts[0];
      Internationalization.#setCurrentLocale(language);
      console.log(message + ' succeeded.');
      Internationalization.#applyTexts();
    }
  }
  
  static setTexts(texts){
    console.log('setTexts');
    var textObject;
    switch (typeof(texts)){
      case 'object':
        // stringify as safety measure
        texts = JSON.stringify(texts);
        textObject = texts;
      case 'string':
        textObject = JSON.parse(texts);
    }
    Internationalization.#texts = textObject;
    Internationalization.#applyTexts();
  }
    
  static #copyElements(nodeList, elements){
    if (elements === undefined) {
      elements = [];
    }
    for (var i = 0; i < nodeList.length; i++){
      elements.push(nodeList.item(i));
    }
    return elements;
  }    
    
  static #getTextContentElements(){    
    var selector = '*:not( .i18nIgnore ):not( :is(style, script, link) ):not( :has( > * ) ):not( :empty )';
    
    var textContentElements = document.querySelectorAll(selector);
    var elements = Internationalization.#copyElements(textContentElements);
    
    // template elements themselves will be picked up by the selector. 
    // but, their content will not be.
    // so, we need a separate loop to apply the selector on their content
    var templateElements = document.querySelectorAll('template');
    for (var i = 0; i < templateElements.length; i++){
      var templateElement = templateElements.item(i);
      var templateContent = templateElement.content.querySelectorAll(selector);
      Internationalization.#copyElements(templateContent, elements);
    }
    
    return elements;
  }
  
  static #getAttributeElements(){
    var attributeNames = Internationalization.#translateableAttributes;
    var templateElements = document.querySelectorAll('template');
    
    var selection = {};
    for (var i = 0; i < attributeNames.length; i++){
      var attributeName = attributeNames[i];
      var selector = `*:not( .i18nIgnore )[${attributeName}]`;
      var elements = document.querySelectorAll(selector);
      selection[attributeName] = Internationalization.#copyElements(elements);
      
      // also add template content with the attribute.
      for (var j = 0; j < templateElements.length; j++){
        var templateElement = templateElements.item(j);
        var templateContent = templateElement.content.querySelectorAll(selector);
        Internationalization.#copyElements(templateContent, selection[attributeName]);
      }
    }
    return selection;
  }
  
  static #visitAllTexts(callback){
    var textContentElements = Internationalization.#getTextContentElements();
    var i18nNativeAttributeName = 'data-i18n-native-text';
    for (var i = 0; i < textContentElements.length; i++){
      var element = textContentElements[i];
      var key, value;

      if (element.hasAttribute(i18nNativeAttributeName)){
        key = element.getAttribute(i18nNativeAttributeName);
      }
      else {
        key = element.textContent.trim();
        if (key.length === 0){
          continue;
        }
      }
      value = Internationalization.getText(key);
            
      callback({
        element: element,
        i18nNativeAttributeName: i18nNativeAttributeName,
        key: key,
        value: value
      });      
    }
      
    var attributeElements = Internationalization.#getAttributeElements();
    for (var attributeName in attributeElements){
      var elements = attributeElements[attributeName];
      var key, value;
      
      for (var j = 0; j < elements.length; j++){
        var element = elements[j];
        if (!element.hasAttribute(attributeName)){
          continue;
        }
        
        var i18nNativeAttributeName = `data-i18n-native-${attributeName}`;
        if (element.hasAttribute(i18nNativeAttributeName)){
          key = element.getAttribute(i18nNativeAttributeName);
        }
        else {
          key = element.getAttribute(attributeName).trim();
          if (key.length === 0){
            continue;
          }
        }
        value = Internationalization.getText(key);
        callback({
          element: element,
          i18nNativeAttributeName: i18nNativeAttributeName,
          attributeName: attributeName,
          key: key,
          value: value
        });      
      }
    }
  }
  
  static #applyTexts(toNative){
    Internationalization.#visitAllTexts(function(object){
      var element = object.element;
      var key = object.key;
      var value = object.value;
      
      var text = toNative === true ? key : value || object.key;
      var attributeName = object.attributeName;
      if (attributeName){
        element.setAttribute(attributeName, text);
      }
      else {
        element.textContent = text;
      }
      
      var i18nNativeAttributeName = object.i18nNativeAttributeName;
      if (!element.hasAttribute(i18nNativeAttributeName)){
        element.setAttribute(i18nNativeAttributeName, key);
      }
    });
  }
    
  static getTextsTemplate(){
    var allTexts = {};
    
    Internationalization.#visitAllTexts(function(object){
      var element = object.element;
      var key = object.key;
      var value = object.value;
      allTexts[key] = value || null;
    });
    
    return Object.keys(allTexts)
    .sort(function(a, b){
      var A = a.toUpperCase();
      var B = b.toUpperCase();
      if (A > B) {
        return 1;
      }
      else
      if (A < B){
        return -1;
      }
      else
      if (a > b){
        return 1;
      }
      else
      if (a < b){
        return -1;
      }
      return 0;
    }).reduce(function(acc, curr){
      acc[curr] = allTexts[curr];
      return acc;
    },{});
  }
  
  static getText(key){
    var text = Internationalization.getCurrentLanguage() === Internationalization.#hueyNativeLanguage ? key : Internationalization.#texts[key];
    if (text === undefined){
      //console.warn(`Translation for content "${key}" not found`);
      return undefined;
    }
    var args = arguments;
    return text.replace(/\{[1-9]\d*\}/g, function(match){
      var index = match.slice(1, -1);
      index = parseInt(index, 10);
      return args[index];
    });
  }
  
  static setTextContent(element, key){
    var args = [];
    for (var i = 0; i < arguments.length; i++){
      if (i === 0) {
        continue;
      }
      args.push(arguments[i]);
    }
    var i18nNativeAttributeName = 'data-i18n-native-text';
    element.setAttribute(i18nNativeAttributeName, key);
    if (args.length > 1){
      var i18nNativeArgsAttributeName = i18nNativeAttributeName + '-args';
      element.setAttribute(i18nNativeArgsAttributeName, JSON.stringify(args.slice(1)));
    }
    var translatedText = Internationalization.getText.apply(Internationalization, args) || key;
    element.textContent = translatedText;
  }
  
  static setAttributes(element, attributes, key){
    if (typeof attributes === 'string'){
      attributes = [attributes];
    }
    var args = [];
    for (var i = 2; i < arguments.length; i++){
      args.push(arguments[i]);
    }
    
    for (var i = 0; i < attributes.length; i++){
      var attributeName = attributes[i];
      if (Internationalization.#translateableAttributes.indexOf(attributeName) === -1){
        element.setAttribute(attributeName, key);
      }
      var i18nNativeAttributeName = `data-i18n-native-${attributeName}`;
      if (element.hasAttribute(i18nNativeAttributeName)){
      }
      else {
        element.setAttribute(i18nNativeAttributeName, key);
        if (args.length > 1){
          element.setAttribute(i18nNativeAttributeName + '-args', JSON.stringify(args.slice(1)));
        }
      }
      var attributeValue = Internationalization.getText.apply(Internationalization, args) || key;
      element.setAttribute(attributeName, attributeValue);
    }
    
  }
  
}