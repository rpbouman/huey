class PageStateManager {

  constructor(){
    this.#initPopStateHandler();
    //this.#initHashChangeHandler();
  }

  #initPopStateHandler(){
    window.addEventListener('popstate', this.#popStateHandler.bind(this));
  }

  #initHashChangeHandler(){
    window.addEventListener('hashchange', this.#hashChangeHandler.bind(this));
  }

  // this basically means: load the query
  #hashChangeHandler(event){
    var currentRoute = Routing.getCurrentRoute();
    // TODO: check if the current state already matches the route, if it does we're done.
    this.setPageState(currentRoute);
  }

  // this basically means: load the query
  #popStateHandler(event){
    var newRoute = event.state;
    // TODO: check if the current state already matches the route, if it does we're done.
    this.setPageState(newRoute);
  }

  async chooseDataSourceForPageStateChangeDialog(referencedColumns, desiredDatasourceId, compatibleDatasources, newDatasources){
    return new Promise(async function(resolve, reject){

      // do we have the referenced datasource?
      var desiredDataSource = compatibleDatasources ? compatibleDatasources[desiredDatasourceId] : undefined;
      if (desiredDataSource){
        // yes! we're done.
        resolve(desiredDataSource);
        return;
      }

      // figure out what kind of datasource is referenced
      var desiredDatasourceIdParts = DuckDbDataSource.parseId(desiredDatasourceId);
      
      if (desiredDatasourceIdParts.isUrl) {
        var url = desiredDatasourceIdParts.resource;
        await uploadUi.uploadFiles([url]);
        desiredDataSource = datasourcesUi.getDatasource(desiredDatasourceId);
        if (desiredDataSource) {
          var isCompatible = await datasourcesUi.isDatasourceCompatibleWithColumnsSpec(
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

      var title;
      var message;;
      var existingDatasource = datasourcesUi.getDatasource(desiredDatasourceId);
      var openNewDatasourceItem;
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
          var mismatchedColumns = [];
          var datasourceSettings = settings.getSettings('datasourceSettings');
          var useLooseColumnComparisonType = datasourceSettings.useLooseColumnTypeComparison;
          for (var i = 0; i < newDatasources.length; i++){
            var newDatasource = newDatasources[i];
            var datasourceId = newDatasource.getId();
            var isCompatible = await datasourcesUi.isDatasourceCompatibleWithColumnsSpec(
              datasourceId, 
              referencedColumns, 
              useLooseColumnComparisonType
            );
            if (isCompatible === true){
              // this shouldn't happen
              continue;
            }
            isCompatible.forEach(function(columnName){
              if (mismatchedColumns.indexOf(columnName) === -1) {
                mismatchedColumns.push(columnName);
              }
            })
          }
          var mismatchedColumnsString = mismatchedColumns.map(function(mismatchedColumnName){
            var columnDef = referencedColumns[mismatchedColumnName];
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

      var list = '<menu class="dataSources">';
      var datasourceType;
      var compatibleDatasourceIds = compatibleDatasources ? Object.keys(compatibleDatasources) : [];
      if (compatibleDatasourceIds.length) {
        message += '<br/>' + Internationalization.getText('Choose any of the compatible datasources instead, or browse for a new one:');
        list += compatibleDatasourceIds.map(function(compatibleDatasourceId, index){
          var compatibleDatasource = compatibleDatasources[compatibleDatasourceId];
          datasourceType = compatibleDatasource.getType();
          switch (datasourceType) {
            case DuckDbDataSource.types.FILE:
              var fileName = compatibleDatasource.getFileName();
              var fileNameParts = DuckDbDataSource.getFileNameParts(fileName);
              break;
            default:
          }
          var caption = DataSourcesUi.getCaptionForDatasource(compatibleDatasource);
          var datasourceItem = DataSourceMenu.getDatasourceMenuItemHTML({
            datasourceType: datasourceType,
            fileType: fileNameParts ? fileNameParts.lowerCaseExtension : undefined,
            index: index,
            value: index,
            labelText: caption
          });
          return datasourceItem;
        }.bind(this)).join('\n');
      }

      list += openNewDatasourceItem;
      list += "</menu>";
      message += list;

      var choice = PromptUi.show({
        title: Internationalization.getText(title),
        contents: message
      });

      choice
      .then(function(choice){
        switch (choice) {
          case 'accept':
            if (compatibleDatasources) {
              var promptUi = byId('promptUi');
              var radio = promptUi.querySelector('input[name=compatibleDatasources]:checked');
              var chosenOption = parseInt(radio.value, 10);
              if (chosenOption !== -1) {
                var compatibleDatasourceId = radio ? compatibleDatasourceIds[chosenOption] : null;
                var compatibleDatasource = compatibleDatasources[compatibleDatasourceId];
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
      .catch(function(error){
        reject();
      });
    }.bind(this));
  }

  async setPageState(newRoute, newUploadResults){

    if (!newRoute){
      // TODO: maybe throw an error?
      return;
    }

    var currentRoute = Routing.getRouteForQueryModel(queryModel);
    if (newRoute === currentRoute) {
      return;
    }

    var state = Routing.getQueryModelStateFromRoute(newRoute);
    if (!state) {
      // TODO: maybe throw an error?
      return;
    }

    var queryModelState = state.queryModel;
    var referencedColumns = QueryModel.getReferencedColumns(queryModelState);

    var datasourceId = queryModelState.datasourceId;
    var compatibleDatasources = await datasourcesUi.findDataSourcesWithColumns(referencedColumns, true);

    var datasource;
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
    setTimeout(function(){
      attributeUi.revealAllQueryAttributes();
    }, 1000);
  }

}

var pageStateManager;
function initPageStateManager(){
  pageStateManager = new PageStateManager();
}