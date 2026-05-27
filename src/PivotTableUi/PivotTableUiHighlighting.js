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
    const id = this.#getPivotTableUiId();
    this.#columnHighlightingRuleText = [`
      html > body:has( 
        > dialog#settingsDialog input#hoverColumnHighlight[type=checkbox]:checked 
      ) > main > #workarea > .pivotTableUiContainer {
        > .pivotTableUiInnerContainer {
          > .pivotTableUiTable {
            .pivotTableUiRow { 
              > .pivotTableUiCell:not( .pivotTableUiStufferCell ):nth-child(`, `) {
                
                &.pivotTableUiHeaderCell {
                  border-right-color: var( --huey-hover-highlight-header-border-color );
                }
                
                &.pivotTableUiValueCell {
                  border-right-color: var( --huey-hover-highlight-cell-border-color );
                }
                
                & + .pivotTableUiCell:not( .pivotTableUiStufferCell ) {
                
                  &.pivotTableUiHeaderCell {
                    background-color: var( --huey-hover-highlight-header-background-color );
                    color: var( --huey-hover-highlight-header-color );
                    border-right-color: var( --huey-hover-highlight-header-border-color );
                  }
                  
                  &.pivotTableUiValueCell {
                    background-color: var( --huey-hover-highlight-cell-background-color );
                    color: var( --huey-hover-highlight-cell-color );
                    border-right-color: var( --huey-hover-highlight-cell-border-color );
                  }
                }
              }
            }
          }
        }
      }
    `];
  }
  
  #getColumnHighlightingCssText(columnIndex){
    const ruleText = this.#columnHighlightingRuleText;
    return `${ruleText[0]}${columnIndex - 1}${ruleText[1]}`;
  }

  #getPivotTableUiId(){
    const pivotTableUiDom = this.#pivotTableUi.getDom();
    const id = pivotTableUiDom.getAttribute('id');
    return id;
  }
  
  #initStylesheet(){
    const styleEl = createEl('style');
    const id = this.#getStylesheetId();
    styleEl.setAttribute('id', id);
    document.head.appendChild(styleEl);
  }

  #getStylesheetId(){
    const id = this.#getPivotTableUiId();
    return `${id}-PivotTableUiHighlighting`;
  }
  
  #getStylesheet(){
    const id = this.#getStylesheetId();
    return byId(id);
  }
  
  #updateStylesheet(cssText){
    const stylesheet = this.#getStylesheet();
    const oldContent = stylesheet.textContent;
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
    const dom = this.#pivotTableUi.getDom();
    dom.addEventListener('mouseover', event => this.#mouseOverHandler( event ) );
  }
  
  #mouseOverHandler(event){
    let target = event.target;
    while (target && target.classList) {
      if (target.classList.contains('pivotTableUiCell')){
        break;
      }
      target = target.parentNode;
    }
    let cssText;
    if (!target || !target.classList){
      cssText = '';
    }
    else {
      let prev = target;
      let count = 0;
      do {
        prev = prev.previousSibling;
        count += 1;
      } while (prev);
      cssText = this.#getColumnHighlightingCssText(count);
    }
    this.#updateStylesheet(cssText);
  }
  
  #initMouseLeaveHandler(){
    const dom = this.#pivotTableUi.getDom();
    dom.addEventListener('mouseleave', event => this.#mouseLeaveHandler( event ) );
  }
  
  #mouseLeaveHandler(event){
    this.#updateStylesheet('');
  }

  enableAlternatingRowColors(enabled){
    const dom = this.#pivotTableUi.getDom();
    dom.setAttribute('data-alternating-row-colors', enabled);
  }
  
  enableHoverRowHighlighting(enabled){
    const dom = this.#pivotTableUi.getDom();
    dom.setAttribute('data-hover-row-highlighting', enabled);
  }

  enableHoverColumnHighlighting(enabled){
    const dom = this.#pivotTableUi.getDom();
    dom.setAttribute('data-hover-column-highlighting', enabled);
  }
  
}