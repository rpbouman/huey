class FilterDialog {

  static MULTIPLE_VALUES_SEPARATOR = ';';
  
  static #numRowsColumnName = '__huey_numrows';
  static filterTypes = {
    INCLUDE: 'in',
    EXCLUDE: 'notin',
    LIKE: 'like',
    NOTLIKE: 'notlike',
    BETWEEN: 'between',
    NOTBETWEEN: 'notbetween'
  };

  #id = undefined;
  #queryAxisItem = undefined;
  #queryModel = undefined;

  #defaultValuePicklistPageSize = 100;
  #defaultSearchAutoQueryTimeout = 1000;
  #currentSearchAutoQueryTimeout = undefined;
  #searchQueryHandler = undefined;
  
  #settings = undefined;

  #getValuePicklistPageSize(){
    var settings = this.#settings;
    if (!settings){
      return this.#defaultValuePicklistPageSize
    }
    var valuePicklistPageSize = settings.getSettings(['querySettings', 'filterValuePicklistPageSize']);
    return valuePicklistPageSize;
  }
  
  #getSearchAutoQueryTimeout(){  
    var settings = this.#settings;
    if (!settings){
      return this.#defaultSearchAutoQueryTimeout;
    }
    var searchAutoQueryTimeout = settings.getSettings(['querySettings', 'filterSearchAutoQueryTimeoutInMilliseconds']);
    return searchAutoQueryTimeout;
  }

  constructor(config){
    this.#id = config.id;
    this.#queryModel = config.queryModel;
    this.#settings = config.settings || settings;
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

      this.#updateValueSelectionStatusText();
    }.bind(this));

    // clear selected button clears the selected values from the value lists
    this.#getClearSelectedButton().addEventListener('click', this.#clearHighlightedValues.bind(this));

    // Selecting values in the picklist adds them to the value lists (behavior depends on the filter type)
    this.#getValuePicklist().addEventListener('change', this.#handleValuePicklistChange.bind(this));

    this.#initFilterValuesList();
    this.#initToFilterValuesList();

    this.#getFilterType().addEventListener('change', function(event){
      var filterType = event.target;
      var width, element;
      var filterValuesList = this.#getFilterValuesList();
      switch (filterType.value){
        case FilterDialog.filterTypes.BETWEEN:
        case FilterDialog.filterTypes.NOTBETWEEN:
          if (this.#getFilterValuesList().options.length !== this.#getToFilterValuesList().options.length){
            this.clearFilterValueLists();
          }
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
      this.#updateValueSelectionStatusText();
    }.bind(this));

    var includeAllFiltersCheckbox = this.#getIncludeAllFilters();
    includeAllFiltersCheckbox.checked = settings.getSettings(['filterDialogSettings', 'filterSearchApplyAll']);
    includeAllFiltersCheckbox.addEventListener('change', function(event){
      // TODO: check to see if there are any other filter items,
      // and also if they have any filter condition set.
      // If we can avoid a query, then return, if not, repopulate the list.
      var target = event.target;
      settings.assignSettings(['filterDialogSettings', 'filterSearchApplyAll'], target.checked);

      this.#updatePicklist();
    }.bind(this));

    var autoWildcardsCheckbox = this.#getAutoWildChards();
    autoWildcardsCheckbox.checked = settings.getSettings(['filterDialogSettings', 'filterSearchAutoWildcards']);
    autoWildcardsCheckbox.addEventListener('change', function(event){
      var target = event.target;
      settings.assignSettings(['filterDialogSettings', 'filterSearchAutoWildcards'], target.checked);

      this.#updatePicklist();
    }.bind(this));

    this.#initSearchQueryHandlerOnce();
    this.#initAddFilterValueButton();
  }

  #clearHighlightedValues(){
    this.#removeSelectedValues();
    this.#updateValueSelectionStatusText();
  }

  #initFilterValuesList(){
    var filterValuesList = this.#getFilterValuesList();
    filterValuesList.addEventListener('change', this.#handleFilterValuesListChange.bind(this));
    filterValuesList.addEventListener('keydown', this.#handleFilterValuesListKeyDown.bind(this));
  }

  #initToFilterValuesList(){
    var toFilterValuesList = this.#getToFilterValuesList();
    
    toFilterValuesList.addEventListener('change', this.#handleToFilterValuesListChange.bind(this));
    toFilterValuesList.addEventListener('keydown', this.#handleFilterValuesListKeyDown.bind(this));
    
    // When the filterType is set to a range type (BETWEEN/NOTBETWEEN), the two value lists share a scrollbar.
    // this handler ensures the scrolbar moves both lists.
    toFilterValuesList.addEventListener('scroll', function(event){
      var target = event.target;
      this.#getFilterValuesList().scrollTop = target.scrollTop;
    }.bind(this));
  }
  
  #handleFilterValuesListKeyDown(event){
    if (event.key !== 'Delete'){
      return;
    }
    this.#clearHighlightedValues();
  }

  #initSearchQueryHandlerOnce(){
    var search = this.#getSearch();
    search.addEventListener('keydown', function(event){
      if (event.key === 'Enter'){
        this.#addValueToFilterValues(event);
        event.target.value = '';
      }
    }.bind(this));
    search.addEventListener('paste', function(event){
      event.preventDefault();
      var pastedText = getPastedText(event);
      pastedText = pastedText.replace(/[\f\n\r\t\v]+/g, FilterDialog.MULTIPLE_VALUES_SEPARATOR);
      search.value = pastedText;      
    }.bind(this));
    this.#initSearchQueryHandler();
  }

  // this adds the event handler that fires on search to update the values list
  // we need to check everytime if the timeout has changed, because then we have to update the handler.
  #initSearchQueryHandler(){
    var searchAutoQueryTimeout = this.#getSearchAutoQueryTimeout();
    if (this.#currentSearchAutoQueryTimeout === searchAutoQueryTimeout){
      return;
    }
    
    var search = this.#getSearch();
    if (this.#searchQueryHandler){
      search.removeEventListener('input', this.#searchQueryHandler);
    }

    this.#searchQueryHandler = bufferEvents(search, 'input', function(event, count){
      if (count === undefined) {
        this.#updatePicklist();
      }
    }, this, searchAutoQueryTimeout);
    
    this.#currentSearchAutoQueryTimeout = searchAutoQueryTimeout;
  }
  
  #initAddFilterValueButton(){
    var addFilterValueButton = this.#getAddFilterValueButton();
    addFilterValueButton.addEventListener('click', function(event){
      this.#addValueToFilterValues(event);
    }.bind(this));
  }
  
  static #addWildcards(searchString){
    var wildcard = '%';
    if (!searchString.startsWith('%')) {
      searchString = wildcard + searchString;
    }
    if (!searchString.endsWith('%')){
      searchString = searchString + wildcard;
    }
    return searchString;
  }
  
  #addValueToFilterValues(){
    // grab the value from the search input
    var search = this.#getSearch(); 
    var searchString = search.value;
    searchString = searchString.trim();
    // if there is no value (or empty string), do nothing
    // (might have to revisit empty string behavior)
    if (!searchString.length){
      return;
    }
    
    var searchStrings = FilterDialog.#splitSearchString(searchString);
    if (!searchStrings.length){
      return;
    }
    
    // check the filter type (opearator)
    var filterType = this.#getFilterType().value;
    var isRangeFilterType = false, isPatternFilterType = false;
    switch (filterType){
      case FilterDialog.filterTypes.LIKE:
      case FilterDialog.filterTypes.NOTLIKE:
        isPatternFilterType = true;
        break;
      case FilterDialog.filterTypes.BETWEEN:
      case FilterDialog.filterTypes.NOTBETWEEN:
        isRangeFilterType = true;
        break;
      default:
    }

    var toFilterValuesList = this.#getToFilterValuesList();
    var filterValuesList = this.#getFilterValuesList();
    var autoWildcards = this.#getAutoWildChards().checked;
    var literalWriter = this.#queryAxisItem.literalWriter;
    searchStrings.forEach(function(searchString){
      if (isPatternFilterType && autoWildcards) {
        searchString = FilterDialog.#addWildcards(searchString);
      }
      var label = searchString ;
      var literal = literalWriter ? literalWriter(searchString) : searchString;
      
      var options, option;

      if (isRangeFilterType && toFilterValuesList.selectedIndex !== -1) {
        option = toFilterValuesList.options[toFilterValuesList.selectedIndex];
        option.value = searchString;
        option.label = label;
        option.setAttribute('data-sql-literal', literal);
        toFilterValuesList.selectedIndex = -1;
        return;
      }

      options = filterValuesList.options;
      var sameValueOptions = [];
      var valueAdded = false;
      for (var i = 0; i < options.length; i++){
        option = options[i];
        if (option.selected) {
          option.value = searchString;
          option.label = label;
          option.setAttribute('data-sql-literal', literal);
          valueAdded = true;
          continue;
        }
        if (option.value === searchString) {
          sameValueOptions.push(option);
        }
      }
      
      if(valueAdded === true){
        if (sameValueOptions.length) {
          for (var i = 0; i < sameValueOptions.length; i++){
            option = sameValueOptions[i];
            option.parentNode.removeChild(option);
          }
        }
      } 
      else 
      if (sameValueOptions.length) {
        for (var i = 1; i < sameValueOptions.length; i++){
          option = sameValueOptions[i];
          option.parentNode.removeChild(option);
        }
      }
      else {
        option = this.#createOptionElementFromValues({
          value: searchString,
          label: label,
          literal: literal
        });
        filterValuesList.appendChild(option);
        if (isRangeFilterType) {
          option = this.#createOptionElementFromValues({
            value: searchString,
            label: label,
            literal: literal
          });
          var selectedIndex = toFilterValuesList.options.length;
          toFilterValuesList.appendChild(option);
          toFilterValuesList.selectedIndex = selectedIndex;
        }
      }      
    }.bind(this));
    search.value = '';
    search.focus();
    this.#updatePicklist();
  }

  #handleFilterValuesListChange(event){
    if (event.target.selectedOptions.length){
      this.#getValuePicklist().selectedIndex = -1;
      this.#getToFilterValuesList().selectedIndex = -1;
    }
  }
  #handleToFilterValuesListChange(){
    if (event.target.selectedOptions.length){
      this.#getValuePicklist().selectedIndex = -1;
      this.#getFilterValuesList().selectedIndex = -1;
    }
  }

  #sortValues(values){
    var dataType = QueryAxisItem.getQueryAxisItemDataType(this.#queryAxisItem);
    if (dataType){
      var dataTypeInfo = getDataTypeInfo(dataType);
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

  #sortValueLists(valuesList, toValuesList){
    var sortedValuesList = {}, sortedToValuesList, toKeys;
    var keys = Object.keys(valuesList);
    var sortedKeys = this.#sortValues([].concat(keys));
    if (toValuesList) {
      sortedToValuesList = {};
      toKeys = Object.keys(toValuesList);
    }

    sortedKeys.forEach(function(key){
      sortedValuesList[key] = valuesList[key];
      if (toValuesList) {
        var toKey = toKeys[keys.indexOf(key)];
        sortedToValuesList[toKey] = toValuesList[toKey];
      }
    });

    return {
      valuesList: sortedValuesList,
      toValuesList: sortedToValuesList
    };
  }

  #extractValueFromOption(option){
    var valueObject = {
      value: option.value,
      label: option.label,
      literal: option.getAttribute('data-sql-literal')
    }
    if (option.getAttribute('data-sql-null') === String(true)) {
      valueObject.isSqlNull = true;
    }
    return valueObject;
  }
  
  #extractValuesFromOptions(options){
    var optionObjects = {};
    for (var i = 0; i < options.length; i++){
      var option = options[i];
      var valueObject = this.#extractValueFromOption(option);
      optionObjects[option.value] = valueObject;
    }
    return optionObjects;
  }

  #createOptionElementFromValues(valueObject){
    var optionElement = createEl('option', {
      value: valueObject.value,
      label: valueObject.label,
      "data-sql-literal": valueObject.literal
    });
    if (valueObject.isSqlNull){
      optionElement.setAttribute('data-sql-null', true);
    }
    return optionElement;
  }

  #extractOptionsFromSelectList(selectList, selected){
    var options = selectList[ selected === true ? 'selectedOptions' : 'options'];
    var values = this.#extractValuesFromOptions(options);
    return values;
  }

  #renderOptionsToSelectList(options, selectList){
    if (options === undefined) {
      return;
    }
    var values = Object.keys(options);

    for (var i = 0; i < values.length; i++){
      var value = values[i];
      var valueObject = options[value];
      var optionElement = this.#createOptionElementFromValues(valueObject);
      selectList.appendChild(optionElement);
    }
  }

  #handleValuePicklistChange(event){
    var isSqlNull;
    var valueSelectionStatusText = undefined;
    var selectControl = event.target;
    var options = selectControl.options;
    var selectedOptions = selectControl.selectedOptions;

    // first, check if this is a special "loader" option
    var selectedOption;
    if (selectedOptions.length === 1) {
      var selectedOption = selectedOptions[0];
      if (selectedOption.getAttribute('data-next-page-loader') === 'true') {
        // it is a loader option, so load more values and exit.
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

    var toFilterValuesList, currentToValues;

    // these are used to set a selection in either the values list or the values to list.
    var restoreSelectionInValueList, restoreSelectionValue;

    // get the current selection and create new options out of it.
    if (isRangeFilterType) {
      toFilterValuesList = this.#getToFilterValuesList();
      var toFilterValuesListOptions = toFilterValuesList.options;
      currentToValues = this.#extractOptionsFromSelectList(toFilterValuesList);

      var rangeStart, rangeEnd;

      // The following condition captures the case where the user selected 1 option in the picklist,
      // and either the values list or the to values list also has 1 option selected.
      // In action is then to use the picklist value to update that end of a range.
      if (
        selectedOptions.length === 1 && selectedOption.getAttribute('data-sql-null') !== String(true) && (
          filterValuesList.selectedOptions.length === 1 && toFilterValuesList.selectedOptions.length === 0 && filterValuesList.selectedOptions[0].getAttribute('data-sql-null') !== String(true) ||
          filterValuesList.selectedOptions.length === 0 && toFilterValuesList.selectedOptions.length === 1 && toFilterValuesList.selectedOptions[0].getAttribute('data-sql-null') !== String(true)
        )
      ){

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
          valueSelectionStatusText = `Existing range collision.`;
        }
        else
        if ( values === currentValues &&  selectedOption.value > correspondingValue) {
          // noop, fromValue can't be bigger than toValue
          valueSelectionStatusText = `From Value exceeds to Value.`;
        }
        else
        if ( values === currentToValues && selectedOption.value < correspondingValue) {
          // noop, toValue can't be smaller than fromValue
          valueSelectionStatusText = `To Value smaller than from Value.`;
        }
        else {
          delete values[option.value];
          var correspondingOptionValueObject = correspondingValues[correspondingValue];
          delete correspondingValues[correspondingValue];

          values[selectedOption.value] = this.#extractValueFromOption(selectedOption);
          correspondingValues[correspondingValue] = correspondingOptionValueObject;
          valueSelectionStatusText = `Range modified.`;
        }

        if (filterValuesList.selectedOptions.length === 1) {
          // if the values list had a selected item, we will restore that selection.
          // (if the to values list had a selected item, it could be the result of adding a new range,
          // and in that case we don't want to restore the selection because the likely new action is adding a new range, not editing the existing range.)
          restoreSelectionInValueList = filterValuesList;
          restoreSelectionValue = optionValue;
        }
      }
      else {
        // go through the options, and add one pair of from/to values for a set of adjacent selected options
        for (var i = 0; i < options.length; i++){
          var option = options[i];

          if (option.selected) {
            // no range start, this is the start of a new range.
            if (rangeStart === undefined) {
              rangeStart = this.#extractValueFromOption(option);
            }

            // update the end of the current range (we keep updating it as long as the options are selected)
            if (rangeStart !== undefined) {
              rangeEnd = this.#extractValueFromOption(option);
            }
          }

          // if the option is not selected, or if we are the last option, then add the current range.
          if((option.selected !== true || i === options.length -1) && rangeStart){
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
              restoreSelectionInValueList = toFilterValuesList;
              restoreSelectionValue = rangeEnd.value;
            }

            rangeStart = rangeEnd = undefined;
          }
        }
        valueSelectionStatusText = `Range created.`;
      }
    }
    else {
      // go through the new options, and add them if they aren't already in the list.
      for (var i = 0; i < selectedOptions.length; i++) {
        selectedOption = selectedOptions[i];
        if (currentValues[selectedOption.value] !== undefined) {
          continue;
        }
        currentValues[selectedOption.value] = this.#extractValueFromOption(selectedOption);
      }
    }

    // clear the value lists and then update them with the changed set of values
    this.clearFilterValueLists();
    var sortedValueLists = this.#sortValueLists(currentValues, currentToValues)
    this.#renderOptionsToSelectList(sortedValueLists.valuesList, filterValuesList);
    this.#renderOptionsToSelectList(sortedValueLists.toValuesList, toFilterValuesList);

    if (valueSelectionStatusText){
      this.#setValueSelectionStatusText(valueSelectionStatusText);
    }
    else {
      this.#updateValueSelectionStatusText();
    }

    //no need to restore a selection
    if (restoreSelectionInValueList === undefined) {
      return ;
    }

    // finally, restore the selection in the value lists.
    filterValuesListOptions = restoreSelectionInValueList.options;
    for (var i = 0; i < filterValuesListOptions.length; i++){
      if (filterValuesListOptions[i].value !== restoreSelectionValue) {
        continue;
      }
      filterValuesListOptions.selectedIndex = i;
      break;
    }

    // the end.
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
        currentValues[option.value] = this.#extractValueFromOption(option);
        if (toOption){
          currentToValues[toOption.value] = this.#extractValueFromOption(toOption);
        }
      }
    }

    this.clearFilterValueLists();
    this.#renderOptionsToSelectList(currentValues, selectControl);
    this.#renderOptionsToSelectList(currentToValues, toValuesList);

    this.#getValuePicklist().selectedIndex = -1;
  }

  #getDialogButtons(){
    var filterDialog = this.getDom();
    var footer = filterDialog.getElementsByTagName('footer').item(0);
    var buttons = footer.getElementsByTagName('button');
    return buttons;
  }

  #getAddFilterValueButton(){
    return byId('addFilterValueButton');
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
    return byId('filterSearchStatus');
  }

  #getValueSelectionStatus(){
    return byId('filterValueSelectionStatus');
  }

  #setValueSelectionStatusText(text){
    this.#getValueSelectionStatus().innerText = text;
  }

  #updateValueSelectionStatusText(){
    var text;
    var count = this.#getFilterValuesList().options.length;
    if (count === 0) {
      text = 'Select values from the picklist';
    }
    else {
      var object = 'value', verb;
      switch (this.#getFilterType().value) {
        case FilterDialog.filterTypes.INCLUDE:
          verb = 'included';
          break;
        case FilterDialog.filterTypes.EXCLUDE:
          verb = 'excluded';
          break;
        case FilterDialog.filterTypes.LIKE:
          object += ' pattern';
          verb = 'included';
          break;
        case FilterDialog.filterTypes.NOTLIKE:
          object += ' pattern';
          verb = 'excluded';
          break;
        case FilterDialog.filterTypes.BETWEEN:
          object += ' range';
          verb = 'included';
          break;
        case FilterDialog.filterTypes.NOTBETWEEN:
          object += ' range';
          verb = 'excluded';
          break;
      }
      if (count > 1){
        object += 's';
      }
      text = `${count} ${object} ${verb}.`;
    }
    this.#setValueSelectionStatusText(text);
  }

  #getIncludeAllFilters(){
    return byId('filterSearchApplyAll');
  }
  
  #getAutoWildChards(){
    return byId('filterSearchAutoWildcards');
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
    this.#initSearchQueryHandler();
    this.#clearDialog();

    this.#queryAxisItem = queryModelItem;
    this.#queryModel = queryModel;

    this.#updateDialogState();

    this.#positionFilterDialog(queryAxisItemUi);
    var filterDialog = this.getDom();
    filterDialog.showModal();
    this.#updatePicklist();
    this.#getSearch().focus();
  }

  #updateDialogState(){
    var queryAxisItem = this.#queryAxisItem;
    var filter = queryAxisItem.filter;
    if (filter){
      this.#getFilterType().value = filter.filterType;

      var sortedValues, sortedValueArgs = [filter.values];
      switch (filter.filterType) {
        case FilterDialog.filterTypes.BETWEEN:
        case FilterDialog.filterTypes.NOTBETWEEN:
          sortedValueArgs.push(filter.toValues);
      }
      sortedValues = this.#sortValueLists.apply(this, sortedValueArgs);
      this.#renderOptionsToSelectList(sortedValues.valuesList, this.#getFilterValuesList());
      this.#renderOptionsToSelectList(sortedValues.toValuesList, this.#getToFilterValuesList());
    }
    else {

    }
    this.#updateValueSelectionStatusText();
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
    if (offset === undefined){
      offset = 0;
    }
    if (limit === undefined){
      limit = this.#getValuePicklistPageSize();
    }
    var result = await this.#getPicklistValues(offset, limit);
    this.#populatePickList(result, offset, limit);
  }

  #getOtherFilterAxisItems(withFilterValues){
    var filtersAxis = this.#queryModel.getFiltersAxis();
    var filtersAxisItems = filtersAxis.getItems();
    var otherFilterAxisItems = filtersAxisItems.filter(function(filterAxisItem){
      if (filterAxisItem === this.#queryAxisItem) {
        return false;
      }
      if (
        filterAxisItem.columnName === this.#queryAxisItem.columnName &&
        filterAxisItem.derivation === this.#queryAxisItem.derivation &&
        filterAxisItem.aggregator === this.#queryAxisItem.aggregator
      ){
        return false;
      }
      if (withFilterValues){
        if (!filterAxisItem.filter) {
          return false;
        }

        if (!filterAxisItem.filter.values) {
          return false;
        }

        if (!Object.keys(filterAxisItem.filter.values).length){
          return false;
        }
      }
      return true;
    }.bind(this));
    return otherFilterAxisItems;
  }
  
  static #splitSearchString(searchString){
    return searchString.split(FilterDialog.MULTIPLE_VALUES_SEPARATOR)
    .map(function(searchString){
      return searchString.trim();
    })
    .filter(function(searchString){
      return Boolean(searchString.length);
    });
  }
  
  #getSqlSelectStatementForPickList(offset, limit){
    var datasource = this.#queryModel.getDatasource();
    var queryAxisItem = this.#queryAxisItem;
    
    var queryAxisItems = [
      Object.assign({}, queryAxisItem, {caption: 'value'}),
      Object.assign({}, queryAxisItem, {caption: 'label'})
    ];

    var filterAxisItems = [];
    var filterSearchApplyAll = settings.getSettings(['filterDialogSettings', 'filterSearchApplyAll']);
    if (filterSearchApplyAll) {
      filterAxisItems = filterAxisItems.concat(this.#getOtherFilterAxisItems(true));
    }
    
    var search = this.#getSearch();
    var searchStrings = FilterDialog.#splitSearchString(search.value);

    if (searchStrings.length) {
      var filterValues = {};
      var autoWildcards = this.#getAutoWildChards().checked;
      var picklistFilterItem = Object.assign({}, queryAxisItem);
      searchStrings.forEach(function(searchString){
        if (autoWildcards){
          searchString = FilterDialog.#addWildcards(searchString);
        }
        filterValues[searchString] = {
          value: searchString,
          label: searchString,
          literal: quoteStringLiteral(searchString)
        }; 
      });
      picklistFilterItem.filter = {
        filterType: FilterDialog.filterTypes.LIKE,
        values: filterValues
      }
      filterAxisItems.push(picklistFilterItem);
    }
    
    var sql = SqlQueryGenerator.getSqlSelectStatementForAxisItems(
      datasource, 
      queryAxisItems,
      filterAxisItems, 
      offset === 0,
      FilterDialog.#numRowsColumnName,
      'FIRST'
    );    
    return sql;
  }

  async #getPicklistValues(offset, limit){
    var sql = this.#getSqlSelectStatementForPickList(offset, limit);
    if (limit === undefined) {
      limit = this.#getValuePicklistPageSize();
      if (offset === undefined){
        offset = 0;
      }
      sql += `\nLIMIT ${limit} OFFSET ${offset}`;
    }
    var timeMessage = `Executing filter dialog picklist query.`;
    console.time(timeMessage);
    var datasource = this.#queryModel.getDatasource();
    var result = await datasource.query(sql);
    console.timeEnd(timeMessage);
    return result;
  }

  async #getPicklistValuesXX(offset, limit){
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

    var condition = '';
    var filterSearchApplyAll = settings.getSettings(['filterDialogSettings', 'filterSearchApplyAll']);
    if (filterSearchApplyAll) {
      var otherFilterAxisItems = this.#getOtherFilterAxisItems(true);
      if (otherFilterAxisItems.length) {
        var conditions = otherFilterAxisItems.map(function(filterAxisItem){
          return QueryAxisItem.getFilterConditionSql(filterAxisItem);
        });
        if (conditions && conditions.length){
          condition = conditions.join('\nAND ');
        }
      }
    }

    var search = this.#getSearch();
    var searchString = search.value.trim();
    var parameters = [];
    var bindValue;
    if (searchString.length){
      var dataType = QueryAxisItem.getQueryAxisItemDataType(this.#queryAxisItem);
      var collation = '';
      switch (dataType) {
        case 'VARCHAR':
          collation = ' COLLATE NOCASE ';
        default:
          if (condition && condition.length) {
            condition += '\nAND ';
          }
          // TODO: implement toggle for the collation.
          // however it's currently not working anyway (see PR: https://github.com/duckdb/duckdb/pull/12359)
          condition += `${sqlExpression}::VARCHAR${collation} LIKE ?`;
          bindValue = `${searchString}`;
          break;
      }
    }

    if (condition) {
      sql.push(`WHERE ${condition}`);
    }

    if (bindValue){
      var autoWildcards = this.#getAutoWildChards().checked;
      if (autoWildcards){
        bindValue = `%${bindValue}%`;
      }
      parameters.push(bindValue);
    }

    if (offset === 0){
      sql.push(`GROUP BY ${sqlExpression}`);
    }
    // todo: 
    // - make it an option whether NULL value appears first or last
    // - make the sort direction (ASC|DESC) an option
    sql.push(`ORDER BY ${sqlExpression} NULLS FIRST`);

    if (limit === undefined) {
      limit = this.#getValuePicklistPageSize();
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
      searchStatus.innerHTML = `${count} values found. Click to add to Filter values list`;
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

    var formatter = this.#queryAxisItem.formatter;
    var valueField, labelField;
    if (formatter) {
      var fields = resultset.schema.fields;
      for (var i = 0; i < fields.length; i++) {
        var field = fields[i];
        switch (field.name) {
          case 'label':
            labelField = field;
            break;
          case 'value':
            valueField = field;
            break;
        }
      }
    }
    var literalWriter = this.#queryAxisItem.literalWriter;
    var option;
    for (var i = 0; i < resultset.numRows; i++) {
      var row = resultset.get(i);
      var value = row.value;
      var label = row.label;
      if (formatter) {
        value = formatter(value, valueField);
        label = formatter(label, labelField);
      }
      option = createEl('option', {
        value: value,
        label: label,
        "data-sql-literal": literalWriter(row.value, valueField)
      });
      if (value === null){
        option.setAttribute('data-sql-null', true);
      }
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
    queryModel: queryModel,
    settings: settings
  });
}