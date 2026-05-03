class PromptUi {

  static ACCEPT = 'accept';
  static REJECT = 'reject';
  
  static #DIALOG_ID = 'promptUi';
  static get #dialog(){
    return byId(PromptUi.#DIALOG_ID);
  }
  
  static get #label(){
    const dialog = PromptUi.#dialog;
    return dialog.querySelector('#' + dialog.getAttribute('aria-labelledby'));
  }
  
  static set #title(text){
    PromptUi.#label.textContent = text;
  }
  
  static get #section(){
    const dialog = PromptUi.#dialog;
    return dialog.querySelector('section');
  }
  
  static set #contents(html){
    PromptUi.#section.innerHTML = html;
  }
  
  static {
    
    byId('promptDialogAcceptButton')
    .addEventListener('click', event => {
      const dialog = PromptUi.#dialog;
      dialog.returnValue = PromptUi.ACCEPT;
      // firefox seems to forget the returnValue
      dialog.setAttribute('data-returnValue', dialog.returnValue);
    });

    byId('promptDialogRejectButton')
    .addEventListener('click', event => {
      const dialog = byId('promptUi');
      dialog.returnValue = PromptUi.REJECT;
      // firefox seems to forget the returnValue
      dialog.setAttribute('data-returnValue', dialog.returnValue);
    });

  }

  static show(config){
    return new Promise( (resolve, reject) => {
      const dialog = PromptUi.#dialog;
      
      PromptUi.#title = config.title;
      PromptUi.#contents = config.contents;

      const closeHandler = function(event){
        dialog.removeEventListener('close', closeHandler);
        resolve( dialog.getAttribute('data-returnValue') );
      }

      dialog.addEventListener('close', closeHandler);
      dialog.showModal();
    });
  }
  
  static clear(){
    PromptUi.#title = '';
    PromptUi.#contents = '';
  }
}