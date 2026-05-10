class RegXpChef {

  static #allowedLocalFlags = 'mis';
    
  static #needWrap(source, forQuantifier){
    const groups = {
      '[': ']',
      '{': '}',
      '(': ')',
    };
    let open, close, skip, level = 0, numElements = 0;
    for (const ch of source){
      if (forQuantifier && numElements > 1) return true;
      if (skip){
        skip = false;
        if (!open) numElements++;
        continue;
      }
      if (ch === '\\'){
        skip = true;
        continue;
      }
      if (open){
        switch (ch){
          case open:
            level++;
            continue;
          case close:
            level--;
            if (!level){
              open = close = undefined;
              numElements++;
            }
            continue;
        }
        continue;
      }
      
      if (close = groups[ch]){
        level++;
        open = ch;
        continue;
      }

      if (ch === '|') return true;
      numElements++;
    }
    return forQuantifier && numElements > 1;
  }
  
  static #wrap(source, force){
    if (force || RegXpChef.#needWrap(source)) source = `(?:${source})`;
    return source;
  }
  
  static escape(source){
    return String(source).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  static #modFlags(flags, arg){
    if (!arg.flags) return undefined;
    
    const addFlags = [...arg.flags].filter(ch => flags.indexOf(ch) === -1);
    const omitFlags = [...flags].filter(ch => arg.flags.indexOf(ch) === -1);
    if (!addFlags.length && !omitFlags.length)  return undefined;
    
    let fixAddFlags = [];
    addFlags.forEach(ch => {
      if (RegXpChef.#allowedLocalFlags.indexOf(ch) !== -1) fixAddFlags.push(ch);
    });

    let fixOmitFlags = [];
    omitFlags.forEach(ch => {
      if(RegXpChef.#allowedLocalFlags.indexOf(ch) !== -1) fixOmitFlags.push(ch);
    });
    
    let localFlags = fixAddFlags.join('');
    if (fixOmitFlags.length) localFlags += `-${fixOmitFlags.join('')}`;
    
    return localFlags;
  }
  
  static #fromArray(array, flags){
    if (array.some(el => typeof el !== 'string')) return array.map(el => RegXpChef.#toPattern(el, flags)).join('|');
    const trie = RegXpChef.#toTrie(array, flags);
    return RegXpChef.#fromTrie(trie);
  }

  static #toTrie(array, flags){
    const caseInsensitive = flags.includes('i');
    array = [].concat(array).sort((a,b) => {
      if (caseInsensitive){
        a = a.toUpperCase();
        b = b.toUpperCase();
      }
      if (a > b) return 1;
      if (a < b) return -1;
      return 0;
    });
    let ch, branch, tree = {};
    array.forEach(str => {
      branch = tree;
      for (ch of str) {
        if (caseInsensitive) ch = ch.toLowerCase();
        branch = branch[ch] || (branch[ch] = {});
      }
      branch[''] = true;
    });
    return tree;
  }
  
  static #fromTrie(tree){
    let source = '', count = 0, terminalCount = 0;
    let terminals = '';
    for (const ch in tree){
      if (!ch ) continue;
      const branch = tree[ch];
      const isTerminal = branch[''] === true;
      const keys = Object.keys(branch);
      if (keys.length === (isTerminal ? 1 : 0)) {
        terminals += RegXpChef.escape(ch);
        terminalCount++;
        continue;
      }
      if (count++) source += '|';
      source += RegXpChef.escape(ch);
      let branchSource = RegXpChef.#fromTrie(branch);
      if (keys.length > 1) branchSource = RegXpChef.#wrap(branchSource, !/^\[.+(?<!\\)\]$/.test(branchSource));
      if (isTerminal) branchSource += '?';
      source += branchSource;
    }
    if (terminalCount) {
      if (terminalCount > 1){
        terminals = `[${terminals}]`;
      }
      if (source){
        source = `|${source}`;
      }
      source = terminals + source;
    }
    return source;
  }

  static #getQuantifier(object){
    
    const defaultMin = object.$end === undefined ? 1 : 0;
    const min = object.$min === undefined ? defaultMin : parseInt(object.$min, 10);
    if (isNaN(min) || min < 0 || typeof object.$min === 'number' && min !== object.$min){
      throw new Error(`Invalid: If specified, $min must be a non-negative integer.`);
    }
    
    const defaultMax = object.$end === undefined ? 1 : Infinity;
    const max = object.$max === undefined ? defaultMax : ([Infinity, '∞'].includes(object.$max) ? Infinity : parseInt(object.$max, 10));
    if (isNaN(max) || max <= 0 || max < min || typeof object.$max === 'number' && max !== object.$max){
      throw new Error(`Invalid: If specified, $max must be an integer greater than 0 and not less than $min.`);
    }
    
    let quantifier;
    _quantifier: switch(max){
      case 1:
        switch(min) {
          case 0:
            quantifier = '?';
            break _quantifier;
          case 1:
            quantifier = '';
            break _quantifier;
        }
      case Infinity:
        switch(min){
          case 0:
            quantifier = '*';
            break _quantifier;
          case 1:
            quantifier = '+';
            break _quantifier;
        }
      default:
        quantifier = min;
        if (max > min){
          quantifier += ',';
          if (max !== Infinity) quantifier += max;
        }
        quantifier = `{${quantifier}}`;
    }
    return quantifier;
  }

  static #getTerminal(object, flags, side){
    let pattern, regExp = object[side];
    if (regExp) {
      pattern = RegXpChef.#toPattern(regExp, flags);
      let prefix = '(?';
      if (object[side + 'Exclusive'] === true) {
        if (side === '$begin') prefix += '<';
        prefix += '=';
      }
      else prefix += RegXpChef.#needWrap(pattern) ? ':' : '';
      regExp = prefix === '(?' ? pattern : `${prefix}${pattern})`;
    }
    else regExp = '';
    
    if (object.$escape){
      const escapePattern = RegXpChef.#toPattern(object.$escape, flags);
      if (escapePattern === pattern){
        if (side === '$begin') regExp = `(?<!${escapePattern})${regExp}`;
        else 
        if (side === '$end') regExp = `${regExp}(?!${escapePattern})`;
      }
      else 
      if (side === '$end') regExp = `(?<!${escapePattern})${regExp}`;
    }
    
    return {
      regExp: regExp,
      pattern: pattern
    };
  }

  static #fromObject(object, flags) {
    const begin = RegXpChef.#getTerminal(object, flags, '$begin');
    const end = RegXpChef.#getTerminal(object, flags, '$end');

    let content;
    if (object.$content === undefined) content = '[\\s\\S]';
    else
    if (object.$content instanceof Array) {
      if (Object.keys(object).some(prop => {
        switch (prop){
          case '$escape':
          case '$min':
          case '$max':
            return true;
        }
      })) throw new Error(`Invalid: $escape, $min, $max are not valid when $content is an array.`);
      content = RegXpChef.#fromArray(object.$content, flags);
    }
    else content = RegXpChef.#toPattern(object.$content, flags);

    let endRegExp = end.regExp;
    if (end.pattern) {
      if (object.$content === undefined && typeof object.$end === 'string' && object.$end.length === 1){
        let characterClass = end.pattern;
        if (object.$escape && typeof object.$escape === 'string' && object.$escape.length === 1 && object.$escape !== object.$end){
          characterClass += RegXpChef.#toPattern(object.$escape, flags);
        }
        content = `[^${characterClass}]`;
        if (object.$escape !== object.$end) endRegExp = end.pattern;
      }
      else
      if (object.$content === undefined){
        const endLookAhead = `(?!${end.pattern})`;
        content = `${endLookAhead}${content}`;
      }
      
      if (object.$escape){
        const escapePattern = RegXpChef.#toPattern(object.$escape, flags);
        const escapedEnd = `${RegXpChef.#wrap(escapePattern)}${RegXpChef.#wrap(end.pattern)}`;
        const escapedEscape = `${RegXpChef.#wrap(escapePattern)}${RegXpChef.#wrap(escapePattern)}`;
        content = RegXpChef.#wrap(`${escapedEnd}|${escapedEscape}|${content}`);
      }
    }
    else 
    if (object.$escape) throw new Error(`Invalid: $escape not allowed without $end.`);

    if (! (object.$content instanceof Array) ){
      const quantifier = RegXpChef.#getQuantifier(object);
      if (quantifier){
        if (RegXpChef.#needWrap(content, true)) content = `(?:${content})`;
        content += quantifier;
      }
    }

    const regExp = new RegExp(`${begin.regExp}${RegXpChef.#wrap(content)}${endRegExp}`, object.$flags);
    return RegXpChef.#toPattern(regExp, flags);
  }
  
  static #label(arg, label, flags){
    const source = RegXpChef.#toPattern(arg[label], flags);
    return `(?<${label}>${source})`;
  }
  
  static #toPattern(arg, flags){
    let source;
    const argType = typeof arg;
    switch (argType) {
      case 'object':
        if (arg !== null){
          if (arg instanceof RegExp){
            source = arg.source;
            const localFlags = RegXpChef.#modFlags(flags, arg);
            if (localFlags) source = `(?${localFlags}:${source})`;
          }
          else
          if (arg instanceof Array) source = RegXpChef.#fromArray(arg, flags);
          else {
            const keys = Object.keys(arg);
            if (keys.every(prop => prop.startsWith('$'))) {
              source = (keys.length === 1 && keys[0] === '$flags') ? '' : RegXpChef.#fromObject(arg, flags);
            }
            else
            if (keys.every(label => !label.startsWith('$'))) {
              source = RegXpChef.#fromArray(keys.map(label => {
                const source = RegXpChef.#label(arg, label, flags);
                return new RegExp(source, flags);
              }), flags);
            }
            else throw new Error(`Invalid object - can't mix objects with $-prefixed properties and objects without $-prefixed properties: "${arg}"`);
          }
          source = RegXpChef.#wrap(source);
          break;
        }
      default:
        arg = String(arg);
      case 'string':
        source = RegXpChef.escape(arg);
    }
    return source;
  }
  
  static groupCounts(source){
    if (source instanceof RegExp) source = source.source;
    if (typeof source !== 'string') return;
    const counts = Array.from( source.matchAll(/(?<!\\)\(\?<(?<name>[^>]+)>/g) )
    .reduce((acc, match) => {
      const name = match.groups.name;
      acc[name] = acc[name] ? acc[name] + 1 : 1;
      return acc;
    }, {});
    return counts;
  }

  static assemble(){
    const sources = [];
    const flags = arguments[0].flags || arguments[0].$flags || '';
    for (const arg of arguments) sources.push(RegXpChef.#toPattern(arg, flags));
    return {
      source: sources.join(''),
      flags: flags
    };
  }
  
  static compile(){
    const regXp = RegXpChef.assemble(...arguments);
    return new RegExp(regXp.source, regXp.flags);
  }

  static matchGroups(match){
    if (match && match.groups) {
      return Object.keys(match.groups).filter(groupName => {
        return match.groups[groupName] !== undefined;
      });
    }
  }

}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = RegXpChef;
}

if (typeof window !== 'undefined') {
  window.RegXpChef = RegXpChef;
}