# 🦆 Huey
Huey is a browser-based application that lets you explore and analyze data.
Huey supports reading from multiple file formats, like .csv, .parquet, .json data files as well as .duckdb database files.

Checkout my [DataZen talk on youtube](https://www.youtube.com/watch?v=1A0r4CbLSaI) for background and a demo if its features. 

Or, __Try Huey now online__ [https://rpbouman.github.io/huey/src/index.html](https://rpbouman.github.io/huey/src/index.html)

(Note: this is a static webapp. Any data you load into the app stays on your local client.)

![image](https://github.com/user-attachments/assets/f9d49b89-f29e-49b4-accf-64545b3e4c62)

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
- Zero install. Huey is a static webapp so you can simply download or checkout the source tree, and open src/index.html in your browser - no server required. Alternatively, [use the Live demo site](https://rpbouman.github.io/huey/src/index.html). Being a static webapp, Huey can run locally without a server, but there is nothing that keeps you from serving it from a webserver if you need or want to.
- It's free! Huey is released under the MIT license, just like DuckDB.

### Limitations
- Huey is based on DuckDB WASM. DuckDB is awesome! However, the WASM runtime imposes some limits which result in a poorer performance as compared to native DuckDB. That said, DuckDB WASM is still incredibly fast when compared to any in-browser alternative. 

## Getting started
For a super quick start, here are a few links to the [live demo](https://rpbouman.github.io/huey/src/index.html)

- Los Angeles International Airport - [Number of Flight operations, by flight type and reporting period](https://rpbouman.github.io/huey/src/index.html#JTdCJTIycXVlcnlNb2RlbCUyMiUzQSU3QiUyMmRhdGFzb3VyY2VJZCUyMiUzQSUyMmZpbGUlM0ElNUMlMjJodHRwcyUzQSUyRiUyRmRhdGEubGFjaXR5Lm9yZyUyRmFwaSUyRnZpZXdzJTJGYWppdi11YzYzJTJGcm93cy5jc3YlM0ZhY2Nlc3NUeXBlJTNERE9XTkxPQUQlNUMlMjIlMjIlMkMlMjJjZWxsc0hlYWRlcnMlMjIlM0ElMjJjb2x1bW5zJTIyJTJDJTIyYXhlcyUyMiUzQSU3QiUyMmNlbGxzJTIyJTNBJTVCJTdCJTIyY29sdW1uTmFtZSUyMiUzQSUyMkZsaWdodE9wc0NvdW50JTIyJTJDJTIyY29sdW1uVHlwZSUyMiUzQSUyMkJJR0lOVCUyMiUyQyUyMmFnZ3JlZ2F0b3IlMjIlM0ElMjJzdW0lMjIlN0QlNUQlMkMlMjJjb2x1bW5zJTIyJTNBJTVCJTdCJTIyY29sdW1uTmFtZSUyMiUzQSUyMkZsaWdodFR5cGUlMjIlMkMlMjJjb2x1bW5UeXBlJTIyJTNBJTIyVkFSQ0hBUiUyMiUyQyUyMmluY2x1ZGVUb3RhbHMlMjIlM0F0cnVlJTdEJTJDJTdCJTIyY29sdW1uTmFtZSUyMiUzQSUyMkFycml2YWxfRGVwYXJ0dXJlJTIyJTJDJTIyY29sdW1uVHlwZSUyMiUzQSUyMlZBUkNIQVIlMjIlN0QlNUQlMkMlMjJyb3dzJTIyJTNBJTVCJTdCJTIyY29sdW1uTmFtZSUyMiUzQSUyMlJlcG9ydFBlcmlvZCUyMiUyQyUyMmNvbHVtblR5cGUlMjIlM0ElMjJUSU1FU1RBTVAlMjIlMkMlMjJkZXJpdmF0aW9uJTIyJTNBJTIyeWVhciUyMiUyQyUyMmluY2x1ZGVUb3RhbHMlMjIlM0F0cnVlJTdEJTJDJTdCJTIyY29sdW1uTmFtZSUyMiUzQSUyMlJlcG9ydFBlcmlvZCUyMiUyQyUyMmNvbHVtblR5cGUlMjIlM0ElMjJUSU1FU1RBTVAlMjIlMkMlMjJkZXJpdmF0aW9uJTIyJTNBJTIybW9udGglMjBzaG9ydG5hbWUlMjIlMkMlMjJpbmNsdWRlVG90YWxzJTIyJTNBdHJ1ZSU3RCU1RCU3RCU3RCU3RA==)
- City of Chicago Energy Benchmarking [Use of electricity, gas and steam by district over years 2018 - 2022](https://rpbouman.github.io/huey/src/index.html#JTdCJTIycXVlcnlNb2RlbCUyMiUzQSU3QiUyMmRhdGFzb3VyY2VJZCUyMiUzQSUyMmZpbGUlM0ElNUMlMjJodHRwcyUzQSUyRiUyRmRhdGEuY2l0eW9mY2hpY2Fnby5vcmclMkZhcGklMkZ2aWV3cyUyRnhxODMtanI4YyUyRnJvd3MuY3N2JTNGYWNjZXNzVHlwZSUzRERPV05MT0FEJTVDJTIyJTIyJTJDJTIyY2VsbHNIZWFkZXJzJTIyJTNBJTIyY29sdW1ucyUyMiUyQyUyMmF4ZXMlMjIlM0ElN0IlMjJjZWxscyUyMiUzQSU1QiU3QiUyMmNvbHVtbk5hbWUlMjIlM0ElMjJFbGVjdHJpY2l0eSUyMFVzZSUyMChrQnR1KSUyMiUyQyUyMmNvbHVtblR5cGUlMjIlM0ElMjJET1VCTEUlMjIlMkMlMjJhZ2dyZWdhdG9yJTIyJTNBJTIyc3VtJTIyJTdEJTJDJTdCJTIyY29sdW1uTmFtZSUyMiUzQSUyMk5hdHVyYWwlMjBHYXMlMjBVc2UlMjAoa0J0dSklMjIlMkMlMjJjb2x1bW5UeXBlJTIyJTNBJTIyRE9VQkxFJTIyJTJDJTIyYWdncmVnYXRvciUyMiUzQSUyMnN1bSUyMiU3RCUyQyU3QiUyMmNvbHVtbk5hbWUlMjIlM0ElMjJEaXN0cmljdCUyMFN0ZWFtJTIwVXNlJTIwKGtCdHUpJTIyJTJDJTIyY29sdW1uVHlwZSUyMiUzQSUyMkRPVUJMRSUyMiUyQyUyMmFnZ3JlZ2F0b3IlMjIlM0ElMjJzdW0lMjIlN0QlNUQlMkMlMjJjb2x1bW5zJTIyJTNBJTVCJTdCJTIyY29sdW1uTmFtZSUyMiUzQSUyMkRhdGElMjBZZWFyJTIyJTJDJTIyY29sdW1uVHlwZSUyMiUzQSUyMkJJR0lOVCUyMiU3RCU1RCUyQyUyMmZpbHRlcnMlMjIlM0ElNUIlN0IlMjJjb2x1bW5OYW1lJTIyJTNBJTIyRGF0YSUyMFllYXIlMjIlMkMlMjJjb2x1bW5UeXBlJTIyJTNBJTIyQklHSU5UJTIyJTJDJTIyZmlsdGVyJTIyJTNBJTdCJTIyZmlsdGVyVHlwZSUyMiUzQSUyMmJldHdlZW4lMjIlMkMlMjJ2YWx1ZXMlMjIlM0ElN0IlMjIyJTJDMDE4JTIyJTNBJTdCJTIydmFsdWUlMjIlM0ElMjIyJTJDMDE4JTIyJTJDJTIybGFiZWwlMjIlM0ElMjIyJTJDMDE4JTIyJTJDJTIybGl0ZXJhbCUyMiUzQSUyMjIwMTglMjIlN0QlN0QlMkMlMjJ0b1ZhbHVlcyUyMiUzQSU3QiUyMjIlMkMwMjIlMjIlM0ElN0IlMjJ2YWx1ZSUyMiUzQSUyMjIlMkMwMjIlMjIlMkMlMjJsYWJlbCUyMiUzQSUyMjIlMkMwMjIlMjIlMkMlMjJsaXRlcmFsJTIyJTNBJTIyMjAyMiUyMiU3RCU3RCUyQyUyMnRvZ2dsZVN0YXRlJTIyJTNBJTIyY2xvc2VkJTIyJTdEJTdEJTVEJTJDJTIycm93cyUyMiUzQSU1QiU3QiUyMmNvbHVtbk5hbWUlMjIlM0ElMjJDb21tdW5pdHklMjBBcmVhJTIyJTJDJTIyY29sdW1uVHlwZSUyMiUzQSUyMlZBUkNIQVIlMjIlN0QlNUQlN0QlN0QlN0Q=)
- Montgomery County of Maryland: [Warehouse and Retail Sales](https://rpbouman.github.io/huey/src/index.html#JTdCJTIycXVlcnlNb2RlbCUyMiUzQSU3QiUyMmRhdGFzb3VyY2VJZCUyMiUzQSUyMmZpbGUlM0ElNUMlMjJodHRwcyUzQSUyRiUyRmRhdGEubW9udGdvbWVyeWNvdW50eW1kLmdvdiUyRmFwaSUyRnZpZXdzJTJGdjc2aC1yN2JyJTJGcm93cy5jc3YlM0ZhY2Nlc3NUeXBlJTNERE9XTkxPQUQlNUMlMjIlMjIlMkMlMjJjZWxsc0hlYWRlcnMlMjIlM0ElMjJjb2x1bW5zJTIyJTJDJTIyYXhlcyUyMiUzQSU3QiUyMmNlbGxzJTIyJTNBJTVCJTdCJTIyY29sdW1uTmFtZSUyMiUzQSUyMlJFVEFJTCUyMFNBTEVTJTIyJTJDJTIyY29sdW1uVHlwZSUyMiUzQSUyMkRPVUJMRSUyMiUyQyUyMmFnZ3JlZ2F0b3IlMjIlM0ElMjJzdW0lMjIlN0QlMkMlN0IlMjJjb2x1bW5OYW1lJTIyJTNBJTIyUkVUQUlMJTIwVFJBTlNGRVJTJTIyJTJDJTIyY29sdW1uVHlwZSUyMiUzQSUyMkRPVUJMRSUyMiUyQyUyMmFnZ3JlZ2F0b3IlMjIlM0ElMjJzdW0lMjIlN0QlMkMlN0IlMjJjb2x1bW5OYW1lJTIyJTNBJTIyV0FSRUhPVVNFJTIwU0FMRVMlMjIlMkMlMjJjb2x1bW5UeXBlJTIyJTNBJTIyRE9VQkxFJTIyJTJDJTIyYWdncmVnYXRvciUyMiUzQSUyMnN1bSUyMiU3RCU1RCUyQyUyMmNvbHVtbnMlMjIlM0ElNUIlN0IlMjJjb2x1bW5OYW1lJTIyJTNBJTIyWUVBUiUyMiUyQyUyMmNvbHVtblR5cGUlMjIlM0ElMjJCSUdJTlQlMjIlN0QlMkMlN0IlMjJjb2x1bW5OYW1lJTIyJTNBJTIyTU9OVEglMjIlMkMlMjJjb2x1bW5UeXBlJTIyJTNBJTIyQklHSU5UJTIyJTdEJTVEJTJDJTIyZmlsdGVycyUyMiUzQSU1QiU3QiUyMmNvbHVtbk5hbWUlMjIlM0ElMjJZRUFSJTIyJTJDJTIyY29sdW1uVHlwZSUyMiUzQSUyMkJJR0lOVCUyMiUyQyUyMmZpbHRlciUyMiUzQSU3QiUyMmZpbHRlclR5cGUlMjIlM0ElMjJpbiUyMiUyQyUyMnZhbHVlcyUyMiUzQSU3QiUyMjIlMkMwMTclMjIlM0ElN0IlMjJ2YWx1ZSUyMiUzQSUyMjIlMkMwMTclMjIlMkMlMjJsYWJlbCUyMiUzQSUyMjIlMkMwMTclMjIlMkMlMjJsaXRlcmFsJTIyJTNBJTIyMjAxNyUyMiUyQyUyMmVuYWJsZWQlMjIlM0FmYWxzZSU3RCUyQyUyMjIlMkMwMTglMjIlM0ElN0IlMjJ2YWx1ZSUyMiUzQSUyMjIlMkMwMTglMjIlMkMlMjJsYWJlbCUyMiUzQSUyMjIlMkMwMTglMjIlMkMlMjJsaXRlcmFsJTIyJTNBJTIyMjAxOCUyMiUyQyUyMmVuYWJsZWQlMjIlM0FmYWxzZSU3RCUyQyUyMjIlMkMwMTklMjIlM0ElN0IlMjJ2YWx1ZSUyMiUzQSUyMjIlMkMwMTklMjIlMkMlMjJsYWJlbCUyMiUzQSUyMjIlMkMwMTklMjIlMkMlMjJsaXRlcmFsJTIyJTNBJTIyMjAxOSUyMiU3RCUyQyUyMjIlMkMwMjAlMjIlM0ElN0IlMjJ2YWx1ZSUyMiUzQSUyMjIlMkMwMjAlMjIlMkMlMjJsYWJlbCUyMiUzQSUyMjIlMkMwMjAlMjIlMkMlMjJsaXRlcmFsJTIyJTNBJTIyMjAyMCUyMiU3RCU3RCUyQyUyMnRvVmFsdWVzJTIyJTNBJTdCJTdEJTJDJTIydG9nZ2xlU3RhdGUlMjIlM0ElMjJvcGVuJTIyJTdEJTdEJTJDJTdCJTIyY29sdW1uTmFtZSUyMiUzQSUyMklURU0lMjBUWVBFJTIyJTJDJTIyY29sdW1uVHlwZSUyMiUzQSUyMlZBUkNIQVIlMjIlMkMlMjJmaWx0ZXIlMjIlM0ElN0IlMjJmaWx0ZXJUeXBlJTIyJTNBJTIyaW4lMjIlMkMlMjJ2YWx1ZXMlMjIlM0ElN0IlMjJCRUVSJTIyJTNBJTdCJTIydmFsdWUlMjIlM0ElMjJCRUVSJTIyJTJDJTIybGFiZWwlMjIlM0ElMjJCRUVSJTIyJTJDJTIybGl0ZXJhbCUyMiUzQSUyMidCRUVSJyUyMiU3RCUyQyUyMkRVTk5BR0UlMjIlM0ElN0IlMjJ2YWx1ZSUyMiUzQSUyMkRVTk5BR0UlMjIlMkMlMjJsYWJlbCUyMiUzQSUyMkRVTk5BR0UlMjIlMkMlMjJsaXRlcmFsJTIyJTNBJTIyJ0RVTk5BR0UnJTIyJTdEJTJDJTIyS0VHUyUyMiUzQSU3QiUyMnZhbHVlJTIyJTNBJTIyS0VHUyUyMiUyQyUyMmxhYmVsJTIyJTNBJTIyS0VHUyUyMiUyQyUyMmxpdGVyYWwlMjIlM0ElMjInS0VHUyclMjIlN0QlMkMlMjJMSVFVT1IlMjIlM0ElN0IlMjJ2YWx1ZSUyMiUzQSUyMkxJUVVPUiUyMiUyQyUyMmxhYmVsJTIyJTNBJTIyTElRVU9SJTIyJTJDJTIybGl0ZXJhbCUyMiUzQSUyMidMSVFVT1InJTIyJTdEJTJDJTIyTk9OLUFMQ09IT0wlMjIlM0ElN0IlMjJ2YWx1ZSUyMiUzQSUyMk5PTi1BTENPSE9MJTIyJTJDJTIybGFiZWwlMjIlM0ElMjJOT04tQUxDT0hPTCUyMiUyQyUyMmxpdGVyYWwlMjIlM0ElMjInTk9OLUFMQ09IT0wnJTIyJTdEJTJDJTIyUkVGJTIyJTNBJTdCJTIydmFsdWUlMjIlM0ElMjJSRUYlMjIlMkMlMjJsYWJlbCUyMiUzQSUyMlJFRiUyMiUyQyUyMmxpdGVyYWwlMjIlM0ElMjInUkVGJyUyMiUyQyUyMmVuYWJsZWQlMjIlM0FmYWxzZSU3RCUyQyUyMlNUUl9TVVBQTElFUyUyMiUzQSU3QiUyMnZhbHVlJTIyJTNBJTIyU1RSX1NVUFBMSUVTJTIyJTJDJTIybGFiZWwlMjIlM0ElMjJTVFJfU1VQUExJRVMlMjIlMkMlMjJsaXRlcmFsJTIyJTNBJTIyJ1NUUl9TVVBQTElFUyclMjIlN0QlMkMlMjJXSU5FJTIyJTNBJTdCJTIydmFsdWUlMjIlM0ElMjJXSU5FJTIyJTJDJTIybGFiZWwlMjIlM0ElMjJXSU5FJTIyJTJDJTIybGl0ZXJhbCUyMiUzQSUyMidXSU5FJyUyMiU3RCU3RCUyQyUyMnRvVmFsdWVzJTIyJTNBJTdCJTdEJTJDJTIydG9nZ2xlU3RhdGUlMjIlM0ElMjJvcGVuJTIyJTdEJTdEJTVEJTJDJTIycm93cyUyMiUzQSU1QiU3QiUyMmNvbHVtbk5hbWUlMjIlM0ElMjJTVVBQTElFUiUyMiUyQyUyMmNvbHVtblR5cGUlMjIlM0ElMjJWQVJDSEFSJTIyJTdEJTJDJTdCJTIyY29sdW1uTmFtZSUyMiUzQSUyMklURU0lMjBUWVBFJTIyJTJDJTIyY29sdW1uVHlwZSUyMiUzQSUyMlZBUkNIQVIlMjIlN0QlMkMlN0IlMjJjb2x1bW5OYW1lJTIyJTNBJTIySVRFTSUyMERFU0NSSVBUSU9OJTIyJTJDJTIyY29sdW1uVHlwZSUyMiUzQSUyMlZBUkNIQVIlMjIlN0QlNUQlN0QlN0QlN0Q=)

Want to run Huey locally? No problem! Follow the instructions below:

1) [Checkout](https://github.com/rpbouman/huey.git) or [Download](https://github.com/rpbouman/huey/archive/refs/heads/dev.zip) from github
2) Open [index.html](https://github.com/rpbouman/huey/blob/dev/index.html) in your web browser. Note that although Huey runs locally, it depends on DuckDB WASM and Tabler Icons, which are served by the jsdelivr.com CDN, so make sure you're connected to the internet. Once these resources are downloaded, they are typically cached by your browser, often allowing you to run Huey even without an internet connection. 
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

#### Searching Attributes

Especially when there are a lot of attributes, it can be useful to search for attributes by nam To do that, use the Attribute Search feature. 
Simply type a part of the attribute name in the search input, and after a brief timeout, the list of attributes will automatically show only those attributes that (partially) match the search string:

![image](https://github.com/user-attachments/assets/1ab093d3-90f9-445a-bfaa-e6af1e81397e)

The search string is treated as a regular expression, and is matched in a case-insensitive manner, making it both easy and powerful.  

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
The values that are thus derived from the original attribute values can be thought of as a 'virtual' column. Derived attributes may be placed on either the rows or the columns pivot table axis. 
Derived attributes may be used as filter too.

### Aggregates

Aggregates are special expressions that calculate a result on a group of attribute values. 
Aggregates cannot be placed on the rows or columns axes of the pivot table. Rather, they can used to create cells appearing at the intersection of the row and column headers.
Currently, aggregates can also not be used on the filters axis. (Support for filtering on aggregated values is currently under consideration.)

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

#### Filter Types

The Filter type dropdown appears in the top of the Filter Dialog. Here you choose the operator that should be used to filter the data. The options are:
- __Include__: the values in the data must match any of the filter values exactly
- __Exclude__: rows from the data appear only when the value from the respective item does not match any of the filter values. (Negated include)
- __Like__: the values in the data must match the pattern of one or more filter values. The pattern is a simple [SQL LIKE pattern](https://duckdb.org/docs/sql/functions/pattern_matching.html#like) which supports % (percent sign) as wildcard for zero or more arbitrary characters, and _ (underscore) as wildcard for a single arbitrary character. 
- __Not Like__: the values in the data must not match the pattern of any of the filter values. (Negated Like)
- __Between__: the values of the data must be between the filter value-ranges.
- __Not Between__: the values of the data must not be between any of the filter value-ranges (Negated Between)

#### Array Filter Type 

Array-valued attributes support filtering using the regular Include/Exclude and Between/Not Between filter types. In addition, 4 array-specific filter types are supported: 

- __Include Has Any__: Include the rows if the array contains any of the selected filter values.
- __Exclude Has Any__: Exclude the rows if the array contains any of the selected filter values. (Negated Has Any)
- __Include Has All__: Include the rows only if the array contains all of the selected filter values.
- __Exclude Has All__: Exclude the rows only if the array contains all of the selected filter values. (Negated Has All)

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

The Range filter types Between and Not Between require two values, and the Filter dialog will reveal two value lists when choosing these filter types. 
When picking a new value, a new range is added using that value as both lower and upper bound of the range: 

![image](https://github.com/user-attachments/assets/4937056f-bf7a-4032-a8d3-a3d7fc54384f)

The upper bound value is automatically selected, and picking another value from the picklist will overwrite the selected value:

![image](https://github.com/user-attachments/assets/03d2fa78-a0b3-4c2e-b1c9-95a3b8ddd425)

You can always manually select a value in either value list to overwrite it with a new value.

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

# Development, Releases, and contributions 

## Branches
The Huey repository has two important branches - [dev](https://github.com/rpbouman/huey/tree/dev) and [main](https://github.com/rpbouman/huey/tree/main). 
Active development is done on the dev branch. 

## (Pre-)Release
Once every while, typically every few weeks, ongoing developments are captured in a (pre-)release, which gets its own version number and a nickname.
You can checkout prior releases here: [https://github.com/rpbouman/huey/releases](https://github.com/rpbouman/huey/releases)

A new (pre-)release is triggered whenever a dependency is updated (currently, Huey has two dependencies - DuckDB WASM and Tabler Icons).
Other events that trigger a (pre-)release is when ongoing development of new features and bugfixes is deemed stable - or at least stable enough to focus on new developments.

When a couple of pre-releases have been found stable enough for production usage, a release is made and the work from the dev branch is merged into the main branch.
The live demo at [https://rpbouman.github.io/huey/src/index.html](https://rpbouman.github.io/huey/src/index.html) is a github page that is created right on top of the main branch.
So, a merge to the main branch is what updates the version of the live demo.

If you just want to enjoy use of a stable version of Huey, you can either use the live demo, or checkout or download the main branch.
If you want to enjoy the latest developments, then you should use the dev branch.

## Checking your Huey version

You can verify the current Huey version in the about dialog:

![image](https://github.com/user-attachments/assets/7a0b8690-4986-4189-8e8c-be3abd9580e6)

Note that this also gives info on the versions of Huey's dependencies.

## Contributions

Your contributions are welcome! 
You can contribute in many ways:
- filing an issue: If something isn't working, or not working the way it's supposed to, please [file an issue](https://github.com/rpbouman/huey/issues/new/choose)!
  To ensure maximum effectivity, clearly describe the component that is having an issue, describe the observed behavior, describe the expected behavior, and describe how this issue may be reproduced. Please include your browserversion and operating system too. If your issue relies on a dataset, and you are at liberty to share that, then please include that too. Please label your issue as "bug".
- suggest a feature. You may also file issues to request or suggest features. If you're looking for a feature you know from other tools which Huey doesn't have, then its typically helpful if you name the product and its feature name.
- fork the repo and send a pull request. If you filed and issue or feature request, or you found an existing issue and feature request, you can also consider picking it up and send a pull request. There is no guarantee that your PR would be accepted, but in general these would be welcome. Just make sure there is an issue filed already that can be referenced, so that it is clear what the PR is attempting to fix or what feature the PR aims to deliver.
- Become an advocate. If you like Huey, spread the word! Share it with your friends and colleagues, and help them get set up. If Huey was of some help to you in your daily work, consider writing a blog about it, or maybe present your use case at a meeting.
- Become a sponsor. Just click the "Sponsor" button at the top of the huey github project page:

 ![image](https://github.com/user-attachments/assets/a8fb2c41-5286-467b-b1a6-4a06495dcb51)

 Alternatively, you can sponsor Huey by [making a donation](https://www.paypal.com/donate/?hosted_button_id=776A6UNZ35M84). 
 - Commission a feature or consultation: if need help using, installing or deploying Huey, you can always ask for help. Same if you need custom developments. Contact me with such a request and we'll negotiate the details.
