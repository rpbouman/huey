class SelectionHelper {
  
  static FORWARD = 'forward';
  static BACKWARD = 'backward';
  
  static create(element, from, to, direction){
    var index = 0;
    if(direction === undefined){
      direction = SelectionHelper.FORWARD;
    }
    
    if (from === undefined || to === undefined){
      var textContent = element.textContent;
      if (from === undefined){
        from = direction === SelectionHelper.FORWARD ? 0 : textContent.length;
      }
      if (to === undefined){
        to = direction === SelectionHelper.FORWARD ? textContent.length : 0;
      }
    }

    var childNode, childNodes = element.childNodes, n = childNodes.length;
    var fromNode, fromIndex, dataLength;
    for (var i = 0; i < n; i++){
      childNode = childNodes[i];
      if (childNode.nodeType !== 3) {
        continue;
      }
      dataLength = childNode.data.length;
      if (from >= (index + dataLength) ) {
        index += dataLength;
        continue;
      }
      fromNode = childNode;
      fromIndex = from - index;
      break;
    } 

    var toNode, toIndex;
    for (; i < n; i++){
      childNode = childNodes[i];
      if (to > index + childNode.data.length) {
        index += childNode.data.length;
        continue;
      }
      toNode = childNode;
      toIndex = to - index;
      break;
    }
    
    var anchorNode, anchorOffset, focusNode, focusOffset
    switch (direction){
      case SelectionHelper.BACKWARD:
        anchorNode = toNode;
        anchorOffset = toIndex;
        focusNode = fromNode;
        focusOffset = fromIndex;
        break;
      default:
        anchorNode = fromNode;
        anchorOffset = fromIndex;
        focusNode = toNode;
        focusOffset = toIndex;
    }
    var selection = document.getSelection()
    selection.setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset);
  }
  
 static get(element){
    var selection = document.getSelection();
    var focusNode = selection.focusNode;
    if (focusNode === null || focusNode === element){
      return;
    }
    var el = focusNode;
    if (el.nodeType !== 1) {
      el = el.parentNode;
    }
    if (el !== element) {
      return undefined;
    }
    var beginNode, beginOffset, endNode, endOffset;
    var direction = selection.direction;
    switch (direction){
      case SelectionHelper.BACKWARD:
        beginNode = focusNode;
        beginOffset = selection.focusOffset;
        endNode = selection.anchorNode;
        endOffset = selection.anchorOffset;
        break;
      case SelectionHelper.FORWARD:
      default:
        beginNode = selection.anchorNode;
        beginOffset = selection.anchorOffset;
        endNode = focusNode;
        endOffset = selection.focusOffset;
    }
    var selectionStart = 0;
    var selectedText = '';
    var childNodes = el.childNodes;
    var childNode;
    for (var i = 0; i < childNodes.length; i++){
      childNode = childNodes[i];
      if (childNode.nodeType !== 3) {
        continue;
      }
      if (childNode === beginNode){
        break;
      }
      selectionStart += childNode.data.length;
    }
    selectionStart += beginOffset;
    var selectionEnd = selectionStart;
    for (; i < childNodes.length; i++){
      childNode = childNodes[i];
      if (childNode.nodeType !== 3) {
        continue;
      }
      if (childNode === endNode){
        break;
      }
      selectionEnd += childNode.data.length;
      selectedText += childNode.data;
    }
    
    if (beginNode === endNode){
      selectionEnd += endOffset - beginOffset;
      selectedText = beginNode.data.slice(beginOffset, endOffset);
    }
    else {
      selectionEnd += endOffset;
      selectedText = beginNode.data.slice(beginOffset) + selectedText + endNode.data.slice(0, endOffset);
    }
    return {
      direction: direction,
      start: selectionStart,
      end: selectionEnd,
      selectedText: selectedText,
      selection: selection
    };
  }
  
  static has(element){
    var selection = document.getSelection();
    var focusNode = selection.focusNode;
    if (!focusNode){
      return false;
    }
    var el = focusNode;
    if (el.nodeType !== 1) {
      el = el.parentNode;
    }
    return el === element;
  }
    
}