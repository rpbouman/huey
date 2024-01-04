function getQuotedIdentifier(identifier){
  return `"${identifier.replace(/"/g, '""')}"`;
}

function getQualifiedIdentifier(){
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
                  return getQuotedIdentifier(element);
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
      var args = [];
      for (var i = 0; i < arguments.length; i++){
        var identifier = arguments[i];
        args.push(identifier);
      }
      return getQualifiedIdentifier(args);
  }
  throw new Error(`Invalid arguments`);
}

