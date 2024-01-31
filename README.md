# 🦆 Huey
Huey is a browser-based application that lets you inspect and analyze tabular datasets.
Huey supports reading from multiple file formats, like .csv, .parquet, .json data files as well as .duckdb database files.

__Try Huey now online__ [https://rpbouman.github.io/huey/src/index.html](https://rpbouman.github.io/huey/src/index.html)

![image](https://github.com/rpbouman/huey/assets/647315/b2e45002-409c-4a98-8d38-f5a6bfc6b7e9)


## Key features
- Zero install. Download or checkout the source tree, and open src/index.html in your browser! No server required.
- Supports reading .parquet, .csv, .json and .duckdb database files. (Support for reading MS Excel .xlsx files and .sqlite is planned)
- Blazing fast, even for large files - courtesy of [DuckDB](https://duckdb.org)
- An intuitive and responsive pivot table, with support for many types of metrics

Note: although Huey can run locally, there is nothing that keeps you from deploying it in a webserver if you want to.

## Limitations
- Developed on latest/recent versions of Google Chrome. Most features will work on other major browsers as well, browser compatibility is currently not the highest priority. 
- Currently supports only local files. ("Local files" are files that logically exist in the local file system. This includes files from network drives and cloud drives like Google Drive and Microsoft OneDrive)

## Getting started
1) [Checkout](https://github.com/rpbouman/huey.git) or [Download](https://github.com/rpbouman/huey/archive/refs/heads/dev.zip) from github
2) Open [index.html](https://github.com/rpbouman/huey/blob/dev/index.html) in your web browser. Note that although Huey runs locally, it depends on resources served by jsdelivr.com, so make sure you're connected to the internet.
3) Register one or more files and start analyzing!

## Registering and Analyzing Files with Huey

### Registering Files
Huey uses [DuckDb WASM](https://duckdb.org/docs/archive/0.9.2/api/wasm/overview) to access and analyze files. 
Due to general security policy, the web browser can not simply read arbitrary files from your local computer: you need to explicitly select files and register them in DuckDB WASM's virtual file system. 

To register one or more files, you can either 
1) Click the 'Upload...' button, which is the leftmost button on the toolbar at the top of the page.
2) Drag 'n Drop one or more files unto the "Datasources" tab in the sidebar. (The sidebar is on the left of the screen)

Either of these actions will pop up a dialog that lets you browse and choose one or more files from your local filesystem.
In the file browser dialog, navigate to the file or files that you want to analyze, select them and then confirm the dialog by clicking the 'Ok' button.

After confirming the dialog, Huey will attempt to register the files in DuckDb. 
The successfully registered files are added to the "Datasources" tab in the sidebar.

When registering new files, Huey will attempt to group files having similar column signature. The group appears as a separate node in the Datasources tab, and the individual files appear indented below it.

Files that cannot be grouped appear in a separate Miscellanous Files group.

#### Opening DuckDb files
Apart from reading data files directly, Huey can also utilize existing duckdb files and access its tables and views. 
The process for accessing duckdb files is exactly the same as for accessing data files. Just make sure you give your duckdb file a '.duckdb' extension - that's how Huey knows it's a duckdb file 
(DuckDB data files are not required to have any particular name or extension, but Huey currently cannot detect that, so it relies on a file extension convention instead.)

Note: We ran into a limitation - when the duckdb file itself refers to external files, then it's likely that Huey (or rather, DuckDB WASM) won't be able to find them.
But native duckdb tables, as well as views based on duckdb base tables work marvelously and are quite a bit faster than querying bare data files.

### Analyzing Datasources
The Datasources have an analyze button. After clicking it, the sidebar switches to the Attributes tab, which is then is populated with a list of the Attributes of the selected Datasource.
You can think of Attributes as a list of values (a column) that can be extracted from the Datasource and presented along the axes of the pivot table.

The pivot table has two axes for placing attribute values:
1) Attributes appearing on the horizontal axis are used to generate column headers. For this reason the horizontal axis is also known as the 'columns'-axis.
2) attributes appearing on the vertical axis are used to generate row headers. For this reason the vertical axis is also known as the 'rows'-axis.

Right before the attribute item, there is a widget to expand the Attribute so its derived Attributes and Aggregates are revealed.

You can think of a derived attribute as an expression (formulae) that calculates some aspect from a single value from the attribute upon which it is based.
For example, from an attribute that represents timestamp values, we can extract only the date part, or only the time part, or even the individual parts like year, month, and so on.
The values that are thus derived from the original attribute values can be thought of as a 'virtual' column and can appear on wither of the pivot table axes.

Aggregates are special expressions that calculate a result on a group of attribute values. 
Aggregates cannot be placed on the horizontal or vertical axes of the pivot table. Rather, they can used to create cells appearing at the intersection of the row and column headers.

#### Filtering
The query editor supports a special Filters axis. Items placed on the filters access support the Filters dialog which lets you choose values and operators to filter the query results.
Items on the filter axis themselves are not visible in the query result, unless those items are also placed on the the columns or rows axis.

### Export
Huey provides export capabilities so you can use the results of your analysis outside huey.
The export dialog lets you export query results by downloading it as csv, parquet, or JSON file, or you can choose to have your results copied to your operating system clipboard.

Apart from the result data, Huey also lets you export the SQL statements that would produce the query result.
