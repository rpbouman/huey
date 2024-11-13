function initAboutDialog(){
  var el;

  el = byId('hueyVersion');
  el.innerText = `Huey version ${hueyVersionNumber} - ${hueyVersionName}`;

  el = byId('tablerIconsUrl');
  el.innerText = `Tabler Icons v${tablerIconsFontVersion}`;
  
  el = byId('duckDbLibraryUrl');
  el.setAttribute('href', duckDbLibraryUrl);
  el.innerText = `DuckDB WASM ${duckdbLibraryVersion}`;
}

initAboutDialog();