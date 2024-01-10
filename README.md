# 🦆 Huey
Huey is a web application that lets you inspect and analyze tabular datasets stored as .csv or .parquet files. 

## Key features
- Zero install. Download or checkout the source tree, and open index.html in your browser! No server required.
- Support for parquet and csv files. (Support for json and duckdb database files is planned).
- Blazing fast, even for large files - courtesy of [DuckDB](https://duckdb.org)
- An intuitive and responsive pivot table, supporting many types of metrics

## Limitations
- Developed on latest/recent versions of Google Chrome. Although most features should work on other major browsers as well, browser compatibility is currently not the highest priority
- When run directly from file, all typical limitations such as same domain restrictions apply. In general this means you can only access files that are already on your local machine.

## Getting started
1) [Checkout](https://github.com/rpbouman/huey.git) or [Download](https://github.com/rpbouman/huey/archive/refs/heads/dev.zip) from github
2) Open [index.html](https://github.com/rpbouman/huey/blob/dev/index.html) in your web browser. Note that although Huey runs locally, it depends on resources served by jsdelivr.com, so make sure you're connected to the internet.
3) Register one or more files and start analyzing!

## Registering and Analyzing Files with Huey

### Registering Files
Huey uses [DuckDb WASM](https://duckdb.org/docs/archive/0.9.2/api/wasm/overview) to access and analyze files. 
Due to general security policy, the web browser can not simply read arbitrary files from your local computer: you need to explicitly browse for a file so it can be registered in DuckDB WASM's virtual file system. 

To register a file, either select the 'Register New...' option in the 'Files' dropdown list. (This dropdown is located left in the toolbar in the top of the page).
Alternatively, you can click the 'Upload...' button, which is immediately to the right of the Files dropdown list.
Either of these actions will pop up a dialog that lets you browse and choose files on your local computer.
In the file browser dialog, navigate to the file or files that you want to analyze, select them and then confirm the dialog by clicking the 'Ok' button.
After confirming the dialog, Huey will attempt to register the files in DuckDb. 

The successfully registered files are added to the 'Files' dropdown list so you can analyze them.

### Analyzing files
After selecting a registered file from the 'Files' dropdown list, the sidebar at the left side of the page is populated with a list of its Attributes.
You can think of Attributes as a list of values (a column) that can be extracted from the file and presented along the axes of the pivot table.

The pivot table has two axes for placing attribute values:
1) Attributes appearing on the horizontal axis are used to generate column headers. For this reason the horizontal axis is also known as the 'columns'-axis.
2) attributes appearing on the vertical axis are used to generate row headers. For this reason the vertical axis is also known as the 'rows'-axis.

Right before the attribute item, there is a widget to expand the Attribute so its derived Attributes and Aggregates are revealed.

You can think of a derived attribute as an expression (formulae) that calculates some aspect from a single value from the attribute upon which it is based.
For example, from an attribute that represents timestamp values, we can extract only the date part, or only the time part, or even the individual parts like year, month, and so on.
The values that are thus derived from the original attribute values can be thought of as a 'virtual' column and can appear on wither of the pivot table axes.

Aggregates are special expressions that calculate a result on a group of attribute values. 
Aggregates cannot be placed on the horizontal or vertical axes of the pivot table. Rather, they can used to create cells appearing at the intersection of the row and column headers.


