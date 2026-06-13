class AttachParser extends SpecialPurposeParser {

  static #attachRe = /\s*attach/yi;
  static #matchAttach(slice, position){
    AttachParser.#attachRe.lastIndex = 0;
    const match = AttachParser.#attachRe.exec(slice);
    if (!match){
      SpecialPurposeParser.throwParsingError('"ATTACH"', position);
    }
    return match;
  }

  static #databaseNameRe = new RegExp(`(?<name>${SpecialPurposeParser.nameRe.source})`, 'i');
  static #matchDatabaseName(slice, position){
    AttachParser.#databaseNameRe.lastIndex = 0;
    const match = AttachParser.#databaseNameRe.exec(slice);
    if (!match){
      SpecialPurposeParser.throwParsingError('identifier', position);
    }
    return match;
  }

  static #urlRe = `(?<url>${SpecialPurposeParser.stringValueRe.source})`;
  static #matchUrl(slice, position) {
    AttachParser.#urlRe.lastIndex = 0;
    const match = AttachParser.#urlRe.exec(slice);
    if (!match){
      SpecialPurposeParser.throwParsingError('identifier', position);
    }
    return match;
  }

  static #asRe = /\s*as\s*/yi;
  static #matchAs(slice, position){
    AttachParser.#asRe.lastIndex = 0;
    const match = AttachParser.#asRe.exec(slice);
    if (!match){
      SpecialPurposeParser.throwParsingError('"AS"', position);
    }
    return match;
  }

  static parse(attachSql) {
    const attachDocument = {};
    let match, slice = attachSql, position = 0;

    match = AttachParser.#matchAttach(slice, position);

    position += match[0].length;
    slice = slice.slice(match[0].length);
    match = SpecialPurposeParser.matchIfNotExists(slice);
    if (match){
      position += match[0].length;
      slice = slice.slice(match[0].length);
    }
    
    match = SpecialPurposeParser.matchMandatoryWhitespace(slice, position);
    position += match[0].length;
    slice = slice.slice(match[0].length);

    match = AttachParser.#matchUrl(slice, position);
    let url = unQuoteStringLiteral( match.groups.url );
    attachDocument.url = url;

    match = AttachParser.#matchAs(slice, position);
    position += match[0].length;
    slice = slice.slice(match[0].length);

    // parse the database name
    match = AttachParser.#matchDatabaseName(slice, position);
    let name = match.groups.name;
    if (isQuotedIdentifier(name)){
      name = unQuoteIdentifier(name);
    }
    attachDocument.name = name;
    
    const result = SpecialPurposeParser.matchFields(slice, position);
    attachDocument.fields = result.fields;
    attachDocument.fields = attachDocument.fields.filter(field => {
      if (SpecialPurposeParser.typeRe.test(field.key)){
        const type = field.value;        
        attachDocument.type = type;
        return false;
      }
      return true;
    });
    slice = result.slice;
    position = result.position;

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
    
    return attachDocument;
  }

}