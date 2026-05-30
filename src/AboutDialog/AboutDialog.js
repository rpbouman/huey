function initAboutDialog(){
  const logo = byId('logo');
  logo.textContent = hueyName;
  
  const logoVersion  = byId('logoVersion');
  logoVersion.textContent = `v ${hueyVersionNumber} (${hueyVersionName})` ;

  const hueyVersion = byId('hueyVersion');
  hueyVersion.textContent = manifest.name;

  const iconsUrl = byId('tablerIconsUrl');
  iconsUrl.textContent = `Tabler Icons v${tablerIconsFontVersion}`;
  
  const libUrl = byId('duckDbLibraryUrl');
  libUrl.setAttribute('href', duckDbLibraryUrl);
  libUrl.textContent = `DuckDB WASM ${duckdbLibraryVersion}`;
}

initAboutDialog();