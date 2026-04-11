class ContextMenu {
  
  #menuId = undefined;
  #targetElement = undefined;
  
  constructor(menuHost, menuId){
    this.#menuId = menuId;
    this.#initEvents(menuHost);
  }
  
  #initEvents(menuHost){
    // add a handler to the menuHost's dom so the context menu can be opened when the user askes for it
    menuHost.getDom().addEventListener('contextmenu', event => {
      // check of the host has a beforeShowContextMenu handler.
      // if it has one, call it, and pass the event and the context menu object (this)
      // this allows the menuHost to tweak the context menu before its actually presented to the user.
      // if the host returns false, it means the context menu should not be shown.
      // in that case, we just return and let the native default contextmenu do its work.
      if (
        typeof menuHost.beforeShowContextMenu === 'function' && 
        menuHost.beforeShowContextMenu(event, this) === false
      ) {
        return;
      }
      // if the host does not indicate the context menu should not be shown, 
      // then prevent the default context menu from showing
      // instead, show our context menu.
      event.preventDefault();
      this.#showPopover(event);
    });
    
    // initialize the items in the context menu so the context menu is closed when an item is activated.
    const dom = this.getDom();
    this.#initMenuItems(dom, menuHost);
  }
  
  #initMenuItems(dom, menuHost){
    const menuItems = dom.querySelectorAll('li[role=menuitem] > label > button');
    for (const menuItem of menuItems){
      const popoverTarget = menuItem.getAttribute('popovertarget');
      if (popoverTarget){
        this.#initNestedMenuitem(menuItem, dom, menuHost);
      }
      else {
        this.#initActionMenuitem(menuItem, dom, menuHost);
      }
    }
  }
  
  #initNestedMenuitem(menuItem, dom, menuHost){
    const popoverTarget = menuItem.getAttribute('popovertarget');
    const label = menuItem.parentNode;
    const item = label.parentNode;
    item.addEventListener('mouseenter', function(event){
      const popoverTargetDom = byId(popoverTarget);
      const itemBoundingRect = item.getBoundingClientRect();
      popoverTargetDom.showPopover();
      popoverTargetDom.style.left = (itemBoundingRect.x + itemBoundingRect.width) + 'px';
      popoverTargetDom.style.top = itemBoundingRect.y + 'px';
    });
    item.addEventListener('mouseleave', function(event){
      const popoverTargetDom = byId(popoverTarget);
      popoverTargetDom.hidePopover();
    });
  }
  
  #initActionMenuitem(menuItem, dom, menuHost){
    menuItem.setAttribute('popovertarget', this.#menuId);
    menuItem.setAttribute('popoveraction', 'hide');
    this.#createMenuitemClickHandler(menuItem, dom, menuHost);
  }
  
  #createMenuitemClickHandler(menuItem, dom, menuHost){
    menuItem.addEventListener('click', function(event){
      event.preventDefault();
      dom.hidePopover();
      menuHost.contextMenuItemClicked.call(menuHost, event);
    });
  }

  // show the popover at the coordinates of the initiating contextmenu event.
  #showPopover(event){
    const body = document.body;
    const dom = this.getDom();
        
    dom.showPopover();

    const width = dom.clientWidth;
    let left = event.pageX;
    const right = left + width;
    const correctionX = right - body.clientWidth;
    if (correctionX > 0){
      left -= correctionX;
      if (left < 0) {
        left = 0;
      }
    }
    
    dom.style.left = left + 'px';
    
    const height = dom.clientHeight;
    let top = event.pageY;
    const bottom = top + height;
    const correctionY = bottom - body.clientHeight;
    if (correctionY > 0){
      top -= correctionY;
      if (top < 0){
        top = 0;
      }
    }
    dom.style.top = top  + 'px';
  }
  
  //
  getTargetElement(){
    return this.#targetElement;
  }
  
  getDom(){
    return byId(this.#menuId);
  }
  
}