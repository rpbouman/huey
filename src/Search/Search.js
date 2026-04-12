function clearSearch(){
  byId('searchAttribute').value = '';
  const attributeUi = byId('attributeUi');
  const attributeNodes = attributeUi.querySelectorAll('details');
  attributeNodes.forEach( attributeNode => {
    attributeNode.setAttribute('data-matches-searchstring', '');
  });
}

function handleAttributeSearch(event, count){
  if (count !== undefined) {
    return;
  }
  const highlightName = 'HueyAttributeSearchHighlights';
  
  let highlight = CSS.highlights.get(highlightName);
  if (!highlight){
    highlight = new Highlight();
    CSS.highlights.set(highlightName, highlight);
  }
  
  if (highlight){
    highlight.clear();
  }
  
  const searchElement = event.target;
  const searchString = searchElement.value.trim();
  let searchPattern = searchString.replace(/([(){}\[\]^$+*?.\\])/g, '\\$&');
  searchPattern = searchPattern.replace(/%/g, '.+');
  const regex = new RegExp(searchPattern, 'i');
  const attributeUi = byId('attributeUi');
  
  const attributeNodes = attributeUi.querySelectorAll(`details`);
  const matchingAttributeNodes = [];
  for (let i = 0; i < attributeNodes.length; i++){
    const attributeNode = attributeNodes.item(i);
    let match;
    if (searchString === '') {
      match = '';
    }
    else {
      const label = attributeNode.querySelector('summary > span.label');
      label.normalize();
      const labelTextNode = label.firstChild;
      const caption = label.textContent;
      match = regex.test(caption);
      if (!match) {
        match = false;
        attributeNode.removeAttribute('open');
      }
      else {
        regex.lastIndex = 0;
        do {
          match = regex.exec(caption);
          if (match === null || match.index < regex.lastIndex) {
            break;
          }
          const range = new Range();
          range.setStart(labelTextNode, match.index);
          const rangeEnd = match.index + match[0].length;
          range.setEnd(labelTextNode, rangeEnd);
          regex.lastIndex = rangeEnd;
          highlight.add(range);
        } while (true);
      }
    }
    attributeNode.setAttribute('data-matches-searchstring', match);
    
    if (match === true) {
      matchingAttributeNodes.push(attributeNode);
    }
  }
  
  // ensure the ancestors of the matching nodes are visible too
  for (let j = 0; j < matchingAttributeNodes.length; j++){
    const parentNode = matchingAttributeNodes[i];
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