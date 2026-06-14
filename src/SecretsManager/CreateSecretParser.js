class CreateSecretParser extends SpecialPurposeParser {

  static #createRe = /\s*create/yi;
  static #matchCreate(slice, position){
    CreateSecretParser.#createRe.lastIndex = 0;
    const match = CreateSecretParser.#createRe.exec(slice);
    if (!match){
      SpecialPurposeParser.throwParsingError('"CREATE"', position);
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
      SpecialPurposeParser.throwParsingError('"SECRET"', position);
    }
    return match;
  }

  static #secretNameRe = new RegExp(`(?<name>${SpecialPurposeParser.nameRe.source})`, 'i');
  static #matchSecretName(slice, position){
    CreateSecretParser.#secretNameRe.lastIndex = 0;
    const match = CreateSecretParser.#secretNameRe.exec(slice);
    if (!match){
      SpecialPurposeParser.throwParsingError('identifier', position);
    }
    return match;
  }

  static parse(createSecretSql) {
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
    match = SpecialPurposeParser.matchIfNotExists(slice);

    if (match) {
      position += match[0].length;
      slice = slice.slice(match[0].length);
    }

    match = SpecialPurposeParser.matchMandatoryWhitespace(slice, position);
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
    match = SpecialPurposeParser.matchLParen(slice, position);

    position += match[0].length;
    slice = slice.slice(match[0].length);

    // parse the secret type
    match = SpecialPurposeParser.matchTypeSpec(slice, position);
    let type = match.groups.type;
    if (isQuotedIdentifier(type)){
      type = unQuoteIdentifier(type);
    }
    secretDocument.type = type;

    position += match[0].length;
    slice = slice.slice(match[0].length);
    
    match = SpecialPurposeParser.matchComma(slice);
    if (match) {
      position += match[0].length;
      slice = slice.slice(match[0].length);

      const result = SpecialPurposeParser.matchFields(slice, position);
      
      secretDocument.fields = result.fields;
      slice = result.slice;
      position = result.position;
    }
    match = SpecialPurposeParser.matchRParen(slice, position);
    position += match[0].length;
    slice = slice.slice(match[0].length);

    match = SpecialPurposeParser.matchTerminator(slice);
    if (match) {
      position += match[0].length;
      slice = slice.slice(match[0].length);
    }

    if (slice.length) {
      match = SpecialPurposeParser.throwParsingError('no content', position);
    }

    return secretDocument;
  }

}