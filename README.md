# 🦆 Huey
Huey is a browser-based application that lets you explore and analyze data.
Huey supports reading from multiple file formats, like .csv, .parquet, .json data files as well as .duckdb database files.

__Try Huey now online__ [https://rpbouman.github.io/huey/src/index.html](https://rpbouman.github.io/huey/src/index.html)

![image](https://github.com/rpbouman/huey/assets/647315/b2e45002-409c-4a98-8d38-f5a6bfc6b7e9)

## Key features
- Supports reading .parquet, .csv, .json and .duckdb database files. (Support for reading MS Excel .xlsx files and .sqlite is planned)
- A comprehensive Attribute menu for exploring the structure of your dataset
- An intuitive query builder that supports projection, aggregation, filtering, and (sub)totals
- A pivot table to present analysis results
- Many different aggregate functions for reporting and data exploration
- Automatic breakdown of date/time columns into separate parts (year, month, quarter etc) for reporting
- Support for array and STRUCT data types
- Export of results and/or SQL queries to file or clipboard
- Blazing fast, even for large files - courtesy of [DuckDB](https://duckdb.org)
- Truly light-weight. Huey depends on DuckDb-WASM, and Tabler Icons, but nothing more. If it makes sense, dependencies might be added, but up till now we get along fine with what the browser gives us. And that's enough.
- Accessible. Huey uses semantic HTML and aria-roles. Please let us know if you find Huey has accessibility issues!
- Zero install. Download or checkout the source tree, and open src/index.html in your browser - no server required. Note that although Huey can run locally, there is nothing that keeps you from serving it from a webserver if you want to.
- It's free! Huey is released under the MIT license, just like DuckDB.

### Limitations
- Huey is based on DuckDB WASM. DuckDB is awesome! However, the WASM runtime imposes some limits which result in a poorer performance as compared to native DuckDB. That said, DuckDB WASM is still incredibly fast when compared to any in-browser alternative. 

## Getting started
1) [Checkout](https://github.com/rpbouman/huey.git) or [Download](https://github.com/rpbouman/huey/archive/refs/heads/dev.zip) from github
2) Open [index.html](https://github.com/rpbouman/huey/blob/dev/index.html) in your web browser. Note that although Huey runs locally, it depends on resources served by jsdelivr.com, so make sure you're connected to the internet.
3) Register one or more files or urls, and start analyzing!

## Registering and Analyzing Files with Huey

### Registering Files
Huey uses [DuckDb WASM](https://duckdb.org/docs/archive/0.9.2/api/wasm/overview) to read and analyze data files. 
General browser security policies prevent web applications from autonomously accessing files on the local file system. 
Web application users need to explicitly select the files they want to analyze. 
Huey then registers them in DuckDB WASM's virtual file system so they become available for analysis. 

To register one or more files, you can either 
- Click the 'Upload...' button ![upload button icon](https://github.com/rpbouman/huey/assets/647315/8dbae6ad-c4f2-4d5e-bc9a-f15fa9444c89).
The upload button is always available as the leftmost button on the toolbar at the top of the page. The upload action will pop up a file browser dialog that lets you browse and choose one or more files from your local filesystem.
In the file browser dialog, navigate to the file or files that you want to explore, select them and then confirm the dialog by clicking the 'Ok' button.
- Drag 'n Drop one or multiple files unto the "Datasources" tab in the sidebar. 

Either action will open the Upload dialog. The upload dialog will show a progress bar for each file that is being registered. Additional progress items may appear in case a duckdb extension needs to be installed and/or loaded. 

![image](https://github.com/rpbouman/huey/assets/647315/b0c37783-4b3a-4166-9f3b-7f5a5ff91cd9)

After completion of the upload process, the upload dialog is updated to indicate the status of the uploads (or the extension installation, if applicable). 

Items that encountered an error are indicated by red progressbars. In case of errors, the item is expanded to reveal any information that might help to remedy the issue. 

Successful actions are indicated by green progressbars. Succesfully loaded files are available in the Datasources tab, from where you can start exploring their contents by clicking the explore button ![explore button](https://github.com/rpbouman/huey/assets/647315/7b67ff2d-5cec-44e0-91d4-e670d38487c1). As a convenience, the explore button is also present in the upload dialog.

Huey will attempt to group files having similar column signature. The group appears as a separate top-level node in the Datasources tab, with its individual files indented below it. A file group has its own explore button, so that you can not only explore the individual files, but also the UNION of all Files in the group:

![image](https://github.com/rpbouman/huey/assets/647315/0ad057e0-e4ab-4bd8-b996-d3f50542853d)

Files that cannot be grouped appear in a separate Miscellanous Files group.

### Using Remote Datasets

In addition to local files, you can also register URLs. To register a URL, click the "Load data from URL" button on the toolbar ![load data from URL button](https://github.com/user-attachments/assets/89cea13f-b2a8-4ce9-a5ab-a4184c9c00be)
. You will be prompted to enter the URL:

![URL prompt](https://github.com/user-attachments/assets/2a11e0ca-a3c1-4b55-9bf9-8cc404332400)

After confirming, the upload dialog appears just like when uploading local files.

Note that loading data from URL is subject to certain restrictions due to browser security policies. Typically the URL needs to be either in the same domain as from where Huey is served, or the remote server needs to pass CORS headers to overcome the same-origin policy. 

### Opening DuckDb files
Apart from reading data files directly, Huey can also open existing duckdb files and access its tables and views. The process for accessing duckdb files is exactly the same as for accessing data files. Just make sure you give your duckdb file a '.duckdb' extension - that's how Huey knows it's a duckdb file. (DuckDB data files are not required to have any particular name or extension, but Huey currently cannot detect that, so it relies on a file extension convention instead.) Successfully loaded .duckdb files will appear in the DuckDb Folder, which appears at the top of the DataSources tab. 

![image](https://github.com/rpbouman/huey/assets/647315/c7ca5ed7-7454-4783-8dbc-493244f8bb28)

The schemas in the duckdb database file are presented as folders below the duckdb file entry, and any tables or views in the schema are presented below the schema folder. Each table or view has an explore button which you can click to explore the data.   

Note: We ran into a limitation - when the duckdb file itself refers to external files, then it's likely that Huey (or rather, DuckDB WASM) won't be able to find them.
But native duckdb tables, as well as views based on duckdb base tables work marvelously and are quite a bit faster than querying bare data files.

## Exploring Datasources
The Datasources have an explore button ![explore button](https://github.com/rpbouman/huey/assets/647315/7b67ff2d-5cec-44e0-91d4-e670d38487c1). 
After clicking it, the left sidebar switches to the Attributes tab, which is then is populated with a list of the Attributes of the selected Datasource.

### Attributes, Derived Attributes, and Aggregates
You can think of Attributes as a list of values (a column) that can be extracted from the Datasource and presented along the axes of the pivot table.

![image](https://github.com/user-attachments/assets/d4caf74b-64ce-4722-ad55-d31cf192bff6)

The pivot table has two axes for placing attribute values:
1) Attributes appearing on the horizontal axis are used to generate column headers. For this reason the horizontal axis is also known as the 'columns'-axis.
2) attributes appearing on the vertical axis are used to generate row headers. For this reason the vertical axis is also known as the 'rows'-axis.

The selection of attributes and their placement on the axis is represented by the Query Builder. 
The following screenshot may help to explain:

![image](https://github.com/user-attachments/assets/87da26a0-5c0d-4a42-8fad-74369f00b0a7)

In the screenshot, the Attribute Sidebar is at the left side. The workarea is to the right of the Attribute Sidebar. 
The Query Builder is at the top right of the workarea. The pivot table is at the bottom right.

### Query Builder

The screenshot shows a simple query, with one attribute "hvfhs_license_num" placed on the columns axis of the Query Builder. 
Placing the attribute on the Columns axis causes its values to be shown as column headings of the pivot table.

![image](https://github.com/user-attachments/assets/81aa9386-fba6-4f99-ad2f-f8ce0e25afb0)

Likewise, the attribute "dispatching_base_num" is placed on the Rows axis, and this causes its values to show as row headings in the pivot table.

Finally, the generic "count" aggregator is placed on the cells axis. This causes the value of the aggregate to be computed for each combination of values of the rows- and columns-headings.
The aggregated value are placed in the cells at the intersection of the corresponding row and column.

By default, the cell headers appear on the Columns axis, below the last Column Axis item (if any).
The cell headers can also by placed on the Rows axis, in which case they appear right to the values of the last row axis item:

![image](https://github.com/user-attachments/assets/a79a8abf-ed67-41a8-bfb2-13c6772997f9)

(Note that for this particular example, which has only one aggregator on the cells-axis, its placement on either cells or rows doesn't make much difference.)

### Placing Attributes

Attributes can be placed by clicking one of the desired axis-placement buttons, which appear to the left of the attribute name.

Once the items are placed in the rows and column axes, you can move and flip the axes by clicking on the axis icon that appears right before the "Rows" and "Columns" axis header text.
Clicking on the axis icon of the Cells axis will affect the placement of the cell headers on either of the Rows- and Columns- axes. 

Items that are placed inside the Query builder have buttons to manipulate them: At the left and right side of the query items, there are buttons to move the item a single position to the left or right within the axis.
Items on the rows and columns axes also have a button to move the item from one axis to the other.
Items also have a button to remove it from the query.

![image](https://github.com/user-attachments/assets/021f72ba-0551-441e-ba86-106ef3ef6808)

#### Drag and Drop

Instead of using the buttons in the Attribute sidebar, you can also drag Attributes from the sidebar and drop them at the desired position in the Query Builder.
Drag and Drop also works for items that are already placed inside the Query Builder.

### Query Execution

After changing the Query, it must be executed so the pivot table may be updated. 
If the "Autorun query" checkbox on the toolbar is checked, this will happen automatically.
If the "Autorun query" checkbox is not checked, then you can execute the query by clicking the "play" button that appears just in front of the checkbox label:

![image](https://github.com/user-attachments/assets/0d32ac87-25fa-49d2-8d1b-31e615e8378c)

### Derived Attributes
Right before the attribute item, there is a widget to expand the Attribute so its derived Attributes and Aggregates are revealed.

![image](https://github.com/user-attachments/assets/db9e89c5-e7c3-44af-956b-9393dad6723c)

You can think of a derived attribute as an expression (formula) that calculates some aspect from a single value from the attribute upon which it is based.
For example, from an attribute that represents timestamp values, we can extract only the date part, or only the time part, or even the individual parts like year, month, and so on.
The values that are thus derived from the original attribute values can be thought of as a 'virtual' column and can appear on wither of the pivot table axes.

### Aggregates

Aggregates are special expressions that calculate a result on a group of attribute values. 
Aggregates cannot be placed on the horizontal or vertical axes of the pivot table. Rather, they can used to create cells appearing at the intersection of the row and column headers.

![image](https://github.com/user-attachments/assets/3f27fb2a-6456-49ac-a085-c6c2553d1bfa)

## Structured types, Arrays, and Maps

Attributes can have any kind of datatype, including composite or "nested" data types - that is, types whose values are not scalar, but which consist of multiple elements.
Especially when exploring JSON files one is likely to encounter attributes having these types.

### Structured Types

Values with a Structured type (STRUCT) are in the end just values, and can be projected on the query axis as such.
Attributes of this type also have a "structure" folder that gives access to its members.

![image](https://github.com/user-attachments/assets/8687b270-6298-4434-8f52-5b32d7d39a53)

Members are also just attributes, and will have their own derivations and aggregates, in accordance with the member type. 
Of course, members that are themselves of a structured type have their own structure folder that gives access to its members.

### Arrays

Arrays are also just values and can be treated as such.

Attributes of an array type have a set of "array operations" derivations:
- elements: unnests the array and projects the element value on a separate tuple. Just like with members of structured types, array elements are just like attributes and may have derivations and aggregates in accordance with their type.
- element indices: unnests the array, and projects the element index. If both elements and element indices appear together on the same axis, then they are unrolled at the same level, so that the indices and the element values refer to the same element.
- length: returns the length of the array.
- sort values: array value after sorting the elements
- unique values: (sorted) array value after removing the duplicate elements 
- unique values length: length of the deduplicated array.

![image](https://github.com/user-attachments/assets/5f2acd6e-3ac1-4702-b204-7737fbc9a8f0)

When the elements or element indices derivations are applied to multiple, independent attributes, then they are unrolled independently, in order of appearance on the axis.

Arrays also support a collection of "array statistics":

![image](https://github.com/user-attachments/assets/f9230a17-339d-4598-b8e5-3b92f851b395)

Array statistics are special derivations that calculate an aggregate value over the array's elements. 

### Maps

Maps are structured types that are somewhat similar to Arrays. While arrays have an ordered collection of elements with an associated integer index, Maps are an unordered collections of entries. Map entries are values (which can be of any type) which are uniquely identified by a key, which also may have any type.

Maps have a folder with map operations:

![image](https://github.com/user-attachments/assets/0fbaf936-2e4d-40b3-a57d-fa4ad330b795)

- entries gives access to the key and value derivations. These will unnest the map and project the key and/or value. Like array elements and element indices, the key and value derivations of the same map attribute are not independent but unrolled together.
- entry count: the number of entries in the map
- keyset: the (sorted) list of keys.

### Filtering

The query editor supports a special Filters axis. Items placed on the filters axis represent conditions that are applied on the underlying dataset. Items can appear independently on the filter axis: they are not automatically visible in the query result, but items that appear on the filter axis may also (additionally) be placed on the rows or columns axis.

Immediately after placing a new item on the Filters axis, the Filter Dialog pops up right below the Filter axis item. The Filter dialog lets you choose values and operators to filter the query results.

![image](https://github.com/user-attachments/assets/beae75ae-b158-4e26-b30b-958bffd4f222)

#### Filter Type
The Filter type dropdown appears in the top of the Filter Dialog. Here you choose the operator that should be used to filter the data. The options are:
- Include: the values in the data must match any of the filter values exactly
- Exclude: rows from the data appear only when the value from the respective item does not match any of the filter values.
- Like: the values in the data must match the pattern of one or more filter values
- Not Like: the values in the data must not match the pattern of any of the filter values
- Between: the values of the data must be between the filter value-ranges
- Not Between: the values of the data must not be between any of the filter value-ranges

#### Finding Filter Values
In the top of the Filter Dialog there is an input where you can type a value that will be used as a pattern for retrieving values from the respective item.

The pattern is used in a LIKE comparison to retrieve the items values. 
LIKE patterns support two wildcards: 
- `'%'` (percent sign) is a wildcard for any character sequence, of any length; 
- `'_'` (underscore) is a wildcard for any single character.

The input supports multiple patterns. To enter multiple patterns, separate them by a semi-colon.
You can also paste delimited data (such as a range of cells from an Excel workbook) and paste them directly into the input.

The retrieved values are placed in the Picklist appearing below the input.

Right above the input, there appear two checkboxes:
- Apply all filters: when checked, the Filter Picklist will be populated with values from only rows that (in addition to the pattern in the input) also respect all other filter items (if present)
- Auto-wildcards: when checked, texts entered or pasted into the input are automatically pre- and postfixed with the `'%'` wildcard, effectively finding all values that contain the entered text.

#### Adding/Deleting Filter Values

Filter values can be applied to the filter item by finding them in the Filter Value Picklist and clicking them.
Alternatively, values may be entered manually and added by clicking the button next to the input, or by hitting the Enter key on the keyboard.

Applying a value in this way while an already applied value is selected will overwrite the applied value with the new one.
To enter multiple filter values at once, separate them with a semi-colon and then hit the button or the Enter key.
When pasting multiple values from outside Huey, for example from Excel or a text editor, separators like newline and tab are automatically replaced with the semi-colon for ease of use.

Applied values may be removed by selecting them and then hitting the Clear Highlighted dialog button, or the Delete key on the keyboard.
Hitting the Clear All button will remove all applied values. 

#### Filter Dialog Buttons

- The Apply button will actually apply the chosen values to the filter and close the Filter Dialog.
- The Remove button will remove the filter item entirely from the Filter axis and close the Filter Dialog
- The Cancel button will close the Filter Dialag without changing the state of the filter item.

#### Hiding, Revealing and Toggling applied Filter Values
Once the filter values are applied, the Filter Item will show the number of values as well as a collapser/expander.

![image](https://github.com/user-attachments/assets/8f042450-8320-4b52-b097-4787031618c9)

By default, the filter item is collapsed. Clicking the expander will reveal the filter items:

![image](https://github.com/user-attachments/assets/edb058d6-c523-4b37-804c-804fcf11ae58)

The filter values have a checkbox that allows you to enable or disable that value. 

### (Sub)totals

Items on the row or columns axis have a "totals" toggle-icon. When enabled, totals for that item will be displayed in a totals row or column.

![image](https://github.com/user-attachments/assets/4b9bed21-0d42-4af0-9b1c-b921f440de48)

## Saving & Restoring your query 

### Saving Queries
Everytime you make a change to your query it will be encoded and appended to the URL as fragment (a.k.a. hash or anchor). You can bookmark the url and revisit it later, or you can copy the url from your browser's address bar and share it. 

### Restoring Queries
You can load queries simply by navigating to the respective url (including the fragment). The fragment includes the query and a reference to the datasource - not the actual data itself.

When restoring the query, Huey checks if there is currently a datasource present that matches the referenced datasource's name and column signature. If so, it will use it. If there is currently no datasource that matches the referenced one, Huey will prompt you so you can upload it. 

![prompt to load a referenced datasource](https://github.com/user-attachments/assets/fbf35cbd-9265-4b0e-be39-89503b997dcd)

If the referenced datasource does not exist, but there are other datasources that could satisfy the query (based on whether it includes all attributes mentioned in the query), then the prompt will offer those datasources too as alternatives:

![image](https://github.com/user-attachments/assets/4bed7810-74e9-4080-a6b5-dda478501870)

If the datasource is built on a URL, Huey will attempt to access it directly. If that succeeds, you won't be prompted to confirm: Huey will simply load the remote datasource and restore the query. 

### Undo & Redo

Because the query state updates the page url, you can use the browser's standard Back and Forward buttons to browse between different versions of your query.

### Cloning the Huey Window

Hitting the Clone button on the toolbar will open a new instance of Huey in a new browser tab, while preserving the existing data sources as well as the current query.

## Export
Huey provides export capabilities so you can use the results of your analysis outside huey.
The export dialog lets you export query results by downloading it as csv, parquet, or JSON file, or you can choose to have your results copied to your operating system clipboard.

Apart from the result data, Huey also lets you export the SQL statements that would produce the query result.

![image](https://github.com/user-attachments/assets/d0cf66e0-9e03-4dd6-a888-c4da3bf46cac)

## Settings
The settings dialog lets you control Huey's behavior. You can open the settings dialog by clicking the "gear" icon, which is on the right in the top toolbar:![Gear icon](https://github.com/user-attachments/assets/c1d53e42-8d41-4128-ab06-12263e284edc)
. 
Settings are persisted in the browser's local storage.
Settings are organized in separate tabs:

### Datasource Settings
This lets you control the behavior of datasources.
- The UNION loose typing checkbox controls how Huey detects whether datasources have the same column signature. When unchecked, exact data type matching is used; when checked, a more loose typing rule is applied.

### Value formatting
This tab bundles all settings that controls the default appearance of values
- NULL-value label: a string that is used to symbolize NULL-values.
- Totals label: a string that is used to indicate the value is the total of the item indicated by the header.
- Use default locale: when checked, the Browser's default locale(s) are used to format numbers. When unchecked, the Locale setting becomes editable.
- Locale: the custom locale to use. You need to uncheck the Use default locale checkbox to edit this setting
- Min. integer digits: the minimal number of digits to use to denote the integer part of numbers
- Min. fraction digits: the minimal number of fractional digits to denote
- Max. fraction digits: the maximum number of fractional digits to denote
### Query
Controls the behavior of the query editor.
- Autorun: whether queries execute automatically after editing the query
#### Filter
Settings to control the Query's filter behavior
- Search timeout (ms): the number of milliseconds to wait after user input before running a query to populate the filter picklist.
- Picklist pagesize: the number of rows to fetch per query to populate the filter picklist.
### Pivot Table
Settings that control the appearance and behavior of the Pivot Table
- Max. cellwidth (ch): Columns grow according to the largest value, up to this value. The unit is ch - the number of characters.
### Theme
- Themes dropdown: a dropdown showing the various themes/color schemes.

## Integrating and/or Embedding Huey

You can embed huey inside a frame on your own webpage and control the application by sending it commands using the [`postMessage()`-method](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage).
Currently this experimental feature is under development and not documented in detail. Please checkout src/PostMessageInterface/PostMessageTestbed.html for an example that illustrates this feature. 
