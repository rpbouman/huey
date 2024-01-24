function showErrorDialog(config){
  if (config instanceof Error){
    config = {
      title: config.message,
      description: config.stack
    };
  }
  
  var title = config.title;
  if (!title) {
    title = 'Unexpected Error';
  }
  var errorDialogTitle = byId('errorDialogTitle');
  errorDialogTitle.innerHTML = title;
  
  var description = config.description;
  if (!description){
    description = title;
  }
  var errorDialogDescription = byId('errorDialogDescription');
  errorDialogDescription.innerHTML = description;

  var errorDialog = byId('errorDialog');
  errorDialog.showModal();
}

