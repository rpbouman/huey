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
    window.addEventListener('languagechange', event => Internationalization.#languageChanged( event ) )
  }

  static #init(event){
    if (Internationalization.#currentLocale === undefined){
      Internationalization.#setCurrentLocale(Internationalization.#hueyNativeLanguage);
    }
    Internationalization.#loadTexts();
  }

  static #setCurrentLocale(localeName){
    const locale = new Intl.Locale(localeName);
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
    const elementName = 'script';
    const elementId = 'InterationalizationTexts';
    let scripElement = document.querySelector(`${elementName}#${elementId}`);
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
    const languages = navigator.languages;
    if (Internationalization.#languageIndex >= languages.length){
      console.log(`Internationalization: No more languages to attempt.`);
    }
    const language = languages[ Internationalization.#languageIndex++ ];
    if (language === Internationalization.#hueyNativeLanguage){
      console.log(`No need to load Internationalization texts for Huey native language "${Internationalization.#hueyNativeLanguage}".`);
      Internationalization.#applyTexts(true);
      Internationalization.#setCurrentLocale(language);
      return;
    }

    const url = `Internationalization/i18n/${language}.js`;
    console.log(`Attempt to load Internationzalization texts from "${url}"`);
    const scriptElement = Internationalization.#getScriptElement();
    scriptElement.src = url;
  }

  static textsLoaded(event){
    const scriptElement = event.target;
    const message = `Attempt to load Internationzalization texts from "${scriptElement.src}"`;
    if (Internationalization.#texts === undefined){
      console.log(message + ' failed.');
      Internationalization.#loadTexts();
    }
    else {
      const src = scriptElement.src;
      let parts = src.split('/');
      const resource = parts.pop();
      parts = resource.split('.');
      const language = parts[0];
      Internationalization.#setCurrentLocale(language);
      console.log(message + ' succeeded.');
      Internationalization.#applyTexts();
    }
  }

  static setTexts(texts){
    console.log('setTexts');
    let textObject;
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
    for (let i = 0; i < nodeList.length; i++){
      elements.push(nodeList.item(i));
    }
    return elements;
  }

  static #getTextContentElements(){
    const selector = '*:not( [translate=no] ):not( :is(style, script, link) ):not( :has( > * ) ):not( :empty )';
    const textContentElements = document.querySelectorAll(selector);
    const elements = Internationalization.#copyElements(textContentElements);

    // template elements themselves will be picked up by the selector.
    // but, their content will not be.
    // so, we need a separate loop to apply the selector on their content
    const templateElements = document.querySelectorAll('template');
    for (let i = 0; i < templateElements.length; i++){
      const templateElement = templateElements.item(i);
      const templateContent = templateElement.content.querySelectorAll(selector);
      Internationalization.#copyElements(templateContent, elements);
    }

    return elements;
  }

  static #getAttributeElements(){
    const attributeNames = Internationalization.#translateableAttributes;
    const templateElements = document.querySelectorAll('template');

    const selection = {};
    for (let i = 0; i < attributeNames.length; i++){
      const attributeName = attributeNames[i];
      const selector = `*:not( [translate=no] )[${attributeName}]`;
      const elements = document.querySelectorAll(selector);
      selection[attributeName] = Internationalization.#copyElements(elements);

      // also add template content with the attribute.
      for (let j = 0; j < templateElements.length; j++){
        const templateElement = templateElements.item(j);
        const templateContent = templateElement.content.querySelectorAll(selector);
        Internationalization.#copyElements(templateContent, selection[attributeName]);
      }
    }
    return selection;
  }

  static #visitAllTexts(callback){
    const textContentElements = Internationalization.#getTextContentElements();
    const i18nNativeAttributeName = 'data-i18n-native-text';
    for (let i = 0; i < textContentElements.length; i++){
      const element = textContentElements[i];
      let key, value;
      if (element.hasAttribute(i18nNativeAttributeName)){
        key = element.getAttribute(i18nNativeAttributeName);
      }
      else {
        key = element.textContent.trim();
        if (key.length === 0){
          continue;
        }
      }
      let args = [];
      const argsAttribute = element.getAttribute(i18nNativeAttributeName + '-args');
      if (argsAttribute) {
        args = JSON.parse(argsAttribute);
      }
      args.unshift(key);
      value = Internationalization.getText.apply(Internationalization, args);

      callback({
        element: element,
        i18nNativeAttributeName: i18nNativeAttributeName,
        key: key,
        value: value
      });
    }

    const attributeElements = Internationalization.#getAttributeElements();
    for (let attributeName in attributeElements){
      const elements = attributeElements[attributeName];
      let key, value;

      for (let j = 0; j < elements.length; j++){
        const element = elements[j];
        if (!element.hasAttribute(attributeName)){
          continue;
        }

        const i18nNativeAttributeName = `data-i18n-native-${attributeName}`;
        if (element.hasAttribute(i18nNativeAttributeName)){
          key = element.getAttribute(i18nNativeAttributeName);
        }
        else {
          key = element.getAttribute(attributeName).trim();
          if (key.length === 0){
            continue;
          }
        }
        let args = [];
        const argsAttribute = element.getAttribute(i18nNativeAttributeName + '-args');
        if (argsAttribute) {
          args = JSON.parse(argsAttribute);
        }
        args.unshift(key);
        value = Internationalization.getText.apply(Internationalization, args);
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
      const element = object.element;
      const key = object.key;
      const value = object.value;

      const text = toNative === true ? key : value || object.key;
      const attributeName = object.attributeName;
      if (attributeName){
        element.setAttribute(attributeName, text);
      }
      else {
        element.textContent = text;
      }

      const i18nNativeAttributeName = object.i18nNativeAttributeName;
      if (!element.hasAttribute(i18nNativeAttributeName)){
        element.setAttribute(i18nNativeAttributeName, key);
      }
    });
  }

  static getTextsTemplate(){
    const allTexts = {};

    Internationalization.#visitAllTexts(object => {
      const key = object.key;
      const value = object.value;
      allTexts[key] = value || null;
    });

    return Object.keys(allTexts)
    .sort( (a, b) => {
      const A = a.toUpperCase();
      const B = b.toUpperCase();
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
    const text = Internationalization.getCurrentLanguage() === Internationalization.#hueyNativeLanguage ? key : Internationalization.#texts[key];
    if (text === undefined){
      //console.warn(`Translation for content "${key}" not found`);
      return undefined;
    }
    const args = arguments;
    return text.replace(/\{[1-9]\d*\}/g, function(match){
      let index = match.slice(1, -1);
      index = parseInt(index, 10);
      return args[index];
    });
  }

  static setTextContent(element, key){
    const args = [];
    for (let i = 0; i < arguments.length; i++){
      if (i === 0) {
        continue;
      }
      args.push(arguments[i]);
    }
    const i18nNativeAttributeName = 'data-i18n-native-text';
    element.setAttribute(i18nNativeAttributeName, key);
    if (args.length > 1){
      const i18nNativeArgsAttributeName = i18nNativeAttributeName + '-args';
      element.setAttribute(i18nNativeArgsAttributeName, JSON.stringify(args.slice(1)));
    }
    const translatedText = Internationalization.getText.apply(Internationalization, args) || key;
    element.textContent = translatedText;
  }

  static setAttributes(element, attributes, key){
    if (typeof attributes === 'string'){
      attributes = [attributes];
    }
    const args = [];
    for (let i = 2; i < arguments.length; i++){
      args.push(arguments[i]);
    }

    for (let i = 0; i < attributes.length; i++){
      const attributeName = attributes[i];
      if ( !Internationalization.#translateableAttributes.includes(attributeName) ){
        element.setAttribute(attributeName, key);
      }
      const i18nNativeAttributeName = `data-i18n-native-${attributeName}`;
      element.setAttribute(i18nNativeAttributeName, key);
      if (args.length > 1){
        element.setAttribute(i18nNativeAttributeName + '-args', JSON.stringify(args.slice(1)));
      }
      const attributeValue = Internationalization.getText.apply(Internationalization, args) || key;
      element.setAttribute(attributeName, attributeValue);
    }

  }

}