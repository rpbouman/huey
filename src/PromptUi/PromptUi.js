class PromptUi {
 
  static {
    var promptUi = byId('promptUi');
    byId( 'promptDialogAcceptButton' ).addEventListener('click', function(event){
      promptUi.returnValue = 'accept';
    });
    byId( 'promptDialogRejectButton' ).addEventListener('click', function(event){
      promptUi.returnValue = 'reject';
    });
  }
 
  static show(config){    
    return new Promise(function(resolve, reject){
      var promptDialog = byId( 'promptUi');
      promptDialog.querySelector('#' + promptDialog.getAttribute('aria-labelledby')).innerText = config.title;
      promptDialog.querySelector('section').innerHTML = config.contents;
      
      var closeHandler = function(event){
        resolve(promptDialog.returnValue);
        promptDialog.removeEventListener('close', closeHandler);
      };
      promptDialog.addEventListener('close', closeHandler);
      promptDialog.showModal();
    });
  }
}