class CreateSecretParser {

  static #throwParsingError(expected, position){
    throw new Error(`Error parsing CREATE SECRET statement: expected ${expected} at position ${position}.`);
  }

  static #createRe = /\s*create/yi;
  static #matchCreate(slice, position){
    CreateSecretParser.#createRe.lastIndex = 0;
    const match = CreateSecretParser.#createRe.exec(slice);
    if (!match){
      CreateSecretParser.#throwParsingError('"CREATE"', position);
    }
    return match;
  }

  static #orReplaceRe = /(?:\s+or\s+replace)?/yi;
  static #matchOrReplace(slice){
    CreateSecretParser.#orReplaceRe.lastIndex = 0;
    const match = CreateSecretParser.#orReplaceRe.exec(slice);
    return match;
  }

  static #persistentTemporaryRe = /(?:\s+(?:persistent|temporary))?/yi;
  static #matchPersistentTemporary(slice){
    CreateSecretParser.#persistentTemporaryRe.lastIndex = 0;
    const match = CreateSecretParser.#persistentTemporaryRe.exec(slice);
    return match;
  }

  static #secretRe = /\s+secret/yi;
  static #matchSecret(slice, position){
    CreateSecretParser.#secretRe.lastIndex = 0;
    const match = CreateSecretParser.#secretRe.exec(slice);
    if (!match){
      CreateSecretParser.#throwParsingError('"SECRET"', position);
    }
    return match;
  }

  static #ifNotExistsRe = /(?:\s+if\s+not\s+exists)?/yi;
  static #matchIfNotExists(slice){
    CreateSecretParser.#ifNotExistsRe.lastIndex = 0;
    const match = CreateSecretParser.#ifNotExistsRe.exec(slice);
    return match;
  }

  static #mandatoryWhitespaceRe = /\s+/yi;
  static #matchMandatoryWhitespace(slice, position){
    CreateSecretParser.#mandatoryWhitespaceRe.lastIndex= 0;
    const match = CreateSecretParser.#mandatoryWhitespaceRe.exec(slice);
    if (!match){
      CreateSecretParser.#throwParsingError('whitespace', position);
    }
    return match;
  }

  static #nameRe = /[A-Za-z]([\-_A-Za-z0-9]*[A-Za-z0-9])?|"[A-Za-z]([\-_A-Za-z0-9]*[A-Za-z0-9])?"/;

  static #secretNameRe = new RegExp(`(?<name>${CreateSecretParser.#nameRe.source})`, 'i');
  static #matchSecretName(slice, position){
    CreateSecretParser.#secretNameRe.lastIndex = 0;
    const match = CreateSecretParser.#secretNameRe.exec(slice);
    if (!match){
      CreateSecretParser.#throwParsingError('identifier', position);
    }
    return match;
  }

  static #lParenRe = /\s*\(\s*/;
  static #matchLParen(slice, position){
    CreateSecretParser.#lParenRe.lastIndex = 0;
    const match = CreateSecretParser.#lParenRe.exec(slice);
    if (!match){
      CreateSecretParser.#throwParsingError('"("', position);
    }
    return match;
  }

  static #rParenRe = /\s*\)\s*/;
  static #matchRParen(slice, position){
    CreateSecretParser.#rParenRe.lastIndex = 0;
    const match = CreateSecretParser.#rParenRe.exec(slice);
    if (!match){
      CreateSecretParser.#throwParsingError('")"', position);
    }
    return match;
  }

  static #terminatorRe = /\s*;\s*/yi;
  static #matchTerminator(slice){
    CreateSecretParser.#terminatorRe.lastIndex = 0;
    const match = CreateSecretParser.#terminatorRe.exec(slice);
    return match;
  }

  static #typeRe = RegXpChef.compile(
    /type/i,
    CreateSecretParser.#mandatoryWhitespaceRe,
    new RegExp(`(?<type>${CreateSecretParser.#nameRe.source})`, 'i')
  );
  static #matchType(slice, position){
    CreateSecretParser.#typeRe.lastIndex = 0;
    const match = CreateSecretParser.#typeRe.exec(slice);
    if (!match){
      CreateSecretParser.#throwParsingError('TYPE-clause', position);
    }
    return match;
  }

  static #stringValueRe = RegXpChef.compile({
    $begin: '\'',
    $end: '\'',
    $escape: '\''
  });

  static #arrayValueRe = new RegExp(`(?<arrayvalue>\\[(?:\\s*${CreateSecretParser.#stringValueRe.source}(\\s*,\\s*${CreateSecretParser.#stringValueRe.source})*\\s*)?\\])`);
  static #mapEntryRe = new RegExp(`${CreateSecretParser.#stringValueRe.source}\s*:\s*${CreateSecretParser.#stringValueRe.source}`);
  static #mapValueRe = new RegExp(`MAP\\s*(?<mapvalue>\\{\\s*(${CreateSecretParser.#mapEntryRe.source}(\\s*,\\s*${CreateSecretParser.#mapEntryRe.source})*)?\\s*\\})`, 'i');
  static #booleanValueRe = /true|false/i;
  static #fieldValueRe = RegXpChef.compile({
    map: CreateSecretParser.#mapValueRe,
    string: CreateSecretParser.#stringValueRe,
    bool: CreateSecretParser.#booleanValueRe,
    identifier: CreateSecretParser.#nameRe,
    array: CreateSecretParser.#arrayValueRe
  });

  static #fieldRe = RegXpChef.compile(
    /\s*,\s*/,
    new RegExp(`(?<field>${CreateSecretParser.#nameRe.source})`),
    CreateSecretParser.#mandatoryWhitespaceRe,
    CreateSecretParser.#fieldValueRe
  );
  static #matchField(slice, fields){
    CreateSecretParser.#fieldRe.lastIndex = 0;
    const match = CreateSecretParser.#fieldRe.exec(slice);
    if (!match) {
      return match;
    }
    const key = match.groups.field;
    let dataType = undefined;
    let value = undefined;
    if (match.groups.map){
      dataType = 'map';
      value = eval(match.groups.mapvalue);
    }
    else
    if (match.groups.array){
      dataType = 'list';
      value = JSON.parse(match.groups.arrayvalue);
    }
    else
    if (match.groups.bool){
      dataType = 'checkbox';
      value = JSON.parse(match.groups.bool);
    }
    else
    if (match.groups.string){
      dataType = 'text';
      value = eval(match.groups.string);
    }
    else
    if (match.groups.identifier){
      dataType = 'text';
      value = match.groups.identifier;
    }

    if (dataType === undefined || dataType === 'text'){
      const defaultDataType = SecretsDialog.getDefaultDataypeForSecretKey(key);
      dataType = defaultDataType;
    }
    fields.push({
      key: key,
      type: dataType,
      value: value
    });
    return match;
  }

  static parseCreateSecretSQL(createSecretSql) {
    const secretDocument = {};
    let match, slice = createSecretSql, position = 0;

    match = CreateSecretParser.#matchCreate(slice, position);

    position += match[0].length;
    slice = slice.slice(match[0].length);
    match = CreateSecretParser.#matchOrReplace(slice);
    if (match){
      position += match[0].length;
      slice = slice.slice(match[0].length);
    }

    match = CreateSecretParser.#matchPersistentTemporary(slice);
    if (match){
      position += match[0].length;
      slice = slice.slice(match[0].length);
    }

    match = CreateSecretParser.#matchSecret(slice, position);

    position += match[0].length;
    slice = slice.slice(match[0].length);
    match = CreateSecretParser.#matchIfNotExists(slice);

    if (match) {
      position += match[0].length;
      slice = slice.slice(match[0].length);
    }

    match = CreateSecretParser.#matchMandatoryWhitespace(slice, position);
    position += match[0].length;
    slice = slice.slice(match[0].length);

    // parse the secret name
    match = CreateSecretParser.#matchSecretName(slice, position);
    let name = match.groups.name;
    if (isQuotedIdentifier(name)){
      name = unQuoteIdentifier(name);
    }
    secretDocument.name = name;

    position += match[0].length;
    slice = slice.slice(match[0].length);
    match = CreateSecretParser.#matchLParen(slice, position);

    position += match[0].length;
    slice = slice.slice(match[0].length);

    // parse the secret type
    match = CreateSecretParser.#matchType(slice, position);
    let type = match.groups.type;
    if (isQuotedIdentifier(type)){
      type = unQuoteIdentifier(type);
    }
    secretDocument.type = type;

    position += match[0].length;
    slice = slice.slice(match[0].length);

    const fields = [];
    secretDocument.fields = fields;
    do {
      match = CreateSecretParser.#matchField(slice, fields);
      if (match) {
        position += match[0].length;
        slice = slice.slice(match[0].length);
      }
    } while(match);

    match = CreateSecretParser.#matchRParen(slice, position);

    position += match[0].length;
    slice = slice.slice(match[0].length);

    match = CreateSecretParser.#matchTerminator(slice);
    if (match) {
      position += match[0].length;
      slice = slice.slice(match[0].length);
    }

    if (slice.length) {
      match = CreateSecretParser.#throwParsingError('no content', position);
    }

    return secretDocument;
  }

}