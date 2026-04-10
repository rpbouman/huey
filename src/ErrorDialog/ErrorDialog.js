function getDataFromError(error){
  const newlineRegex = /\r\n|[\r\n]/g;
  
  const message = error.message;
  let messageLines;
  if (message) {
    messageLines = message.split(newlineRegex);
    messageLines = messageLines.filter(function(messageLine){
      return messageLine.trim() !== '';
    });
  }
  
  const stack = error.stack;
  let stackLines;
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
  
  let title = config.title;
  if (!title) {
    title = 'Unexpected Error';
  }
  if (config.type) {
    title = `${config.type}: ${title}`;
  }
  const errorDialogTitle = byId('errorDialogTitle');
  errorDialogTitle.textContent = title;
  
  let description = config.description;
  if (!description){
    description = title;
  }
  if (typeof description === 'string') {
    description = [description];
  }
  
  if (!(description instanceof Array)) {
    description = [];
  }
  
  const errorDialogDescription = byId('errorDialogDescription');
  errorDialogDescription.innerHTML = description.map(escapeHtmlText).join('<br/>');

  const errorDialogDetails = byId('errorDialogDetails');
  errorDialogDetails.removeAttribute('open');
  
  const errorDialogStack = byId('errorDialogStack');
  const details = config.details || '';
  errorDialogStack.textContent = details;

  const errorDialog = byId('errorDialog');
  errorDialog.showModal();
}

function initErrorDialog(){
  const errorDialog = byId('errorDialog');
  byId('errorDialogOkButton').addEventListener('click', function(event){
    event.cancelBubble = true;
    errorDialog.close();
  });
}
initErrorDialog()