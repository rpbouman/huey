function showErrorDialog(config){
  if (config instanceof Error){
    console.error(config);
    config = {
      title: config.message,
      description: `<pre>${config.stack}</pre>`
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

function initErrorDialog(){
  var errorDialog = byId('errorDialog');
  byId('errorDialogOkButton').addEventListener('click', function(event){
    event.cancelBubble = true;
    errorDialog.close();
  });
}