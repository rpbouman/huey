class PageStateManager {

  #view = undefined;

  constructor(){
    this.#initPopStateHandler();
  }
  
  #initPopStateHandler(){
    window.addEventListener('popstate', this.#popStateHandler.bind(this));
  }
  
  // this basically means: load the query
  #popStateHandler(event){
    var currentRoute = Routing.getCurrentRoute();
    // TODO: check if the current state already matches the route, if it does we're done.
    this.setPageState(currentRoute);    
  }

  // this basically means: save the query
  #handleViewUpdate(event){
    var view = event.currentTarget;    
    Routing.updateRouteFromView(view);
  }

  #getViewUpdateHandler(){
    return this.#handleViewUpdate.bind(this);
  }
  
  observe(view){
    this.#view = view;
    view.addEventListener('updated', this.#getViewUpdateHandler());
  }

  unobserve(view){
    if (this.#view !== view) {
      return;
    }
    view.removeEventListener('updated', this.#getViewUpdateHandler())
    this.#view = null;
  }

  static openDatasource(event){
    debugger;
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

  isSynced(){
    return Routing.isSynced(this.#view);
  }

  async setPageState(newRoute){
        
    if (!newRoute){
      // TODO: maybe throw an error?
      return;
    }
    
    if (!this.#view){
      return;
    }
    var currentRoute = Routing.getRouteForView(this.#view);
    if (newRoute === currentRoute) {
      return;
    }
    
    var state = Routing.getViewstateFromRoute(newRoute);
    if (!state) {
      // TODO: maybe throw an error?
      return;
    }
    
    var viewClass = state.viewClass;
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

    var columnMetadata = await datasource.getColumnMetadata();
    
    var cellsHeadersAxis = queryModelState.cellsHeaders;
    var axes = queryModelState.axes;
    
    var autoRunQuery = settings.getSettings('querySettings').autoRunQuery;
    try {
      if (autoRunQuery) {
        settings.assignSettings(['querySettings', 'autoRunQuery'], false);
      }
      var queryModel = pivotTableUi.getQueryModel();
      if (queryModel.getDatasource() === datasource) {
        queryModel.clear();
      }
      else {
        queryModel.setDatasource(datasource);
      }
      
      for (var axisId in axes){
        var items = axes[axisId];
        for (var i = 0 ; i < items.length; i++){
          var item = items[i];
          var config = { columnName: item.column };

          config.columnType = item.columnType;
          config.derivation = item.derivation;
          config.aggregator = item.aggregator;
          if (item.includeTotals === true){
            config.includeTotals = true;
          }
          
          var formatter = QueryAxisItem.createFormatter(config);
          if (formatter){
            config.formatter = formatter;
          }
          
          var literalWriter = QueryAxisItem.createLiteralWriter(config);
          if (literalWriter){
            config.literalWriter = literalWriter;
          }
          
          if (axisId === QueryModel.AXIS_FILTERS) {
            var filter = item.filter;
            if (filter) {
              config.filter = filter;
            }
          }
          config.axis = axisId;
          await queryModel.addItem(config);
        }
      }
    } 
    catch (e) {
      showErrorDialog(e);
    }
    finally {
      if (autoRunQuery) {
        settings.assignSettings(['querySettings', 'autoRunQuery'], true);
        pivotTableUi.updatePivotTableUi();      
      }
    }
  }

}

var pageStateManager;
function initPageStateManager(){
  pageStateManager = new PageStateManager();  
}