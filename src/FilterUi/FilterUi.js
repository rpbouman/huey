class FilterDialog {

  static MULTIPLE_VALUES_SEPARATOR = ';';

  static #numRowsColumnName = '__huey_numrows';
  
  static equalityFilterTypes = {
    INCLUDE: 'in',
    EXCLUDE: 'notin'
  };
  
  static simplePatternFilterTypes = {
    LIKE: 'like',
    NOTLIKE: 'notlike'
  }

  static rangeFilterTypes = {
    BETWEEN: 'between',
    NOTBETWEEN: 'notbetween'
  };

  static arrayFilterTypes = {
    HASANY: 'hasany',
    HASALL: 'hasall',
    NOTHASANY: 'nothasany',
    NOTHASALL: 'nothasall'
  };
    
  static filterTypes = Object.assign(
    {},
    FilterDialog.equalityFilterTypes,
    FilterDialog.simplePatternFilterTypes,
    FilterDialog.rangeFilterTypes,
    FilterDialog.arrayFilterTypes
  )
  
  static #isFilterTypeInObject(filterTypeObject, filterType){
    return Object.values(filterTypeObject).includes(filterType);
  }
  
  static isRangeFilterType(filterType){
    return FilterDialog.#isFilterTypeInObject(
      FilterDialog.rangeFilterTypes, 
      filterType
    );
  }

  static isSimplePatternFilterType(filterType){
    return FilterDialog.#isFilterTypeInObject(
      FilterDialog.simplePatternFilterTypes, 
      filterType
    );
  }

  static isArrayFilterType(filterType){
    return FilterDialog.#isFilterTypeInObject(
      FilterDialog.arrayFilterTypes, 
      filterType
    );
  }
  
  static isExclusiveFilterType(filterType){
    return filterType.startsWith('not');
  }
  
  static getLabelForFilterType(filterType){
    const selectElement = byId('filterType');
    const options = selectElement.options;
    for (let i = 0; i < options.length; i++){
      const option = options.item(i);
      if (option.value === filterType){
        return option.textContent;
      }
    }
    return undefined;
  }
  
  #id = undefined;
  #queryAxisItem = undefined;
  #queryModel = undefined;

  #defaultValuePicklistPageSize = 100;
  #defaultSearchAutoQueryTimeout = 1000;
  #previousFilterTypeIsArrayFilterType = false;

  #settings = undefined;

  getQueryAxisItem(){
    return this.#queryAxisItem;
  }

  #getValuePicklistPageSize(){
    const settings = this.#settings;
    if (!settings){
      return this.#defaultValuePicklistPageSize
    }
    const valuePicklistPageSize = settings.getSettings(['querySettings', 'filterValuePicklistPageSize']);
    return valuePicklistPageSize;
  }

  #getSearchAutoQueryTimeout(){
    const settings = this.#settings;
    if (!settings){
      return this.#defaultSearchAutoQueryTimeout;
    }
    const searchAutoQueryTimeout = settings.getSettings(['querySettings', 'filterSearchAutoQueryTimeoutInMilliseconds']);
    return searchAutoQueryTimeout;
  }

  constructor(config){
    this.#id = config.id;
    this.#queryModel = config.queryModel;
    this.#settings = config.settings || settings;
    this.#initEvents();
  }

  #handleOkButtonClick( event ) {
    const dialogState = this.#getDialogState();
    this.#queryModel.setQueryAxisItemFilter(this.#queryAxisItem, dialogState);
    const filterDialog = this.getDom();
    filterDialog.close();
  }

  #handleCancelButtonClick( event ) {
    const filterDialog = this.getDom();
    filterDialog.close();
  }
  
  #handleClearButtonClick( event ){
    this.clearFilterValueLists();
    this.#updateValueSelectionStatusText();
  }

  #handleRemoveFilterButtonClick( event ){
    this.#queryModel.removeItem(this.#queryAxisItem);
    const filterDialog = this.getDom();
    filterDialog.close();
  }

  #handleFilterTypeChange( event ){
    const filterType = event.target;
    let width, element;
    const filterValuesList = this.#getFilterValuesList();
    let isArrayFilterType;
    if (FilterDialog.isRangeFilterType(filterType.value)){
      isArrayFilterType = false;
      if (this.#getFilterValuesList().options.length !== this.#getToFilterValuesList().options.length){
        this.clearFilterValueLists();
      }
      width = '50%';
      element = filterValuesList.parentNode;
    }
    else {
      isArrayFilterType = FilterDialog.isArrayFilterType(filterType.value);
      element = filterValuesList;
      width = '';
    }
    element.style.width = width;

    // reset the width again so the resizer can manage the width.
    element.style.width = '';
    this.#getValuePicklist().selectedIndex = -1;
    this.#updateValueSelectionStatusText();
    
    if (isArrayFilterType !== this.#previousFilterTypeIsArrayFilterType) {
      this.#updatePicklist();
    }
    this.#previousFilterTypeIsArrayFilterType = isArrayFilterType;
  }
  
  #handleIncludeAllFiltersCheckboxChange( event ) {
    // TODO: check to see if there are any other filter items,
    // and also if they have any filter condition set.
    // If we can avoid a query, then return, if not, repopulate the list.
    const target = event.target;
    settings.assignSettings(['filterDialogSettings', 'filterSearchApplyAll'], target.checked);

    this.#updatePicklist();
  }
  
  #handleAutoWildcardsCheckboxChange( event ) {
    const target = event.target;
    settings.assignSettings(['filterDialogSettings', 'filterSearchAutoWildcards'], target.checked);
    this.#updatePicklist();
  }
  
  #handleCaseSensitiveChange( event ){
    const target = event.target;
    settings.assignSettings(['filterDialogSettings', 'filterSearchCaseSensitive'], target.checked);
    this.#updatePicklist();
  }

  #handleToValuesListScroll(event){
    // When the filterType is set to a range type (BETWEEN/NOTBETWEEN), the two value lists share a scrollbar.
    // this handler ensures the scrolbar moves both lists.
    const target = event.target;
    this.#getFilterValuesList().scrollTop = target.scrollTop;
  }

  #handleFilterValuesListKeyDown(event){
    if (event.key !== 'Delete'){
      return;
    }
    this.#clearHighlightedValues();
  }

  #handleSearchKeyDown(event){
    if (event.key !== 'Enter'){
      return;
    }
    this.#addValueToFilterValues(event);
    event.target.value = '';
  }
  
  #handleSearchPaste( event ) {
    const search = event.target;
    event.preventDefault();
    let pastedText = getPastedText(event);
    pastedText = pastedText.replace(/[\f\n\r\t\v]+/g, FilterDialog.MULTIPLE_VALUES_SEPARATOR);
    pastedText = pastedText
      .split( FilterDialog.MULTIPLE_VALUES_SEPARATOR )
      .reduce( (arr, value) => {
        if (!arr.includes( value )){
          arr.push(value);
        }
        return arr;
      }, [])
      .join( FilterDialog.MULTIPLE_VALUES_SEPARATOR );
    const currentValue = search.value;
    const newValue = [
      currentValue.slice(0, search.selectionStart),
      pastedText,
      currentValue.slice(search.selectionEnd)
    ].join('');
    search.value = newValue;
    this.#updatePicklist();
  }

  #resetValueListsSelection(event){
    if (event.target.selectedOptions.length){
      this.#getValuePicklist().selectedIndex = -1;
      this.#getToFilterValuesList().selectedIndex = -1;
    }
  }

  #initEvents(){
    const filterDialog = this.getDom();

    // Ok button confirms the filter settings and stores them in the model
    this.#getOkButton().addEventListener('click', event => this.#handleOkButtonClick( event ) );
    this.#getRemoveFilterButton().addEventListener('click', event => this.#handleRemoveFilterButtonClick( event ) );
    this.#getCancelButton().addEventListener('click', event => this.#handleCancelButtonClick( event ) );
    // Clear button clears the values lists
    this.#getClearButton().addEventListener('click', event => this.#handleClearButtonClick( event ) );
    // clear selected button clears the selected values from the value lists
    this.#getClearSelectedButton().addEventListener('click', event => this.#clearHighlightedValues( event ) );
    // Selecting values in the picklist adds them to the value lists (behavior depends on the filter type)
    this.#getValuePicklist().addEventListener('change', event => this.#handleValuePicklistChange( event ) );

    const filterValuesList = this.#getFilterValuesList();
    filterValuesList.addEventListener('change', event => this.#resetValueListsSelection( event ) );
    filterValuesList.addEventListener('keydown', event => this.#handleFilterValuesListKeyDown( event ) );

    const toFilterValuesList = this.#getToFilterValuesList();
    toFilterValuesList.addEventListener('change', event => this.#resetValueListsSelection( event ) );
    toFilterValuesList.addEventListener('keydown', event => this.#handleFilterValuesListKeyDown( event ) );
    toFilterValuesList.addEventListener('scroll', event => this.#handleToValuesListScroll( event ) );

    this.#getFilterType().addEventListener('change', event => this.#handleFilterTypeChange( event ) );

    const includeAllFiltersCheckbox = this.#getIncludeAllFilters();
    includeAllFiltersCheckbox.checked = settings.getSettings(['filterDialogSettings', 'filterSearchApplyAll']);
    includeAllFiltersCheckbox.addEventListener('change', event => this.#handleIncludeAllFiltersCheckboxChange( event ) );

    const autoWildcardsCheckbox = this.#getAutoWildChards();
    autoWildcardsCheckbox.checked = settings.getSettings(['filterDialogSettings', 'filterSearchAutoWildcards']);
    autoWildcardsCheckbox.addEventListener('change', event => this.#handleAutoWildcardsCheckboxChange(event) );

    this.#getCaseSensitive().addEventListener('change', event => this.#handleCaseSensitiveChange( event ) );

    const search = this.#getSearch();
    search.addEventListener('keydown', event => this.#handleSearchKeyDown( event ) );
    search.addEventListener('paste', event => this.#handleSearchPaste( event ) );
    bufferEvents(search, 'input', (event, count) => {
      if (count !== undefined) {
        return;
      }
      this.#updatePicklist();
    }, this, this.#getSearchAutoQueryTimeout.bind(this));
    
    this.#getAddFilterValueButton().addEventListener('click', event => this.#addValueToFilterValues( event ) );
  }

  #clearHighlightedValues(){
    this.#removeSelectedValues();
    this.#updateValueSelectionStatusText();
  }  

  static #addWildcards(searchString){
    const wildcard = '%';
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
    const search = this.#getSearch();
    const searchString = search.value.trim();
    if (!searchString.length){
      // if there is no value (or empty string), do nothing
      // (might have to revisit empty string behavior)
      return;
    }

    const searchStrings = FilterDialog.#splitSearchString(searchString);
    if (!searchStrings.length){
      return;
    }

    // check the filter type (opearator)
    const filterType = this.#getFilterType().value;
    const isRangeFilterType = FilterDialog.isRangeFilterType(filterType);
    const isPatternFilterType = FilterDialog.isSimplePatternFilterType(filterType);

    const toFilterValuesList = this.#getToFilterValuesList();
    const filterValuesList = this.#getFilterValuesList();
    const autoWildcards = this.#getAutoWildChards().checked;
    const literalWriter = this.#queryAxisItem.literalWriter;
    const parser = this.#queryAxisItem.parser;
    searchStrings.forEach( searchString => {
      if (isPatternFilterType && autoWildcards) {
        searchString = FilterDialog.#addWildcards(searchString);
      }
      const label = searchString ;
      if (parser) {
        try {
          searchString = parser(searchString);
        }
        catch(e){
          showErrorDialog(e);
          return;
        }
      }
      const literal = literalWriter ? literalWriter(searchString) : searchString;

      let options, option;
      if (isRangeFilterType && toFilterValuesList.selectedIndex !== -1) {
        option = toFilterValuesList.options[toFilterValuesList.selectedIndex];
        option.value = searchString;
        option.label = label;
        option.setAttribute('data-sql-literal', literal);
        toFilterValuesList.selectedIndex = -1;
        return;
      }

      options = filterValuesList.options;
      const sameValueOptions = [];
      let valueAdded = false;
      for (let i = 0; i < options.length; i++){
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

      if (sameValueOptions.length) {
        const startIndex = valueAdded ? 0 : 1;
        for (let i = startIndex; i < sameValueOptions.length; i++){
          option = sameValueOptions[i];
          option.parentNode.removeChild(option);
        }
      }
      else
      if (!valueAdded){
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
          const selectedIndex = toFilterValuesList.options.length;
          toFilterValuesList.appendChild(option);
          toFilterValuesList.selectedIndex = selectedIndex;
        }
      }
    });
    search.value = '';
    search.focus();
    this.#updatePicklist();
  }

  #getNullsSortOrder(){
    let nullsSortOrder = this.#settings.getSettings(['localeSettings', 'nullsSortOrder', 'value']) || 'FIRST';
    if ( !['FIRST','LAST'].includes(nullsSortOrder) ) {
      console.warn(`Wrong value for nullsSortOrder "${nullsSortOrder}"`);
      nullsSortOrder = 'FIRST';
    }
    return nullsSortOrder;
  }

  #sortValueListKeys(valuesList) {
    let dataTypeInfo;
    const dataType = QueryAxisItem.getQueryAxisItemDataType(this.#queryAxisItem);
    if (dataType){
      dataTypeInfo = getDataTypeInfo(dataType);
    }
    const nullsSortOrder = this.#getNullsSortOrder();
    const sortNull = ({
      'FIRST': -1,
      'LAST': 1
    })[nullsSortOrder];

    const keys = Object.keys(valuesList);
    const thisColumnType = this.#queryAxisItem.columnType;
    keys.sort((key1, key2) => {
      const valueObject1 = valuesList[key1];
      let literal1 = valueObject1.literal;
      const valueObject2 = valuesList[key2];
      let literal2 = valueObject2.literal;

      if (literal1 === 'NULL' || literal1.startsWith('NULL::')) {
        return literal2.startsWith('NULL::') ? 0 : sortNull;
      }
      else
      if (literal2 === 'NULL' || literal2.startsWith('NULL::')){
        return -sortNull;
      }

      if (dataTypeInfo && dataTypeInfo.isNumeric){
        literal1 = literal1.split('::')[0];
        literal2 = literal2.split('::')[0];
        switch (thisColumnType){
          case 'HUGEINT':
          case 'BIGINT':
          case 'UBIGINT':
          case 'UHUGEINT':
            literal1 = BigInt(literal1);
            literal2 = BigInt(literal2);
            break;
          default:
            literal1 = parseFloat(literal1);
            literal2 = parseFloat(literal2);
        }
      }

      if (literal1 > literal2) {
        return 1;
      }
      else
      if ( literal1 < literal2) {
        return -1;
      }
      return 0;
    });
    return keys;
  }

  #sortValueLists(valuesList, toValuesList){
    const sortedList = {}, sortedToList = toValuesList ? {} : undefined;
    const keys = this.#sortValueListKeys(valuesList);
    keys.forEach(function(key){
      sortedList[key] = valuesList[key];
      if (!toValuesList) {
        return;
      }
      sortedToList[key] = toValuesList[key];
    });
    return {
      valuesList: sortedList,
      toValuesList: sortedToList
    };
  }

  #extractValueFromOption(option){
    const valueObject = {
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
    const optionObjects = {};
    for (let i = 0; i < options.length; i++){
      const option = options[i];
      const valueObject = this.#extractValueFromOption(option);
      optionObjects[option.value] = valueObject;
    }
    return optionObjects;
  }

  #createOptionElementFromValues(valueObject){
    const optionElement = createEl('option', {
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
    const options = selectList[ selected === true ? 'selectedOptions' : 'options'];
    const values = this.#extractValuesFromOptions(options);
    return values;
  }

  #renderOptionsToSelectList(options, selectList){
    if (options === undefined) {
      return;
    }
    const keys = this.#sortValueListKeys(options);
    for (let i = 0; i < keys.length; i++){
      const key = keys[i];
      const valueObject = options[key];
      const optionElement = this.#createOptionElementFromValues(valueObject);
      selectList.appendChild(optionElement);
    }
  }
  
  #compareValues(value1, value2){
    const parser = this.#queryAxisItem.parser;
    if (parser) {
      value1 = parser(value1);
      value2 = parser(value2);
    }
    
    if (value1 > value2) {
      return 1;
    }
    else
    if (value1 < value2) {
      return -1;
    }
    return 0;
  }

  #handleValuePicklistChange(event){
    let isSqlNull;
    let valueSelectionStatusText = undefined;
    const selectControl = event.target;
    const options = selectControl.options;
    const selectedOptions = selectControl.selectedOptions;

    // first, check if this is a special "loader" option
    let selectedOption;
    if (selectedOptions.length === 1) {
      selectedOption = selectedOptions[0];
      if (selectedOption.getAttribute('data-next-page-loader') === 'true') {
        // it is a loader option, so load more values and exit.
        const offset = parseInt(selectedOption.getAttribute('data-offset'), 10);
        const limit = parseInt(selectedOption.getAttribute('data-limit'), 10);
        this.#updatePicklist(offset, limit);
        return;
      }
    }

    const filterType = this.#getFilterType().value;
    const isRangeFilterType = FilterDialog.isRangeFilterType(filterType);

    const filterValuesList = this.#getFilterValuesList();
    const currentValues = this.#extractOptionsFromSelectList(filterValuesList);

    let toFilterValuesList, currentToValues;
    // these are used to set a selection in either the values list or the values to list.
    let restoreSelectionInValueList, restoreSelectionValue;

    // get the current selection and create new options out of it.
    if (isRangeFilterType) {
      toFilterValuesList = this.#getToFilterValuesList();
      const toFilterValuesListOptions = toFilterValuesList.options;
      currentToValues = this.#extractOptionsFromSelectList(toFilterValuesList);

      let rangeStart, rangeEnd;
      // The following condition captures the case where the user selected 1 option in the picklist,
      // and either the values list or the to values list also has 1 option selected.
      // In action is then to use the picklist value to update that end of a range.
      if (
        selectedOptions.length === 1 && 
        selectedOption.getAttribute('data-sql-null') !== String(true) 
        && (
          filterValuesList.selectedOptions.length === 1 && 
          toFilterValuesList.selectedOptions.length === 0 && 
          filterValuesList.selectedOptions[0].getAttribute('data-sql-null') !== String(true) ||
          filterValuesList.selectedOptions.length === 0 && 
          toFilterValuesList.selectedOptions.length === 1 && 
          toFilterValuesList.selectedOptions[0].getAttribute('data-sql-null') !== String(true)
        )
      ){

        const selectedList = filterValuesList.selectedOptions.length ? filterValuesList : toFilterValuesList;
        const values = filterValuesList.selectedOptions.length ? currentValues : currentToValues;

        const correspondingList = filterValuesList.selectedOptions.length ? toFilterValuesList : filterValuesList;
        const correspondingValues = filterValuesList.selectedOptions.length ? currentToValues : currentValues;

        const selectedIndex = selectedList.selectedIndex;
        const option = selectedList.options[selectedIndex];
        const optionValue = option.value;

        const correspondingOption = correspondingList.options[selectedIndex];
        const correspondingValue = correspondingOption.value;

        if (values[selectedOption.value]) {
          // invalid choice, range already exists
          valueSelectionStatusText = `Existing range collision.`;
        }
        else
        if ( 
          values === currentValues && 
          this.#compareValues(selectedOption.value, correspondingValue) === 1
        ) {
          // noop, fromValue can't be bigger than toValue
          valueSelectionStatusText = `From Value exceeds to Value.`;
        }
        else
        if ( 
          values === currentToValues && 
          this.#compareValues(selectedOption.value, correspondingValue) === -1
        ) {
          // noop, toValue can't be smaller than fromValue
          valueSelectionStatusText = `To Value smaller than from Value.`;
        }
        else {
          delete values[option.value];
          const correspondingOptionValueObject = correspondingValues[correspondingValue];
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
        for (let i = 0; i < options.length; i++){
          const option = options[i];

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
          if(
            ( option.selected !== true || i === options.length - 1 ) && 
            rangeStart
          ){
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
      for (let i = 0; i < selectedOptions.length; i++) {
        selectedOption = selectedOptions[i];
        if (currentValues[selectedOption.value] !== undefined) {
          continue;
        }
        currentValues[selectedOption.value] = this.#extractValueFromOption(selectedOption);
      }
    }

    // clear the value lists and then update them with the changed set of values
    this.clearFilterValueLists();
    this.#renderOptionsToSelectList(currentValues, filterValuesList);
    this.#renderOptionsToSelectList(currentToValues, toFilterValuesList);

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
    const filterValuesListOptions = restoreSelectionInValueList.options;
    for (let i = 0; i < filterValuesListOptions.length; i++){
      if (filterValuesListOptions[i].value !== restoreSelectionValue) {
        continue;
      }
      filterValuesListOptions.selectedIndex = i;
      break;
    }

    // the end.
  }

  #removeSelectedValues(){
    const selectControl = this.#getFilterValuesList();
    const options = selectControl.options;
    const toValuesList = this.#getToFilterValuesList();
    const toValuesOptions = toValuesList.options;
    const currentValues = {};
    const currentToValues = {};
    for (let i = 0 ; i < options.length; i++){
      const option = options[i];
      let toOption;
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
    const filterDialog = this.getDom();
    const footer = filterDialog.getElementsByTagName('footer').item(0);
    const buttons = footer.getElementsByTagName('button');
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

  #setBusy(trueOrFalse){
    const dom = this.getDom();
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
    this.#getValueSelectionStatus().textContent = text;
  }

  #updateValueSelectionStatusText(){
    let text;
    const count = this.#getFilterValuesList().options.length;
    if (count === 0) {
      text = Internationalization.getText('Select values from the picklist');
    }
    else {
      const filterType = this.#getFilterType().value;
      let object = 'value';
      if (FilterDialog.isRangeFilterType(filterType)){
        object += ' range';
      }
      else
      if (FilterDialog.isSimplePatternFilterType(filterType)){
        object += ' pattern';
      }
      
      if (count > 1){
        object += 's';
      }
      
      const verb = FilterDialog.isExclusiveFilterType(filterType) ? 'excluded' : 'included';
      text = `{1} ${object} ${verb}.`;
      text = Internationalization.getText(text, count);
    }
    this.#setValueSelectionStatusText(text);
  }

  #getIncludeAllFilters(){
    return byId('filterSearchApplyAll');
  }

  #getAutoWildChards(){
    return byId('filterSearchAutoWildcards');
  }

  #getCaseSensitive(){
    return byId('filterSearchCaseSensitive');
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
    const boundingRect = queryAxisItemUi.getBoundingClientRect();
    const filterDialog = this.getDom();
    filterDialog.style.left = boundingRect.x + 'px'
    filterDialog.style.top = (boundingRect.y + boundingRect.height) + 'px';
  }

  #clearDialog(){
    // https://github.com/rpbouman/huey/issues/421: reset the filter type to default position
    this.#getFilterType().selectedIndex = 0;
    this.#getValuePicklist().innerHTML = '';
    this.clearFilterValueLists();
    this.#getSearch().value = '';
  }

  async openFilterDialog(queryModel, queryModelItem, queryAxisItemUi){
    this.#clearDialog();

    this.#previousFilterTypeIsArrayFilterType = false;
    this.#queryAxisItem = queryModelItem;
    this.#queryModel = queryModel;

    this.#updateDialogState();

    this.#positionFilterDialog(queryAxisItemUi);
    const filterDialog = this.getDom();
    
    let dataType;
    if (queryModelItem.derivation) {
      const derivationInfo = AttributeUi.getDerivationInfo(queryModelItem.derivation);
      if (derivationInfo.dataValueTypeOverride) {
        dataType = derivationInfo.dataValueTypeOverride;
      }
    }
    if (!dataType) {
      dataType = QueryAxisItem.getQueryAxisItemDataType(queryModelItem);
    }

    filterDialog.setAttribute('data-query-model-item-datatype', dataType);
    
    filterDialog.showModal();
    this.#updatePicklist();
  }

  #updateDialogState(){
    const queryAxisItem = this.#queryAxisItem;
    const filter = queryAxisItem.filter;
    if (filter){
      this.#getFilterType().value = filter.filterType;
      this.#renderOptionsToSelectList(filter.values, this.#getFilterValuesList());
      if (FilterDialog.isRangeFilterType(filter.filterType)){
        this.#renderOptionsToSelectList(filter.toValues, this.#getToFilterValuesList());
      }
    }
    else {
      // noop
    }
    this.#updateValueSelectionStatusText();
  }

  #getDialogState(){
    const filterValuesList = this.#getFilterValuesList();
    const filterValues = this.#extractOptionsFromSelectList(filterValuesList);
    const toFilterValuesList = this.#getToFilterValuesList();
    const toFilterValues = this.#extractOptionsFromSelectList(toFilterValuesList);
    const dialogState = {
      filterType: this.#getFilterType().value,
      values: filterValues,
      toValues: toFilterValues,
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
    const result = await this.#getPicklistValues(offset, limit);
    this.#populatePickList(result, offset, limit);
  }

  #getOtherFilterAxisItems(withFilterValues){
    const filtersAxis = this.#queryModel.getFiltersAxis();
    const filtersAxisItems = filtersAxis.getItems();
    const otherFilterAxisItems = filtersAxisItems.filter(filterAxisItem => {
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
        if (!filterAxisItem.filter || !filterAxisItem.filter.values) {
          return false;
        }

        if (!Object.keys(filterAxisItem.filter.values).length){
          return false;
        }
      }
      return true;
    });
    return otherFilterAxisItems;
  }

  static #splitSearchString(searchString){
    return searchString
    .split(FilterDialog.MULTIPLE_VALUES_SEPARATOR)
    .map(searchString => {
      return searchString.trim();
    })
    .filter(searchString => {
      return Boolean(searchString.length);
    });
  }

  #getSqlSelectStatementForPickList(offset, limit){
    let queryAxisItem = this.#queryAxisItem;
    const filterType = this.#getFilterType().value;
    
    // for array filter operators, we need to unnest the array
    // so, we make a copy of the query axis item and modify it
    if (FilterDialog.isArrayFilterType(filterType)){
      queryAxisItem = Object.assign({}, queryAxisItem);
      if (!queryAxisItem.memberExpressionPath) {
        queryAxisItem.memberExpressionPath = [];
      }

      queryAxisItem.memberExpressionPath = Object.assign([], queryAxisItem.memberExpressionPath);
      if (queryAxisItem.derivation) {
        switch (queryAxisItem.derivation) {
          case 'keyset':
            queryAxisItem.memberExpressionPath.push('map_keys()');
            queryAxisItem.derivation = 'elements';
            break;
          case 'valuelist':
            queryAxisItem.memberExpressionPath.push('map_values()');
            queryAxisItem.derivation = 'elements';
            break;
        }
      }
      queryAxisItem.derivation = 'elements';
      queryAxisItem.memberExpressionPath.push('unnest()');
      delete queryAxisItem.literalWriter;
    }
    
    // https://github.com/rpbouman/huey/issues/553
    // never produce totals in the picklist result.
    if (queryAxisItem.includeTotals){
      queryAxisItem = Object.assign({}, queryAxisItem);
      delete queryAxisItem.includeTotals;
    }

    let filterAxisItems = [];
    const filterSearchApplyAll = settings.getSettings(['filterDialogSettings', 'filterSearchApplyAll']);
    if (filterSearchApplyAll) {
      filterAxisItems = filterAxisItems.concat(this.#getOtherFilterAxisItems(true));
    }

    const search = this.#getSearch();
    const searchStrings = FilterDialog.#splitSearchString(search.value);
    if (searchStrings.length) {
      const filterValues = {};
      const autoWildcards = this.#getAutoWildChards().checked;
      const picklistFilterItem = Object.assign({}, queryAxisItem);
      searchStrings.forEach(searchString => {
        if (autoWildcards){
          searchString = FilterDialog.#addWildcards(searchString);
        }
        filterValues[searchString] = {
          value: searchString,
          label: searchString,
          literal: quoteStringLiteral(searchString)
        };
      });
     
      const caseSensitive = this.#getCaseSensitive();
      picklistFilterItem.filter = {
        filterType: FilterDialog.filterTypes.LIKE,
        values: filterValues,
        caseSensitive: caseSensitive.checked
      }
      filterAxisItems.push(picklistFilterItem);
    }

    const datasource = this.#queryModel.getDatasource();
    const queryAxisItems = [
      Object.assign({}, queryAxisItem, {caption: 'value', axis: QueryModel.AXIS_ROWS}),
      Object.assign({}, queryAxisItem, {caption: 'label', axis: QueryModel.AXIS_ROWS})
    ];
    const nullsSortOrder = this.#getNullsSortOrder();
    const sql = SqlQueryGenerator.getSqlSelectStatementForAxisItems({
      datasource: datasource,
      queryAxisItems: queryAxisItems,
      filterAxisItems: filterAxisItems,
      includeCountAll:offset === 0,
      countAllAlias: FilterDialog.#numRowsColumnName,
      nullsSortOrder: nullsSortOrder
    });
    return sql;
  }

  async #getPicklistValues(offset, limit){
    this.#setBusy(true);
    let sql = this.#getSqlSelectStatementForPickList(offset, limit);
    if (limit === undefined) {
      limit = this.#getValuePicklistPageSize();
    }
    if (offset === undefined){
      offset = 0;
    }
    // TODO: best practices would say we shouldn't use LIMIT / OFFSET; 
    // we could theoretically do better by doing some sort of keyset pagination
    // by filtering for values greater than the last value of the previous page-loader
    // However, I tried this and it didn't really seem to make a difference, at least not in plain duckdb.
    sql += `\nLIMIT ${limit} OFFSET ${offset}`;
    const timeMessage = `Executing filter dialog picklist query.`;
    console.time(timeMessage);
    const datasource = this.#queryModel.getDatasource();
    const result = await datasource.query(sql);
    console.timeEnd(timeMessage);
    return result;
  }

  #updateSearchStatus(resultset){
    let count = resultset.numRows;
    if (count) {
      count = parseInt(String(resultset.get(0)[FilterDialog.#numRowsColumnName]), 10);
    }
    let message;
    switch(count){
      case 0:
        message = 'No values found.'
        message = Internationalization.getText(message);
        break;
      case 1:
        message = '{1} value found.'
        message = Internationalization.getText(message, count);
        break;
      default:
        message = '{1} values found.'
        message = Internationalization.getText(message, count);
        break;
    }
    if (count){
      message += ' ' + Internationalization.getText('Click to add to Filter values list');
    }
    const searchStatus = this.#getSearchStatus();
    searchStatus.innerHTML = message;
  }

  #populatePickList(resultset, offset, limit){
    const listOfValues = this.#getValuePicklist();
    const exhausted = resultset.numRows < limit;

    let optionGroup, optionsContainer;
    const optionGroupLabelText = `Values ${offset + 1} - ${offset + resultset.numRows}`;

    if (offset === 0) {
      this.#updateSearchStatus(resultset);
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

    let valueField, labelField;
    const fields = resultset.schema.fields;
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      switch (field.name) {
        case 'label':
          labelField = field;
          break;
        case 'value':
          valueField = field;
          break;
      }
    }
    
    const formatter = this.#queryAxisItem.formatter;
    let option;
    for (let i = 0; i < resultset.numRows; i++) {
      const row = resultset.get(i);
      const value = row.value === null ? 'NULL' : (valueField.type.typeId === 7 ? getArrowDecimalAsString(row.value, valueField.type) : String(row.value));
      let label = row.label;
      if (formatter) {
        label = formatter(label, labelField);
      }
      const literal = getDuckDbLiteralForValue(row.value, valueField.type);
      option = createEl('option', {
        value: value,
        label: label,
        "data-sql-literal": literal
      });
      if (value === null){
        option.setAttribute('data-sql-null', true);
      }
      optionsContainer.appendChild(option);
    }

    this.#setBusy(false);

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
    //Fix https://github.com/rpbouman/huey/issues/566
    //setTimeout(
      //function(){
        listOfValues.appendChild(optionGroup);
      //}, 100
    //);
  }

  getDom(){
    return byId(this.#id);
  }
}

let filterDialog;
function initFilterUi(){
  filterDialog = new FilterDialog({
    id: 'filterDialog',
    queryModel: queryModel,
    settings: settings
  });
}