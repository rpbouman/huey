function getCsv(data, options) {
  options = options || {};
  const lineSeparator = options.lineSeparator || '\n';
  const fieldSeparator = options.fieldSeparator || '\t';
  const quoteChar = options.quoteChar || '"';
  const escapeChar = options.escapeChar || quoteChar;
  
  return data.map(line => {
    return line.map(value => {
      switch (typeof value) {
        case 'string':
          if (
            value.includes(fieldSeparator) || 
            value.includes(lineSeparator) || 
            value.includes(quoteChar)
          ){
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

function getSearchParams(urlStringOrLocationObject){
  
  urlStringOrLocationObject = urlStringOrLocationObject || window.location;
  
  if (urlStringOrLocationObject && urlStringOrLocationObject.href){
    urlStringOrLocationObject = urlStringOrLocationObject.href;
  }
  
  const params = {};
  if (typeof urlStringOrLocationObject === 'string'){
    const searchParams = (new URL(urlStringOrLocationObject)).searchParams;
    for (const key of new Set(searchParams.keys())) {
      const values = searchParams.getAll(key);
      params[key] = values.length === 1 ? values[0] : values;
    }
  }
  return params;
}
