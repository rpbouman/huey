function createClipboardItem(blob, mimeType){
  var conf = {};
  conf[mimeType || blob.type] = blob;
  return new ClipboardItem(conf);
}

async function copyToClipboard(data, mimeType) {
  var clipboard = navigator.clipboard, method, arg;
  if (typeof data === 'string') {
    if (mimeType) {
      if (!ClipboardItem.supports(mimeType)){
        console.warn(`Clipboard does not support preferred mimeType ${mimeType}, downgrading to text/plain.`);
        mimeType = 'text/plain';
      }      
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
  var result;
  try {
    result = await method.call(clipboard, arg);
  }
  catch(e){
    switch (e.name) {
      case 'NotAllowedError':
        // this is probably https://github.com/rpbouman/huey/issues/305,
        // which happens on chrome when we try to write to the clipboard but the document is not focused.
        console.warn(e);
        console.warn('Attempting to focus the document and retrying');
        document.defaultView.focus();
        result = await method.call(clipboard, arg);
        break;
      default:
        throw e;
    }
  }
  return result;
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