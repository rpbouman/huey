function getQuotedIdentifier(identifier){
  return `"${identifier}"`;
}

function getQualifiedIdentifier(){
  var identifiers = [];
  switch (arguments.length) {
    case 0:
      throw new Error(`Invalid number of arguments.`);
    case 1:
      var arg = arguments[0];
      switch (typeof arg) {
        case 'string':
          return getQualifiedIdentifier([arg]);
        case 'object':
          if (arg instanceof Array) {
            if (arg.length) {
              return arg
              .filter(function(element){
                return String(element) === element;
              })
              .map(function(element){
                if (!element.startsWith('"') && !element.endsWith('"')){
                  return getQualifiedIdentifier(element);
                }
                return element;
              })
              .join('.');
            }
            else {
              return undefined;
            }
          }
      }
      break;
    default:
      args = [];
      for (var i = 0; i < arguments.length; i++){
        var identifier = arguments[i];
        if (!identifier.startsWith('"') && !identifier.endsWith('"')){
          identifier = getQuotedIdentifier(identifier);
        }
        identifiers.push(identifier);
      }
      return getQualifiedIdentifier(args);
  }
  throw new Error(`Invalid arguments`);
}

