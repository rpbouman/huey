
class PivotTableUi {
  
  #id = undefined;
  #queryModel = undefined;
  
  constructor(config){
    this.#id = config.id;
    
    var queryModel = config.queryModel;
    this.#queryModel = queryModel;
   
    queryModel.addEventListener('change', function(event){
      this.updatePivotTableUi();
    }.bind(this));
   
  }

  renderColumns() {
  }
  
  renderRows(){
  }
  
  renderCells(){
  }
  
  updatePivotTableUi(){
    this.clear();
    this.renderColumns();
    this.renderRows();
    this.renderCells();
  }
  
  clear(){
    var dom = this.getDom();
    dom.innerHTML = '';
  }
  
  getDom(){
    return document.getElementById(this.#id);
  }
}

var pivotTableUi;
function initPivotTableUi(){
  pivotTableUi = new PivotTableUi({
    id: 'pivotTableUi',
    queryModel: queryModel
  });  
}