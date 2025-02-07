function clearSearch(){
  byId('searchAttribute').value = '';
  var attributeUi = byId('attributeUi');
  var attributeNodes = attributeUi.getElementsByTagName('details');
  for (var i = 0; i < attributeNodes.length; i++){
    var attributeNode = attributeNodes.item(i);
    attributeNode.setAttribute('data-matches-searchstring', '');
  }
}

function handleAttributeSearch(event, count){
  if (count !== undefined) {
    return;
  }
  var searchElement = event.target;
  var searchString = searchElement.value.trim();
  var searchPattern = searchString.replace(/([(){}\[\]^$+*?.\\])/g, '\\$&');
  searchPattern = searchPattern.replace(/%/g, '.+');
  var regex = new RegExp(searchPattern, 'i');
  var attributeUi = byId('attributeUi');
  var attributeNodes = attributeUi.querySelectorAll(`details`);
  var matchingAttributeNodes = []
  for (var i = 0; i < attributeNodes.length; i++){
    var attributeNode = attributeNodes.item(i);
    var match;
    if (searchString === '') {
      match = '';
    }
    else {
      var caption = attributeNode.querySelector('summary > span.label').textContent;
      match = regex.test(caption);
      if (!match) {
        match = false;
        attributeNode.removeAttribute('open');
      }
    }
    attributeNode.setAttribute('data-matches-searchstring', match);
    
    if (match === true) {
      matchingAttributeNodes.push(attributeNode);
    }
  }
  
  // ensure the ancestors of the matching nodes are visible too
  for (var i = 0; i < matchingAttributeNodes.length; i++){
    var parentNode = matchingAttributeNodes[i];
    while (
      (parentNode = parentNode.parentNode) && 
      parentNode.nodeName === 'DETAILS' && 
      parentNode.getAttribute('data-matches-searchstring') !== 'true'
    ) {
      parentNode.setAttribute('data-matches-searchstring', 'true');
      if (parentNode.getAttribute('open') === null){
        parentNode.setAttribute('open', true);
      }
    }
  }
}

function initSearch(){
  bufferEvents(byId('searchAttribute'), 'input', handleAttributeSearch, 1000);
}