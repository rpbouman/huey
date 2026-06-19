class SpecialPurposeParser {

  static throwParsingError(expected, position){
    throw new Error(`Parsing Error: expected ${expected} at position ${position}.`);
  }
  
  static ifNotExistsRe = /(?:\s+if\s+not\s+exists)?/yi;
  static matchIfNotExists(slice){
    SpecialPurposeParser.ifNotExistsRe.lastIndex = 0;
    const match = SpecialPurposeParser.ifNotExistsRe.exec(slice);
    return match;
  }

  static mandatoryWhitespaceRe = /\s+/yi;
  static matchMandatoryWhitespace(slice, position){
    SpecialPurposeParser.mandatoryWhitespaceRe.lastIndex= 0;
    const match = SpecialPurposeParser.mandatoryWhitespaceRe.exec(slice);
    if (!match){
      SpecialPurposeParser.throwParsingError('whitespace', position);
    }
    return match;
  }

  static nameRe = /[A-Za-z]([\-_A-Za-z0-9]*[A-Za-z0-9])?|"[A-Za-z]([\-_A-Za-z0-9]*[A-Za-z0-9])?"/;
  
  static lParenRe = /\s*\(\s*/;
  static matchLParen(slice, position){
    SpecialPurposeParser.lParenRe.lastIndex = 0;
    const match = SpecialPurposeParser.lParenRe.exec(slice);
    if (!match){
      SpecialPurposeParser.throwParsingError('"("', position);
    }
    return match;
  }

  static rParenRe = /\s*\)\s*/;
  static matchRParen(slice, position){
    SpecialPurposeParser.rParenRe.lastIndex = 0;
    const match = SpecialPurposeParser.rParenRe.exec(slice);
    if (!match){
      SpecialPurposeParser.throwParsingError('")"', position);
    }
    return match;
  }

  static typeRe = /\btype\b/iy;

  static typeSpecRe = RegXpChef.compile(
    SpecialPurposeParser.typeRe,
    SpecialPurposeParser.mandatoryWhitespaceRe,
    new RegExp(`(?<type>${SpecialPurposeParser.nameRe.source})`, 'i')
  );
  static matchTypeSpec(slice, position){
    SpecialPurposeParser.typeSpecRe.lastIndex = 0;
    const match = SpecialPurposeParser.typeSpecRe.exec(slice);
    if (!match){
      SpecialPurposeParser.throwParsingError('TYPE-clause', position);
    }
    return match;
  }

  static terminatorRe = /\s*;\s*/yi;
  static matchTerminator(slice){
    SpecialPurposeParser.terminatorRe.lastIndex = 0;
    const match = SpecialPurposeParser.terminatorRe.exec(slice);
    return match;
  }

  static stringValueRe = RegXpChef.compile({
    $begin: '\'',
    $end: '\'',
    $escape: '\''
  });

  static arrayValueRe = new RegExp(`(?<arrayvalue>\\[(?:\\s*${SpecialPurposeParser.stringValueRe.source}(\\s*,\\s*${SpecialPurposeParser.stringValueRe.source})*\\s*)?\\])`);
  static mapEntryRe = new RegExp(`${SpecialPurposeParser.stringValueRe.source}\\s*:\\s*${SpecialPurposeParser.stringValueRe.source}`);
  static mapValueRe = new RegExp(`MAP\\s*(?<mapvalue>\\{\\s*(${SpecialPurposeParser.mapEntryRe.source}(\\s*,\\s*${SpecialPurposeParser.mapEntryRe.source})*)?\\s*\\})`, 'i');
  static booleanValueRe = /true|false/i;
  static fieldValueRe = RegXpChef.compile({
    map: SpecialPurposeParser.mapValueRe,
    string: SpecialPurposeParser.stringValueRe,
    bool: SpecialPurposeParser.booleanValueRe,
    identifier: SpecialPurposeParser.nameRe,
    array: SpecialPurposeParser.arrayValueRe
  });

  static commaRe = /\s*,\s*/;
  static matchComma(slice, position){
    SpecialPurposeParser.commaRe.lastIndex = 0;
    const match = SpecialPurposeParser.commaRe.exec(slice);
    return match;
  }

  static fieldRe = RegXpChef.compile(
    new RegExp(`(?<field>${SpecialPurposeParser.nameRe.source})`),
    SpecialPurposeParser.mandatoryWhitespaceRe,
    SpecialPurposeParser.fieldValueRe
  );
  static matchField(slice, fields){
    SpecialPurposeParser.fieldRe.lastIndex = 0;
    const match = SpecialPurposeParser.fieldRe.exec(slice);
    if (!match) {
      return match;
    }
    const key = match.groups.field;
    let dataType = undefined;
    let value = undefined;
    if (match.groups.map){
      dataType = 'map';
      value = eval(`(${match.groups.mapvalue})`);
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

    fields.push({
      key: key,
      type: dataType,
      value: value
    });
    return match;
  }
  
  static matchFields(slice, position){
    const fields = [];
    let match;
    do {
      match = SpecialPurposeParser.matchField(slice, fields);
      if (match) {
        position += match[0].length;
        slice = slice.slice(match[0].length);
        match = SpecialPurposeParser.matchComma(slice);
        if (match) {
          position += match[0].length;
          slice = slice.slice(match[0].length);
        }
      }
    } while(match);
    return {
      slice,
      position,
      fields
    };
  }
}
