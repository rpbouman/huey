class PivotTableUiHighlighting {
  
  #pivotTableUi = undefined;
  #settings = undefined;
  #columnHighlightingRuleText = undefined;
  
  constructor(pivotTableUi, settings){
    this.#pivotTableUi = pivotTableUi;
    this.#settings = settings;
    
    this.#init();
  }
  
  #init(){
    this.#initColumnHighlightingRuleText();
    this.#initStylesheet();
    this.#initEvents();
  }
  
  #initColumnHighlightingRuleText(){
    var id = this.#getPivotTableUiId();
    this.#columnHighlightingRuleText = [`#${id}.pivotTableUiContainer[data-hover-column-highlighting=true] {
      > .pivotTableUiInnerContainer {
        > .pivotTableUiTable {
          .pivotTableUiRow { 
            > .pivotTableUiCell:not( .pivotTableUiStufferCell ):nth-child(`, `) {
              background-color: var( --huey-highlight-background-color );
              color: var( --huey-highlight-color );
            }
          }
        }
      }
    }
    `];
  }
  
  #getColumnHighlightingCssText(columnIndex){
    var ruleText = this.#columnHighlightingRuleText;
    return `${ruleText[0]}${columnIndex}${ruleText[1]}`;
  }

  #getPivotTableUiId(){
    var pivotTableUiDom = this.#pivotTableUi.getDom();
    var id = pivotTableUiDom.getAttribute('id');
    return id;
  }
  
  #initStylesheet(){
    var styleEl = createEl('style');
    var id = this.#getStylesheetId();
    styleEl.setAttribute('id', id);
    document.head.appendChild(styleEl);
  }

  #getStylesheetId(){
    var id = this.#getPivotTableUiId();
    return `${id}-PivotTableUiHighlighting`;
  }
  
  #getStylesheet(){
    var id = this.#getStylesheetId();
    return byId(id);
  }
  
  #updateStylesheet(cssText){
    var stylesheet = this.#getStylesheet();
    var oldContent = stylesheet.textContent;
    if (oldContent === cssText){
      return;
    }
    stylesheet.textContent = cssText;
  }
  
  #initEvents(){
    this.#initMouseOverHandler();
    this.#initMouseLeaveHandler();
  }
  
  #initMouseOverHandler(){
    var dom = this.#pivotTableUi.getDom();
    dom.addEventListener('mouseover', this.#mouseOverHandler.bind(this));
  }
  
  #mouseOverHandler(event){
    var target = event.target;
    while (target && target.classList) {
      if (target.classList.contains('pivotTableUiCell')){
        break;
      }
      target = target.parentNode;
    }
    var cssText;
    if (!target || !target.classList){
      cssText = '';
    }
    else {
      var prev = target;
      var count = 0;
      do {
        prev = prev.previousSibling;
        count += 1;
      } while (prev);
      cssText = this.#getColumnHighlightingCssText(count);
    }
    this.#updateStylesheet(cssText);
  }
  
  #initMouseLeaveHandler(){
    var dom = this.#pivotTableUi.getDom();
    dom.addEventListener('mouseleave', this.#mouseLeaveHandler.bind(this));
  }
  
  #mouseLeaveHandler(event){
    this.#updateStylesheet('');
  }

  enableAlternatingRowColors(enabled){
    var dom = this.#pivotTableUi.getDom();
    dom.setAttribute('data-alternating-row-colors', enabled);
  }
  
  enableHoverRowHighlighting(enabled){
    var dom = this.#pivotTableUi.getDom();
    dom.setAttribute('data-hover-row-highlighting', enabled);
  }

  enableHoverColumnHighlighting(enabled){
    var dom = this.#pivotTableUi.getDom();
    dom.setAttribute('data-hover-column-highlighting', enabled);
  }
  
}