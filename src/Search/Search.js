function clearSearch(){
  byId('searchAttribute').value = '';
  const attributeUi = byId('attributeUi');
  const attributeNodes = attributeUi.querySelectorAll('details');
  attributeNodes.forEach( attributeNode => {
    attributeNode.setAttribute('data-matches-searchstring', '');
  });
}

// https://github.com/rpbouman/huey/issues/817
// Purpose of this is to load any childnodes of the argument attributeNode to statisfy the search
// The idea is that attributeNodes are lazily loaded, but search relies on actual DOM attributeNodes
// So, if a node was not yet loaded, but it would have matching childnodes, then we can now explicitly load them
// - we can discover whether the node requires loading by applying the pattern to the data type
// - if we load more childnodes, we must add then to the attributeNodes array to allow the rest of the search functionality to be applied as usual.
// Note that by adding the childnodes to the list we automatcially take care of recursion (only single level of expansion required) 
function loadAttributeNodeChildrenToSatisfySearch(searchPattern, attributeNode, attributeNodes){
  if (
    attributeNode.querySelector('details') !== null ||
    attributeNode.getAttribute('data-nodetype') === 'aggregate'
  ) {
    // this node is already loaded
    return;
  }

  let associatedDataType = attributeNode.getAttribute('data-member_expression_type');
  if (!associatedDataType) {
    associatedDataType = attributeNode.getAttribute('data-column_type');
  }
  // now we have to find named members in the data type.
  // this means we have to unwrap the data type until it's a STRUCT.
  const typesToCheck = [associatedDataType];
  
  let loadNode = false;
  _typeToCheck: for (let i = 0; i < typesToCheck.length; i++) {
    associatedDataType = typesToCheck[i];
    while ( !isStructType(associatedDataType) ) {
      if (isMapType(associatedDataType)) {
        associatedDataType = getMapEntryType(associatedDataType);
      }
      else
      if (isArrayType(associatedDataType)){
        associatedDataType = getArrayElementType(associatedDataType);
      }
      else {
        // if the type cannot be unwrapped any further to yield a STRUCT then we can't match it.
        break;
      }
    }
    if (!isStructType(associatedDataType)) {
      continue;
    }
    const typeDescriptor = getStructTypeDescriptor(associatedDataType);
    for (let memberName in typeDescriptor) {
      searchPattern.lastIndex = 0;
      if (searchPattern.test(memberName)) {
        loadNode = true;
        break _typeToCheck;
      }
      
      const memberType = typeDescriptor[memberName];
      typesToCheck.push(memberType);
    }
  }
  
  if (!loadNode) {
    return;
  }
  
  attributeUi.loadChildNodes( attributeNode );
  const newAttributeNodes = getAttributeNodeChildren( attributeNode, true );
  newAttributeNodes.forEach( newAttributeNode => {
    if ( attributeNodes.includes( newAttributeNode ) ) {
      return;
    }
    attributeNodes.push( newAttributeNode );
  });
}

function getAttributeNodeChildren(attributeNode, empty){
  let selector = ':scope details';
  if (empty){
    selector += ':not( :has( > details ) )';
  }
  return Array.from( attributeNode.querySelectorAll(selector) );
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
  
  const attributeNodes = getAttributeNodeChildren( attributeUi );
  const matchingAttributeNodes = [];
  for (let i = 0; i < attributeNodes.length; i++){
    const attributeNode = attributeNodes[i];
    loadAttributeNodeChildrenToSatisfySearch(regex, attributeNode, attributeNodes);
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
      if (match) {
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
        match = true;
      }
      else {
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
  for (let j = 0; j < matchingAttributeNodes.length; j++){
    let parentNode = matchingAttributeNodes[j];
    while (
      (parentNode = parentNode.parentNode) && 
      parentNode.nodeName === 'DETAILS' 
    ) {
      if (parentNode.getAttribute('data-matches-searchstring') !== 'true'){
        parentNode.setAttribute('data-matches-searchstring', 'true');
      }
      if (parentNode.getAttribute('open') === null){
        parentNode.setAttribute('open', true);
      }
    }
  }
}

function initSearch(){
  bufferEvents(byId('searchAttribute'), 'input', handleAttributeSearch, 1000);
}