class Hilited {

  #options = undefined;
  #element = undefined;
  #elementStyle = undefined;
  #paddingTop = undefined;
  #paddingBottom = undefined;

  #tokenizer = undefined;
  #tokens = [];
  #hasMoreTokens = undefined;

  #lines = [];
  #visibleLines = [];
  #lineCount = 0;
  #text = '';

  #highlighters = {};
  #resizeObserver = undefined;
  #tabSize = undefined;
  #oldSelection = undefined;
  #oldScrollTop = undefined;
  #selectionChangePending = false;
  #selectionInterval = undefined;

  static #defaultOptions = {
    highlighterPrefix: 'hilited',
    // hard tabs means: use tab characters for indent.
    hardTabs: true,
  };

  #syncLinenumber(){
    const firstVisibleLine = Math.round(this.#element.scrollTop / this.#element.scrollHeight * this.#lineCount);
    this.#element.parentNode.style.setProperty('--linenumber', firstVisibleLine);
  }

  #renderingTimeout = undefined;
  #handleScroll(event){
    this.#syncLinenumber();
    const firstLine = this.#visibleLines[0]?.line ?? 0;
    this.#element.dispatchEvent(new CustomEvent('hilited:scroll', {
      bubbles: true,
      detail: { firstLine }
    }));
  }
  #thisHandleScroll = this.#handleScroll.bind(this);

  #handleScrollEnd(event){
    const element = event.target;
    const lineHeight = (element.scrollHeight - (this.#paddingTop + this.#paddingBottom)) / this.#lineCount;
    const remainder = (element.scrollTop - this.#paddingTop) % lineHeight;
    const round = Math.round(remainder / lineHeight);
    element.scrollTop += (round ? lineHeight : 0) - remainder;
    setTimeout( this.#thisUpdateHighlighting, 0);
  }
  #thisHandleScrollEnd = this.#handleScrollEnd.bind(this);

  #updateElementDimension(){
    this.#elementStyle = getComputedStyle(this.#element);
    this.#paddingTop = parseInt(this.#elementStyle.getPropertyValue('padding-top'), 10);
    this.#paddingBottom = parseInt(this.#elementStyle.getPropertyValue('padding-bottom'), 10);
    this.#tabSize = parseInt(this.#elementStyle.getPropertyValue('tab-size'), 10);
  }

  #thisResize = (function(){
    this.#updateElementDimension();
    this.#updateHighlighting();
    this.#element.dispatchEvent(new CustomEvent('hilited:resize', { bubbles: true }));
    this.#renderingTimeout = undefined;
  }.bind(this));

  #handleResize(entries){
    if (this.#renderingTimeout){
      clearTimeout(this.#renderingTimeout);
    }
    this.#renderingTimeout = setTimeout(this.#thisResize, 100);
  }
  #thisHandleResize = this.#handleResize.bind(this);

  #handleTab(shiftKey){
    const hardTabs = this.#options.hardTabs;
    const tabSize = this.#tabSize;
    const selection = this.#getSelection();
    let textToInsert;
    const startLine = this.#getLineForPosition(selection.start, this.#lines);
    let lines, selectionStart;
    const selectionCollapsed = selection.start === selection.end;
    if (selectionCollapsed) {
      if (hardTabs){
        if (shiftKey){
          if (this.#text.charAt(selection.start - 1) === '\t'){
            document.execCommand('delete');
          }
        }
        else {
          textToInsert = '\t';
        }
      }
      else {
        let numSpaces;
        if (shiftKey){
          if (this.#text.charAt(selection.start - 1) === '\t'){
            document.execCommand('delete');
          }
          else {
            numSpaces = (selection.start - startLine.start) % tabSize;
            if (numSpaces === 0){
              numSpaces = tabSize;
            }
            selectionStart = selection.start;
            while (this.#text.charAt( selectionStart - 1 ) === ' ' && selection.start - (selectionStart - 1) <= numSpaces) {
              selectionStart -= 1;
            }
            this.#createSelection(selectionStart, selection.start);
            document.execCommand('delete');
          }
        }
        else {
          let endOfSpaceRun = selection.start;
          const spaceMatch = /^ +/.exec(this.#text.slice(selection.start));
          if (spaceMatch){
            endOfSpaceRun += spaceMatch[0].length;
          }
          numSpaces = tabSize - ((endOfSpaceRun - startLine.start) % tabSize);
          textToInsert = (new Array(numSpaces)).fill(' ').join('');
        }
      }
    }
    else {
      selectionStart = selection.start;
      let selectionEnd = selection.end;
      let fromNode, fromOffset, toNode, toOffset;
      switch (selection.selection.direction){
        case 'backward':
          fromNode = selection.selection.focusNode;
          fromOffset = selection.selection.focusOffset;
          toNode = selection.selection.anchorNode;
          toOffset = selection.selection.anchorOffset;
          break;
        default:
          fromNode = selection.selection.anchorNode;
          fromOffset = selection.selection.anchorOffset;
          toNode = selection.selection.focusNode;
          toOffset = selection.selection.focusOffset;
      }

      var selectionNeedsAdjustment;
      // check empty line in selection
      if (this.#text.charAt(selectionEnd - 1) === '\n') {
        selectionEnd -= 1;
        if (toOffset >= 1){
          toOffset -=1;
        }
        else {
          toNode = toNode.previousSibling;
          toOffset = toNode.data.length;
        }
        selectionNeedsAdjustment = true;
      }

      // if selection doesn't start at the start of the first line, adjust it so it does
      if (selectionStart > startLine.start) {
        selectionNeedsAdjustment = true;
        while (selectionStart > startLine.start){
          const diff = selectionStart - startLine.start;
          if (diff <= fromOffset) {
            fromOffset -= diff;
            break;
          }
          selectionStart -= fromOffset;
          fromNode = fromNode.previousSibling;
          fromOffset = fromNode.data.length;
        }
      }

      if (selectionNeedsAdjustment) {
        selection.selection.setBaseAndExtent(
          fromNode,
          fromOffset,
          toNode,
          toOffset
        );
      }

      const endLine = this.#getLineForPosition(
        selectionEnd,
        this.#lines,
        startLine.line,
        startLine.line
      );

      lines = this.#lines.slice(startLine.line, endLine.line + 1);
      let lineText; 
      const lineTexts = [];
      for (let i = 0; i < lines.length; i++){
        const line = lines[i];
        lineText = this.#text.slice(line.start, line.textEnd);
        const leadingWhitespaceMatch = /^[ \t]*/.exec(lineText);
        let leadingWhitespaceText = leadingWhitespaceMatch[0];
        lineText = lineText.slice(leadingWhitespaceText.length);

        let remainingspaces;
        if (!hardTabs){
          const numspaces = leadingWhitespaceText.length - leadingWhitespaceText.replace(/ /g, '').length;
          remainingspaces = numspaces % this.#tabSize;
        }
        if (shiftKey){
          if (hardTabs){
            if (leadingWhitespaceText.indexOf('\t') === -1) {
              leadingWhitespaceText = leadingWhitespaceText.slice(this.#tabSize);
            }
            else {
              leadingWhitespaceText = leadingWhitespaceText.replace(/\t/, '');
            }
          }
          else {
            if (remainingspaces === 0){
              remainingspaces = this.#tabSize;
            }
            while(leadingWhitespaceText.length &&remainingspaces > 0){
              leadingWhitespaceText = leadingWhitespaceText.replace(/ /, '');
              remainingspaces -= 1;
            }
          }
        }
        else {
          if (hardTabs){
            leadingWhitespaceText += '\t';
          }
          else {
            var missingWhitespace = new Array(this.#tabSize - remainingspaces);
            leadingWhitespaceText += missingWhitespace.fill(' ').join('');
          }
        }
        lineText = leadingWhitespaceText + lineText;
        lineTexts.push(lineText);
      }
      textToInsert = lineTexts.join('\n');
    }

    if (!textToInsert) {
      return;
    }

    this.#saveScrollTop();
    this.#insertText(textToInsert);
    if (!selectionCollapsed){

      this.#createSelection(
        lines[0].start,
        lines[0].start + textToInsert.length,
        selection.selection.direction
      );

    }
    this.#scheduleRestoreScrollTop()
    return;
  }

  #saveScrollTop(){
    this.#oldScrollTop = this.#element.scrollTop;
  }

  #restoreScrollTop(){
    this.#element.scrollTop = this.#oldScrollTop;
  }
  #thisRestoreScrollTop = this.#restoreScrollTop.bind(this);

  #scheduleRestoreScrollTop(){
    setTimeout(this.#thisRestoreScrollTop);
  }

  #handleKeydown(event){
    const key = event.key;
    switch (key) {
      case 'Tab':
        // Tabkey was hit. Normally this would change focus from the current element to whatever has the next by tabindex.
        // But, for an editor we want to implement special behavior
        // - if any if ctrlKey, metaKey, altKey is pressed then we do default behavior
        if (event.ctrlKey || event.metaKey || event.altKey) {
          // default behavior
          return;
        }
        const shiftKey = event.shiftKey;
        setTimeout(function(){
          this.#handleTab(shiftKey);
        }.bind(this), 0);
        event.preventDefault();
      default:
        console.log(`handleKeyDown: ${key}`);
    }
  }
  #thisHandleKeydown = this.#handleKeydown.bind(this);

  #handleBeforeInput(event){
    // https://w3c.github.io/input-events/#interface-InputEvent-Attributes
    switch (event.inputType){
      case 'insertLineBreak':
        this.#saveScrollTop();
      case 'insertText':
      case 'insertFromDrop':
      case 'insertFromPaste':
      case 'deleteByCut':
      case 'deleteByDrag':
      case 'deleteContent':
      case 'deleteContentBackward':
      case 'deleteContentForward':
      case 'deleteWordBackward':
      case 'deleteWordForward':
      case 'historyRedo':
      case 'historyUndo':
    }
    console.log(`before: ${event.inputType}`);
  }
  #thisHandleBeforeInput = this.#handleBeforeInput.bind(this);

  #handleInput(event){
    console.log(`after: ${event.inputType}`);
    this.#checkTextChange();
    switch (event.inputType){
      case 'insertLineBreak':
        this.#restoreScrollTop();
    }
    this.#element.dispatchEvent(new CustomEvent('hilited:change', {
      bubbles: true,
      detail: { text: this.#text, lineCount: this.#lineCount }
    }));
  }
  #thisHandleInput = this.#handleInput.bind(this);

  #checkTextChange(){
    console.time('#checkTextChange');
    const text = this.#getTextContent();
    if (text === this.#text){
      console.timeEnd('#checkTextChange');
      return;
    }
    this.#text = text;
    this.#parseLines();
    let token;
    let i;
    for (i = 0; i < this.#tokens.length; i++){
      token = this.#tokens[i];
      if (token.groups.__other__ !== undefined){
        break;
      }
      const tokenText = token[0];
      if (text.slice(token.index, token.index + tokenText.length) === tokenText){
        continue;
      }
      break;
    }
    if (token) {
      this.#tokens = this.#tokens.slice(0, i - (i > 0 ? 1 : 0) );
    }
    this.#textValueChanged();
    console.timeEnd('#checkTextChange');
  }

  #textValueChanged(){
    setTimeout(this.#thisUpdateHighlighting,0);
  }

  static #getLinesFromText(text){
    const lines = [];
    let index, position = 0;
    while (index !== -1) {
      index = text.indexOf('\n', position);
      const line = {
        line: lines.length,
        start: position,
        textEnd: index,
        end: position = index + 1
      };
      lines.push(line);
    };
    if (lines.length){
      const lastLine = lines[lines.length - 1];
      const lineTextLength = text.slice(lastLine.start).length;
      if (lineTextLength){
        lastLine.textEnd = lastLine.start + lineTextLength;
        delete lastLine.end;
      }
      else{
        lines.pop();
      }
    }
    return lines;
  }

  #getTextContent(){
    console.time('#getTextContent');
    const childNodes = this.#element.childNodes;
    const chunks = [];
    for (let i = 0; i < childNodes.length; i++){
      const node = childNodes[i];
      switch(node.nodeType){
        case 1:
          const tagName = node.tagName;
          if(tagName === 'BR'){
          }
          else {
            throw new Error(`Didn't expect element ${tagName}.`);
          }
          break;
        case 3:
          chunks.push(node.textContent);
          break;
        default:
          throw new Error(`Didn't expect node of type ${node.type}.`);
      }
    }
    const textContent = chunks.join('');
    console.timeEnd('#getTextContent');
    return textContent;
  }

  #parseLines(){
    console.time('#parseLines');
    const lines = Hilited.#getLinesFromText(this.#text);
    this.#lineCount = lines.length;
    this.#lines = lines;
    console.timeEnd('#parseLines');
  }

  #getLines(){
    return this.#lines;
  }

  getLineCount(){
    return this.#lineCount;
  }

  getText(){
    return this.#text;
  }

  #getLineForPosition(position, lines, currentLine, minLine, maxLine){
    console.time('#getLineForPosition');
    if (lines === undefined){
      lines = this.#lines;
    }

    if (minLine === undefined) {
      minLine = 0;
    }

    if (maxLine === undefined) {
      maxLine = lines.length - 1;
    }

    if (currentLine === undefined){
      currentLine = 0;
    }

    do {
      const line = lines[currentLine];
      if (position < line.start) {
        maxLine = currentLine - 1;
      }
      else
      if (position > line.textEnd) {
        minLine = currentLine + 1;
      }
      else {
        console.timeEnd('#getLineForPosition');
        return line;
      }
      let skip;
      const diff = maxLine - minLine;
      if (diff > 0) {
        skip = diff >> 1;
        if (skip === 0){
          skip = 1;
        }
      }
      else {
        console.timeEnd('#getLineForPosition');
        return lines[maxLine];
      }
      currentLine += skip;
    } while (true);
    console.timeEnd('#getLineForPosition');
  }

  getVisibleLines(){
    return this.#visibleLines;
  }

  #getVisibleLines(){
    let scrollHeight = this.#element.scrollHeight;
    scrollHeight -= this.#paddingTop;
    scrollHeight -= this.#paddingBottom;
    const height = this.#element.clientHeight;
    const lines = this.#getLines();
    if (scrollHeight <= height) {
      this.#visibleLines = lines;
    }
    else {
      const scrollTop = this.#element.scrollTop;
      const ratio = scrollTop / scrollHeight;
      const firstLine = Math.round(ratio * this.#lineCount);

      const portion = height / scrollHeight;
      const lineCount = Math.ceil(lines.length * portion);
      this.#visibleLines = lines.slice(firstLine, firstLine + lineCount);
    }

    this.#element.parentNode.style.setProperty('--linenumber', this.#visibleLines.length === 0 ? 1 : this.#visibleLines[0].line)
    return this.#visibleLines;
  }

  #prepareTokenizer(start, end){
    const tokens = [];
    this.#hasMoreTokens = undefined;
    let lastTokenEndPosition = 0;
    this.#text  = this.getText();

    if (this.#tokens.length) {
      let token = this.#tokens[this.#tokens.length - 1];
      lastTokenEndPosition = token.index + token[0].length;
      if (start < lastTokenEndPosition){
        for (let i = 0; i < this.#tokens.length; i++){
          token = this.#tokens[i];
          lastTokenEndPosition = token.index + token[0].length;
          if (lastTokenEndPosition < start) {
            // token is before start or requested range.
            // skip this token
            continue;
          }
          if (token.index >= end){
            this.#hasMoreTokens = false;
            return tokens;
          }
          tokens.push(token);
        }
      }
    }
    this.#hasMoreTokens = Boolean(this.#text.slice(lastTokenEndPosition).length);
    this.#tokenizer.lastIndex = lastTokenEndPosition;
    return tokens;
  }

  #getNextToken(){
    const currentIndex = this.#tokenizer.lastIndex;
    const token = this.#tokenizer.exec(this.#text);
    const lightWeightToken = [];
    lightWeightToken.groups = {};
    if (!token || token.index !== currentIndex) {
      // oops - we couldn't match a piece of string and skipped over it.
      // we will present this as a __other__ pseudotoken
      const resumeIndex = token ? token.index : this.#text.length;
      this.#tokenizer.lastIndex = resumeIndex;
      const skippedText = this.#text.substring(currentIndex, resumeIndex);
      lightWeightToken[0] = skippedText;
      lightWeightToken.groups['__other__'] = skippedText;
      lightWeightToken.index = currentIndex;
    }
    else
    if (token[0].length === 0) {
      throw new Error('Zero-length token!');
    }
    else {
      lightWeightToken[0] =  token[0];
      const groups = token.groups;
      for (let groupName in groups) {
        if (!groups[groupName]){
          continue;
        }
        lightWeightToken.groups[groupName] = lightWeightToken[0];
        lightWeightToken.index = token.index;
      }
    }

    if (token === null || token.index + token[0].length >= this.#text.length) {
      this.#hasMoreTokens = false;
      //free lastMatch of regex
      /\s*/g.exec('');
    }
    else {
      this.#hasMoreTokens = true;
    }

    return lightWeightToken;
  }

  #getTokensForRange(start, end) {
    const tokens = this.#prepareTokenizer(start, end);
    let prevToken, token;
    let i = 0;
    while (this.#hasMoreTokens ) {
      token = this.#getNextToken();
      i += 1;
      this.#tokens.push(token);
      if (token.index >= start) {
        break;
      }
      prevToken = token;
    }

    // add previousToken if necessary
    if (prevToken && prevToken.index + prevToken[0].length > start){
      tokens.push(prevToken);
    }

    if (!token){
      return tokens;
    }
    // add token
    tokens.push(token);

    // continue tokenization and render as markup.
    while (this.#hasMoreTokens ) {
      token = this.#getNextToken();
      this.#tokens.push(token);
      if (token.index >= end){
        break;
      }
      tokens.push(token);
    }
    return tokens;
  }

  #addHighlighterRange(
    token,
    startContainer, startOffset,
    endContainer, endOffset
  ){
    const tokenText = token[0];
    const groups = token.groups;
    const highlighters = [];
    const highlighterPrefix = this.#options.highlighterPrefix;
    for (let groupName in groups) {
      if (groups[groupName] !== tokenText){
        continue;
      }
      const highlightName = `${highlighterPrefix}-${groupName}`;
      let highlighter = CSS.highlights.get(highlightName);
      if (!highlighter){
        highlighter = new Highlight();
        CSS.highlights.set(highlightName, highlighter);
        this.#highlighters[highlightName] = highlighter;
      }
      const range = new StaticRange({
        startContainer: startContainer,
        startOffset: startOffset,
        endContainer: endContainer,
        endOffset: endOffset
      });
      highlighter.add(range);
    }
  }

  #clearHighlights(){
    for (let hightlightName in this.#highlighters) {
      var highlighter = this.#highlighters[hightlightName];
      highlighter.clear();
    }
  }

  #updateHighlighting(){
    const childNodes = this.#element.childNodes;
    const textNodes = [];
    for (let i = 0; i < childNodes.length; i++){
      const childNode = childNodes[i];
      switch (childNode.nodeType) {
        case 3:
          textNodes.push(childNode);
      }
    }
    if (!textNodes.length) {
      return;
    }
    
    let textNodeIndex = 0;
    let startTextNode = textNodes[textNodeIndex];
    let startTextNodeRangeStart = 0;
    let startTextNodeRangeEnd = startTextNode.data.length;
    let endTextNode, endTextNodeRangeStart, endTextNodeRangeEnd;
    const visibleLines = this.#getVisibleLines();


    this.#clearHighlights();
    // tokenize to find the first (partially) visible token
    const firstVisibleLine = visibleLines[0];
    const lastVisibleLine = visibleLines[visibleLines.length - 1];

    const tokens = this.#getTokensForRange(firstVisibleLine.start, lastVisibleLine.textEnd);
    for (let i = 0; i < tokens.length; i++){
      const token = tokens[i];
      while (startTextNodeRangeEnd <= token.index){
        startTextNode = textNodes[++textNodeIndex];
        if (!startTextNode) {
          break;
        }
        if (startTextNode.nodeType !== 3){
          continue;
        }
        startTextNodeRangeStart = startTextNodeRangeEnd;
        startTextNodeRangeEnd += startTextNode.data.length;
      }

      const tokenRangeEnd = token.index + token[0].length;
      endTextNode = startTextNode;
      endTextNodeRangeStart = startTextNodeRangeStart;
      endTextNodeRangeEnd = startTextNodeRangeEnd;

      while (textNodeIndex < textNodes.length - 1 && endTextNodeRangeEnd < tokenRangeEnd){
        endTextNode = textNodes[++textNodeIndex];
        if (endTextNode.nodeType !== 3){
          continue;
        }
        endTextNodeRangeStart = endTextNodeRangeEnd;
        endTextNodeRangeEnd += endTextNode.data.length;
      }
      this.#addHighlighterRange(
        token,
        startTextNode, token.index - startTextNodeRangeStart,
        endTextNode, tokenRangeEnd - endTextNodeRangeStart
      );
      startTextNode = endTextNode;
      startTextNodeRangeStart = endTextNodeRangeStart;
      startTextNodeRangeEnd = endTextNodeRangeEnd;
    }
  }
  #thisUpdateHighlighting = (this.#updateHighlighting.bind(this));

  #createSelection(from, to, direction){
    return SelectionHelper.create(this.#element, from, to, direction);
  }

  #getSelection(){
    return SelectionHelper.get(this.#element);
  }

  #hasSelection(){
    return SelectionHelper.has(this.#element);
  }

  #insertText(text){
    if (!this.#hasSelection()){
      return;
    }
    // document.execCommand has the advantage of keeping the UNDO functionality correct.
    if (document.execCommand('insertText', undefined, text)){
      return;
    }

  }

  setText(text){
    this.#element.textContent = '';
    const selection = document.getSelection();
    selection.setBaseAndExtent(this.#element, 0, this.#element, 0);
    this.#text = text;
    this.#tokens = [];
    this.#element.textContent = '';
    this.#insertText(text);
    this.#parseLines();
    this.#updateHighlighting();
  }

  #handleDocumentSelectionChange(){
    this.#selectionChangePending = true;
  }
  #thisHandleDocumentSelectionChange = this.#handleDocumentSelectionChange.bind(this);

  #emitSelectionChange(){
    if (!this.#selectionChangePending) return;
    this.#selectionChangePending = false;
    if (!this.#hasSelection()) return;
    const sel = this.#getSelection();
    if (!sel) return;
    const line = this.#getLineForPosition(sel.start, this.#lines);
    if (!line) return;
    this.#element.dispatchEvent(new CustomEvent('hilited:select', {
      bubbles: true,
      detail: {
        position: sel.start + 1,
        line: line.line + 1,
        column: sel.start - line.start + 1
      }
    }));
  }
  #thisEmitSelectionChange = this.#emitSelectionChange.bind(this);

  #eventHandlers = {
    'beforeinput': this.#thisHandleBeforeInput,
    'input': this.#thisHandleInput,
    'scroll': this.#thisHandleScroll,
    'scrollend': this.#thisHandleScrollEnd,
    'keydown': this.#thisHandleKeydown
  }

  #wireEvents(onOff){
    const element = this.#element;
    const method = element[ ( onOff ? 'add' : 'remove' ) + 'EventListener' ];
    Object
    .keys(this.#eventHandlers)
    .forEach(
      id => method.call( element, id, this.#eventHandlers[id] )
    );
  }

  get element(){
    return this.#element;
  }

  constructor(options){
    let configElement = options.element;
    const typeOfConfigElement = typeof configElement;
    if (typeOfConfigElement === 'string'){
      configElement = document.querySelector( configElement );
    }
    if (! (configElement instanceof Node && configElement.nodeType === Node.ELEMENT_NODE) ) {
      throw new TypeError(`Config element should resolve to an DOM Element node!`);
    }
    this.#element = configElement;
    if (options.text){
      this.#element.textContent = options.text;
    }

    this.#options = Object.assign(Hilited.#defaultOptions, options);
    this.#updateElementDimension();
    this.#element.setAttribute('autocorrect', 'off');
    this.#element.setAttribute('contenteditable', 'plaintext-only');
    this.#element.setAttribute('spellcheck', 'false');
    this.#element.setAttribute('translate', 'no');
    this.#element.setAttribute('writingsuggestions', 'false');
    this.#element.classList.add('hilited');

    this.#wireEvents(true);
    document.addEventListener('selectionchange', this.#thisHandleDocumentSelectionChange);
    this.#selectionInterval = setInterval(this.#thisEmitSelectionChange, 250);

    this.#resizeObserver = new ResizeObserver(this.#thisHandleResize);
    this.#resizeObserver.observe(this.#element);

    this.#tokenizer = options.regexp;

    this.setText(this.#getTextContent());
    this.#syncLinenumber();
  }

  destroy(){
    this.#wireEvents(false);
    this.#tokens = [];
    this.#lines = [];
    this.#visibleLines = [];
    this.#clearHighlights();
    document.removeEventListener('selectionchange', this.#thisHandleDocumentSelectionChange);
    clearInterval(this.#selectionInterval);
  }

}