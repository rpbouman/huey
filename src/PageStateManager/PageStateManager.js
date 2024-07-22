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
      
      var title;
      var message = `The requested datasource ${desiredDatasourceId} `;
      var existingDatasource = datasourcesUi.getDatasource(desiredDatasourceId);
      if (existingDatasource) {
        title = 'Incompatible Datasource';
        message += 'is not compatible with your query:';
        
        // TODO: show why it's not compatible
      }
      else {
        title = 'Datasource not found';
        message += ' does not exist.' +
        '<br/>Would you like to open it?';
      }
      var compatibleDatasourceIds = compatibleDatasources ? Object.keys(compatibleDatasources) : [];
      if (compatibleDatasourceIds.length) {
        message += '<br/>You can choose any of the compatible datasources instead, or else open a new one:';
        var list = compatibleDatasourceIds.map(function(compatibleDatasourceId, index){
          return `<div><input type="radio" name="compatibleDatasources" value="${index}"/> ${compatibleDatasourceId}</div>`;
        });
        list = `<form id="chooseCompatibleDatasourceForm">${list}</form>`;
        message += list;
      }
      else {
        message += 'Choose Ok to open it.'
      }
      
      //message += `<div><button onclick="byId('uploader').click()">Open Datasource...</button></div>`;
      
      var choice = PromptUi.show({
        title: 'Datasource not found',
        contents: message
      });
      
      choice
      .then(function(choice){
        switch (choice) {
          case 'accept':
            if (compatibleDatasources) {
              var form = byId('chooseCompatibleDatasourceForm');
              var radio = form.querySelector('input[name=compatibleDatasources]:checked')
              var compatibleDatasourceId = radio ? compatibleDatasourceIds[parseInt(radio.value, 10)] : null;
              if (compatibleDatasourceId) {
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
      .catch(function(){
        reject();
      });
    });
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