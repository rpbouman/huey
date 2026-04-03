function initLaunchQueue(){
  if ('launchQueue' in window) {
    window.launchQueue.setConsumer(async launchParams => {
      let files = launchParams.files;
      if (files && files.length) {
        // unwrap file system handle (given by pwa) to plain old web api File objects
        files = await Promise.all(files.map(
          file => file instanceof FileSystemFileHandle ? file.getFile() : file
        ));
        uploadResults = await uploadUi.uploadFiles(files);
        afterUploaded(uploadResults);
      }
    });
  }
}

function initPwa(){
  initLaunchQueue();
}

