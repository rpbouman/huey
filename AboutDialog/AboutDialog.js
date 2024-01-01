function initAbout(){
  var aboutDialog = byId('aboutDialog');

  byId('aboutButton').addEventListener('click', function(){
    aboutDialog.showModal();
  });

  byId('aboutDialogOkButton').addEventListener('click', function(event){
    event.cancelBubble = true;
    aboutDialog.close();
  });
}
