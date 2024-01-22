class FilterDialog {
  
  static #numRowsColumnName = '__huey_numrows';
  static filterTypes = {
    INCLUDE: 'in',
    EXCLUDE: 'notin',
    BETWEEN: 'between'
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
    
    this.#getOkButton().addEventListener('click', function(event){
      var dialogState = this.#getDialogState();
      this.#queryModel.setQueryAxisItemFilter(this.#queryAxisItem, dialogState);
      filterDialog.close();
    }.bind(this));
    this.#getCancelButton().addEventListener('click', function(event){
      filterDialog.close();
    });
    this.#getClearButton().addEventListener('click', function(event){
      this.clearFilterValueLists();
    }.bind(this));
    
    this.#getValuePicklist().addEventListener('change', this.#handleValuePicklistChange.bind(this));
    this.#getFilterValuesList().addEventListener('change', this.#handleFilterValuesListChange.bind(this));
    this.#getToFilterValuesList().addEventListener('scroll', function(event){
      var target = event.target;
      this.#getFilterValuesList().scrollTop = target.scrollTop;
    }.bind(this));
    
    this.#getFilterType().addEventListener('change', function(event){
      var filterType = event.target;
      var width, element;
      var filterValuesList = this.#getFilterValuesList();
      if (filterType.value === FilterDialog.filterTypes.BETWEEN) {
        this.clearFilterValueLists();
        width = '50%';
        element = filterValuesList.parentNode;
      }
      else {
        element = filterValuesList;
        width = '';
      } 
      element.style.width = width;
      
      // reset the width again so the resizer can manage the width.
      element.style.width = '';
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
    var isBetweenFilterType = filterType === FilterDialog.filterTypes.BETWEEN;
    
    var filterValuesList = this.#getFilterValuesList();
    var filterValuesListOptions = filterValuesList.options;
    var currentValues = this.#extractOptionsFromSelectList(filterValuesList);

    var toFilterValuesList = this.#getToFilterValuesList();
    var toFilterValuesListOptions = toFilterValuesList.options;
    var currentToValues = this.#extractOptionsFromSelectList(toFilterValuesList);
    
    var valueForSelectingToListOption = undefined;
    // get the current selection and create new options out of it.
    var selectedOption, newOptions = [];
    if (isBetweenFilterType) {

      var rangeStart, rangeEnd;
      
      if (filterValuesList.selectedOptions.length === 1 && toFilterValuesList.selectedOptions.length === 0 && selectedOptions.length === 1) {
        // one value is selected in the picklist, and the start of an existing range is selected: 
        // we will attempt to update the start of the existing range
        var newSelectedValueOption = selectedOptions[0];
        var newSelectedValue = newSelectedValueOption.value;

        var selectedValueOption = filterValuesList.selectedOptions[0]
        var selectedValue = selectedValueOption.value;
        var correspondingToValue = currentToValues[selectedValue];

        if (currentValues[newSelectedValue] !== undefined) {
          // invalid choice: a range already exists for the newly selected value
        }
        else
        if (newSelectedValue > correspondingToValue.value) {
          // invalid choice: newly selected value exceeds to end of the existing range
        }
        else {
          delete currentValues[selectedValue];
          delete currentToValues[selectedValue];
          
          currentValues[newSelectedValue] = {
            value: newSelectedValueOption.value,
            label: newSelectedValueOption.label
          };
          currentToValues[newSelectedValue] = correspondingToValue;
        }
      }
      else
      if (filterValuesList.selectedOptions.length === 0 && toFilterValuesList.selectedOptions.length === 1 && selectedOptions.length === 1) {
        // one value is selected in the picklist, and the end of an existing range is selected: 
        // we will attempt to update the end of the existing range
        var newSelectedValueOption = selectedOptions[0];
        var newSelectedValue = newSelectedValueOption.value;

        var selectedValueIndex = toFilterValuesList.selectedIndex;
        var selectedValueOption = toFilterValuesList.options[selectedValueIndex];        
        var correspondingOption = filterValuesList.options[selectedValueIndex];
        var selectedValue = correspondingOption.value;
        
        if (newSelectedValue < selectedValue) {
          // invalid choice: newly selected value exceeds to end of the existing range
        }
        else {
          currentToValues[selectedValue] = {
            value: newSelectedValueOption.value,
            label: newSelectedValueOption.label
          };
        }        
      }
      else {
        // go through the options, and add one pair of from/to values for a set of adjacent selected options
        for (var i = 0; i < options.length; i++){
          var option = options[i];
          if (rangeStart === undefined) {
            if (option.selected) {
              rangeStart = rangeEnd = {
                value: option.value,
                label: option.label
              };
            }
          }
          else
          if (option.selected) {
            rangeEnd = {
              value: option.value,
              label: option.label
            };
          }
          else {
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
  
  #handleFilterValuesListChange(event){
    var selectControl = event.target;
    var options = selectControl.options;
    var toValuesList = this.#getToFilterValuesList();
    var toValuesOptions = toValuesList.options;
    var valueOptionsToRemove = [];
    var toValueOptionsToRemove = [];
    for (var i = 0 ; i < options.length; i++){
      var option = options[i];
      if (option.selected) {
        valueOptionsToRemove.push(option);
        if (i < toValuesOptions.length){
          toValueOptionsToRemove.push(toValuesOptions[i]);
        }
      }
    }
    valueOptionsToRemove.forEach(function(option){
      selectControl.removeChild(option);
    });
    toValueOptionsToRemove.forEach(function(option){
      toValuesList.removeChild(option);
    });
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
  
  #getCancelButton(){
    return byId('filterDialogCancelButton');
  }

  #getClearButton(){
    return byId('filterDialogClearButton');
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