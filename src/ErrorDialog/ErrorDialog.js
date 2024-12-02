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
    type: error.name || 'Unknown Error',
    title: messageLines ? messageLines[0] : 'Error',
    description: messageLines ? messageLines.slice(1) : ['Unexpected error.'],
    details: stackLines ? stackLines.join('\n') : ''
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
  if (config.type) {
    title = `${config.type}: ${title}`;
  }
  var errorDialogTitle = byId('errorDialogTitle');
  errorDialogTitle.innerText = title;
  
  var description = config.description;
  if (!description){
    description = [title];
  }
  var errorDialogDescription = byId('errorDialogDescription');
  errorDialogDescription.innerHTML = description.map(escapeHtmlText).join('<br/>');

  var errorDialogDetails = byId('errorDialogDetails');
  errorDialogDetails.removeAttribute('open');
  
  var errorDialogStack = byId('errorDialogStack');
  var details = config.details || '';
  errorDialogStack.textContent = details;

  var errorDialog = byId('errorDialog');
  errorDialog.getElements
  errorDialog.showModal();
}

function initErrorDialog(){
  var errorDialog = byId('errorDialog');
  byId('errorDialogOkButton').addEventListener('click', function(event){
    event.cancelBubble = true;
    errorDialog.close();
  });
}