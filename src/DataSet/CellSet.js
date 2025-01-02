class CellSet extends DataSetComponent {

  // Cells is an array indexed by columntupleIndex * rowTupleIndex
  // Cells array elements are objects having a values property.
  // The values property is an array of values corresponding (by position) to the items of the cells axis
  #cells = [];
  #cellValueFields = {};

  #tupleSets = [];

  static datasetRelationName = '__data';
  static #tupleDataRelationName = '__huey_tuples';
  static #cellIndexColumnName = '__huey_cellIndex';
  static #countStarExpressionAlias = '__huey_count_star';

  constructor(queryModel, tupleSets, settings){
    super(queryModel, settings);
    this.#tupleSets = tupleSets;
  }

  clear(){
    this.#cells = [];
    this.#cellValueFields = {};
  }

  getCellValueFields(){
    return this.#cellValueFields;
  }

  // variable argument list,
  // each argument should be a tuple index
  // tuple indexes should by in order of tupleSets
  getCellIndex(){
    var cellIndex = 0;
    var tupleSets = this.#tupleSets;
    var numTupleSets = tupleSets.length || 0;

    // for each tupleset ...
    for (var i = 0; i < numTupleSets; i++){
      var tupleIndex = arguments[i];
      var factor = tupleIndex;
      // ...get the factor for all downstream tuplesets.
      for (var j = i + 1; j < numTupleSets; j++){
        var tupleSet = tupleSets[j];
        var numTuples = tupleSet.getTupleCountSync();
        if (!numTuples) {
          continue;
        }
        factor *= numTuples;
      }
      cellIndex += factor;
    }
    return cellIndex;
  }

  // convenience method.
  // calls getCellIndex and returns the corresponding (cached) cell
  // returns undefined if the cell does not exist.
  #getCell(){
    var cellIndex = this.getCellIndex.apply(this, arguments);
    var cells = this.#cells;
    var cell = cells[cellIndex];
    return cell;
  }

  // based on the passed ranges, this returns an array of groups of tupleindices that together identify each tuple in each tupleset in the range.
  // typically, callers should only call this with the first argument
  getTupleRanges(ranges, previousTupleIndices, allRanges){
    if (!previousTupleIndices){
      allRanges = [];
      previousTupleIndices = [];
    }

    var numRanges = ranges.length;
    if (numRanges === 0) {
      allRanges.push(previousTupleIndices);
      return allRanges;
    }

    var tupleSets = this.#tupleSets;
    var numTupleSets = tupleSets.length;

    var tupleSetIndex = numTupleSets - numRanges;
    var tupleSet = tupleSets[tupleSetIndex];
    var tupleCount = tupleSet.getTupleCountSync();

    var range = ranges.shift();
    var fromTuple = range[0];
    var toTuple = range[1];

    if (fromTuple === 0 && toTuple === 0) {
      toTuple = 1;
    }

    // Make sure we stay within the range of actual number of tuples.
    if (toTuple > tupleCount){
      toTuple = tupleCount;
    }

    for (var i = fromTuple; i < toTuple; i++){
      var rangesCopy = [].concat(ranges);
      var previousTupleIndicesCopy = [].concat(previousTupleIndices);
      previousTupleIndicesCopy.push(i);
      this.getTupleRanges(rangesCopy, previousTupleIndicesCopy, allRanges);
    }
    return allRanges;
  }

  #getTuplesCte(tuplesToQuery, tuplesFields, includeGroupingId){
    var tupleSets = this.#tupleSets;
    var totalsItems = [];
    var combinationTuples = [];
    var allQueryAxisItems = [];
    var cellIndices = Object.keys(tuplesToQuery);
    _cells: for (var i = 0; i < cellIndices.length; i++) {
      var groupingId = 0;
      var cellIndex = cellIndices[i];
      var combinationTuple = [cellIndex];
      var tuples = tuplesToQuery[cellIndex];
      _tuples: for (var j = 0; j < tuples.length; j++){
        var tupleSet = tupleSets[j];
        var queryAxisItems = tupleSet.getQueryAxisItems();
        if (i === 0) {
          allQueryAxisItems = allQueryAxisItems.concat(queryAxisItems);
          totalsItems[j] = queryAxisItems.filter(function(queryAxisItem){
            return queryAxisItem.includeTotals;
          });
        }
        if (j && totalsItems[j] && totalsItems[j].length){
          groupingId <<= totalsItems[j].length;
        }
        var tuple = tuples[j];
        if (tuple){
          groupingId |= parseInt(tuple[TupleSet.groupingIdAlias]) || 0;
          var tupleValues = tuple.values;
          var fields = tuplesFields[j];
          _fields: for (var k = 0; k < queryAxisItems.length; k++){
            var queryAxisItem = queryAxisItems[k];
            var tupleValue = tupleValues[k];
            var tupleValueField = fields[k];
            var literal = queryAxisItem.literalWriter ? queryAxisItem.literalWriter(tupleValue, tupleValueField) : String(tupleValue);
            combinationTuple.push(literal);
          }
        }
      }
      if (includeGroupingId) {
        combinationTuple.push(groupingId);
      }
      combinationTuples.push(combinationTuple);
    }
    if (cellIndices.length === 0){
      combinationTuples.push([0]);
    }
    var tuplesSql = combinationTuples.map(function(combinationTuple){
      return `(${combinationTuple.join(', ')})`;
    }).join('\n  , ');
    
    var relationDefinition = allQueryAxisItems.map(function(queryAxisItem){
      return quoteIdentifierWhenRequired( QueryAxisItem.getCaptionForQueryAxisItem(queryAxisItem) );
    });
    relationDefinition.unshift(quoteIdentifierWhenRequired(CellSet.#cellIndexColumnName));
    if (includeGroupingId) {
      relationDefinition.push(quoteIdentifierWhenRequired(TupleSet.groupingIdAlias));
    }
    relationDefinition = `${quoteIdentifierWhenRequired(CellSet.#tupleDataRelationName)}(\n  ${relationDefinition.join('\n, ')}\n)`;
    tuplesSql = `${relationDefinition} AS (\n  FROM (VALUES\n    ${tuplesSql}\n  )\n)`;
    return tuplesSql;
  }
  
  // this method is here to implement
  // https://github.com/rpbouman/huey/issues/134
  // idea is to use the tuples to come up with a more clever/optimized query condition 
  // to be pushed down to the lowest level of the cellset.
  #getFilterAxisItemsForCells(
    // object keyed by cellindex, with an array of tuples as value.
    tuplesToQuery,
    // fields describing the values of the tuples.
    tuplesFields,
    // the cell axis items for which to generate aggregates
    cellsAxisItemsToFetch
  ){
    var tupleSets = this.#tupleSets;
    var queryModel = this.getQueryModel();
    var filterAxis = queryModel.getFiltersAxis();
    var originalFilterAxisItems = filterAxis.getItems();
    
    /*
    // most basic optimization: IN clause for all non-derived items (=columns)
    // we will make a special tuple filter item for this:
    // - a filter item that combines multiple axis items, and a array of tuple value arrays
    var first = true;
    var columnItems = [];
    var fields = [];
    var tupleValues = [];
    var tuplesFilterItem;
    for (var tupleIndex in tuplesToQuery){
      var filterTupleValues = [];
      var tupleToQuery = tuplesToQuery[tupleIndex];
      for (var i = 0; i < tupleSets.length; i++){
        var tuple = tupleToQuery[i];
        if (!tuple) {
          continue;
        }
        var tupleFields = tuplesFields[i];
        var tupleValues = tuple.values;

        var tupleSet = tupleSets[i];
        var queryAxisItems = tupleSet.getQueryAxisItems();
        
        for (var j = 0; j < queryAxisItems.length; j++){
          var queryAxisItem = queryAxisItems[j];
          if (queryAxisItem.derivation) {
            continue;
          }
          // check if this tuple item appears in the filters axis
          var sqlForQueryAxisItem = QueryAxisItem.getSqlForQueryAxisItem(queryAxisItem);
          var originalFilterAxisItemIndex = originalFilterAxisItems.findIndex(function(filterAxisItem){
            return QueryAxisItem.getSqlForQueryAxisItem(filterAxisItem) === sqlForQueryAxisItem;
          });
          // If it exists as fitler axis item, we can now remove it since the condition we're generating is stronger
          if (originalFilterAxisItemIndex !== -1) {
            originalFilterAxisItems.splice(originalFilterAxisItemIndex, 1);
          }
            
          if (first){
            columnItems.push(queryAxisItem);
            var tupleField = tupleFields[j];
            fields.push(tupleField);
          }
          var tupleValue = tupleValues[j];
          filterTupleValues.push(tupleValue);
        }
      }
      
      if (first) {
        first = false;
        if (!columnItems.length) {
          break;
        }
        tuplesFilterItem = {
          queryAxisItems: columnItems,
          fields: fields,
          filter: {
            filterType: FilterDialog.filterTypes.INCLUDE,
            values: []
          }
        }
      }
      tuplesFilterItem.filter.values.push(filterTupleValues)
    }
    
    if (tuplesFilterItem) {
      originalFilterAxisItems.unshift(tuplesFilterItem);
    }
    */
    
    return originalFilterAxisItems;
  }

  #getSqlQueryForCells(
    // object keyed by cellindex, with an array of tuples as value.
    tuplesToQuery,
    // fields describing the values of the tuples.
    tuplesFields,
    // the cell axis items for which to generate aggregates
    cellsAxisItemsToFetch
  ){
    var queryModel = this.getQueryModel();
    var datasource = queryModel.getDatasource();

    var rowsAxisItems = queryModel.getRowsAxis().getItems();
    var columnsAxisItems = queryModel.getColumnsAxis().getItems();
    var axisItems = [].concat(rowsAxisItems, columnsAxisItems);
    var allItems = [].concat(axisItems, cellsAxisItemsToFetch || []);
    var filterAxisItems = this.#getFilterAxisItemsForCells(
      tuplesToQuery,
      tuplesFields,
      cellsAxisItemsToFetch
    );
    
    var samplingConfig = queryModel.getSampling(QueryModel.AXIS_CELLS);
    var datasource = queryModel.getDatasource();
    var sql = SqlQueryGenerator.getSqlSelectStatementForAxisItems({
      datasource: datasource, 
      queryAxisItems: allItems, 
      filterAxisItems: filterAxisItems,
      includeOrderBy: false,
      finalStateAsCte: true,
      cteName: '__huey_cells',
      samplingConfig: samplingConfig
    });

    var totalsItems = allItems.filter(function(queryAxisItem){
      return queryAxisItem.includeTotals === true;
    });
    var hasTotalsItems = Boolean(totalsItems.length);
    var tuples = this.#getTuplesCte(tuplesToQuery, tuplesFields, hasTotalsItems);
    
    sql += `, ${tuples}`;
    
    var select = cellsAxisItemsToFetch.map(function(axisItem){
      var expression = QueryAxisItem.getCaptionForQueryAxisItem(axisItem);
      var qualifiedIdentifier = getQualifiedIdentifier('__huey_cells', expression);
      var alias = QueryAxisItem.getSqlForQueryAxisItem(axisItem, CellSet.datasetRelationName);
      return `${qualifiedIdentifier} AS ${quoteIdentifierWhenRequired(alias)}`;
    });
    select.unshift(
      getQualifiedIdentifier(
        CellSet.#tupleDataRelationName, 
        CellSet.#cellIndexColumnName
      )
    );
    var from = `FROM ${quoteIdentifierWhenRequired(CellSet.#tupleDataRelationName)}`;
    var joinSql, onCondition;
    if (axisItems.length) {
      joinSql = `LEFT JOIN`;
      onCondition = axisItems.map(function(axisItem){
        var axisExpression = QueryAxisItem.getCaptionForQueryAxisItem(axisItem)
        var leftExpression = getQualifiedIdentifier(CellSet.#tupleDataRelationName, axisExpression);
        var rightExpression = getQualifiedIdentifier('__huey_cells', axisExpression);
        return `${leftExpression} is not distinct from ${rightExpression}`;
      });
    }
    else {
      joinSql = `CROSS JOIN`;
      onCondition = '';
    }
    joinSql += ` ${quoteIdentifierWhenRequired('__huey_cells')}`;
    from += `\n${joinSql}`;

    if (hasTotalsItems) {
      select.push(
        getQualifiedIdentifier(
          CellSet.#tupleDataRelationName,
          TupleSet.groupingIdAlias
        )
      );
      var leftExpression = getQualifiedIdentifier(CellSet.#tupleDataRelationName, TupleSet.groupingIdAlias);
      var rightExpression = getQualifiedIdentifier('__huey_cells', TupleSet.groupingIdAlias);
      onCondition.push(`${leftExpression} = ${rightExpression}`);
    }

    if (onCondition.length) {
      from += `\nON  ${onCondition.join(`\nAND `)}`;
    }
    
    sql += `\nSELECT ${select.join('\n, ')}`;
    sql += `\n${from}`;

    return sql;
    
  }

  async #executeCellsQuery(
    tuplesToQuery,
    tuplesFields,
    cellsAxisItemsToFetch
  ) {
    var sql = this.#getSqlQueryForCells(
      tuplesToQuery,
      tuplesFields,
      cellsAxisItemsToFetch
    );
    var connection = await this.getManagedConnection();
    var resultSet = await connection.query(sql);
    return resultSet;
  }

  #extractCellsFromResultset(resultSet){
    var cells = {};
    var fields = resultSet.schema.fields;
    for (var i = 0; i < resultSet.numRows; i++){
      var row = resultSet.get(i);
      var cellIndex, cell;
      for (var j = 0; j < fields.length; j++){
        var field = fields[j];
        var fieldName = field.name;
        if (this.#cellValueFields[fieldName] === undefined) {
          this.#cellValueFields[fieldName] = field;
        }
        var value = row[fieldName];

        if (j === 0) {
          cellIndex = value;
          // check if we already cached the cell,
          // because if it already exists then we will update it with the newly fetched metrics
          cell = this.#cells[cellIndex];
          if (cell === undefined){
            // cell didn't exist! So lets add it.
            this.#cells[cellIndex] = cell = {values: {}};
          }
        }
        else {
          cell.values[fieldName] = value;
        }
      }
      cells[cellIndex] = cell;
    }
    return cells;
  }

  // ranges is aa list of tuple index pairs
  async getCells(ranges){
    var queryModel = this.getQueryModel();
    var cellsAxis = queryModel.getCellsAxis();
    var cellsAxisItems = cellsAxis.getItems();

    if (cellsAxisItems.length === 0){
      return undefined;
    }

    var tupleIndices = this.getTupleRanges(ranges);
    var tupleSets = this.#tupleSets;
    var cells = this.#cells;

    // this is where we collect the cells, keyed by cellIndex,
    var availableCells = {};

    // this is where we keep  the collection of values of the tuples
    // for which we currently don't have all required cell values
    // along with the tuple values, we store the cellIndex
    var tuplesToQuery = {};
    var tuplesFields = [];
    // this is where we store the cell axis items that need to be fetched.
    // If there are cells missing, or cells present that still didn't have a value for a required cell axis item,
    // this will contain all cell axis items that need to be queried.
    var cellsAxisItemsToFetch = [];

    // combine values from tuples of different axes into one 'supertuple'
    _combinedTuples: for (var i = 0; i < tupleIndices.length; i++){
      var tupleIndicesItem = tupleIndices[i];
      var cellIndex = this.getCellIndex(...tupleIndicesItem);
      var cell = cells[cellIndex];

      for (var j = 0; j < cellsAxisItems.length; j++){
        var cellsAxisItem = cellsAxisItems[j];
        // we get the sql expression for the cells axis item just as a key to store the cell value.
        // it might be conceptually cleaner to use the caption for the item but captions are always unique, whereas the resulting SQL might not be.
        // not however we don't use it here to generate SQL queries - that is the job of #getSqlQueryForCells
        var sqlExpression = QueryAxisItem.getSqlForQueryAxisItem(cellsAxisItem, CellSet.datasetRelationName);
        if (!cell || cell.values[sqlExpression] === undefined ){
          // we have a cell, but the cell doesn't have a value for this axis item.
          // this means the cell is not complete so we must fetch it.
          // so, we mark the cell as undefined
          cell = undefined;

          // if we aren't already querying this aggregate, then we add it too.
          if (cellsAxisItemsToFetch.indexOf(cellsAxisItem) === -1) {
            cellsAxisItemsToFetch.push(cellsAxisItem);
          }
        }
      }

      if (cell) {
        // If we arrive here, and we still have the cell,
        // it means the cell was not only already cached, but also contains values for all currently reqyested cells axis items.
        // We can serve the cell from the cache and we don't need to include it in our SQL.
        availableCells[cellIndex] = cell;
        continue;
      }

      // If we arrive here, the cell is either not cached, or incomplete,
      // i.e. it lacks one or more values corresponding to the requested cells axis items.
      // If even one cells axis item value is missing, we have to include the cell in our query.
      var tuplesForCell = [];

      // get the actual tuples and store them along with the cell index.
      // we need this to construct a query to fetch only the cells we're missing
      _tuplesetIndices: for (var j = 0; j < tupleIndicesItem.length; j++){

        // ...get the tuple,...
        var tupleIndex = tupleIndicesItem[j];
        var tupleSet = tupleSets[j];

        var tuple = tupleSet.getTupleSync(tupleIndex);
        if (!tuple) {
          // this shouldn't happen!
          // if we arrive here it means we messed up while calculating the tuple ranges.
          //console.error(`Couldn't find tuple ${tupleIndex} in tupleset for query axis ${tupleSet.getQueryAxisId()}`);
          continue;
        }
        tuplesForCell[j] = tuple;
      }

      if (tuplesForCell.length) {
        tuplesToQuery[cellIndex] = tuplesForCell;
      }
    }

    if (cellsAxisItemsToFetch.length){
      for (var i = 0; i < tupleIndicesItem.length; i++){
        var tupleset = this.#tupleSets[i];
        var fields = tupleset.getTupleValueFields();
        tuplesFields[i] = fields;
      }
      var resultset = await this.#executeCellsQuery(
        tuplesToQuery,
        tuplesFields,
        cellsAxisItemsToFetch
      );
      var newCells = this.#extractCellsFromResultset(resultset);
      Object.assign(availableCells, newCells);
    }

    return availableCells;
  }

}
