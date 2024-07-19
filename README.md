# 🦆 Huey
Huey is a browser-based application that lets you explore tabular datasets.
Huey supports reading from multiple file formats, like .csv, .parquet, .json data files as well as .duckdb database files.

__Try Huey now online__ [https://rpbouman.github.io/huey/src/index.html](https://rpbouman.github.io/huey/src/index.html)

![image](https://github.com/rpbouman/huey/assets/647315/b2e45002-409c-4a98-8d38-f5a6bfc6b7e9)


## Key features
- An intuitive and responsive pivot table that supports filtering and (sub)totals
- Supports many different aggregate functions for reporting and data exploration
- Automatic breakdown of date/time columns into separate parts (year, month, quarter etc) for reporting
- Supports reading .parquet, .csv, .json and .duckdb database files. (Support for reading MS Excel .xlsx files and .sqlite is planned)
- Export of results and/or SQL queries to file or clipboard
- Blazing fast, even for large files - courtesy of [DuckDB](https://duckdb.org)
- Zero install. Download or checkout the source tree, and open src/index.html in your browser! No server required.

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
Huey uses [DuckDb WASM](https://duckdb.org/docs/archive/0.9.2/api/wasm/overview) to read and analyze data files. 
Due to general security policy, the web browser can not simply read files from your local computer: you need to explicitly select and register files in DuckDB WASM's virtual file system. 

To register one or more files, you can either 
1) Click the 'Upload...' button ![upload button icon](https://github.com/rpbouman/huey/assets/647315/8dbae6ad-c4f2-4d5e-bc9a-f15fa9444c89).
The upload button is always available as the leftmost button on the toolbar at the top of the page. The upload action will pop up a file browser dialog that lets you browse and choose one or more files from your local filesystem.
In the file browser dialog, navigate to the file or files that you want to explore, select them and then confirm the dialog by clicking the 'Ok' button.
2) Drag 'n Drop one or multiple files unto the "Datasources" tab in the sidebar. 

Either action will open the Upload dialog. The upload dialog will show a progress bar for each file that is being registered. Additional progress items may appear in case a duckdb extension needs to be installed and/or loaded. 

![image](https://github.com/rpbouman/huey/assets/647315/b0c37783-4b3a-4166-9f3b-7f5a5ff91cd9)

After completion of the upload process, the upload dialog is updated to indicate the status of the uploads (or the extension installation, if applicable). 

Items that encountered an error are indicated by red progressbars. In case of errors, the item is expanded to reveal any information that might help to remedy the issue. 

Successful actions are indicated by green progressbars. Succesfully loaded files are available in the Datasources tab, from where you can start exploring their contents by clicking the explore button ![explore button](https://github.com/rpbouman/huey/assets/647315/7b67ff2d-5cec-44e0-91d4-e670d38487c1). As a convenience, the explore button is also present in the upload dialog.

Huey will attempt to group files having similar column signature. The group appears as a separate top-level node in the Datasources tab, with its individual files indented below it. A file group has its own explore button, so that you can not only explore the individual files, but also the UNION of all Files in the group:

![image](https://github.com/rpbouman/huey/assets/647315/0ad057e0-e4ab-4bd8-b996-d3f50542853d)

Files that cannot be grouped appear in a separate Miscellanous Files group.

#### Opening DuckDb files
Apart from reading data files directly, Huey can also open existing duckdb files and access its tables and views. The process for accessing duckdb files is exactly the same as for accessing data files. Just make sure you give your duckdb file a '.duckdb' extension - that's how Huey knows it's a duckdb file. (DuckDB data files are not required to have any particular name or extension, but Huey currently cannot detect that, so it relies on a file extension convention instead.) Successfully loaded .duckdb files will appear in the DuckDb Folder, which appears at the top of the DataSources tab. 

![image](https://github.com/rpbouman/huey/assets/647315/c7ca5ed7-7454-4783-8dbc-493244f8bb28)

The schemas in the duckdb database file are presented as folders below the duckdb file entry, and any tables or views in the schema are presented below the schema folder. Each table or view has an explore button which you can click to explore the data.   

Note: We ran into a limitation - when the duckdb file itself refers to external files, then it's likely that Huey (or rather, DuckDB WASM) won't be able to find them.
But native duckdb tables, as well as views based on duckdb base tables work marvelously and are quite a bit faster than querying bare data files.

### Exploring Datasources
The Datasources have an explore button ![explore button](https://github.com/rpbouman/huey/assets/647315/7b67ff2d-5cec-44e0-91d4-e670d38487c1)
 . After clicking it, the sidebar switches to the Attributes tab, which is then is populated with a list of the Attributes of the selected Datasource.
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

#### (Sub)totals

Items on the row or columns axis have a "totals" toggle-icon. When enabled, totals for that item will be displayed in a totals row or column.

![image](https://github.com/user-attachments/assets/4b9bed21-0d42-4af0-9b1c-b921f440de48)

### Export
Huey provides export capabilities so you can use the results of your analysis outside huey.
The export dialog lets you export query results by downloading it as csv, parquet, or JSON file, or you can choose to have your results copied to your operating system clipboard.

Apart from the result data, Huey also lets you export the SQL statements that would produce the query result.
