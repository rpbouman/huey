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

function getPastedText(domClipboardEvent){
  var target = domClipboardEvent.target;
  var value = target.value;
  
  var selectionStart = domClipboardEvent.selectionStart === undefined ? value.length : domClipboardEvent.selectionStart;
  var prefix = value.substr(0, selectionStart);
  
  var selectionEnd = domClipboardEvent.selectionEnd === undefined ? value.length : domClipboardEvent.selectionEnd;
  var postfix = value.substr(selectionEnd);

  var data = domClipboardEvent.clipboardData;
  var mimeType = 'text/plain';
  var rawPasteText = data.getData(mimeType);

  return rawPasteText;
}