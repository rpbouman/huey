
class Routing {
 
  static getQueryModelStateFromRoute(route){
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
      
  static getRouteForQueryModel(queryModel){
    var queryModelObject = queryModel.getState();    
    
    if (queryModelObject === null) {
      return undefined;
    }
    
    var routeObject = {
      queryModel: queryModelObject
    };
    var json = JSON.stringify( routeObject );
    var ascii = encodeURIComponent( json );
    var base64 = btoa( ascii ); 
    var route = base64;
    return route;
  }

  static getCurrentRoute(){
    var hash = document.location.hash;

    if (hash.startsWith('#')){
      hash = hash.substring(1);
    }

    if (hash === ''){
      return undefined;
    }
    
    return hash;
  }
  
  static isSynced(queryModel) {
    var route = Routing.getRouteForQueryModel(queryModel);
    var currentRoute = Routing.getCurrentRoute();
    return route === currentRoute;
  }

  static updateRouteFromQueryModel(queryModel){
    var newRoute = Routing.getRouteForQueryModel(queryModel);
    //if (currentRoute === newRoute && Boolean(newRoute)) {
    //  return;
   // }
    var hash = newRoute ? `#${newRoute}` : '';
    //document.location.hash = hash;
    if (history.state === newRoute){
      return;
    }
    history.pushState(newRoute, undefined, hash);
  }
}