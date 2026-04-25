class PageStateManager {

  constructor(){
    this.#initPopStateHandler();
    //this.#initHashChangeHandler();
  }

  #initPopStateHandler(){
    window.addEventListener('popstate', event => this.#popStateHandler( event ) );
  }

  #initHashChangeHandler(){
    window.addEventListener('hashchange', event => this.#hashChangeHandler( event ) );
  }

  // this basically means: load the query
  #hashChangeHandler(event){
    const currentRoute = Routing.getCurrentRoute();
    // TODO: check if the current state already matches the route, if it does we're done.
    this.setPageState(currentRoute);
  }

  // this basically means: load the query
  #popStateHandler(event){
    const newRoute = event.state;
    // TODO: check if the current state already matches the route, if it does we're done.
    this.setPageState(newRoute);
  }

  async chooseDataSourceForPageStateChangeDialog(referencedColumns, desiredDatasourceId, compatibleDatasources, newDatasources){
    return new Promise(async (resolve, reject) => {

      // do we have the referenced datasource?
      let desiredDataSource = compatibleDatasources ? compatibleDatasources[desiredDatasourceId] : undefined;
      if (desiredDataSource){
        // yes! we're done.
        resolve(desiredDataSource);
        return;
      }

      // figure out what kind of datasource is referenced
      const desiredDatasourceIdParts = DuckDbDataSource.parseId(desiredDatasourceId);
      
      if (desiredDatasourceIdParts.isUrl) {
        const url = desiredDatasourceIdParts.resource;
        await uploadUi.uploadFiles([url]);
        desiredDataSource = datasourcesUi.getDatasource(desiredDatasourceId);
        if (desiredDataSource) {
          const isCompatible = await datasourcesUi.isDatasourceCompatibleWithColumnsSpec(
            desiredDatasourceId,
            referencedColumns,
            true
          );
          if (isCompatible === true) {
            uploadUi.close();
            resolve(desiredDataSource);
            return;
          }
        }
      }

      let title;
      let message;;
      const existingDatasource = datasourcesUi.getDatasource(desiredDatasourceId);
      let openNewDatasourceItem;
      if (existingDatasource) {
        openNewDatasourceItem = DataSourceMenu.getDatasourceMenuItemHTML({
          value: -1,
          checked: true,
          labelText: Internationalization.getText('Browse for a new Datasource')
        });
        title = 'Incompatible Datasource';
        message = Internationalization.getText(
          'The requested {1} {2} isn\'t compatible with your query.', 
          desiredDatasourceIdParts.type, desiredDatasourceIdParts.localId
        );
        
        if (newDatasources && newDatasources.length) {
          const mismatchedColumns = [];
          const datasourceSettings = settings.getSettings('datasourceSettings');
          const useLooseColumnComparisonType = datasourceSettings.useLooseColumnTypeComparison;
          for (let i = 0; i < newDatasources.length; i++){
            const newDatasource = newDatasources[i];
            const datasourceId = newDatasource.getId();
            const isCompatible = await datasourcesUi.isDatasourceCompatibleWithColumnsSpec(
              datasourceId, 
              referencedColumns, 
              useLooseColumnComparisonType
            );
            if (isCompatible === true){
              // this shouldn't happen
              continue;
            }
            isCompatible.forEach(function(columnName){
              if ( !mismatchedColumns.includes(columnName) ) {
                mismatchedColumns.push(columnName);
              }
            })
          }
          const mismatchedColumnsString = mismatchedColumns.map(function(mismatchedColumnName){
            const columnDef = referencedColumns[mismatchedColumnName];
            return `${mismatchedColumnName} ${columnDef.columnType}`;
          }).join(', ');
          message += '\n' + Internationalization.getText('Missing or unmatched columns: {1}', mismatchedColumnsString);
        }
      }
      else {
        message = Internationalization.getText(
          'The requested {1} {2} doesn\'t exist.', 
          desiredDatasourceIdParts.type, desiredDatasourceIdParts.localId
        );
        openNewDatasourceItem = DataSourceMenu.getDatasourceMenuItemHTML({
          datasourceType: desiredDatasourceIdParts.type,
          value: -1,
          checked: true,
          labelText: Internationalization.getText('Browse to open {1}', desiredDatasourceIdParts.localId)
        });
        title = 'Datasource not found';
      }

      let list = '<menu class="dataSources">';
      let datasourceType;
      const compatibleDatasourceIds = compatibleDatasources ? Object.keys(compatibleDatasources) : [];
      if (compatibleDatasourceIds.length) {
        message += '<br/>' + Internationalization.getText('Choose any of the compatible datasources instead, or browse for a new one:');
        list += compatibleDatasourceIds.map((compatibleDatasourceId, index) => {
          const compatibleDatasource = compatibleDatasources[compatibleDatasourceId];
          datasourceType = compatibleDatasource.getType();
          let fileNameParts;
          switch (datasourceType) {
            case DuckDbDataSource.types.FILE:
              const fileName = compatibleDatasource.getFileName();
              fileNameParts = FileUtils.getFileNameParts(fileName);
              break;
            default:
          }
          const caption = DataSourcesUi.getCaptionForDatasource(compatibleDatasource);
          const datasourceItem = DataSourceMenu.getDatasourceMenuItemHTML({
            datasourceType: datasourceType,
            fileType: fileNameParts ? fileNameParts.lowerCaseExtension : undefined,
            index: index,
            value: index,
            labelText: caption
          });
          return datasourceItem;
        }).join('\n');
      }

      list += openNewDatasourceItem;
      list += "</menu>";
      message += list;

      const choice = PromptUi.show({
        title: Internationalization.getText(title),
        contents: message
      });

      choice
      .then(choice => {
        switch (choice) {
          case 'accept':
            if (compatibleDatasources) {
              const promptUi = byId('promptUi');
              const radio = promptUi.querySelector('input[name=compatibleDatasources]:checked');
              const chosenOption = parseInt(radio.value, 10);
              if (chosenOption !== -1) {
                const compatibleDatasourceId = radio ? compatibleDatasourceIds[chosenOption] : null;
                const compatibleDatasource = compatibleDatasources[compatibleDatasourceId];
                resolve(compatibleDatasource);
                return;
              }
            }
            byId('uploader').click();
            // TODO: there's a loose end here
            // this function returns a promise so we should either reject or resolve.
            // but this code path does neither.
            resolve(null);
            break;
          case 'reject':
            reject();
            break;
        }
      })
      .catch(error => {
        reject();
      });
    });
  }

  async setPageState(newRoute, newUploadResults){

    if (!newRoute){
      // TODO: maybe throw an error?
      return;
    }

    const currentRoute = Routing.getRouteForQueryModel(queryModel);
    if (newRoute === currentRoute) {
      return;
    }

    const state = Routing.getQueryModelStateFromRoute(newRoute);
    if (!state) {
      // TODO: maybe throw an error?
      return;
    }

    const queryModelState = state.queryModel;
    const referencedColumns = QueryModel.getReferencedColumns(queryModelState);

    const datasourceId = queryModelState.datasourceId;
    const compatibleDatasources = await datasourcesUi.findDataSourcesWithColumns(referencedColumns, true);

    let datasource;
    if (compatibleDatasources && compatibleDatasources[datasourceId]) {
      datasource = datasourcesUi.getDatasource(datasourceId);
    }
    else {
      try {
        datasource = await this.chooseDataSourceForPageStateChangeDialog(
          referencedColumns,
          datasourceId,
          compatibleDatasources,
          newUploadResults ? newUploadResults.datasources : undefined
        );
        // TODO: this is a bit funky, we're getting null because the ui flow to select a datasource
        // at some point gets disconnected when we have to open the filepicker.
        // For now we'll leave it but we need to find a more rigourous wat to define UI workflows
        // because now it's just a load of Promispaghetti
        if (datasource === null) {
          Routing.updateRouteFromQueryModel(queryModelState);
          return;
        }
      }
      catch (error){
        queryModel.clear();
        Routing.updateRouteFromQueryModel(queryModel);
      }
      if (!datasource) {
        return;
      }
    }
    queryModelState.datasourceId = datasource.getId();
    queryModel.setState(queryModelState);
    analyzeDatasource(datasource);
    setTimeout(() => attributeUi.revealAllQueryAttributes(), 1000);
  }

}

let pageStateManager;
function initPageStateManager(){
  pageStateManager = new PageStateManager();
}