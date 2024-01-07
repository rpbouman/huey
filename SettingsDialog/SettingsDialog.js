function initSettingsDialog(){
  var settingsDialog = byId('settingsDialog');

  byId('settingsButton').addEventListener('click', function(){
    settingsDialog.showModal();
  });

  byId('settingsDialogOkButton').addEventListener('click', function(event){
    event.cancelBubble = true;
    settingsDialog.close();
  });
}
