function getDataFromError(error){
  var newlineRegex = /\r\n|[\r\n]/g;
  
  var message = error.message;
  var messageLines;
  if (message) {
    messageLines = message.split(newlineRegex);
    messageLines = messageLines.filter(function(messageLine){
      return messageLine.trim() !== '';
    });
  }
  
  var stack = error.stack;
  var stackLines;
  var description;
  if (stack) {
    stackLines = stack.split(newlineRegex);
  }
    
  return {
    title: messageLines ? messageLines[0] : 'Error',
    description: stackLines ? `<pre>${stackLines.join('\n')}</pre>` : ''
  };
}


function showErrorDialog(config){
  if (config instanceof Error){
    console.error(config);
    config = getDataFromError(config);
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