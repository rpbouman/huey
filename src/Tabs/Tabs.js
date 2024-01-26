class TabUi {

  static getSelectedTab(tablist){
    switch (typeof tablist){
      case 'string':
        tablist = document.querySelector(tablist);
      case 'object':
        break;
    }
    
    if ( !(tablist instanceof Element) ) {
      throw new Error(`Argument does not resolve to an Element`);
    }
    
    if (tablist.getAttribute('role') !== 'tablist'){
      tablist = tablist.querySelector('*[role=tablist]');
    }
    
    var selectedTab = tablist.querySelector('*:has( > label[role=tab] + input[type=radio] + *[role=tabpanel] ) > label[role=tab]:has( + input[type=radio]:checked + *[role=tabpanel] )');
    return selectedTab;
  }

}

