function byId(id){
  return document.getElementById(id);
}

function createEl(tagName, attributes, content){
  const el = document.createElement(tagName);
  if (content) {
    switch (typeof content){
      case 'string':
        el.innerHTML = content;
        break;
    }
  }
  if (!attributes){
    return el;
  }
  setAttributes(el, attributes);
  return el;
}

function instantiateTemplate(templateId, idOrAttributes) {
  const template = byId(templateId);
  const clone = template.content.cloneNode(true);
  let index = 0, node;
  do {
    node = clone.childNodes.item(index++);
  } while (node && node.nodeType !== node.ELEMENT_NODE);
    
  const typeOfIdOrAttributes = typeof idOrAttributes;
  switch (typeOfIdOrAttributes) {
    case 'undefined':
      break;
    case 'string':
      node.setAttribute('id', idOrAttributes);
      break;
    case 'object':
      setAttributes(node, idOrAttributes);
      break;
    default:
      throw new Error(`Expected string id or attributes object, not ${typeOfIdOrAttributes}`);
  }
  return node;
}

function setAttribute(dom, attName, attValue){
  switch (attName) {
    case 'style':
      setStyle(dom, attValue);
      return;
    case 'class':
      setClass(dom, attValue);
      return;
    default:
  }    
  dom.setAttribute(attName, attValue);
}

function setStyle(dom, styleValue){
  switch (typeof styleValue){
    case 'undefined':
    case 'object':
      if (styleValue === null || styleValue === undefined){
        styleValue = '';
      }
      else {
        styleValue = Object.keys(styleValue).reduce(function(acc, curr){
          if (!acc) {
            acc = '';
          }
          else {
            acc += '\n';
          }
          acc += `${curr}: ${styleValue[curr]};`;
          return acc;
        });
      }
    case 'string':
      break;
    default:
      throw new Error(`Invalid value for style`);
  }
  dom.setAttribute('style', styleValue);
}

function setClass(dom, classNames){
  switch (typeof classNames) {
    case 'undefined':
    case 'object':
      if (classNames === null || classNames === undefined) {
        classNames = '';
      }
      else
      if (classNames instanceof Array) {
        classNames = classNames.join(' ');
      }
    case 'string':
      break;
  }
  dom.className = classNames;
}

function setAttributes(dom, attributes){
  for (let attName in attributes) {
    const attValue = attributes[attName];
    setAttribute(dom, attName, attValue);
  }
}

function getClassNames(dom){
  const className = dom.className;
  if (!className) {
    return undefined;
  }
  const classNames = className.split(/\s+/);
  return classNames.length ? classNames : undefined;
}

function hasClass(dom, classNames, allOrSome){
  if (typeof classNames === 'string'){
    classNames = [classNames];
  }
  if (! (classNames instanceof Array) ) {
    throw new Error(`Invalid classname argument`);
  }
  const domClassNames = getClassNames(dom);
  if (domClassNames === undefined) {
    return false;
  }
  let noMatch;
  for (let i = 0; i < classNames.length; i++){
    noMatch = domClassNames.indexOf(classNames[i]) === -1;
    
    if (allOrSome && noMatch) {
      return false;
    }
    else 
    if (!allOrSome && !noMatch){
      return true;
    }
  }
  return !noMatch;
}

function replaceClass(dom, oldClass, newClass){
  const classNames = getClassNames(dom);
  const indexOfOldClass = classNames.indexOf(oldClass);
  if (indexOfOldClass === -1){
    return;
  }
  const args = [indexOfOldClass, 1];
  if (classNames.indexOf(newClass) === -1) {
    args.push(newClass);
  }
  Array.prototype.splice.apply(classNames, args);
  dom.className = classNames.join(' ');
}

function getAncestorWithTagName(dom, tagName, includeSelf){
  if (!dom) {
    return undefined;
  }
  
  if (includeSelf === undefined) {
    includeSelf = true;
  }

  tagName = tagName.toUpperCase();
  let node = includeSelf ? dom : dom.parentNode;
  while(isEl(node)) {
    if (node.tagName === tagName){
      return node;
    }
    node = node.parentNode;
  }    
  return undefined;
}

function getAncestorWithClassName(dom, classNames, allOrSome, includeSelf){
  if (!dom) {
    return undefined;
  }
  
  if (includeSelf === undefined) {
    includeSelf = true;
  }
  
  let node = includeSelf ? dom : dom.parentNode;
  while(isEl(node)) {
    if (hasClass(node, classNames, allOrSome)){
      return node;
    }
    node = node.parentNode;
  }    
  return undefined;
}

function getAncestorWithAttributeValue(dom, attributeName, attributeValue, includeSelf){
  if (!dom) {
    return undefined;
  }
  
  if (includeSelf === undefined) {
    includeSelf = true;
  }
  
  let node = includeSelf ? dom : dom.parentNode;
  while(isEl(node)) {
    const value = node.getAttribute(attributeName);
    if (value === attributeValue) {
      return node;
    }
    node = node.parentNode;
  }    
  return undefined;
}

function isEl(node){
  return node && node.nodeType === 1;
}

function getChildWithClassName(dom, className){
  const childNodes = dom.childNodes;
  for (let i = 0; i < childNodes.length; i++){
    const childNode = childNodes.item(i);
    if (!isEl(childNode)) {
      continue;
    }
    if (hasClass(childNode,className)){
      return childNode;
    }
  }
  return undefined;
  //throw new Error(`Couldn't find element with classname ${className}`);
}

function escapeHtmlText(text){
  return text.replace(/[&<>]/g, function(match){
    switch(match) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;'
      default:
        return match;
    }
  });
}