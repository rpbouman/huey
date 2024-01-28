class FilterDialog {
  
  static #numRowsColumnName = '__huey_numrows';
  static filterTypes = {
    INCLUDE: 'in',
    EXCLUDE: 'notin',
    BETWEEN: 'between',
    NOTBETWEEN: 'notbetween'
  };
  
  #id = undefined;
  #queryAxisItem = undefined;
  #queryModel = undefined;
  
  #valuePicklistPageSize = 100;
  #searchAutoQueryTimeout = 1000;
  
  constructor(config){
    this.#id = config.id;
    this.#queryModel = config.queryModel;
    this.#initEvents();
  }

  #initEvents(){
    var filterDialog = this.getDom();
    
    // Ok button confirms the filter settings and stores them in the model
    this.#getOkButton().addEventListener('click', function(event){
      var dialogState = this.#getDialogState();
      this.#queryModel.setQueryAxisItemFilter(this.#queryAxisItem, dialogState);
      filterDialog.close();
    }.bind(this));
    
    this.#getRemoveFilterButton().addEventListener('click', function(event){
      this.#queryModel.removeItem(this.#queryAxisItem);
      filterDialog.close();
    }.bind(this));

    this.#getCancelButton().addEventListener('click', function(event){
      filterDialog.close();
    }.bind(this));
        
    // Clear button clears the values lists
    this.#getClearButton().addEventListener('click', function(event){
      this.clearFilterValueLists();
    }.bind(this));

    // clear selected button clears the selected values from the value lists
    this.#getClearSelectedButton().addEventListener('click', function(event){
      this.#removeSelectedValues();
    }.bind(this));
    
    // Selecting values in the picklist adds them to the value lists (behavior depends on the filter type)
    this.#getValuePicklist().addEventListener('change', this.#handleValuePicklistChange.bind(this));
    
    //this.#getFilterValuesList().addEventListener('change', this.#handleFilterValuesListChange.bind(this));
    
    // When the filterType is set to a range type (BETWEEN/NOTBETWEEN), the two value lists share a scrollbar.
    // this handler ensures the scrolbar moves both lists.
    this.#getToFilterValuesList().addEventListener('scroll', function(event){
      var target = event.target;
      this.#getFilterValuesList().scrollTop = target.scrollTop;
    }.bind(this));
    
    this.#getFilterType().addEventListener('change', function(event){
      var filterType = event.target;
      var width, element;
      var filterValuesList = this.#getFilterValuesList();
      switch (filterType.value){
        case FilterDialog.filterTypes.BETWEEN:
        case FilterDialog.filterTypes.NOTBETWEEN:
          this.clearFilterValueLists();
          width = '50%';
          element = filterValuesList.parentNode;
          break;
        default:
          element = filterValuesList;
          width = '';
      }
      element.style.width = width;
      
      // reset the width again so the resizer can manage the width.
      element.style.width = '';
      this.#getValuePicklist().selectedIndex = -1;
    }.bind(this));
    
    bufferEvents(this.#getSearch(), 'input', function(event, count){
      if (count === undefined) {
        this.#updatePicklist(0, this.#valuePicklistPageSize);
      }
    }, this, this.#searchAutoQueryTimeout);
  }
  
  #sortValues(values){
    var dataType = QueryAxisItem.getQueryAxisItemDataType(this.#queryAxisItem);
    if (dataType){
      var dataTypeInfo = dataTypes[dataType];
      if (dataTypeInfo.isNumeric){
        return values.sort(function(a, b){
          a = parseFloat(a);
          b = parseFloat(b);
          if (a > b) {
            return 1;
          }
          if (a < b) {
            return -1;
          }
          return 0;
        });
      }
    }
    return values.sort();
  }
  
  #extractOptionsFromSelectList(selectList){
    var optionObjects = {};
    var options = selectList.options;
    for (var i = 0; i < options.length; i++){
      var option = options[i];
      optionObjects[option.value] = {
        value: option.value,
        label: option.label
      };
    }
    return optionObjects;
  }
  
  #renderOptionsToSelectList(options, selectList){
    var values = Object.keys(options);
    values = this.#sortValues(values);
   
    for (var i = 0; i < values.length; i++){
      var value = values[i];
      var option = options[value];
      var option = createEl('option', {
        value: option.value,
        label: option.label
      });
      selectList.appendChild(option);
    }   
  }
    
  #handleValuePicklistChange(event){
    var selectControl = event.target;
    var options = selectControl.options;
    var selectedOptions = selectControl.selectedOptions;

    // first, check if this is a special "loader" option
    var selectedOption;
    if (selectedOptions.length === 1) {
      var selectedOption = selectedOptions[0];
      // it is a loader option, so load more values and exit.
      if (selectedOption.getAttribute('data-next-page-loader') === 'true') {
        var offset = parseInt(selectedOption.getAttribute('data-offset'), 10);
        var limit = parseInt(selectedOption.getAttribute('data-limit'), 10);
        this.#updatePicklist(offset, limit);
        return;
      }
    }
    
    var filterType = this.#getFilterType().value;
    var isRangeFilterType;
    switch (filterType){
      case FilterDialog.filterTypes.BETWEEN:
      case FilterDialog.filterTypes.NOTBETWEEN:
        isRangeFilterType = true;
        break;
      default:
        isRangeFilterType = false;
    }
    
    var filterValuesList = this.#getFilterValuesList();
    var filterValuesListOptions = filterValuesList.options;
    var currentValues = this.#extractOptionsFromSelectList(filterValuesList);

    var toFilterValuesList = this.#getToFilterValuesList();
    var toFilterValuesListOptions = toFilterValuesList.options;
    var currentToValues = this.#extractOptionsFromSelectList(toFilterValuesList);
    
    var valueIndex;
    
    var valueForSelectingToListOption = undefined;
    // get the current selection and create new options out of it.
    if (isRangeFilterType) {
      var rangeStart, rangeEnd;
      
      if (selectedOptions.length === 1 && (
          filterValuesList.selectedOptions.length === 1 && toFilterValuesList.selectedOptions.length === 0 ||
          filterValuesList.selectedOptions.length === 0 && toFilterValuesList.selectedOptions.length === 1
        )
      ) {
        var selectedList = filterValuesList.selectedOptions.length ? filterValuesList : toFilterValuesList;
        var values = filterValuesList.selectedOptions.length ? currentValues : currentToValues;

        var correspondingList = filterValuesList.selectedOptions.length ? toFilterValuesList : filterValuesList;
        var correspondingValues = filterValuesList.selectedOptions.length ? currentToValues : currentValues;

        var selectedIndex = selectedList.selectedIndex;

        var option = selectedList.options[selectedIndex];
        var optionValue = option.value;        

        var correspondingOption = correspondingList.options[selectedIndex];
        var correspondingValue = correspondingOption.value;        
        
        if (values[selectedOption.value]) {
          // invalid choice, range already exists
        }
        else
        if ( values === currentValues &&  selectedOption.value > correspondingValue) {
          // noop, fromValue can't be bigger than toValue
        }
        else
        if ( values === currentToValues && selectedOption.value < correspondingValue) {
          // noop, toValue can't be smaller than fromValue
        }
        else {
          delete values[option.value];
          var correspondingOptionValueObject = correspondingValues[correspondingValue];
          delete correspondingValues[correspondingValue];

          values[selectedOption.value] = {
            value: selectedOption.value,
            label: selectedOption.label
          };
          correspondingValues[correspondingValue] = correspondingOptionValueObject;
        }
      }
      else {
        // go through the options, and add one pair of from/to values for a set of adjacent selected options
        for (var i = 0; i < options.length; i++){
          var option = options[i];
          if (option.selected) {
            if (rangeStart === undefined) {
              rangeStart = rangeEnd = {
                value: option.value,
                label: option.label
              };
            }
            else {
              rangeEnd = {
                value: option.value,
                label: option.label
              };
            }
          }          
          else 
          if(rangeStart){
            // check if we should add the new range
            if (
              currentValues[rangeStart.value] === undefined || 
              JSON.stringify(currentValues[rangeStart.value]) === JSON.stringify(currentToValues[rangeStart.value])
            ){
              currentValues[rangeStart.value] = rangeStart;
              currentToValues[rangeStart.value] = rangeEnd;
            }

            // save the value so we can select it in the toValues list.
            if (selectedOptions.length === 1 && rangeStart.value === rangeEnd.value) {
              valueForSelectingToListOption = rangeStart.value;
            }

            rangeStart = rangeEnd = undefined;
          }
        }
        
        if (rangeStart !== undefined && rangeEnd !== undefined) {
          // check if we should add the new range
          if (
            currentValues[rangeStart.value] === undefined || 
            JSON.stringify(currentValues[rangeStart.value]) === JSON.stringify(currentToValues[rangeStart.value])
          ){
            currentValues[rangeStart.value] = rangeStart;
            currentToValues[rangeStart.value] = rangeEnd;
            
            // save the value so we can select it in the toValues list.
            if (selectedOptions.length === 1 && rangeStart.value === rangeEnd.value) {
              valueForSelectingToListOption = rangeStart.value;
            }
          }
        }
        
      }
    }
    else {
      // go through the new options, and add them if they aren't already in the list.
      for (var i = 0; i < selectedOptions.length; i++) {
        selectedOption = selectedOptions[i];
        if (currentValues[selectedOption.value] !== undefined) {
          continue;
        }
        currentValues[selectedOption.value] = {
          value: selectedOption.value,
          label: selectedOption.label
        }
      }
    }
    
    this.clearFilterValueLists();
    
    this.#renderOptionsToSelectList(currentValues, filterValuesList);
    this.#renderOptionsToSelectList(currentToValues, toFilterValuesList);
    
    if (valueForSelectingToListOption !== undefined) {
      filterValuesListOptions = filterValuesList.options;
      for (var i = 0; i < filterValuesListOptions.length; i++){
        if (filterValuesListOptions[i].value !== valueForSelectingToListOption) {
          continue;
        }
        toFilterValuesList.selectedIndex = i;
        break;
      }
    }
  }
  
  #removeSelectedValues(){
    var selectControl = this.#getFilterValuesList();
    var options = selectControl.options;
    var toValuesList = this.#getToFilterValuesList();
    var toValuesOptions = toValuesList.options;
    var currentValues = {}, currentToValues = {};
    for (var i = 0 ; i < options.length; i++){
      var option = options[i];
      var toOption;
      if (i < toValuesOptions.length){
        toOption = toValuesOptions[i];
      }
      
      if (option.selected || toOption && toOption.selected) {
        // either side has a selected option, which should be removed.
      }
      else {
        // neither side has a selected option, so we add it to preserve
        currentValues[option.value] = {
          value: option.value,
          label: option.label,
        };
        if (toOption){
          currentToValues[toOption.value] = {
            value: toOption.value,
            label: toOption.label,
          };
        }
      }
    }

    selectControl.innerHTML = '';
    this.#renderOptionsToSelectList(currentValues, selectControl);
    toValuesList.innerHTML = '';
    this.#renderOptionsToSelectList(currentToValues, toValuesList);
    
    this.#getValuePicklist().selectedIndex = -1;
  }

  #getDialogButtons(){
    var filterDialog = this.getDom();
    var footer = filterDialog.getElementsByTagName('footer').item(0);
    var buttons = footer.getElementsByTagName('button');
    return buttons;
  }

  #getOkButton(){
    return byId('filterDialogOkButton');
  }
  
  #getRemoveFilterButton(){
    return byId('filterDialogRemoveButton');
  }
  
  #getCancelButton(){
    return byId('filterDialogCancelButton');
  }

  #getClearButton(){
    return byId('filterDialogClearButton');
  }

  #getClearSelectedButton(){
    return byId('filterDialogClearSelectedButton');
  }

  #getSpinner(){
    return byId('filterDialogSpinner'); 
  }
  
  setBusy(trueOrFalse){
    var dom = this.getDom();
    dom.setAttribute('aria-busy', String(trueOrFalse));
  }

  #getSearch(){
    return byId('filterSearch');
  }
  
  #getSearchStatus(){
    return byId('searchStatus');
  }

  #getFilterType(){
    return byId('filterType');
  }

  #getValuePicklist(){
    return byId('filterPicklist');
  }
  
  clearValuePicklist(){
    this.#getValuePicklist().innerHTML = '';
  }

  #getFilterValuesList(){
    return byId('filterValueList');
  }
  
  #getToFilterValuesList(){
    return byId('toFilterValueList');
  }

  clearFilterValueList(){
    this.#getFilterValuesList().innerHTML = '';
  }

  clearToFilterValueList(){
    this.#getToFilterValuesList().innerHTML = '';
  }
  
  clearFilterValueLists() {
    this.clearFilterValueList();
    this.clearToFilterValueList();
  }
  
  #positionFilterDialog(queryAxisItemUi){
    var boundingRect = queryAxisItemUi.getBoundingClientRect();
    var filterDialog = this.getDom();
    filterDialog.style.left = boundingRect.x + 'px' 
    filterDialog.style.top = (boundingRect.y + boundingRect.height) + 'px';
  }
  
  #clearDialog(){
    this.#getValuePicklist().innerHTML = '';
    this.clearFilterValueLists();
    this.#getSearch().value = '';
  }
  
  async openFilterDialog(queryModel, queryModelItem, queryAxisItemUi){
    this.#clearDialog();
    
    this.#queryAxisItem = queryModelItem;
    this.#queryModel = queryModel;
    
    this.#updateDialogState();
    
    this.#positionFilterDialog(queryAxisItemUi);
    var filterDialog = this.getDom();
    filterDialog.showModal();
    this.#updatePicklist(0, this.#valuePicklistPageSize);
  }
  
  #updateDialogState(){
    var queryAxisItem = this.#queryAxisItem;
    var filter = queryAxisItem.filter;
    if (filter){
      this.#getFilterType().value = filter.filterType;
      this.#renderOptionsToSelectList(filter.values, this.#getFilterValuesList());
      this.#renderOptionsToSelectList(filter.toValues, this.#getToFilterValuesList());      
    }
    else {
    }
  }
  
  #getDialogState(){
    var dialogState = {
      filterType: this.#getFilterType().value,
      values: this.#extractOptionsFromSelectList(this.#getFilterValuesList()),
      toValues: this.#extractOptionsFromSelectList(this.#getToFilterValuesList()),
    };
    return dialogState;
  }
  
  async #updatePicklist(offset, limit){
    var result = await this.#getPicklistValues(offset, limit);
    this.#populatePickList(result, offset, limit);
  }
  
  async #getPicklistValues(offset, limit){
    this.setBusy(true);

    if (offset === 0) {
      var searchStatus = this.#getSearchStatus();
      searchStatus.innerHTML = 'Finding values...';
    }
    
    var datasource = this.#queryModel.getDatasource();
    var sqlExpression = QueryAxisItem.getSqlForQueryAxisItem(this.#queryAxisItem);

    var fromClause = datasource.getFromClauseSql();
    var sql;
    if (offset === 0) {
      sql = [
        'SELECT',
        `${sqlExpression} AS "value"`,
        `,${sqlExpression} AS "label"`,
        `,count(*) over () as "${FilterDialog.#numRowsColumnName}"`,
        fromClause,
      ];
    }
    else {
      sql = [
        'SELECT DISTINCT',
        `${sqlExpression} AS "value"`,
        `,${sqlExpression} AS "label"`,
        fromClause
      ];
    }
    
    var search = this.#getSearch();
    var searchString = search.value.trim();
    var parameters = [];
    var bindValue;
    if (searchString.length){
      var condition;
      var dataType = QueryAxisItem.getQueryAxisItemDataType(this.#queryAxisItem);
      switch (dataType) {
        case 'VARCHAR':
        // TODO: think of a more clever way to deal with non-VARCHAR values.
        default:
          condition = `${sqlExpression} like ?`;
          bindValue = `${searchString}`;
          break;
      }
      if (condition) {
        sql.push(`WHERE ${condition}`);
      }      
    }
    
    if (bindValue){
      parameters.push(bindValue);
    }
    
    if (offset === 0){
      sql.push(`GROUP BY ${sqlExpression}`);
    }
    sql.push(`ORDER BY ${sqlExpression}`);

    if (limit === undefined) {
      limit = this.#valuePicklistPageSize;
    }
    parameters.push(limit);
    sql.push('LIMIT ?');
    
    if (offset === undefined){
      offset = 0;
    }
    parameters.push(offset);
    sql.push('OFFSET ?');
    
    sql = sql.join('\n');
    console.log(`Preparing sql for filter dialog value picklist:`);
    console.log(sql);
    var preparedStatement = await datasource.prepareStatement(sql);
    console.log(`preparedStatement: ${preparedStatement}`);
    console.log(`Parameters: ${JSON.stringify(parameters)}`);
    var timeMessage = `Executing filter dialog picklist query.`;
    console.time(timeMessage);
    var result = await preparedStatement.query.apply(preparedStatement, parameters);
    console.timeEnd(timeMessage);
    return result;  
  }
  
  #populatePickList(resultset, offset, limit){
    if (offset === 0) {
      var searchStatus = this.#getSearchStatus();
      var count = resultset.numRows;
      if (count) {
        count = resultset.get(0)[FilterDialog.#numRowsColumnName];
      }
      searchStatus.innerHTML = `${count} values found.`;
    }
    
    var listOfValues = this.#getValuePicklist();
    
    var exhausted = resultset.numRows < limit;

    var optionGroup, optionsContainer;
    var optionGroupLabelText = `Values ${offset + 1} - ${offset + resultset.numRows}`;
    
    if (offset === 0) {
      this.clearValuePicklist();
      if (exhausted) {
        optionsContainer = listOfValues;
      }
      else { 
        optionGroup = createEl('optgroup', {
          label: optionGroupLabelText,
          "data-offset": offset + limit,
          "data-limit": limit
        });
        listOfValues.appendChild(optionGroup);
        optionsContainer = optionGroup
      }
    }
    else {
      optionGroup = listOfValues.childNodes.item(listOfValues.childNodes.length - 1);
      if (optionGroup.getAttribute('data-offset') !== String(offset)) {
        throw new Error(`Unexpected error, invalid page`);
      }
      optionGroup.setAttribute('label', optionGroupLabelText);
      optionGroup.innerHTML = '';
      optionsContainer = optionGroup;
    }
    
    var option;
    for (var i = 0; i < resultset.numRows; i++) {
      var row = resultset.get(i);
      option = createEl('option', {
        value: row.value,
        label: row.label
      });
      optionsContainer.appendChild(option);
    }

    this.setBusy(false);

    if (exhausted){
      return;
    }
    optionGroup = createEl('optgroup', {
      label: `${offset + resultset.numRows + 1} - ...`,
      "data-offset": offset + limit,
      "data-limit": limit
    });
    option = createEl('option', {
      value: 'nextPage',
      label: `Click to load the next ${limit} values...`,
      "data-next-page-loader": true,
      "data-offset": offset + limit,
      "data-limit": limit
    });
    optionGroup.appendChild(option);
    listOfValues.appendChild(optionGroup);
  }
    
  getDom(){
    return byId(this.#id);
  }
}

var filterDialog;
function initFilterUi(){
  filterDialog = new FilterDialog({
    id: 'filterDialog',
    queryModel: queryModel
  });
}