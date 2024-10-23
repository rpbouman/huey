class PromptUi {
  
  static {
    
    byId('promptDialogAcceptButton')
    .addEventListener('click', function(event){
      var dialog = byId('promptUi');
      dialog.returnValue = 'accept';
      // firefox seems to forget the returnValue
      dialog.setAttribute('data-returnValue', dialog.returnValue);
    });
    
    byId('promptDialogRejectButton')
    .addEventListener('click', function(event){
      var dialog = byId('promptUi');
      dialog.returnValue = 'reject';
      // firefox seems to forget the returnValue
      dialog.setAttribute('data-returnValue', dialog.returnValue);
    });
    
  }
 
  static show(config){    
    return new Promise(function(resolve, reject){
      var promptDialog = byId( 'promptUi');
      promptDialog.querySelector('#' + promptDialog.getAttribute('aria-labelledby')).innerText = config.title;
      promptDialog.querySelector('section').innerHTML = config.contents;
      
      var closeHandler = function(event){
        byId('promptUi').removeEventListener('close', closeHandler);
        resolve(byId('promptUi').getAttribute('data-returnValue'));
      };
      promptDialog.addEventListener('close', closeHandler);
      promptDialog.showModal();
    });
  }
}