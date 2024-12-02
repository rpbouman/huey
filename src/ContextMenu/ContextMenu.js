class ContextMenu {
  
  #menuId = undefined;
  #targetElement = undefined;
  
  constructor(menuHost, menuId){
    this.#menuId = menuId;
    this.#initEvents(menuHost);
  }
  
  #initEvents(menuHost){
    // add a handler to the menuHost's dom so the context menu can be opened when the user askes for it
    menuHost.getDom().addEventListener('contextmenu', function(event){
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
    }.bind(this));
    
    // initialize the items in the context menu so the context menu is closed when an item is activated.
    var dom = this.getDom();
    var menuItems = dom.querySelectorAll('li[role=menuitem] > label > button');
    for (var i = 0; i < menuItems.length; i++){
      var menuItem = menuItems.item(i);
      menuItem.setAttribute('popovertarget', this.#menuId);
      menuItem.setAttribute('popoveraction', 'hide');
      menuItem.addEventListener('click', function(event){
        event.preventDefault();
        dom.hidePopover();
        menuHost.contextMenuItemClicked.call(menuHost, event);
      });
    }
  }

  // show the popover at the coordinates of the initiating contextmenu event.
  #showPopover(event){
    var body = document.body;
    var dom = this.getDom();
        
    dom.showPopover();

    var width = dom.clientWidth;
    var left = event.pageX;
    var right = left + width;
    var correctionX = right - body.clientWidth;
    if (correctionX > 0){
      left -= correctionX;
      if (left < 0) {
        left = 0;
      }
    }
    
    dom.style.left = left + 'px';
    
    var height = dom.clientHeight;
    var top = event.pageY;
    var bottom = top + height;
    var correctionY = bottom - body.clientHeight;
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