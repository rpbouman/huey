function byId(id){
  return document.getElementById(id);
}

function createEl(tagName, attributes, content){
  var el = document.createElement(tagName);
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
  for (var attName in attributes) {
    var attValue = attributes[attName];
    setAttribute(dom, attName, attValue);
  }
}

function getClassNames(dom){
  var className = dom.className;
  if (!className) {
    return undefined;
  }
  var classNames = className.split(/\s+/);
  return classNames.length ? classNames : undefined;
}

function hasClass(dom, classNames, allOrSome){
  if (typeof classNames === 'string'){
    classNames = [classNames];
  }
  if (! (classNames instanceof Array) ) {
    throw new Error(`Invalid classname argument`);
  }
  var domClassNames = getClassNames(dom);
  for (var i = 0; i < classNames.length; i++){
    var noMatch = domClassNames.indexOf(classNames[i]) === -1;
    
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
  var classNames = getClassNames(dom);
  var indexOfOldClass = classNames.indexOf(oldClass);
  if (indexOfOldClass === -1){
    return;
  }
  var args = [indexOfOldClass, 1];
  if (classNames.indexOf(newClass) === -1) {
    args.push(newClass);
  }
  Array.prototype.splice.apply(classNames, args);
  dom.className = classNames.join(' ');
}

function getClassNames(el){
  var className = el.className;
  var classNames = className.split(/\s+/);
  return classNames;
}
