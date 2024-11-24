function getCsv(data, options) {
  options = options || {};
  var lineSeparator = options.lineSeparator || '\n';
  var fieldSeparator = options.fieldSeparator || '\t';
  var quoteChar = options.quoteChar || '"';
  var escapeChar = options.escapeChar || quoteChar;
  
  return data.map(function(line){
    return line.map(function(value){
      switch (typeof value) {
        case 'string':
          if (value.indexOf(fieldSeparator) !== -1 || value.indexOf(lineSeparator) !== -1 || value.indexOf(quoteChar) !== -1){
            value = value.replaceAll(escapeChar, escapeChar + escapeChar);
            if (quoteChar !== escapeChar) {
              value = value.replaceAll(quoteChar, escapeChar + quoteChar);
            }
            value = `${quoteChar}${value}${quoteChar}`;
          }
          break;
        default:
      }
      
      return value;
    }).join(fieldSeparator);
  }).join(lineSeparator);
}
