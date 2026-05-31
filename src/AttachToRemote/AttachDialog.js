class AttachDialog {
  constructor(){
    
  }
  
  getDom(){
    return byId('attachDiaog');
  }
}

let attachDialog; 

function initAttachDialog(){
  attachDialog = new AttachDialog();
}