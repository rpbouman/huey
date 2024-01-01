class CellSet {
    
  #queryModel = undefined;
  #cells = [];
  #columnsTupleSet = undefined;
  #rowsTupleSet = undefined;
  
  constructor(queryModel, columnsTupleSet, rowsTupleSet){
    this.#queryModel = queryModel;
    this.#columnsTupleSet = columnsTupleSet;  
    this.#rowsTupleSet = rowsTupleSet;  
  }

  #getSqlSelectStatement(){
    return '';
  }
  
  clear(){
    this.#cells = [];
  }  

  async #executeCellsQuery(fromColumnTuple, toColumnTuple, fromRowTuple, toRowTuple){
  }

  async getCells(fromColumnTuple, toColumnTuple, fromRowTuple, toRowTuple){
    var data = this.#cells;
    var cells = [];

    return cells;
  }    
  
}
