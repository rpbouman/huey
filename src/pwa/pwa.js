function initLaunchQueue(){
  if ('launchQueue' in window) {
    window.launchQueue.setConsumer(async launchParams => {
      let files = launchParams.files;
      if (!files || !files.length) {
        return;
      }
      // unwrap file system handle (given by pwa) to plain old web api File objects
      files = await FileUtils.unwrapFileSystemHandleToFile( files );
      uploadResults = await uploadUi.uploadFiles(files);
      afterUploaded(uploadResults);
    });
  }
}

function initPwa(){
  initLaunchQueue();
}

