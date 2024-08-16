class DatasourceSettings extends SettingsBase {
  
  static #template = {
    "csvReader": {
      "csvReaderAutoDetect": true,
      "csvReaderSampleSize": "20480",
      "csvReaderSkip": "0",
      "csvReaderMaxLineSize": "2097152",
      "csvReaderAllVarchar": false,
      "csvReaderAutoTypeCandidates": {
        "options": [
          {"value": "BIGINT", "label": "BIGINT"},
          {"value": "BOOLEAN", "label": "BOOLEAN"},
          {"value": "DATE", "label": "DATE"},
          {"value": "FLOAT", "label": "FLOAT"},
          {"value": "DOUBLE", "label": "DOUBLE"},
          {"value": "INTEGER", "label": "INTEGER"},
          {"value": "SMALLINT", "label": "SMALLINT"},
          {"value": "TIME", "label": "TIME"},
          {"value": "TIMESTAMP", "label": "TIMESTAMP"},
          {"value": "TINYINT", "label": "TINYINT"}
        ],
        "value": [
          "BOOLEAN",
          "BIGINT",
          "DOUBLE",
          "TIME",
          "DATE",
          "TIMESTAMP"
        ]
      },
      "csvReaderHeader": false,
      "csvReaderNormalizeNames": false,
      "csvReaderNullPadding": false,
      "csvReaderFileName": false,
      "csvReaderDelim": "",
      "csvReaderNewLine": {
        "options": [
         {"value": "", "label": "(default)", "title": "Use default line separator"},
         {"value": "\r", "label": "CR", "title": "Carriage Return"},
         {"value": "\r\n", "label": "CRLF", "title": "Carriage Return/Linefeed pair"},
         {"value": "\n", "label": "LF", "title": "Linefeed"}
        ],
        "value": ""        
      },
      "csvReaderQuote": "\"",
      "csvReaderEscape": "\"",
      "csvReaderAllowQuotedNulls": true,
      "csvReaderDecimalSeparator": ".",
      "csvReaderDateformat": "",
      "csvReaderTimestampformat": "",
      "csvReaderNullstr": ""
    }
  };
  
  constructor(){
    super();
  }
 
  getTemplate(){
    return Object.assign({}, DatasourceSettings.#template);
  }
  
  static #getDuckDbReaderArgumentName(settingsKey, settingKey){
    if (!settingKey.startsWith(settingsKey)){
      throw new Error(`Settingkey ${settingKey} does not start with settingskey ${settingsKey}`);
    }
    var remainder = settingKey.substr(settingsKey.length);
    var argumentName = remainder.replace(/([A-Z][a-z]+)/g, function(match){
      match = '_' + match.charAt(0).toLowerCase() + match.substring(1);
      return match;
    });
    argumentName = argumentName.substring(1);
    return argumentName;
  }
  
  getCsvReaderArguments(){
    var csvReaderArguments = {};
    var csvReaderKey = 'csvReader'; 
    var csvReaderSettings = this.getSettings(csvReaderKey);
    var templateSettings = DatasourceSettings.#template[csvReaderKey];
    for (var settingKey in csvReaderSettings){
      var value = csvReaderSettings[settingKey];
      var templateValue = templateSettings[settingKey];
      var valueIsDefault;
      switch (typeof(value)){
        case 'object':
          if (value.options){
            value = value.value;
            templateValue = templateValue.value;
            valueIsDefault = [].concat(value).sort().join(',') === [].concat(templateValue).sort().join(',');
          }
          break;
        default:
          valueIsDefault = value === templateValue;
      }
      if (!valueIsDefault) {
        var argumentName = DatasourceSettings.#getDuckDbReaderArgumentName(csvReaderKey, settingKey);
        csvReaderArguments[argumentName] = value;
      }
    }
    return csvReaderArguments;
  }
  
  static getCsvReaderArgumentsSql(csvReaderArguments){
    return Object.keys(csvReaderArguments).map(function(argumentName){
      var argumentValue = csvReaderArguments[argumentName];
      switch (typeof(argumentValue)){
        case 'string':
          argumentValue = quoteStringLiteral(argumentValue);
          break;
        case 'undefined':
          argumentValue = 'NULL';
          break;
        case 'object':
          if (argumentValue === null) {
            argumentValue = 'NULL';
          }
          else
          if (argumentValue instanceof Array) {
            argumentValue = argumentValue.map(function(element){
              return quoteStringLiteral(element);
            });
          }
          argumentValue = `[${argumentValue}]`;
          break;
      }
      return `${argumentName} = ${argumentValue}`;
    }).join(', ');
  }
}