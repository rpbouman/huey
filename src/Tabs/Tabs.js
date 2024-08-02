class TabUi {

  static #getTablist(element){
    var tablist;
    switch (typeof element){
      case 'string':
        tablist = document.querySelector(element);
        break;
      case 'object':
        tablist = element;
        break;
    }
    
    if ( !(tablist instanceof Element) ) {
      throw new Error(`Argument does not resolve to an Element`);
    }
    
    if (tablist.getAttribute('role') !== 'tablist'){
      tablist = tablist.querySelector('*[role=tablist]');
    }
    return tablist;
  }

  static #getTablistItem(tablist, tab){
    tablist = TabUi.#getTablist(tablist);
    var tabToBeReturned = tablist.querySelector(`*[role=tab]:has( + ${tab}[type=radio] + *[role=tabpanel] ) + ${tab}[type=radio]`);
    if (!tabToBeReturned) {
      throw new Error(`Can't find tab ${tab}`);
    }
    return tabToBeReturned;
  }

  static getSelectedTab(tablist){
    tablist = TabUi.#getTablist(tablist);
    var selectedTab = tablist.querySelector('*:has( > label[role=tab] + input[type=radio] + *[role=tabpanel] ) > label[role=tab]:has( + input[type=radio]:checked + *[role=tabpanel] )');
    return selectedTab;
  }

  static setSelectedTab(tablist, tab){
    var item = TabUi.#getTablistItem(tablist, tab);

    item.checked = true;
    return true;
  }
  
  static getTabPanel(tablist, tab){
    tablist = TabUi.#getTablist(tablist);
    var tabToBeReturned = tablist.querySelector(`*[role=tab]:has( + ${tab}[type=radio] + *[role=tabpanel] ) + ${tab}[type=radio] + *[role=tabpanel]`);
    if (!tabToBeReturned) {
      throw new Error(`Can't find tab ${tab}`);
    }
    return tabToBeReturned;
  }
}

