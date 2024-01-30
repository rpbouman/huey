
class Routing {
  
  static serializeQueryModel(queryModel){
    var datasource = queryModel.getDatasource();
    if (!datasource) {
      return null;
    }
    var datasourceId = datasource.getId();
    
    var queryModelObject = {
      datasourceId: datasourceId,
      cellsHeaders: queryModel.getCellHeadersAxis(),
      axes: {}
    };
    
    var axisIds = queryModel.getAxisIds().sort();
    var hasItems = false;
    axisIds.forEach(function(axisId){
      var axis = queryModel.getQueryAxis(axisId);
      var items = axis.getItems();
      if (items.length === 0) {
        return '';
      }
      hasItems = true;
      queryModelObject.axes[axisId] = items.map(function(axisItem){
        var strippedItem = {column: axisItem.columnName};
        
        var derivation = axisItem.derivation;
        if (derivation) {
          var derivationInfo = AttributeUi.getDerivationInfo(derivation);
          strippedItem.derivation = {};
          strippedItem.derivation[derivation] = derivationInfo.expressionTemplate;
        }
        
        var aggregator = axisItem.aggregator;
        if (aggregator) {
          var aggregatorInfo = AttributeUi.getAggregatorInfo(aggregator);
          strippedItem.aggregator = {};
          strippedItem.aggregator[aggregator] = aggregatorInfo.expressionTemplate;
        }
        
        return strippedItem;
      });
    });
    if (!hasItems){
      return null;
    }
    return queryModelObject;
  }
 
  static getRouteForView(view, noHash){
    var viewClass = view.constructor.name;
    
    var queryModel = view.getQueryModel();
    var queryModelObject = Routing.serializeQueryModel(queryModel);    
    
    if (queryModelObject === null) {
      return null;
    }
    
    var viewObject = {
      viewClass: viewClass,
      queryModel: queryModelObject
    };
    var json = JSON.stringify( viewObject );
    var ascii = encodeURIComponent( json );
    var base64 = btoa( ascii ); 
    var route = base64;
    if (noHash){
      return route;
    }
    return `#${route}`;
  }

  static getViewstateFromRoute(route){
    try {
      var base64 = route;
      var ascii = atob( base64 ); 
      var json = decodeURIComponent( ascii );
      var state = JSON.parse( json );
      return state;
    }
    catch(error){
      return null;
    }
  }
    
}