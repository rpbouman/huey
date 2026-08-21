function initAboutDialog(){
  const logo = byId('logo');
  logo.textContent = hueyName;
  
  const logoVersion  = byId('logoVersion');
  const versionName = `v${hueyVersionNumber} (${hueyVersionName})`
  logoVersion.textContent = versionName;

  const hueyVersion = byId('hueyVersion');
  hueyVersion.textContent = `${hueyName} ${versionName}`;

  const iconsUrl = byId('tablerIconsUrl');
  iconsUrl.textContent = `Tabler Icons v${tablerIconsFontVersion}`;
  
}

initAboutDialog();