function createClipboardItem(blob, mimeType){
  var conf = {};
  conf[mimeType || blob.type] = blob;
  return new ClipboardItem(conf);
}

async function copyToClipboard(data, mimeType) {
  var clipboard = navigator.clipboard, method, arg;
  if (typeof data === 'string') {
    if (mimeType) {
      data = new Blob([data], {type: mimeType});
    }
    else {
      method = clipboard.writeText;
      arg = data;
    }
  }
  if (data instanceof Blob){
    method = clipboard.write;
    arg = [createClipboardItem(data, mimeType)];
  }
  return method.call(clipboard, arg);
}
