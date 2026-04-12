class PromptUi {

  static {

    byId('promptDialogAcceptButton')
    .addEventListener('click', event => {
      const dialog = byId('promptUi');
      dialog.returnValue = 'accept';
      // firefox seems to forget the returnValue
      dialog.setAttribute('data-returnValue', dialog.returnValue);
    });

    byId('promptDialogRejectButton')
    .addEventListener('click', event => {
      const dialog = byId('promptUi');
      dialog.returnValue = 'reject';
      // firefox seems to forget the returnValue
      dialog.setAttribute('data-returnValue', dialog.returnValue);
    });

  }

  static show(config){
    return new Promise((resolve, reject) => {
      const promptDialog = byId( 'promptUi');
      const ariaLabel = promptDialog.querySelector('#' + promptDialog.getAttribute('aria-labelledby'))
      ariaLabel.textContent = config.title;
      const section = promptDialog.querySelector('section')
      section.innerHTML = config.contents;

      promptDialog.addEventListener('close', event => {
        byId('promptUi').removeEventListener('close', closeHandler);
        resolve(byId('promptUi').getAttribute('data-returnValue'));
      });
      promptDialog.showModal();
    });
  }
}