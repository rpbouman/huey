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
  var searchString = searchElement.value.trim().toUpperCase();
  console.log(searchString);
  var attributeUi = byId('attributeUi');  
  var attributeNodes = attributeUi.getElementsByTagName('details');
  for (var i = 0; i < attributeNodes.length; i++){
    var attributeNode = attributeNodes.item(i);
    var match;
    if (searchString === '') {
      match = '';
    }
    else {
      var columnName = attributeNode.getAttribute('data-column_name');
      if (columnName) {
        match = columnName.toUpperCase().indexOf(searchString) !== -1;
      }
      else {
        match = false;
      }
    }
    attributeNode.setAttribute('data-matches-searchstring', match);
  }
}

function initSearch(){
  bufferEvents(byId('searchAttribute'), 'input', handleAttributeSearch, 1000);
}