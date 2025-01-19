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

  async chooseDataSourceForPageStateChangeDialog(referencedColumns, desiredDatasourceId, compatibleDatasources){
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
          if (isCompatible) {
            uploadUi.close();
            resolve(desiredDataSource);
            return;
          }
        }
      }

      var title;
      var message = `The requested ${desiredDatasourceIdParts.type} ${desiredDatasourceIdParts.localId}`;
      var existingDatasource = datasourcesUi.getDatasource(desiredDatasourceId);
      var openNewDatasourceItem;
      if (existingDatasource) {
        openNewDatasourceItem = DataSourceMenu.getDatasourceMenuItemHTML({
          value: -1,
          checked: true,
          labelText: 'Browse for a new Datasource'
        });
        title = 'Incompatible Datasource';
        message += ' isn\'t compatible with your query.';
        // TODO: show why it's not compatible
      }
      else {
        openNewDatasourceItem = DataSourceMenu.getDatasourceMenuItemHTML({
          datasourceType: desiredDatasourceIdParts.type,
          value: -1,
          checked: true,
          labelText: `Browse to open ${desiredDatasourceIdParts.localId}`
        });        
        title = 'Datasource not found';
        message += ' doesn\'t exist.';
      }

      var list = '<menu class="dataSources">';
      var datasourceType;
      var compatibleDatasourceIds = compatibleDatasources ? Object.keys(compatibleDatasources) : [];
      if (compatibleDatasourceIds.length) {
        message += '<br/>Choose any of the compatible datasources instead, or browse for a new one:';
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
        title: title,
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

  async setPageState(newRoute){

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
    if (!compatibleDatasources || !compatibleDatasources[datasourceId]) {
      try {
        datasource = await this.chooseDataSourceForPageStateChangeDialog(
          referencedColumns,
          datasourceId,
          compatibleDatasources
        );
      }
      catch (error){
        queryModel.clear();
        Routing.updateRouteFromQueryModel(queryModel);
      }
      if (!datasource) {
        return;
      }
    }
    else {
      datasource = datasourcesUi.getDatasource(datasourceId);
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