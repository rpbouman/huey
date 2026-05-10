class HilitedPeripherals {
  
  #hilited = undefined;
    
  get #container(){
    const hilitedElementEditor = this.#hilited.element;
    const container = hilitedElementEditor.parentNode;
    return container;
  }
  
  get #lengthEl(){
    const container = this.#container;
    const lengthEl = container.querySelector('output[name=length]');
    return lengthEl;
  }
  
  get #linesEl(){
    const container = this.#container;
    const linesEl = container.querySelector('output[name=lines]');
    return linesEl;
  }

  get #lineEl(){
    const container = this.#container;
    const lineEl = container.querySelector('output[name=line]');
    return lineEl;
  }

  get #columnEl(){
    const container = this.#container;
    const columnEl = container.querySelector('output[name=column]');
    return columnEl;
  }
  
  get #positionEl(){
    const container = this.#container;
    const positionEl = container.querySelector('output[name=position]');
    return positionEl;
  }

  get #gutterEl(){
    const container = this.#container;
    const gutter = container.querySelector('.hilited-gutter'); 
    return gutter;
  }
  
  resetGutter(){
    this.#gutterEl.innerHTML = '';
  }
  
  #changeHandler = (event) => {
    this.#updateLengthAndLines(
      event.detail.text.length + 1, 
      event.detail.lineCount
    );
  }

  #updateLengthAndLines(length, lines){
    this.#lengthEl.textContent = length;
    this.#linesEl.textContent = lines;
  }
  
  #selectionHandler = (event) => {
    this.#lineEl.textContent = event.detail.line;
    this.#columnEl.textContent = event.detail.column;
    this.#positionEl.textContent = event.detail.position;
  }
  
  #resizeHandler = (event) => {
    this.#syncGutterLines(event);
  }
  
  #syncGutterLines(event, reset){
    const hilitedElementEditor = this.#hilited.element;
    const height = hilitedElementEditor.offsetHeight;
    const gutter = this.#gutterEl;
    let last = gutter.lastElementChild;
    let childHeight = last ? last.offsetTop + last.clientHeight : 0;
    while (childHeight < height) {
      const child = document.createElement('div');
      child.textContent = String.fromCharCode(160);
      gutter.appendChild(child);
      childHeight = child.offsetTop + child.clientHeight;
    }
    while (
      (last = gutter.lastElementChild) &&
      (last.offsetTop + last.clientHeight) > height
    ){
      gutter.removeChild(last);
    }
  }
  
  #eventHandlers = {
    'hilited:change': this.#changeHandler,
    'hilited:select': this.#selectionHandler,
    'hilited:resize': this.#resizeHandler
  }

  #wireEvents(onOff){
    const element = this.#hilited.element;
    const method = element[ ( onOff ? 'add' : 'remove' ) + 'EventListener' ];
    Object
    .keys(this.#eventHandlers)
    .forEach(
      id => method.call( element, id, this.#eventHandlers[id] )
    );
  }
  
  
  destroy(){
    this.#wireEvents(false);
  }  

  constructor(options){
    this.#hilited = options.hilited;
    const hilitedElementEditor = this.#hilited.element;
    // seed initial display state
    this.#updateLengthAndLines(
      this.#hilited.getText().length + 1, 
      this.#hilited.getLineCount()
    );
    this.#syncGutterLines();

    this.#wireEvents(true);
    hilitedElementEditor.focus();
  }
}