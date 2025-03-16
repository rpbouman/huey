class DatasourceSettings extends SettingsBase {

  static #reader_settings = {
    'read_csv': 'csvReader',
    'read_json': 'jsonReader',
    'read_json_auto': 'jsonReader',
    'read_parquet': 'parquetReader',
    'read_xlsx': 'xlsxReader'
  };

  static #template = {
    "csvReader": {
      "csvReaderAutoDetect": true,
      "csvReaderSampleSize": 20480,
      "csvReaderSkip": 0,
      "csvReaderMaxLineSize": 2097152,
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
      "csvReaderDelim": ",",
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
    },
    "jsonReader": {
      "jsonReaderFormat": {
        "options": [
          {"value": "auto", "label": "Automatic", "title": "Automatic" },
          {"value": "unstructured", "label": "Unstructured", "title": "Unstructured" },
          {"value": "newline_delimited", "label": "Newline delimited", "title": "Delimited by newlines" },
          {"value": "array", "label": "Array", "title": "Array" },
        ],
        "value": "auto"
      },
      "jsonReaderMaximumObjectSize": 16777216,
      "jsonReaderAutoDetect": true,
      "jsonReaderDateFormat": "iso",
      "jsonReaderMaximumDepth": -1,
      "jsonReaderRecords": {
        "options": [
          {"value": "auto", "label": "Automatic", "title": "Automatic" },
          {"value": "true", "label": "True", "title": "True" },
          {"value": "false", "label": "False", "title": "False" },
        ]
      },
      "jsonReaderSampleSize": 20480,
      "jsonReaderTimestampformat": "iso",
      "jsonReaderUnionByName": true,
      "jsonReaderMapInferenceThreshold": 200,
      "jsonReaderFieldAppearanceThreshold": 0.1
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

  getReaderArguments(readerKey){
    
    if (DatasourceSettings.#reader_settings[readerKey] !== undefined) {
      readerKey = DatasourceSettings.#reader_settings[readerKey];
    }
    
    var readerArguments = {};
    var readerSettings = this.getSettings(readerKey);
    var templateSettings = DatasourceSettings.#template[readerKey];
    for (var settingKey in readerSettings){
      var value = readerSettings[settingKey];
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
        var argumentName = DatasourceSettings.#getDuckDbReaderArgumentName(readerKey, settingKey);
        readerArguments[argumentName] = value;
      }
    }
    return readerArguments;
  }

  static getReaderArgumentsSql(readerArguments){
    return Object.keys(readerArguments).map(function(argumentName){
      var argumentValue = readerArguments[argumentName];
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