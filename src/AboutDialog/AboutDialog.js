function initAboutDialog(){
  var link = byId('duckDbLibraryUrl');
  link.setAttribute('href', duckDbLibraryUrl);
  link.innerText = `DuckDB WASM ${duckdbLibraryVersion}`;
}

initAboutDialog();