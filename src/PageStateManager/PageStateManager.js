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
    return new Promise(function(resolve, reject){
      var desiredDataSource = compatibleDatasources ? compatibleDatasources[desiredDatasourceId] : undefined;
      if (desiredDataSource){
        resolve(desiredDataSource);
        return;
      }
      var desiredDatasourceIdParts = DuckDbDataSource.parseId(desiredDatasourceId);
      var title;
      var message = `The requested ${desiredDatasourceIdParts.type} ${desiredDatasourceIdParts.localId}`;
      var existingDatasource = datasourcesUi.getDatasource(desiredDatasourceId);
      var openNewDatasourceItem;
      if (existingDatasource) {
        openNewDatasourceItem = [
          `<li id="datasourceMenu-1" data-nodetype="datasource">`,
            `<input id="datasourceMenu-1" type="radio" name="compatibleDatasources" value="-1" checked="true"/>`,
            '<span class="icon" role="img"></span>',
            `<label for="datasourceMenu-1" class="label">Browse for a new Datasource</span>`,
          `</li>`
        ].join('\n')
        title = 'Incompatible Datasource';
        message += ' isn\'t compatible with your query.';
        // TODO: show why it's not compatible
      }
      else {
        openNewDatasourceItem = [
          `<li id="datasourceMenu-1" data-nodetype="datasource" data-datasourcetype="${desiredDatasourceIdParts.type}">`,
            `<input id="datasourceMenu-1" type="radio" name="compatibleDatasources" value="-1" checked="true"/>`,
            '<span class="icon" role="img"></span>',
            `<label datasourceMenu-1 class="label">Browse to open ${desiredDatasourceIdParts.localId}</label>`,
          `</li>`
        ].join('\n');
        title = 'Datasource not found';
        message += 'doesn\'t exist.';
      }
      
      var list = '<menu class="dataSources">';
      var datasourceType;
      var compatibleDatasourceIds = compatibleDatasources ? Object.keys(compatibleDatasources) : [];
      if (compatibleDatasourceIds.length) {
        message += '<br/>You can choose any of the compatible datasources instead, or browse to open a new one:';
        list += compatibleDatasourceIds.map(function(compatibleDatasourceId, index){
          var compatibleDatasource = compatibleDatasources[compatibleDatasourceId];
          datasourceType = compatibleDatasource.getType();
          var extraAtts = '';
          switch (datasourceType) {
            case DuckDbDataSource.types.FILE:
              var fileName = compatibleDatasource.getFileName();
              var fileNameParts = DuckDbDataSource.getFileNameParts(fileName);
              extraAtts = ` data-filetype="${fileNameParts.lowerCaseExtension}"`;
              break;
            default:
          }
          var caption = DataSourcesUi.getCaptionForDatasource(compatibleDatasource);
          return [
            `<li data-nodetype="datasource" data-datasourcetype="${datasourceType}" ${extraAtts}>`,
              `<input id="datasourceMenu${index}" type="radio" name="compatibleDatasources" value="${index}"/>`,
              '<span class="icon" role="img"></span>',
              `<label for="datasourceMenu${index}" class="label">${caption}</label>`,
            `</li>`
          ].join('\n');
        }).join('');
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
    });
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
    var axes = queryModelState.axes;
    var referencedColumns = Object.keys(axes).reduce(function(acc, curr){
      var items = axes[curr];
      items.forEach(function(item, index){
        var columnName = item.column;
        if (columnName === '*'){
          return;
        }
        acc[columnName] = {
          columnType: item.columnType
        };
      });
      return acc;
    },{});
    
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
        debugger;
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
  }

}

var pageStateManager;
function initPageStateManager(){
  pageStateManager = new PageStateManager();
}