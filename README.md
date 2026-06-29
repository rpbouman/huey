# 🦆 Huey
Huey is a browser-based application that lets you explore and analyze data.
Huey supports reading from multiple file formats, like .csv, .parquet, .json data files as well as .duckdb database files.

There's a recording available of me <a href="https://www.youtube.com/watch?v=qCx4hG9J3O8" target="_blank" rel="noopener noreferrer">demoing Huey</a> at the 3rd DuckDB Meetup.
Or, if you like some more background, check out my <a href="https://www.youtube.com/watch?v=1A0r4CbLSaI" target="_blank" rel="noopener noreferrer">DataZen talk on youtube</a>.

Or, __Try Huey now__ with some [sample reports](#getting-started) using the live demo at [https://rpbouman.github.io/huey/src/index.html](https://rpbouman.github.io/huey/src/index.html)

(Note: this is a live demo that allows you to run Huey without even downloading it. Even though it's available online, it's still a static webapp: any data you load into it is safe, and stays on your local client.)

![image](https://github.com/user-attachments/assets/f9d49b89-f29e-49b4-accf-64545b3e4c62)

## Key features
- Supports ```.parquet```, ```.csv```, ```.json```, ```.xlsx``` (MS Excel) both for [analysis](#registering-files) as well [exporting results](#export). Huey can also [read DuckDB database files](#opening-duckdb-files), or [connect to a remote catalog](#catalogs-manager).
- Comprehensive [attributes tab](#attributes-derived-attributes-and-aggregates) to explore the structure of your dataset
- Intuitive [query builder](#query-builder) that supports projection, [aggregation](#aggregates), [filtering](#filtering), and [(sub)totals](#subtotals)
- A pivot table to present analysis results
- Many different [aggregate functions](#aggregates) for reporting and data exploration
- Automatic breakdown of date/time columns to temporal hierarchy with [derived attributes](#derived-attributes) for  year, month, quarter etc 
- Extensive support for [arrays](#arrays) and [```STRUCT```](#structured-types) data types to allow immediate ad-hoc analysis of complex, nested data (typical for JSON data)
- [Export](#export) of result data and SQL queries to file or clipboard. 
- Blazing fast, even for large files - courtesy of <a href="https://duckdb.org" target="_blank" rel="noopener noreferrer">DuckDB</a>
- Truly light-weight. Huey depends on DuckDb-WASM, and a Tabler Icons font, but nothing more. (Dependencies may be added in the future, but only when strictly necessary.)
- Accessible. Huey uses semantic HTML and aria-roles. Please let us know if you find Huey has accessibility issues!
- Run it your way! 
  - Huey is a static webapp: you can simply download or check out the source tree, and open src/index.html in your browser (as ```file://``` - no server required). But if you like, you can serve from any webserver like you would with any web page. 
  - The latest stable release is available online as [Live demo site](https://rpbouman.github.io/huey/src/index.html). One click and you're up and running! Even in this setup, any data you process with Huey remains local and private. There is no active server-side process.
  - Huey is also a <a href="https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps" target="_blank" rel="noopener noreferrer">progressive web app</a> (PWA). This lets you install Huey on your device just as if it's a native app. [Running as PWA is described in more detail later in this readme](#running-huey-on-your-device-as-progressive-web-app-pwa).
- It's free! Huey is released under the [MIT license](https://github.com/rpbouman/huey?tab=MIT-1-ov-file#readme), just like DuckDB.

### Limitations
- Huey is based on DuckDB WASM. DuckDB is awesome! 
  However, the WASM runtime imposes some limits which result in a poorer performance as compared to native DuckDB. 
  That said, DuckDB WASM is still incredibly fast when compared to any in-browser alternative. 

## Getting started
For a super quick start, the following sections present sample reports using the [live demo](https://rpbouman.github.io/huey/src/index.html).
All these examples use a URL to a publicly available dataset as datasource. 

(For some of them you may need to wait a little. You'll find that most of the time is spent waiting for the download while the analysis itself is pretty quick.)

### CSV Examples
- **Los Angeles International Airport**: [Number of Flight operations, by flight type and reporting period](https://rpbouman.github.io/huey/src/index.html#JTdCJTIycXVlcnlNb2RlbCUyMiUzQSU3QiUyMmRhdGFzb3VyY2VJZCUyMiUzQSUyMmZpbGUlM0ElNUMlMjJodHRwcyUzQSUyRiUyRmRhdGEubGFjaXR5Lm9yZyUyRmFwaSUyRnZpZXdzJTJGYWppdi11YzYzJTJGcm93cy5jc3YlM0ZhY2Nlc3NUeXBlJTNERE9XTkxPQUQlNUMlMjIlMjIlMkMlMjJjZWxsc0hlYWRlcnMlMjIlM0ElMjJjb2x1bW5zJTIyJTJDJTIyYXhlcyUyMiUzQSU3QiUyMmNlbGxzJTIyJTNBJTVCJTdCJTIyY29sdW1uTmFtZSUyMiUzQSUyMkZsaWdodE9wc0NvdW50JTIyJTJDJTIyY29sdW1uVHlwZSUyMiUzQSUyMkJJR0lOVCUyMiUyQyUyMmFnZ3JlZ2F0b3IlMjIlM0ElMjJzdW0lMjIlN0QlNUQlMkMlMjJjb2x1bW5zJTIyJTNBJTVCJTdCJTIyY29sdW1uTmFtZSUyMiUzQSUyMkZsaWdodFR5cGUlMjIlMkMlMjJjb2x1bW5UeXBlJTIyJTNBJTIyVkFSQ0hBUiUyMiUyQyUyMmluY2x1ZGVUb3RhbHMlMjIlM0F0cnVlJTdEJTJDJTdCJTIyY29sdW1uTmFtZSUyMiUzQSUyMkFycml2YWxfRGVwYXJ0dXJlJTIyJTJDJTIyY29sdW1uVHlwZSUyMiUzQSUyMlZBUkNIQVIlMjIlN0QlNUQlMkMlMjJmaWx0ZXJzJTIyJTNBJTVCJTdCJTIyY29sdW1uTmFtZSUyMiUzQSUyMkRvbWVzdGljX0ludGVybmF0aW9uYWwlMjIlMkMlMjJjb2x1bW5UeXBlJTIyJTNBJTIyVkFSQ0hBUiUyMiUyQyUyMmZpbHRlciUyMiUzQSU3QiUyMmZpbHRlclR5cGUlMjIlM0ElMjJpbiUyMiUyQyUyMnZhbHVlcyUyMiUzQSU3QiUyMkRvbWVzdGljJTIyJTNBJTdCJTIydmFsdWUlMjIlM0ElMjJEb21lc3RpYyUyMiUyQyUyMmxhYmVsJTIyJTNBJTIyRG9tZXN0aWMlMjIlMkMlMjJsaXRlcmFsJTIyJTNBJTIyJ0RvbWVzdGljJyUyMiU3RCUyQyUyMkludGVybmF0aW9uYWwlMjIlM0ElN0IlMjJ2YWx1ZSUyMiUzQSUyMkludGVybmF0aW9uYWwlMjIlMkMlMjJsYWJlbCUyMiUzQSUyMkludGVybmF0aW9uYWwlMjIlMkMlMjJsaXRlcmFsJTIyJTNBJTIyJ0ludGVybmF0aW9uYWwnJTIyJTdEJTdEJTJDJTIydG9WYWx1ZXMlMjIlM0ElN0IlN0QlMkMlMjJ0b2dnbGVTdGF0ZSUyMiUzQSUyMm9wZW4lMjIlN0QlN0QlNUQlMkMlMjJyb3dzJTIyJTNBJTVCJTdCJTIyY29sdW1uTmFtZSUyMiUzQSUyMlJlcG9ydFBlcmlvZCUyMiUyQyUyMmNvbHVtblR5cGUlMjIlM0ElMjJUSU1FU1RBTVAlMjIlMkMlMjJkZXJpdmF0aW9uJTIyJTNBJTIyeWVhciUyMiUyQyUyMmluY2x1ZGVUb3RhbHMlMjIlM0F0cnVlJTdEJTJDJTdCJTIyY29sdW1uTmFtZSUyMiUzQSUyMlJlcG9ydFBlcmlvZCUyMiUyQyUyMmNvbHVtblR5cGUlMjIlM0ElMjJUSU1FU1RBTVAlMjIlMkMlMjJkZXJpdmF0aW9uJTIyJTNBJTIybW9udGglMjBzaG9ydG5hbWUlMjIlMkMlMjJpbmNsdWRlVG90YWxzJTIyJTNBdHJ1ZSU3RCU1RCU3RCU3RCU3RA==).
  This is from an open data set "<a href="https://data.lacity.org/Transportation/Los-Angeles-International-Airport-Flight-Operation/ajiv-uc63/about_data" target="_blank" rel="noopener noreferrer">Los Angeles International Airport - Flight Operations By Month</a>" provided by the city of Los Angeles.
  The <a href="https://data.lacity.org/api/views/ajiv-uc63/rows.csv?accessType=DOWNLOAD" target="_blank" rel="noopener noreferrer">raw CSV data</a> provides the number of flight operations, as well as a timestamp and various attributes that describe the flight, such as whether it is an arrival or departure; a charter or a scheduled flight, and whether it is a domestic or an international flight.
  The report demonstrates the following Huey features:
  - Reporting Period timestamp is correctly detected from the CSV data as `TIMESTAMP` type by the DuckDB CSV reader
  - Huey year and month [derived attributes](#derived-attributes) are applied on the row axis to produce a clear temporal breakdown
  - Flight type and Arrival/Departure are placed on the columns axis
  - Domestic/International is placed on the filters axis, showing all filter values in an expanded state. This lets you slice the data by checking/unchecking the checkbox for a specific filter value
  - The sum of the flight operations appears in the cells
  - (Sub)totals are included at the year, month and flight type level
- **City of Chicago Energy Benchmarking**: [Use of electricity, gas and steam by district over years 2018 - 2022](https://rpbouman.github.io/huey/src/index.html#JTdCJTIycXVlcnlNb2RlbCUyMiUzQSU3QiUyMmRhdGFzb3VyY2VJZCUyMiUzQSUyMmZpbGUlM0ElNUMlMjJodHRwcyUzQSUyRiUyRmRhdGEuY2l0eW9mY2hpY2Fnby5vcmclMkZhcGklMkZ2aWV3cyUyRnhxODMtanI4YyUyRnJvd3MuY3N2JTNGYWNjZXNzVHlwZSUzRERPV05MT0FEJTVDJTIyJTIyJTJDJTIyY2VsbHNIZWFkZXJzJTIyJTNBJTIyY29sdW1ucyUyMiUyQyUyMmF4ZXMlMjIlM0ElN0IlMjJjZWxscyUyMiUzQSU1QiU3QiUyMmNvbHVtbk5hbWUlMjIlM0ElMjJFbGVjdHJpY2l0eSUyMFVzZSUyMChrQnR1KSUyMiUyQyUyMmNvbHVtblR5cGUlMjIlM0ElMjJET1VCTEUlMjIlMkMlMjJhZ2dyZWdhdG9yJTIyJTNBJTIyc3VtJTIyJTdEJTJDJTdCJTIyY29sdW1uTmFtZSUyMiUzQSUyMk5hdHVyYWwlMjBHYXMlMjBVc2UlMjAoa0J0dSklMjIlMkMlMjJjb2x1bW5UeXBlJTIyJTNBJTIyRE9VQkxFJTIyJTJDJTIyYWdncmVnYXRvciUyMiUzQSUyMnN1bSUyMiU3RCUyQyU3QiUyMmNvbHVtbk5hbWUlMjIlM0ElMjJEaXN0cmljdCUyMFN0ZWFtJTIwVXNlJTIwKGtCdHUpJTIyJTJDJTIyY29sdW1uVHlwZSUyMiUzQSUyMkRPVUJMRSUyMiUyQyUyMmFnZ3JlZ2F0b3IlMjIlM0ElMjJzdW0lMjIlN0QlNUQlMkMlMjJjb2x1bW5zJTIyJTNBJTVCJTdCJTIyY29sdW1uTmFtZSUyMiUzQSUyMkRhdGElMjBZZWFyJTIyJTJDJTIyY29sdW1uVHlwZSUyMiUzQSUyMkJJR0lOVCUyMiU3RCU1RCUyQyUyMmZpbHRlcnMlMjIlM0ElNUIlN0IlMjJjb2x1bW5OYW1lJTIyJTNBJTIyRGF0YSUyMFllYXIlMjIlMkMlMjJjb2x1bW5UeXBlJTIyJTNBJTIyQklHSU5UJTIyJTJDJTIyZmlsdGVyJTIyJTNBJTdCJTIyZmlsdGVyVHlwZSUyMiUzQSUyMmJldHdlZW4lMjIlMkMlMjJ2YWx1ZXMlMjIlM0ElN0IlMjIyMDE0JTIyJTNBJTdCJTIydmFsdWUlMjIlM0ElMjIyMDE0JTIyJTJDJTIybGFiZWwlMjIlM0ElMjIyJTJDMDE0JTIyJTJDJTIybGl0ZXJhbCUyMiUzQSUyMjIwMTQlMjIlN0QlMkMlMjIyMDE3JTIyJTNBJTdCJTIydmFsdWUlMjIlM0ElMjIyMDE3JTIyJTJDJTIybGFiZWwlMjIlM0ElMjIyJTJDMDE3JTIyJTJDJTIybGl0ZXJhbCUyMiUzQSUyMjIwMTclMjIlN0QlMkMlMjIyMDIxJTIyJTNBJTdCJTIydmFsdWUlMjIlM0ElMjIyMDIxJTIyJTJDJTIybGFiZWwlMjIlM0ElMjIyJTJDMDIxJTIyJTJDJTIybGl0ZXJhbCUyMiUzQSUyMjIwMjElMjIlN0QlN0QlMkMlMjJ0b1ZhbHVlcyUyMiUzQSU3QiUyMjIwMTYlMjIlM0ElN0IlMjJ2YWx1ZSUyMiUzQSUyMjIwMTYlMjIlMkMlMjJsYWJlbCUyMiUzQSUyMjIlMkMwMTYlMjIlMkMlMjJsaXRlcmFsJTIyJTNBJTIyMjAxNiUyMiU3RCUyQyUyMjIwMjAlMjIlM0ElN0IlMjJ2YWx1ZSUyMiUzQSUyMjIwMjAlMjIlMkMlMjJsYWJlbCUyMiUzQSUyMjIlMkMwMjAlMjIlMkMlMjJsaXRlcmFsJTIyJTNBJTIyMjAyMCUyMiU3RCUyQyUyMjIwMjMlMjIlM0ElN0IlMjJ2YWx1ZSUyMiUzQSUyMjIwMjMlMjIlMkMlMjJsYWJlbCUyMiUzQSUyMjIlMkMwMjMlMjIlMkMlMjJsaXRlcmFsJTIyJTNBJTIyMjAyMyUyMiU3RCU3RCUyQyUyMnRvZ2dsZVN0YXRlJTIyJTNBJTIyb3BlbiUyMiU3RCU3RCU1RCUyQyUyMnJvd3MlMjIlM0ElNUIlN0IlMjJjb2x1bW5OYW1lJTIyJTNBJTIyQ29tbXVuaXR5JTIwQXJlYSUyMiUyQyUyMmNvbHVtblR5cGUlMjIlM0ElMjJWQVJDSEFSJTIyJTJDJTIyZGVyaXZhdGlvbiUyMiUzQSUyMmZpcnN0JTIwbGV0dGVyJTIyJTdEJTJDJTdCJTIyY29sdW1uTmFtZSUyMiUzQSUyMkNvbW11bml0eSUyMEFyZWElMjIlMkMlMjJjb2x1bW5UeXBlJTIyJTNBJTIyVkFSQ0hBUiUyMiU3RCU1RCU3RCU3RCU3RA==).
  This is from the <a href="https://data.cityofchicago.org/Environment-Sustainable-Development/Chicago-Energy-Benchmarking/xq83-jr8c/about_data" target="_blank" rel="noopener noreferrer">Chicago Energy Benchmarking</a> dataset provided by the Chicago Data Portal.
  The <a href="https://data.cityofchicago.org/api/views/xq83-jr8c/rows.csv?accessType=DOWNLOAD" target="_blank" rel="noopener noreferrer">raw CSV data</a> contains metrics for different kinds of energy and water consumption, along with the year and many columns identifying the location.
  The Huey report places the Community area on the rows axis (along with the first letter of the community area for quick alphabetic browsing), the year on the columns axis, and the sum of various energy consumption metrics in the cells.
  In addition, the report has an IN BETWEEN filter, allowing the data to be sliced in 3-year periods.
- **Montgomery County of Maryland**: [Warehouse and Retail Sales](https://rpbouman.github.io/huey/src/index.html#JTdCJTIycXVlcnlNb2RlbCUyMiUzQSU3QiUyMmRhdGFzb3VyY2VJZCUyMiUzQSUyMmZpbGUlM0ElNUMlMjJodHRwcyUzQSUyRiUyRmRhdGEubW9udGdvbWVyeWNvdW50eW1kLmdvdiUyRmFwaSUyRnZpZXdzJTJGdjc2aC1yN2JyJTJGcm93cy5jc3YlM0ZhY2Nlc3NUeXBlJTNERE9XTkxPQUQlNUMlMjIlMjIlMkMlMjJjZWxsc0hlYWRlcnMlMjIlM0ElMjJjb2x1bW5zJTIyJTJDJTIyYXhlcyUyMiUzQSU3QiUyMmNlbGxzJTIyJTNBJTVCJTdCJTIyY29sdW1uTmFtZSUyMiUzQSUyMlJFVEFJTCUyMFNBTEVTJTIyJTJDJTIyY29sdW1uVHlwZSUyMiUzQSUyMkRPVUJMRSUyMiUyQyUyMmFnZ3JlZ2F0b3IlMjIlM0ElMjJzdW0lMjIlN0QlMkMlN0IlMjJjb2x1bW5OYW1lJTIyJTNBJTIyUkVUQUlMJTIwVFJBTlNGRVJTJTIyJTJDJTIyY29sdW1uVHlwZSUyMiUzQSUyMkRPVUJMRSUyMiUyQyUyMmFnZ3JlZ2F0b3IlMjIlM0ElMjJzdW0lMjIlN0QlMkMlN0IlMjJjb2x1bW5OYW1lJTIyJTNBJTIyV0FSRUhPVVNFJTIwU0FMRVMlMjIlMkMlMjJjb2x1bW5UeXBlJTIyJTNBJTIyRE9VQkxFJTIyJTJDJTIyYWdncmVnYXRvciUyMiUzQSUyMnN1bSUyMiU3RCU1RCUyQyUyMmNvbHVtbnMlMjIlM0ElNUIlN0IlMjJjb2x1bW5OYW1lJTIyJTNBJTIyWUVBUiUyMiUyQyUyMmNvbHVtblR5cGUlMjIlM0ElMjJCSUdJTlQlMjIlN0QlMkMlN0IlMjJjb2x1bW5OYW1lJTIyJTNBJTIyTU9OVEglMjIlMkMlMjJjb2x1bW5UeXBlJTIyJTNBJTIyQklHSU5UJTIyJTdEJTVEJTJDJTIyZmlsdGVycyUyMiUzQSU1QiU3QiUyMmNvbHVtbk5hbWUlMjIlM0ElMjJZRUFSJTIyJTJDJTIyY29sdW1uVHlwZSUyMiUzQSUyMkJJR0lOVCUyMiUyQyUyMmZpbHRlciUyMiUzQSU3QiUyMmZpbHRlclR5cGUlMjIlM0ElMjJpbiUyMiUyQyUyMnZhbHVlcyUyMiUzQSU3QiUyMjIlMkMwMTclMjIlM0ElN0IlMjJ2YWx1ZSUyMiUzQSUyMjIlMkMwMTclMjIlMkMlMjJsYWJlbCUyMiUzQSUyMjIlMkMwMTclMjIlMkMlMjJsaXRlcmFsJTIyJTNBJTIyMjAxNyUyMiUyQyUyMmVuYWJsZWQlMjIlM0FmYWxzZSU3RCUyQyUyMjIlMkMwMTglMjIlM0ElN0IlMjJ2YWx1ZSUyMiUzQSUyMjIlMkMwMTglMjIlMkMlMjJsYWJlbCUyMiUzQSUyMjIlMkMwMTglMjIlMkMlMjJsaXRlcmFsJTIyJTNBJTIyMjAxOCUyMiUyQyUyMmVuYWJsZWQlMjIlM0FmYWxzZSU3RCUyQyUyMjIlMkMwMTklMjIlM0ElN0IlMjJ2YWx1ZSUyMiUzQSUyMjIlMkMwMTklMjIlMkMlMjJsYWJlbCUyMiUzQSUyMjIlMkMwMTklMjIlMkMlMjJsaXRlcmFsJTIyJTNBJTIyMjAxOSUyMiU3RCUyQyUyMjIlMkMwMjAlMjIlM0ElN0IlMjJ2YWx1ZSUyMiUzQSUyMjIlMkMwMjAlMjIlMkMlMjJsYWJlbCUyMiUzQSUyMjIlMkMwMjAlMjIlMkMlMjJsaXRlcmFsJTIyJTNBJTIyMjAyMCUyMiU3RCU3RCUyQyUyMnRvVmFsdWVzJTIyJTNBJTdCJTdEJTJDJTIydG9nZ2xlU3RhdGUlMjIlM0ElMjJvcGVuJTIyJTdEJTdEJTJDJTdCJTIyY29sdW1uTmFtZSUyMiUzQSUyMklURU0lMjBUWVBFJTIyJTJDJTIyY29sdW1uVHlwZSUyMiUzQSUyMlZBUkNIQVIlMjIlMkMlMjJmaWx0ZXIlMjIlM0ElN0IlMjJmaWx0ZXJUeXBlJTIyJTNBJTIyaW4lMjIlMkMlMjJ2YWx1ZXMlMjIlM0ElN0IlMjJCRUVSJTIyJTNBJTdCJTIydmFsdWUlMjIlM0ElMjJCRUVSJTIyJTJDJTIybGFiZWwlMjIlM0ElMjJCRUVSJTIyJTJDJTIybGl0ZXJhbCUyMiUzQSUyMidCRUVSJyUyMiU3RCUyQyUyMkRVTk5BR0UlMjIlM0ElN0IlMjJ2YWx1ZSUyMiUzQSUyMkRVTk5BR0UlMjIlMkMlMjJsYWJlbCUyMiUzQSUyMkRVTk5BR0UlMjIlMkMlMjJsaXRlcmFsJTIyJTNBJTIyJ0RVTk5BR0UnJTIyJTdEJTJDJTIyS0VHUyUyMiUzQSU3QiUyMnZhbHVlJTIyJTNBJTIyS0VHUyUyMiUyQyUyMmxhYmVsJTIyJTNBJTIyS0VHUyUyMiUyQyUyMmxpdGVyYWwlMjIlM0ElMjInS0VHUyclMjIlN0QlMkMlMjJMSVFVT1IlMjIlM0ElN0IlMjJ2YWx1ZSUyMiUzQSUyMkxJUVVPUiUyMiUyQyUyMmxhYmVsJTIyJTNBJTIyTElRVU9SJTIyJTJDJTIybGl0ZXJhbCUyMiUzQSUyMidMSVFVT1InJTIyJTdEJTJDJTIyTk9OLUFMQ09IT0wlMjIlM0ElN0IlMjJ2YWx1ZSUyMiUzQSUyMk5PTi1BTENPSE9MJTIyJTJDJTIybGFiZWwlMjIlM0ElMjJOT04tQUxDT0hPTCUyMiUyQyUyMmxpdGVyYWwlMjIlM0ElMjInTk9OLUFMQ09IT0wnJTIyJTdEJTJDJTIyUkVGJTIyJTNBJTdCJTIydmFsdWUlMjIlM0ElMjJSRUYlMjIlMkMlMjJsYWJlbCUyMiUzQSUyMlJFRiUyMiUyQyUyMmxpdGVyYWwlMjIlM0ElMjInUkVGJyUyMiUyQyUyMmVuYWJsZWQlMjIlM0FmYWxzZSU3RCUyQyUyMlNUUl9TVVBQTElFUyUyMiUzQSU3QiUyMnZhbHVlJTIyJTNBJTIyU1RSX1NVUFBMSUVTJTIyJTJDJTIybGFiZWwlMjIlM0ElMjJTVFJfU1VQUExJRVMlMjIlMkMlMjJsaXRlcmFsJTIyJTNBJTIyJ1NUUl9TVVBQTElFUyclMjIlN0QlMkMlMjJXSU5FJTIyJTNBJTdCJTIydmFsdWUlMjIlM0ElMjJXSU5FJTIyJTJDJTIybGFiZWwlMjIlM0ElMjJXSU5FJTIyJTJDJTIybGl0ZXJhbCUyMiUzQSUyMidXSU5FJyUyMiU3RCU3RCUyQyUyMnRvVmFsdWVzJTIyJTNBJTdCJTdEJTJDJTIydG9nZ2xlU3RhdGUlMjIlM0ElMjJvcGVuJTIyJTdEJTdEJTVEJTJDJTIycm93cyUyMiUzQSU1QiU3QiUyMmNvbHVtbk5hbWUlMjIlM0ElMjJTVVBQTElFUiUyMiUyQyUyMmNvbHVtblR5cGUlMjIlM0ElMjJWQVJDSEFSJTIyJTdEJTJDJTdCJTIyY29sdW1uTmFtZSUyMiUzQSUyMklURU0lMjBUWVBFJTIyJTJDJTIyY29sdW1uVHlwZSUyMiUzQSUyMlZBUkNIQVIlMjIlN0QlMkMlN0IlMjJjb2x1bW5OYW1lJTIyJTNBJTIySVRFTSUyMERFU0NSSVBUSU9OJTIyJTJDJTIyY29sdW1uVHlwZSUyMiUzQSUyMlZBUkNIQVIlMjIlN0QlNUQlN0QlN0QlN0Q=).

### JSON Examples
- **Github Events**: [Actors against repo and time and event type](https://rpbouman.github.io/huey/src/index.html#JTdCJTIycXVlcnlNb2RlbCUyMiUzQSU3QiUyMmRhdGFzb3VyY2VJZCUyMiUzQSUyMmZpbGUlM0ElNUMlMjJodHRwcyUzQSUyRiUyRmFwaS5naXRodWIuY29tJTJGZXZlbnRzJTVDJTIyJTIyJTJDJTIyY2VsbHNIZWFkZXJzJTIyJTNBJTIyY29sdW1ucyUyMiUyQyUyMmF4ZXMlMjIlM0ElN0IlMjJjZWxscyUyMiUzQSU1QiU3QiUyMmNvbHVtbk5hbWUlMjIlM0ElMjJhY3RvciUyMiUyQyUyMmNvbHVtblR5cGUlMjIlM0ElMjJTVFJVQ1QoaWQlMjBCSUdJTlQlMkMlMjBsb2dpbiUyMFZBUkNIQVIlMkMlMjBkaXNwbGF5X2xvZ2luJTIwVkFSQ0hBUiUyQyUyMGdyYXZhdGFyX2lkJTIwVkFSQ0hBUiUyQyUyMHVybCUyMFZBUkNIQVIlMkMlMjBhdmF0YXJfdXJsJTIwVkFSQ0hBUiklMjIlMkMlMjJtZW1iZXJFeHByZXNzaW9uUGF0aCUyMiUzQSU1QiUyMmxvZ2luJTIyJTVEJTJDJTIyYWdncmVnYXRvciUyMiUzQSUyMmxpc3QlMjIlN0QlNUQlMkMlMjJjb2x1bW5zJTIyJTNBJTVCJTdCJTIyY29sdW1uTmFtZSUyMiUzQSUyMmNyZWF0ZWRfYXQlMjIlMkMlMjJjb2x1bW5UeXBlJTIyJTNBJTIyVElNRVNUQU1QJTIyJTJDJTIyZGVyaXZhdGlvbiUyMiUzQSUyMnllYXIlMjIlN0QlMkMlN0IlMjJjb2x1bW5OYW1lJTIyJTNBJTIyY3JlYXRlZF9hdCUyMiUyQyUyMmNvbHVtblR5cGUlMjIlM0ElMjJUSU1FU1RBTVAlMjIlMkMlMjJkZXJpdmF0aW9uJTIyJTNBJTIybW9udGglMjBudW0lMjIlN0QlMkMlN0IlMjJjb2x1bW5OYW1lJTIyJTNBJTIyY3JlYXRlZF9hdCUyMiUyQyUyMmNvbHVtblR5cGUlMjIlM0ElMjJUSU1FU1RBTVAlMjIlMkMlMjJkZXJpdmF0aW9uJTIyJTNBJTIyZGF5JTIwb2YlMjBtb250aCUyMiU3RCUyQyU3QiUyMmNvbHVtbk5hbWUlMjIlM0ElMjJjcmVhdGVkX2F0JTIyJTJDJTIyY29sdW1uVHlwZSUyMiUzQSUyMlRJTUVTVEFNUCUyMiUyQyUyMmRlcml2YXRpb24lMjIlM0ElMjJpc28tdGltZSUyMiU3RCUyQyU3QiUyMmNvbHVtbk5hbWUlMjIlM0ElMjJ0eXBlJTIyJTJDJTIyY29sdW1uVHlwZSUyMiUzQSUyMlZBUkNIQVIlMjIlN0QlNUQlMkMlMjJyb3dzJTIyJTNBJTVCJTdCJTIyY29sdW1uTmFtZSUyMiUzQSUyMnJlcG8lMjIlMkMlMjJjb2x1bW5UeXBlJTIyJTNBJTIyU1RSVUNUKGlkJTIwQklHSU5UJTJDJTIwJTVDJTIybmFtZSU1QyUyMiUyMFZBUkNIQVIlMkMlMjB1cmwlMjBWQVJDSEFSKSUyMiUyQyUyMm1lbWJlckV4cHJlc3Npb25QYXRoJTIyJTNBJTVCJTIyaWQlMjIlNUQlN0QlMkMlN0IlMjJjb2x1bW5OYW1lJTIyJTNBJTIycmVwbyUyMiUyQyUyMmNvbHVtblR5cGUlMjIlM0ElMjJTVFJVQ1QoaWQlMjBCSUdJTlQlMkMlMjAlNUMlMjJuYW1lJTVDJTIyJTIwVkFSQ0hBUiUyQyUyMHVybCUyMFZBUkNIQVIpJTIyJTJDJTIybWVtYmVyRXhwcmVzc2lvblBhdGglMjIlM0ElNUIlMjJuYW1lJTIyJTVEJTdEJTVEJTdEJTdEJTdE).
  This sample uses "<a href="https://docs.github.com/en/rest/activity/events?apiVersion=2026-03-10#list-public-events" target="_blank" rel="noopener noreferrer">github's public events endpoint</a>".
  The <a href="https://docs.github.com/en/rest/activity/events?apiVersion=2026-03-10#list-public-events" target="_blank" rel="noopener noreferrer">raw JSON data</a> is an array of objects representing github events. 
  The event object itself has scalar properties like `id`, `type`, and `created_at` timestamp, as well object-typed properties `repo`, `actor` and `payload`.
  The report demonstrates the following Huey features:
  - The DuckDB JSON reader correctly extracts the `created_at` string to a `TIMESTAMP` type.
  - Derived attributes year, month, and day as well as iso-time are applied on the column axis to produce a clean temporal breakdown
  - Event type also appears on the columns axis, showing CreateEvent, DeleteEvent, PushEvent and so on for each timestamp
  - The repo's `id` and `name` properties are extracted from the `repo`-object nested inside the event object and placed on the rows Axis
  - In the cells, the`login` property extracted from the nested `actor`-object is aggregated using the list aggregator. 
  
### Parquet examples

- **Train Services** [count across stations and service types](https://rpbouman.github.io/huey/src/index.html#JTdCJTIycXVlcnlNb2RlbCUyMiUzQSU3QiUyMmRhdGFzb3VyY2VJZCUyMiUzQSUyMmZpbGUlM0ElNUMlMjJodHRwcyUzQSUyRiUyRmJsb2JzLmR1Y2tkYi5vcmclMkZ0cmFpbl9zZXJ2aWNlcy5wYXJxdWV0JTVDJTIyJTIyJTJDJTIyY2VsbHNIZWFkZXJzJTIyJTNBJTIyY29sdW1ucyUyMiUyQyUyMmF4ZXMlMjIlM0ElN0IlMjJjZWxscyUyMiUzQSU1QiU3QiUyMmNvbHVtbk5hbWUlMjIlM0ElMjIqJTIyJTJDJTIyY29sdW1uVHlwZSUyMiUzQSUyMklOVEVHRVIlMjIlMkMlMjJhZ2dyZWdhdG9yJTIyJTNBJTIyY291bnQlMjIlN0QlNUQlMkMlMjJjb2x1bW5zJTIyJTNBJTVCJTdCJTIyY29sdW1uTmFtZSUyMiUzQSUyMnR5cGUlMjIlMkMlMjJjb2x1bW5UeXBlJTIyJTNBJTIyVkFSQ0hBUiUyMiUyQyUyMmRlcml2YXRpb24lMjIlM0ElMjJOT0NBU0UlMjIlN0QlNUQlMkMlMjJyb3dzJTIyJTNBJTVCJTdCJTIyY29sdW1uTmFtZSUyMiUzQSUyMnN0YXRpb25fY29kZSUyMiUyQyUyMmNvbHVtblR5cGUlMjIlM0ElMjJWQVJDSEFSJTIyJTJDJTIyZGVyaXZhdGlvbiUyMiUzQSUyMmZpcnN0JTIwbGV0dGVyJTIyJTdEJTJDJTdCJTIyY29sdW1uTmFtZSUyMiUzQSUyMnN0YXRpb25fY29kZSUyMiUyQyUyMmNvbHVtblR5cGUlMjIlM0ElMjJWQVJDSEFSJTIyJTdEJTJDJTdCJTIyY29sdW1uTmFtZSUyMiUzQSUyMnN0YXRpb25fbmFtZSUyMiUyQyUyMmNvbHVtblR5cGUlMjIlM0ElMjJWQVJDSEFSJTIyJTdEJTVEJTdEJTdEJTdE) 
  The <a href="https://blobs.duckdb.org/train_services.parquet" target="_blank" rel="noopener noreferrer">raw dataset</a> contains trips from the Dutch train network.
  The huey report presents the stations on the rows and the train types on the columns, with the number of trips as cell values.
  It demonstrates the following Huey features:
  - on the columns, the "First letter" derived attribute is used to produce an alphabetic index for the train stations
  - on the columns the "No Case" derived attribute is used for a case-normalized presentation the train types. In the original dataset, the ```type``` column contains both the values ```Stoptrein``` and ```stoptrein```; by using the "No Case" derived attribute, both are presented in a single column.

## Running Locally
Want to run Huey locally? No problem!
From the live demo, you can install the Huey progressive web app on your local device with just one click. 
Alternatively, you can download or check out the Huey source files and resources and run it as a local static webpage in your browser.

### Running Huey on your Device as Progressive Web App (PWA)
1) Visit the [live demo](https://rpbouman.github.io/huey/src/index.html)
2) Use your browser's capabilities to install Huey on your local device. Typically this manifests itself as an installation icon in your browser's URL bar:
   
<img width="773" height="522" alt="image" src="https://github.com/user-attachments/assets/1352db5c-96ee-4a8e-b0c6-e406907670fc" />

After installing Huey as PWA, it appears just as if it is a local native app, and you should be able to find it using your operating system's launch bar or start button:

<img width="777" height="728" alt="image" src="https://github.com/user-attachments/assets/3e9d308b-f471-4e4a-8627-26ab0ce53326" />

#### PWA Offline
The Huey PWA caches itself automatically using your browser's [caching API](https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage).
This requires a modest amount of storage, but the benefit is that this allows Huey to be used even when you're completely disconnected from the internet.

#### PWA File Handler
The Huey PWA explicitly advertises the ability to open certain data files.
Typically, the operating system picks this up and offer an "Open With" feature in the context menu of the file browser:

<img width="1103" height="742" alt="image" src="https://github.com/user-attachments/assets/1bbc3aa2-54ca-4a37-b019-ce9f63e95328" />

This way, you don't even need to locate the app anymore - you just right click on a file you want to analyze, and choose "Open with Huey".

#### Uninstalling the PWA
If you decide the PWA is not for you, that's fine - you can always uninstall it using your operating system's uninstall feature.

### Running Huey from a folder on your device
1) Use git to check out the [Huey github repository](https://github.com/rpbouman/huey.git) to a local folder, or [download](https://github.com/rpbouman/huey/archive/refs/heads/dev.zip) the repository as a .zip file and extract it to a folder.
2) Open [index.html](https://github.com/rpbouman/huey/blob/dev/index.html) in your web browser. 
   Note that although Huey runs locally, it depends on DuckDB WASM and Tabler Icons, which are served by the jsdelivr.com CDN, so make sure you're connected to the internet. 
   Once these resources are downloaded, they are typically cached by your browser, often allowing you to run Huey even without an internet connection. 

With either approach, the Huey files and resources are available in a folder of your choosing.
Of course, if you checked out the repository you can use `git pull` to update too. 

## Registering and Analyzing Files with Huey

Huey uses <a href="https://duckdb.org/docs/archive/0.9.2/api/wasm/overview" target="_blank" rel="noopener noreferrer">DuckDb WASM</a> to read and analyze data files. 

General browser security policies prevent web applications from autonomously accessing files on the local file system. 
Web application users need to explicitly select the files they want to analyze. 
Huey then registers them in DuckDB WASM's virtual file system so they become available for analysis. 

### Registering Files

To register one or more files, you can:
- Click the 'Upload...' button ![upload button icon](https://github.com/rpbouman/huey/assets/647315/8dbae6ad-c4f2-4d5e-bc9a-f15fa9444c89).
  The upload button is always available as the leftmost button on the toolbar at the top of the page. The upload action will pop up a file browser dialog that lets you browse and choose one or more files from your local filesystem.
  In the file browser dialog, navigate to the file or files that you want to explore, select them and then confirm the dialog by clicking the 'Ok' button.

  Note that by default, the File Browser dialog only lists files with a extension recognized by Huey.
  If your file doesn't happen to have one of those known extensions, just choose "All files *.*": 
  <img width="920" height="495" alt="image" src="https://github.com/user-attachments/assets/b5232b97-124a-4cde-9d82-088c81e80b2a" />

- If you installed Huey as [PWA](#running-huey-on-your-device-as-progressive-web-app-pwa), and your files have an extension recognized by Huey, then you can typically also open it by right clicking the file and then choosing [Open With](#pwa-file-handler) from the context menu.

- Drag 'n Drop one or multiple files unto the "Datasources" tab in the sidebar. 

#### Upload Dialog
Either action will open the Upload dialog. 
The upload dialog will show a progress bar for each file that is being registered. Additional progress items may appear in case a duckdb extension needs to be installed and/or loaded. 

![image](https://github.com/rpbouman/huey/assets/647315/b0c37783-4b3a-4166-9f3b-7f5a5ff91cd9)

After completion of the upload process, the upload dialog is updated to indicate the status of the uploads (or the extension installation, if applicable). 

Items that encountered an error are indicated by red progressbars. In case of errors, the item is expanded to reveal any information that might help to remedy the issue. 

Successful actions are indicated by green progressbars. Successfully loaded files are available in the Datasources tab, from where you can start exploring their contents by clicking the explore button ![explore button](https://github.com/rpbouman/huey/assets/647315/7b67ff2d-5cec-44e0-91d4-e670d38487c1). As a convenience, the explore button is also present in the upload dialog.

#### Datasource Tab
Successfully upload files are added to the Datasource tab.
Each Datasource has a couple of buttons to work with the datasource:
- The Download Button <img width="24" height="24" alt="image" src="https://github.com/user-attachments/assets/7e6ac900-b954-4828-9e6f-b59df36f427a" />
 lets you download the data. You will be prompted to choose the output format. You can read more about data export in the section about the [Export dialog](#export).
- The Datasource Settings button <img width="24" height="24" alt="image" src="https://github.com/user-attachments/assets/60163c45-6637-4411-b099-43d38e244224" />
opens the Datasource Settings dialog.
- The Remove button <img width="24" height="24" alt="image" src="https://github.com/user-attachments/assets/511dadaf-67b8-4a5f-8a69-0a0e4bc7cb48" /> removes the datasource from the tab.
- The Analyze Datasource button <img width="24" height="24" alt="image" src="https://github.com/user-attachments/assets/0971342f-cb66-4415-9dd7-3e6d7185a2fe" /> loads the datasource attributes into the [Attributes tab](#exploring-datasources) so you can analyze its data using the [Quey builder](#query-builder).
 
Huey will attempt to group files having similar column signature. The group appears as a separate top-level node in the Datasources tab, with its individual files indented below it. 
A file group has its own explore button, so that you can not only explore the individual files, but also the UNION of all Files in the group:

<img width="439" height="258" alt="image" src="https://github.com/user-attachments/assets/7c35e006-d763-456c-a7f2-bb2f0d76d464" />

Files that cannot be grouped appear in a separate *Miscellaneous Files* group.

#### Opening DuckDb files
Apart from directly reading data files, Huey can also open existing DuckDB database files and access its tables and views.

The process for accessing duckdb files is exactly the same as for accessing data files.
Huey assumes datafiles with a ```.duckdb``` extension are DuckDB database files. 

If your DuckDB database file happens to have another extension - that's totally fine! 
They just won't appear automatically in the browser's File Browser dialog, because by default, that only lists files with extensions that Huey knows about.
You can always override that and select "All files (*.*)".

Successfully loaded DuckDB database files appear in the DuckDb Folder, which appears at the top of the DataSources tab. 

![image](https://github.com/rpbouman/huey/assets/647315/c7ca5ed7-7454-4783-8dbc-493244f8bb28)

The schemas in the duckdb database file are presented as folders below the duckdb file entry, and any tables or views in the schema are presented below the schema folder. 
Each table or view has an explore button which you can click to explore the data.   

Note: We ran into a limitation - when the duckdb file itself refers to external files, then it's likely that Huey (or rather, DuckDB WASM) won't be able to find them.
But native duckdb tables, as well as views based on duckdb base tables work marvelously and are quite a bit faster than querying bare data files.

### Using Remote Datasets

Huey is not just for local files! You can also access remote data by registering a URL or connecting to a remote Catalog.

#### Register URLs

In addition to local files, you can also register URLs. 
To register a URL, click the "Load data from URL" button on the toolbar load data from URL button <img width="24" height="24" alt="image" src="https://github.com/user-attachments/assets/a52332ff-e108-414a-a508-8148a03bbd42" />
. 
You will be prompted to enter the URL:

<img width="452" height="202" alt="image" src="https://github.com/user-attachments/assets/628753b9-59e5-4200-a58c-fedd12242b39" />

After confirming, the upload dialog appears just like when uploading local files.

Note that loading data from URL is subject to certain restrictions due to browser security policies. 
Typically the URL needs to be either in the same domain as from where Huey is served, or the remote server needs to pass CORS headers to overcome the same-origin policy.

In addition, some URLs might require authentication. 
If that is the case, you can use the [Secrets Manager](#secrets-manager) to create and maintain the secret.

#### Remote Catalogs

In Huey, you can use the [Catalogs Manager](#catalogs-manager) to attach to remote databases.
In this README, the Catalogs Manager is described in detail in its own section.

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

When there are a lot of attributes, it can be useful to use search to find them. 
To do that, use the Attribute Search feature: Simply type a part of the attribute name in the search input.
After a brief timeout, the list of attributes will automatically show only those attributes that (partially) match the search string:

![image](https://github.com/user-attachments/assets/1ab093d3-90f9-445a-bfaa-e6af1e81397e)

The search string is treated as a regular expression, and is matched in a case-insensitive manner, making it both easy and powerful.
For extra convenience, the attribute searchstring also supports `%` as wildcard for any sequence of characters (just like the SQL `LIKE` operator). 

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

You can think of a derived attribute as an expression (formula) that calculates some aspect from a single value from the attribute upon which it is based.
For example, from an attribute that represents timestamp values, we can extract only the date part, or only the time part, or even the individual parts like year, month, and so on.
The values that are thus derived from the original attribute values can be thought of as a 'virtual' column. 

Derived attributes may be placed on either the rows or the columns pivot table axis. 
Derived attributes may be used as filter too, and they can also be aggregated.

The attribute's data type primarily determines which derived attributes are supported. 
Derived attributes tend to be grouped in folders around a similar use case or topic. 
Here's a (non-exhaustive) list of derived attribute folders:
- **date fields**: Applies to attributes with temporal data types, like ```DATE``` and ```TIMESTAMP```.
  Derived attributes in this category are mainly to present temporal data in a hierarchically organized breakdown, as well as to offer various formats and labels.
  Typical use cases are to compare data aggregated in the cells across years, month or day of the week.
- **time fields**: Similar to date fields, but for those data types that also carry a time part.
- **string operations**: Applies to attributes with a text type. 
  This offers different collation variants of the text data to support case-insensitive filtering and/or sorting as well as actual case conversion.
- **hashes** various hash functions, which may be useful to compare large text fields
- **array statistics**: for calculating aggregates on the elements of [array-typed attributes](#arrays).
  [Array statistics](#array-aggregates) are described in more detail along with other types of aggregates.

### Aggregates

Aggregates are expressions that calculate a single result on a collection of values.
In statistics, this concept is also known as data reduction, as it takes many values as input to produce a single output value, which somehow represents the entire group of values.
Typical examples of aggregate operations are counts, summation and averaging, but there are many more and more sophisticated aggregate operations.

To understand aggregates in Huey, it is useful to distinguish a few different ways to categorize aggregates:
- **aggregation operation**:
  This categorization refers to the method that is used to produce the output value based on the collection of input values.
  For example, a count simply returns the number of input values, while summation works by adding all the input values together and returning the total.
  
  The attributes tab of the sidebar has a generic *count* aggregator at the very top.
  All attributes also have a *count* and *distinct count* aggregator, which appears together with the [derived attributes](#derived-attributes) when you expand the attribute.
  
  Most attributes have a *statistics* folder which contains basic statistical descriptive operations like *min* (minimum), *max* (maximum), *median* and *mode*, as well as the special purpose *entropy* aggregator. 
  In particular, numerical attributes have additional aggregators like *sum* (summation), *avg* (average), *stdev* (standard deviation), as well as more sophisticated ones like *skewness* and *kurtosis*.
  
  Most attributes also have a *list aggregators* folder.
  The aggregators in the list aggregators folder return a structure (like *histogram*) or a list as output value.
  List aggregators are not for general purpose, but can be useful for data exploration or text analysis.

  <img width="480" height="695" alt="image" src="https://github.com/user-attachments/assets/84931b36-fbd1-4397-a78e-3a9e2a1a0ad7" />
   
- **source** or **scope** of the input values for the aggregation. 
  In Huey, we can distinguish the following scopes: cell aggregates, axis aggregates, and array aggregates. 
  Each is discussed in more detail below.
  
#### Cell-aggregates

Cell aggregates are items used to populate the cells of the query result.
Cells refer to the intersections of the items appearing on the rows- and columns axes.

Cell aggregates take their inputs from all the rows in the underlying dataset that correspond with the values on the rows- and columns dataset.
If we consider the entire pivot table as a SQL query, the cell aggregates would be plain aggregate functions in the ```SELECT```-list, while the items on the row- and cells- axes would appear in the ```GROUP BY``` clause.

In Pivot tables, cell contents are always aggregate values.
In the Query editor, cell-aggregates are created by simply placing an aggregate on the cells-axis. 

Note that the cells axis only accepts aggregate items.
This is intentional: the cells-axis is to define the content for the cells, and almost by definition, any given cell corresponds to a collection of rows, and thus requires an aggregator to produce a single value to populate the cell with.

In the context of OLAP and pivot tables, Cell-aggregates are the most common use case. 
But Huey also defines *axis aggregates* and *array aggregates* (discussed below).

#### Axis-aggregates

Axis aggregates are aggregate items that appear on any other axis than the cells axis.

Just like cell aggregates, axis aggregates also take values from the underlying rows as input values.
But while cell aggregates are calculated on only the rows corresponding to the intersection of the rows- and columns- axes, 
axis aggregates are computed with respect to a particular partition of the items from the axis on which it is placed.

Functionally, axis aggregates can be used to calculate (sub)totals. 
In this regard they are somewhat similar to the totals feature, but without generating super aggregate rows.

If we consider the entire pivot table as a SQL query, axis aggregates would be window functions over a partition of items from the axis on which it is placed.

Axis aggregates are created by placing an aggregate item on any axis that is not the cells-axis.
This can be done either by clicking the rows- or columns- button on an aggregate item in the Attributes tab.
Alternatively, an aggregate item can be dragged from the Attributes tab to the axis. 
Finally, items on the cells axis can also be dragged and then dropped on a non-cells axis.
 
Once the item is placed, any non-aggregate items that appear right before the new axis aggregate item are used to define its partition.

Once the axis aggregate is created it can be freely positioned anywhere on its axis - this will not change the partition definition.
If an item that is used in the partition definition of any axis-aggregates is moved or removed, then that item is removed from the partition definition of those axis-aggregates.

All aggregate operations that are available for cell-aggregates are also available as axis aggregates.

#### Array aggregates

While cell-aggregates and axis-aggregates take input values from the underlying rows, array aggregates apply to the elements of a single array-typed value.
In the Attributes sidebar, array attributes can be found in the array statistics folder.

Array aggregates are technically [derived attributes](#derived-attributes) for array-typed attributes that happen to apply an aggregate function to the array elements.
The repertoire of aggregate operations for aggregate elements is largely the same as for cells- and axis- aggregates.

## Structured types, Arrays, and Maps

Attributes can have any kind of datatype, including composite or "nested" data types - that is, types whose values are not scalar, but which consist of multiple elements.
Especially when exploring JSON files one is likely to encounter attributes having these types.

### Structured Types

Values with a Structured type (STRUCT) are in the end just values, and can be projected on the query axis as such.
Attributes of this type also have a "structure" folder that gives access to its members.

![image](https://github.com/user-attachments/assets/8687b270-6298-4434-8f52-5b32d7d39a53)

Members are also just attributes, and will have their own [derived attributes](#derived-attributes) and [aggregates](#aggregates), in accordance with the member type. 
Of course, members that are themselves of a structured type have their own structure folder that gives access to its members.

### Arrays

Arrays are also just values and can be treated as such.

Attributes of an array type have a set of "array operations" [derived attributes](#derived-attributes):
- elements: unnests the array and projects the element value on a separate tuple. Just like with members of structured types, array elements are just like attributes and may have [derived attributes](#derived-attributes) and aggregates in accordance with their type.
- element indices: unnests the array, and projects the element index. If both elements and element indices appear together on the same axis, then they are unrolled at the same level, so that the indices and the element values refer to the same element.
- length: returns the length of the array.
- sort values: array value after sorting the elements
- unique values: (sorted) array value after removing the duplicate elements 
- unique values length: length of the deduplicated array.

![image](https://github.com/user-attachments/assets/5f2acd6e-3ac1-4702-b204-7737fbc9a8f0)

When the elements or element indices derived attributes are applied to multiple, independent attributes, then they are unrolled independently, in order of appearance on the axis.

Arrays also support a collection of "array statistics":

![image](https://github.com/user-attachments/assets/f9230a17-339d-4598-b8e5-3b92f851b395)

Array statistics are special derived attributes that calculate an aggregate value over the array's elements. 

### Maps

Maps are structured types that are somewhat similar to Arrays. While arrays have an ordered collection of elements with an associated integer index, Maps are an unordered collections of entries. Map entries are values (which can be of any type) which are uniquely identified by a key, which also may have any type.

Maps have a folder with map operations:

![image](https://github.com/user-attachments/assets/0fbaf936-2e4d-40b3-a57d-fa4ad330b795)

- entries gives access to the key- and value- derived attributes. 
  These will unnest the map and project the key and/or value. Like array elements and element indices, the key- and value- derived attributes of the same map attribute are not independent but unrolled together.
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
- __Like__: the values in the data must match the pattern of one or more filter values. The pattern is a simple <a href="https://duckdb.org/docs/sql/functions/pattern_matching.html#like" target="_blank" rel="noopener noreferrer">SQL LIKE pattern</a> which supports % (percent sign) as wildcard for zero or more arbitrary characters, and _ (underscore) as wildcard for a single arbitrary character. 
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
- The Cancel button will close the Filter Dialog without changing the state of the filter item.

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
Everytime you make a change to your query it will be encoded and appended to the URL as fragment (a.k.a. hash or anchor). 
You can bookmark the url and revisit it later, or you can copy the url from your browser's address bar and share it. 

### Restoring Queries
You can load queries simply by navigating to the respective url (including the fragment). 
The fragment includes the query and a reference to the datasource - not the actual data itself.

When restoring the query, Huey checks if there is currently a datasource present that matches the referenced datasource's name and column signature. If so, it will use it. If there is currently no datasource that matches the referenced one, Huey will prompt you so you can upload it. 

![prompt to load a referenced datasource](https://github.com/user-attachments/assets/fbf35cbd-9265-4b0e-be39-89503b997dcd)

If the referenced datasource does not exist, but there are other datasources that could satisfy the query (based on whether it includes all attributes mentioned in the query), then the prompt will offer those datasources too as alternatives:

![image](https://github.com/user-attachments/assets/4bed7810-74e9-4080-a6b5-dda478501870)

If the datasource uses an URL as datasource, Huey will attempt to access it directly. If that succeeds, you won't be prompted to confirm: Huey will simply load the remote datasource and restore the query. 

### Undo & Redo

Because the query state updates the page url, you can use the browser's standard Back and Forward buttons to browse between different versions of your query.

### Cloning the Huey Window

Hitting the Clone button on the toolbar will open a new instance of Huey in a new browser tab, while preserving the existing data sources as well as the current query.

## Export
Huey provides an export dialog that lets you use the query and/or its results outside Huey.
The export dialog can be opened by clicking the download button <img width="24" height="24" alt="image" src="https://github.com/user-attachments/assets/5136576c-e3d2-4399-b4b4-5b2dc1454a6b" />.
This button is visible as soon as items are placed unto the [query builder](#query-builder).

<img width="761" height="488" alt="image" src="https://github.com/user-attachments/assets/fdf53b05-610e-48a3-a6da-46b775cb9779" />

Note: if you want to export an entire datasource, then you can also go to the [Datasource tab](#datasource-tab) and click its Download button. 

### Title and Title template
In the heder of the export dialog, you can control the title of the query by using the title template.
The title template can contain "fields" using `${<field-name>]}` syntax, which will get dynamically replaced.
The title field shows the resulting text after the replacement. 

The fields are:
- `${datasource}`: the name of the datasource used by the query.
- `${<axis>-items}`: the list of captions of the items appearing on that axis, where `<axis>` is the name of the axis. So the actual fields are `${columns-items}`, `${rows-items}`, `${cells-items}` and `${filter-items}`.
- `${utc-timestamp}`: The UTC timestamp,
- `${timestamp}`: The local timestamp

### Data structure
How the result data will be exported. The options are:
- Pivot: the shape of the result data follows the pivot table.
- Table: the data is tabular, creating rows containing the values from all query axes. This may be more convenient for further data analysis outside Huey.

### Export Destination
This controls what to do with the exported data:
- File: the data will be downloaded to a file
- Clipboard: the data is copied to the clipboard so you can paste it another application.

## Export Format Tabs
The export dialog lets you export query results in various file formats like csv, parquet, or JSON. 
Each file type has its own tab with settings specific to that format.

Note: the format-specific options configured in the Export dialog are in general also applied when downloading the contents of a datasource from the [Datasource tab](#datasource-tab). 

### Delimited text
Use this to export delimited text, like CSV and TSV. Delimited text settings:
- Formatting: this controls value formatting
  - Date format: the [DuckDB date format specifier](https://duckdb.org/docs/lts/sql/functions/dateformat#format-specifiers) to use for representing values of the `DATE`-datatype. 
  - Timestamp format: the [DuckDB date format specifier](https://duckdb.org/docs/lts/sql/functions/dateformat#format-specifiers) to use for representing values of the `TIMESTAMP`-datatype. 
  - `NULL`-value string: A string to use to represent `NULL`-values. 
- Delimiters: this controls how rows and fields are represented
  - Column delimiter: the field delimiter. There's a list of suggestions available. 
  - Quote character: the character used to quote values in case the value contains some meta-character. 
  - Escape character: the character used to escape the quote character. 
### Excel
Use this to export the data to the Excel `.xlsx`-format.
### JSON
Use this to export data to `JSON` or `JSONL`-format.
### Parquet
Use this to export data to the `.parquet`-format.
### SQL
Use this to export the SQL query that would produce the result dataset.

Note that this option does not export any data; only the SQL statement that would produce the query result. 
### Query
This option you export the state of the Querybuilder.

Note that this option does not export any data; only the structure of the Huey query is exported.

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

### Attributes
Settings for behavior of the Attributes tab in the sidebar.
- Auto-reveal attributes used in query?: Whether to automatcially expand attribute nodes to reveal all items used in the query also in the Attributes tab. This is useful when opening a query vi

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

# Secrets Manager

Huey includes a graphical user interface for <a href="https://duckdb.org/docs/current/configuration/secrets_manager" target="_blank" rel="noopener noreferrer">DuckDB's Secrets Manager</a>.
The Huey Secrets Manager is a dialog that lets you create, edit, and store DuckDB secrets for services like AWS S3, Google Cloud Storage, Azure Blob Storage, Hugging Face, and more.

## Opening the Secrets Manager
You can open the Secrets Manager by clicking the Secrets Manager button <img width="24" height="24" alt="image" src="https://github.com/user-attachments/assets/51965a31-e464-4a2f-b293-7139f3983208" /> from the right side of the main toolbar. This is what it looks like:

<img width="868" height="378" alt="image" src="https://github.com/user-attachments/assets/95352553-51ed-45e0-aa69-3ff2d3906f98" />

- On the left side of the Secrets Manager Dialog, there's a list that presents the list of stored secrets.
  In the list, secrets are organized by type.  
  In the screenshot above, 3 secrets are visible in the list.
  One is selected: it's the secret called 'my_secret' of the 's3' type.

- On the right side of the Secrets Manager Dialog, there are two tabs:
  - The **Form tab** presents all the secret's details as a structured form.
  - The **Code tab** has a code editor that lets you view and edit the Secret using DuckDB's [```CREATE SECRET```-syntax](https://duckdb.org/docs/lts/sql/statements/create_secret).

## Editing Secrets
Selecting a secret in the list loads it from storage and populates the form and code tabs with its details so you can edit it.

### Secret Manager Form view
The Form is structured thus:
- **Name and type** fieldset: This is the secret's 'header'. It consists of the following items:
  - **Name**: a unique name for the secret. 
    This corresponds to the ```secret_name``` element of the ```CREATE SECRET```-syntax.
    Note that in Huey, the secret's name is a required field.
  - **Type**: the secret's type. 
    This corresponds to the ```secret_type``` element of the ```CREATE SECRET```-syntax.
    
    In the form, the secret type is just a text field, but there's a list of suggestions for all secret types that corresponding to DuckDB's [core extensions](https://duckdb.org/docs/lts/core_extensions/overview).
  - **Autoload**: a checkbox to control whether this particular secret ought to be activated when Huey starts up.
    This is useful if you're regularly accessing resources that require the secret. 

    Secrets that are not auto-loaded can be manually activated when required.
- **Key/Value Pairs** fieldset: The secret's details are specified as a list of Key/Value pairs.
  This fieldset lets you maintain a list of these key/value pairs that define the particulars of the secret. 
  
  A key/value pair consists of the following controls:
  - **Key** field. This is the left-most textfield. The key field is mandatory. It's just a text field, but it provides a list of suggestions based on the selected secret type.
  - Field **Type**. This is a drop down list that controls what kind of values can be entered for the field. The Field types are:
    - ☑: Checkbox, indicating the value is ```BOOLEAN``` and can have either a ```TRUE``` or a ```FALSE``` value.
    - […]: Array, indicating the value is a list of string values
    - txt: Plaintext field, indicating the value is a string value.
    - ***: Password field. This indicates a text value that is to be treated as a secret. Password fields use a password input type so their value is not immediately visible when editing. These values are [encrypted](#encryption-of-password-fields) when the secret is stored.
    - {…}: ```MAP```-field. This indicates the value is itself a set of key/value pairs
    If a well-known value is entered in the Key field, then an appropriate default type is automatically selected.
    However, the dialog always lets you manually override the default.  
  - **Value** field. This is the rightmost textfield. For the structured value-types Array and Map, this field does not exist. In these cases, the value is made up of key/value pairs that appear indented below the structured key type. 

### Secret Manager Code view
The Code tab lets you view and edit the secret as a DuckDB ```CREATE SECRET```-statement:

<img width="867" height="390" alt="image" src="https://github.com/user-attachments/assets/bc647232-4cfd-4a29-a0f9-53b1613df754" />

The code editor is particularly useful if you already have the SQL for a secret and you want to quickly enter it into the Secrets Manager.

Note that the code editor shows the secret as plaintext.
  
Which key/value pairs are appropriate or allowed, depends primarily on the secet type.
In addition, some key/value pairs depend on each other.
Please refer to the DuckDB documentation of the corresponding extension to learn more about which key/value pairs you need to define a secret of a particular type.  
  
## Creating a new Secret

1) Open the Secrets Manager dialog and click the "Add Secret" button <img width="24" height="24" alt="image" src="https://github.com/user-attachments/assets/249b53a4-ea98-4d97-8feb-3b4710c23b3c" />. 
   This is on the left side of the Secrets Manager toolbar. 
   Alternatively, you may also click the "Create a new secret"-hyperlink, which appears next to that toolbar button if you didn't already select an existing secret. 

   You can now use either the Form-tab or the Code-tab to define the secret.
2) In the form tab, enter a name for your new secret. Each secret has its own, unique name. 

   Then, use the suggestions list to pick one of the well-known secret types.
   If Huey does not provide a suggestion for a secret type that you know should be valid, then you can always override the type and enter one manually. 
    
   If you want the secret to be automatically loaded when Huey starts, also check the Autoload checkbox.
   
   <img width="930" height="546" alt="image" src="https://github.com/user-attachments/assets/b3c28027-65e4-44c9-9425-c067a3088f04" />

   In the key/value fieldset, a new blank entry is automatically created.
   Fill out at least one key/value entry is required.

   - Fill out the key field.
     Huey provides suggestions for the key field for any known secret types. Selecting a suggestion, or entering a well-known type, automatically results in choosing a default field type.
     If you're sure you need a particular key but the Huey suggestions list does not provide it, then you can always enter one manually.
   
   - Choose the field type.
     If you chose a key from the suggestions list, or if you entered a key that is well-known and appropriate for the secret type, a default field type is automatically chosen for you.
     Again, you may override the field type if you're sure you need to.

   - Enter the field value. 
     The choice of field type directly affects what values you can add in the value field.
     The field type directly affects the kind of data you can enter into the value field; for example, choosing the checkbox will turn the value input into a checkbox. 

   To work with the existing fields, use the action buttons to the left of the key field:
   - You can add as many key/value pairs as you like,
     Just click the "Add key/value pair"-button <img width="24" height="24" alt="image" src="https://github.com/user-attachments/assets/cc19cbf3-e9bd-490e-ae21-5bb857ecc05c" /> that appears immediately before the key field to create a new one.
   - To remove a key/value pair, click the "Remove key/value pair"-button <img width="24" height="24" alt="image" src="https://github.com/user-attachments/assets/ed254611-be25-4e3c-a0d4-842a7c1e9838" />.
   - You can also move the key/value pairs around using the "Move key/value pair up" <img width="24" height="24" alt="image" src="https://github.com/user-attachments/assets/6729a7b2-b6e1-484d-a3b2-60f2475d1a68" />
 and "Move key/value pair down" <img width="24" height="24" alt="image" src="https://github.com/user-attachments/assets/90cca24d-7ba0-4c02-8879-cc3fad743e75" />
 -buttons.
3) You can switch to the Code tab to see the equivalent ```CREATE SECRET```-statement.
   Alternatively, you could have pasted or entered a ```CREATE SECRET```-statement, and then switch to the Form-tab, which would then be populated accordingly.

4) If the secret appears valid, the "Save Secret"-button <img width="24" height="24" alt="image" src="https://github.com/user-attachments/assets/edd7a839-2751-46f4-8452-bcdf06ef934a" />
will be available in the Secret Manager's toolbar. Click it to store the secret.

## Encryption of password fields
The main purpose of DuckDB secrets is to configure credentials to access datasources that require authentication.
Naturally, credentials are sensitive data and should therefore be protected. 

The Secrets Manager will automatically encrypt the value of all password-typed key/value pairs.
This is implemented using AES-GCM-256 encryption using the browser's built-in ```crypto``` library.

Encyrption requires a password. 
You will be automatically prompted whenever a password is required:

<img width="432" height="306" alt="image" src="https://github.com/user-attachments/assets/05016dfd-4098-4d3f-b45e-bc00a246bf2a" />

The first time a password is required, the pasword itself is hashed, and the hashed value is stored so the store can check whether the entered password is correct.
It is important to realize the password itself is never stored. 
This means that once the store is initialized with a password, you can only decrypt the documents in the store using that password.
So, make sure you don't lose it!

You can always change the password later on by clicking the "Change Password"-button <img width="24" height="24" alt="image" src="https://github.com/user-attachments/assets/6925118d-57a3-4703-ab57-d775d02e5d46" />. 
This is available on the right side of the Secrets Manager's toolbar.

If you lose your password, there is no way to recover any of the encrypted fields. 
In this case you can delete all encrypted documents by clicking the "Reset Secrets Store"-button <img width="24" height="24" alt="image" src="https://github.com/user-attachments/assets/74b69928-fa04-4fdc-87a2-8d881ebe7f3c" />
.
## Activating, Deactivating and auto-loading secrets
In order to use a secret, it needs to be activated.
Activating the secret simply means the equivalent ```CREATE SECRET```-statement is executed so that DuckDB will apply it when required.

Secrets are automcatically activated when saving a secret.
Secrets that are marked for auto-load are also automatically activated on Huey startup.
Activating a secret may result in a prompt for the password if the secret contains key/value pairs of the password-type.

If a secret is selected in the secrets list, the toolbar will show one of these buttons, depending on its activation status:
- Deactivated button <img width="24" height="24" alt="image" src="https://github.com/user-attachments/assets/54af7f3b-15a1-48aa-b7c7-a73bc76212d3" />, indicating the secret is currently not active.
- Activated button <img width="24" height="24" alt="image" src="https://github.com/user-attachments/assets/9b3a747b-bdb1-4dd2-998b-88e3acaef6f1" />
, indicating the secret is currently active. In addition, active secrets are marked up bold in the list.
Hovering over the Activate/Deactive button reveals an action to change the state:
- if the secret is in the active state, clicking the corresponding toolbar button deactivas it
- if the secret is in the inactive state, clicking the corresponding toolbar button activates it 

# Catalogs Manager
Originally, DuckDB advertised itself primarily as an in-process (aka "embedded") local-first data engine, rather than as a fully-fledged analytical relational database system.
While DuckDB remains committed to its embedded database roots, there's an ongoing trend to integrate with external relational datastores, in particular Data Lakehouses.

From the DuckDB perspective, such external datasources take the form of "attached" databases. 
The SQL syntax to achieve this is the [```ATTACH```-statement](https://duckdb.org/docs/current/sql/statements/attach).
The ```ATTACH``` statment has a flexible, type-dependent options section that's used to define the details of the attached database.

The "attachment" is an abstraction that encapsulates a lot of the details of the external datastore:
- In the most basic case, it's simply a pointer to a static file for the local duckdb engine to access and manage. This is what happens when you attach a DuckDB or SQLIte database file.
- In other cases, the local DuckDB instance acts as engine to a central Data Lake (or rather Data Lakehouse); that is: a collection of essentially static, flat datafiles, but with an additional bookkeeping protocol on top to represent physical data files as logical table objects. Concrete examples of this are external [Iceberg](https://duckdb.org/docs/current/core_extensions/iceberg/overview) and [Unity](https://duckdb.org/docs/current/core_extensions/unity_catalog) catalogs.
- In yet other cases, it's more like a federated database, with the local duckdb instance acting no longer as data engine, but rather as a client of a remote database server. The emerging [Quack wire protocol](https://duckdb.org/docs/current/core_extensions/quack) falls into this category, as do the [MySQL](https://duckdb.org/docs/current/core_extensions/mysql) and [PostgreSQL](https://duckdb.org/docs/current/core_extensions/postgres/overview) extensions.
- A Miscellaneous bag of hybrid solutions that mix some elememnts of the aforementioned cases. [Ducklake](https://duckdb.org/docs/current/core_extensions/ducklake) is an example that mostly resembles the aforementioned external Data Lake example, but where the protocol requires an external server for key elements of the bookkeeping process. [Motherduck](https://github.com/duckdb/duckdb-web/issues/6953) is an example that mostly resembles the federated database example, but where the extension smartly divides the load over the local embedded instance and the remote server. 

Huey provides a Catalogs Manager, wich is a graphical user interface to create, maintain and store configuration data required to attach to remote datasources. 
The Catalogs Manager also integrates with the [Secrets Manager](#secrets-manager), as attaching a remote catalog often requires authentication.

## Opening the Catalogs Manager
You can open the Catalogs Manager by clicking the Catalogs Manager button <img width="24" height="24" alt="image" src="https://github.com/user-attachments/assets/044ddba4-d0f1-431a-a5b5-5e3514af52e1" />
 from the left side of the main toolbar. 
 
This is what it looks like:

<img width="905" height="382" alt="image" src="https://github.com/user-attachments/assets/567fa117-46b7-4af8-a0eb-9b2b687a7df7" />

- On the left side of the Catalogs Manager Dialog, there's a list that presents the list of stored catalog definitions.
  In the list, catalogs are organized by type.  
  In the screenshot above, 4 catalogs are visible in the list.
  One is selected: it's the catalog called 'nl_railway' of the 'ducklake' type.

- On the right side of the Catalogs Manager Dialog, there are two tabs:
  - The **Form tab** presents catalog details as a structured form.
  - The **Code tab** has a code editor that lets you view and edit the Secret using DuckDB's [```ATTACH```-syntax](https://duckdb.org/docs/current/sql/statements/attach).

## Editing Catalog Definitions
Selecting a catalog in the list loads it from storage and populates the form and code tabs with its details so you can edit it.

### Catalogs Manager Form view
The Form is structured thus:
- **Name and type** fieldset: This is the 'header'. It consists of the following items:
  - **URL**: a URL that acts as address of the remote catalog. This corresponds to the ```database-path``` element of the ```ATTACH```-statement.
    The URL typically has a schema and internal syntax that is dependent upon the catalog type.
    Alternatively, the URL may follow a URL scheme that identifies the object store of a cloud provider.
    It's also possible that the specific URL syntax depends on the key/value pairs that make up the ```ATTACH```-options. 
    Please refer to the documentation of the extension that implements the catalog for detailed information about how to construct a URL for a particular kind of catalog.
  - **Name**: a unique name for the catalog. 
    This corresponds to the ```database-alias``` element of the ```ATTACH```-statement.
  - **Type**: the catalog type. 
    This corresponds to the ```TYPE``` field that appears in the ```attach-options``` of the ```ATTACH```-statement.

    In the DuckDB documentation for the ```ATTACH```-statement, only ```sqlite``` is listed as an acceptable value.
    In practice, ```ATTACH```ing to remote catalogs is managed by specific extensions that introduce their own values for the ```TYPE``` field. 

    In the form, the catalog type is just a text field, but there's a list of suggestions for all catalog types that correspond to DuckDB's [core extensions](https://duckdb.org/docs/lts/core_extensions/overview).
  - **Autoload**: a checkbox to control whether this particular catalog ought to be attached when Huey starts up.
    This is useful if you're regularly analyzing data from that catalog. 

    Catalogs that are not auto-loaded can be manually attached when required.
- **Key/Value Pairs** fieldset: The catalog's details are specified as a list of Key/Value pairs.
  This fieldset lets you maintain a list of these key/value pairs that define the options for attaching to this catalog. 
  
  A key/value pair consists of the following controls:
  - **Key** field. This is the left-most textfield. The key field is mandatory. It's just a text field, but it provides a list of suggestions based on the selected catalog type.
  - Field **Type**. This is a drop down list that controls what kind of values can be entered for the key/value pair. The Field types are:
    - ☑: Checkbox, indicating the value is ```BOOLEAN``` and can have either a ```TRUE``` or a ```FALSE``` value.
    - […]: Array, indicating the value is a list of string values
    - txt: Plaintext field, indicating the value is a string value.
    - ***: Password field. This indicates a text value that is to be treated as a secret. Password fields use a password input type so their value is not immediately visible when editing. These values are [encrypted](#encryption-of-password-fields) when the secret is stored.
    - {…}: ```MAP```-field. This indicates the value is itself a set of key/value pairs
    If a well-known value is entered in the Key field, then an appropriate default type is automatically selected.
    However, the dialog always lets you manually override the default.  
  - **Value** field. This is the rightmost textfield. For the structured value-types Array and Map, this field does not exist. In these cases, the value is made up of key/value pairs that appear indented below the structured key type. 

### Catalogs Manager Code view
The Code tab lets you view and edit the secret as a DuckDB ```ATTACH```-statement:

<img width="910" height="381" alt="image" src="https://github.com/user-attachments/assets/ebd02175-5cfc-4838-a6b3-39ece8355374" />

The code editor is particularly useful if you already have the ```ATTACH```-statement code and you want to quickly enter it into the Catalogs Manager.

Note that the code editor does not mask or redact any password fields.
  
Which key/value pairs are appropriate or allowed, depends primarily on the catalog type.
In addition, some key/value pairs depend on each other.

Please refer to the DuckDB documentation of the corresponding extension to learn more about which key/value pairs are appropriate, and what values they should take.  
  
## Creating a new Catalog

1) Open the Catalogs Manager dialog and click the "Add Catalog" button <img width="24" height="24" alt="image" src="https://github.com/user-attachments/assets/7a360d5c-5ca4-4090-ac26-941da31e0c90" />. 
   This is on the left side of the Catalogs Manager toolbar. 
   Alternatively, you may also click the "Add new remote catalog"-hyperlink, which appears next to that toolbar button if you didn't already select an existing catalog. 

   You can now use either the Form-tab or the Code-tab to define the options for attaching to the catalog.
2) In the form tab, enter a name for your new Catalog. Each Catalog has its own, unique name. 

   Then, use the suggestions list to pick one of the well-known catalog types.
   If Huey does not provide a suggestion for a catalog type that you know should be valid, then you can always override the type and enter one manually.

   Then, enter the URL that serves as extrernal identifier for the remote catalog.
    
   If you want the catalog to be automatically loaded when Huey starts, also check the Autoload checkbox.
   
   <img width="911" height="540" alt="image" src="https://github.com/user-attachments/assets/ca268f96-b4ed-4d20-ad59-b462f8d0086b" />

   In the key/value fieldset, a new blank entry is automatically created.
   You may or may not need to enter key/value pairs, depending upon the type of catalog.
   Please refer to the documentation of the extension that implements the catalog to discover which key/value pairs are appropriate for your use case. 

   To edit and create key/value pairs, do:
   - Fill out the key field.
     Huey provides suggestions for the key field for any known secret types. Selecting a suggestion, or entering a well-known type, automatically results in choosing a default field type.
     If you're sure you need a particular key but the Huey suggestions list does not provide it, then you can always enter one manually.
   
   - Choose the field type.
     If you chose a key from the suggestions list, or if you entered a key that is well-known and appropriate for the secret type, a default field type is automatically chosen for you.
     Again, you may override the field type if you're sure you need to.

   - Enter the field value. 
     The choice of field type directly affects what values you can add in the value field.
     The field type directly affects the kind of data you can enter into the value field; for example, choosing the checkbox will turn the value input into a checkbox. 

   To work with the existing fields, use the action buttons to the left of the key field:
   - You can add as many key/value pairs as you like,
     Just click the "Add key/value pair"-button <img width="24" height="24" alt="image" src="https://github.com/user-attachments/assets/cc19cbf3-e9bd-490e-ae21-5bb857ecc05c" /> that appears immediately before the key field to create a new one.
   - To remove a key/value pair, click the "Remove key/value pair"-button <img width="24" height="24" alt="image" src="https://github.com/user-attachments/assets/ed254611-be25-4e3c-a0d4-842a7c1e9838" />.
   - You can also move the key/value pairs around using the "Move key/value pair up" <img width="24" height="24" alt="image" src="https://github.com/user-attachments/assets/6729a7b2-b6e1-484d-a3b2-60f2475d1a68" />
 and "Move key/value pair down" <img width="24" height="24" alt="image" src="https://github.com/user-attachments/assets/90cca24d-7ba0-4c02-8879-cc3fad743e75" />
 -buttons.
4) You can switch to the Code tab to see the equivalent ```ATTACH```-statement.
   Alternatively, you can paste or enter an ```ATTACH```-statement, and then switch to the Form-tab. The form will be automatically populated accordingly.

5) If the catalog appears valid, the "Save Catalog"-button <img width="24" height="24" alt="image" src="https://github.com/user-attachments/assets/edd7a839-2751-46f4-8452-bcdf06ef934a" />
will be available in the Catalogs Manager's toolbar. Click it to store the secret.

### Managing Catalog Authentication
Most Catalog extensions support a ```SECRET``` option in their ```ATTACH```-options. 
If specified, this should typically refer to an existing DuckDB Secret created with the ```CREATE SECRET```-statement.

In Huey, the Catalogs Manager integrates with the [Secrets Manager](#secrets-manager) by offering suggestions for the value field of a key/value pair with a SECRET key:

<img width="909" height="482" alt="image" src="https://github.com/user-attachments/assets/c62fb722-a4ed-4304-9ff8-9247886a6b38" />

When attaching to the catalog, Huey scans the catalog definition for any occurrence of the SECRET. 
If it finds one, it will automatically [activate the secret](#activating-deactivating-and-auto-loading-secrets) so DuckDB can use it to connect to the catalog.

As the secret is likely to contain an [encrypted password-type key/value pair](#encryption-of-password-fields), this may in turn prompt you for the password of the secrets store.
Keep in mind: this is the password that you used to initialize the secrets store - NOT a password specific to your catalog configuration.
Huey needs the password to the secrets store to decrypt the password fields in the stored secret so it can then run the ```CREATE SECRET``-statement.

## Activating, Deactivating and auto-attaching Catalogs
In order to use a Catalog, it needs to be activated.
Activating the Catalog simply means the equivalent ```ATTACH```-statement will be executed so that DuckDB can refer to it by name.
In Huey, activating the catalog will also add it as a datasource to the Datasources tab so you can browse its tables and views and select them for data analysis:

<img width="1310" height="581" alt="image" src="https://github.com/user-attachments/assets/d6f0265b-5906-494b-bcc6-7c2dd2ca5406" />

Catalogs are automcatically activated on save.
Catalogs marked for auto-load are also automatically activated on Huey startup.

If a catalog is selected in the catalogs list, the toolbar will show one of these buttons, depending on its attachement status:
- Deactivated button <img width="24" height="24" alt="image" src="https://github.com/user-attachments/assets/c04e588e-c3b2-4fcd-a2d5-fafb9103d21a" />
, indicating the catalog is currently not attached.
- Activated button <img width="24" height="24" alt="image" src="https://github.com/user-attachments/assets/fcc8a8ef-e9b3-454a-8baf-4b184e70f6fe" />
, indicating the catalog is currently attached. In addition, active catalogs are marked up bold in the list.
Hovering over the Activate/Deactive button reveals an action to change the state:
- if the catalog is attached, clicking the button will detach it.
- if the catalog is detached, clicking the button atteches it. 

## Catalog Examples

Ducklabs exposes 2 catalogs that are used as demo datasets in the online duckdb shell.

### nl_railway Ducklake Catalog
The nl_railway Ducklake Catalog contains a few tables with dutch railway service data.
To connect to it from within Huey, follow [the steps for creating a new Catalog](#creating-a-new-catalog) and enter the following details:
- when using the [Catalog Form](#catalogs-manager-form-view), enter:
  - **name**: ```nl_railway```
  - **type**: ```ducklake```
  - **url**: ```https://blobs.duckdb.org/datalake/nl-railway.ducklake```
  <img width="863" height="382" alt="image" src="https://github.com/user-attachments/assets/0593ab95-c3be-463f-bd40-55f37f2c9607" />
- when using the [Catalogs Manager's code view](#catalogs-manager-code-view), enter:
  ```sql
  ATTACH 'https://blobs.duckdb.org/datalake/nl-railway.ducklake'
  AS nl_railway (
    TYPE ducklake
  )    
  ```
  <img width="864" height="385" alt="image" src="https://github.com/user-attachments/assets/f305cea2-202c-419c-9858-67e2aa9dca21" />
- Save the catalog.

If all goes well, the Catalog is now added to the Datasources tab:

<img width="370" height="225" alt="image" src="https://github.com/user-attachments/assets/2f5334f5-a390-474f-84f3-b0f368138c05" />

### TPCH Iceberg Catalog
The TPCH Iceberg Catalog is the TPCH benchmark dataset, served as Iceberg tables stored on S3.  

To connect to it from within Huey, you first have to create a secret, so follow the [steps for creating a new secret](#creating-a-new-secret): 
- when using the [Secret Form](#secret-manager-form-view), enter:
  - **name**: ```my_secret```
  - **type**: ```s3```
  Then, enter the following key/value pairs:
  - **```KEY_ID```**, with type ```txt``` and value ```AKIATZA7ONMDJXWR4UVN```
  - **```SECRET```**, with type ```***``` (passsword) and value ```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```
  - **```REGION```**, with type ```txt``` and value ```us-west-1```
  <img width="868" height="387" alt="image" src="https://github.com/user-attachments/assets/8a97d80e-cda3-46f4-861a-ab56e4cf8e60" />
- when using the [Secrets Manager Code view](#secret-manager-code-view), enter this statement:
  ```sql
  CREATE OR REPLACE TEMPORARY SECRET my_secret (
    TYPE s3
  , KEY_ID 'AKIATZA7ONMDJXWR4UVN'
  , SECRET 'elm876/SqATe455MgkK6RB4fGORgNYep7/0GXajv'
  , REGION 'us-west-1'
  )
  ```
  <img width="871" height="387" alt="image" src="https://github.com/user-attachments/assets/4257117d-fe81-46bb-a1d9-76eb2d654f97" />
- Save your secret. You may be prompted to enter your password.
  If that's the case then enter the password with wich you initialized the store.
  If you never initialized the store, then the prompt will inform you that you need to initialize the store and provide detailed instructions to do so.  

Once the secret is in place, you can follow [the steps for creating a new Catalog](#creating-a-new-catalog) and enter the following details:
- when using the [Catalog Form](#catalogs-manager-form-view), enter:
  - **name**: ```iceberg_dataset```
  - **type**: ```iceberg```
  - **url**: ```arn:aws:s3tables:us-east-1:259911478022:bucket/iceberg-on-the-browser```
  You also need to create and fill out a few key/value pairs:
  - **```ENDPOINT_TYPE```**, with type ```txt``` and value ```s3_tables```
  - **```SECRET```**, with type ```txt``` and value ```my_secret```
  <img width="868" height="380" alt="image" src="https://github.com/user-attachments/assets/770a1e92-3fe8-4508-8a1a-088b737a5acd" />
 - when using the [Catalogs Manager's code view](#catalogs-manager-code-view), enter:
  ```sql
    ATTACH 'arn:aws:s3tables:us-east-1:259911478022:bucket/iceberg-on-the-browser'
    AS iceberg_dataset (
      TYPE iceberg 
    , ENDPOINT_TYPE 's3_tables'
    , SECRET 'my_secret'
    )
  ```
  <img width="939" height="383" alt="image" src="https://github.com/user-attachments/assets/4a40829f-6d0f-440f-9fd2-0e5fa3b68813" />
- Save the catalog.

If all goes well, the Catalog is now added to the Datasources tab:
<img width="370" height="225" alt="image" src="https://github.com/user-attachments/assets/2f5334f5-a390-474f-84f3-b0f368138c05" />

# Development, Releases, and contributions 

## Branches
The Huey repository has two important branches - [dev](https://github.com/rpbouman/huey/tree/dev) and [main](https://github.com/rpbouman/huey/tree/main). 
Active development is done on the dev branch. 

## (Pre-)Release
Once every while, typically every few weeks, ongoing developments are captured in a (pre-)release, which gets its own version number and a nickname.
You can check out prior releases here: [https://github.com/rpbouman/huey/releases](https://github.com/rpbouman/huey/releases)

A new (pre-)release is triggered whenever a dependency is updated (currently, Huey has two dependencies - DuckDB WASM and Tabler Icons).
Other events that trigger a (pre-)release is when ongoing development of new features and bugfixes is deemed stable - or at least stable enough to focus on new developments.

When a couple of pre-releases have been found stable enough for production usage, a release is made and the work from the dev branch is merged into the main branch.
The live demo at [https://rpbouman.github.io/huey/src/index.html](https://rpbouman.github.io/huey/src/index.html) is a github page that is created right on top of the main branch.
So, a merge to the main branch is what updates the version of the live demo.

If you just want to enjoy use of a stable version of Huey, you can either use the live demo, or check out or download the main branch.
If you want to enjoy the latest developments, then you should use the dev branch.

## Checking your Huey version

You can verify the current Huey version in the about dialog:

![image](https://github.com/user-attachments/assets/7a0b8690-4986-4189-8e8c-be3abd9580e6)

Note that this also gives info on the versions of Huey's dependencies.

## URL Query Parameters

Some Huey settings can be configured via URL query parameters.
For typical usage it is not recommended to pass these parameters. 
The main purpose is for development, debugging and to solve compatibility issues.

- `loglevel`: Controls the DuckDB WASM loglevel. Valid values are defined by the [DuckDB/WASM LogLevel Enumeration](https://shell.duckdb.org/docs/enums/index.LogLevel.html). You can pass either the Enumeration keys (`DEBUG`, `ERROR`, `INFO`, `NONE`, `WARNING`) or their corresponding integer values.
- `duckdb-wasm`: DuckDB WASM version as published on jsdelivr. See [https://data.jsdelivr.com/v1/packages/npm/@duckdb/duckdb-wasm](https://data.jsdelivr.com/v1/packages/npm/@duckdb/duckdb-wasm) for a list of acceptable versions. The ability to control the DuckDB WASM version is mostly to solve compatibility issues around DuckDB extensions, as some extensions required by the user may not yet be available for newer DuckDB WASM versions.

## Integrating and/or Embedding Huey

You can embed huey inside a frame on your own webpage and control the application by sending it commands using the <a href="https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage" target="_blank" rel="noopener noreferrer">`postMessage()`-method</a>.
Currently this experimental feature is under development and not documented in detail. Please check out src/PostMessageInterface/PostMessageTestbed.html for an example that illustrates this feature. 

## Contributions

Your contributions are welcome! 
You can contribute in many ways:
- filing an issue: If something isn't working, or not working the way it's supposed to, please [file an issue](https://github.com/rpbouman/Huey/issues/new/choose)!
  To ensure maximum effectivity, clearly describe the component that is having an issue, describe the observed behavior, describe the expected behavior, and describe how this issue may be reproduced. Please include your browserversion and operating system too. If your issue relies on a dataset, and you are at liberty to share that, then please include that too. Please label your issue as "bug".
- Suggest a feature. You may also file issues to request or suggest features. If you're looking for a feature you know from other tools which Huey doesn't have, then its typically helpful if you name the product and its feature name.
- Create a translation! Huey has simple but functional internationalization support. To get started with interationalization, take a look at the Internationalization directory in the src folder. Inside, you'll find a huey.i18n.labels.template.js file. To create your own translation, copy it, rename as a locale and store it in the i18n subdirectory. There are already some translations there. To test your translation, use your browser's language settings and make sure your locale is the preferred locale. If all goes well, Huey should immediately respond to the locale change. You can contribute your translation by sending a pull request.
- Fork the repo and send a pull request. If you filed an issue or feature request, or you found an existing issue and feature request, you can also consider picking it up and send a pull request. There is no guarantee that your PR would be accepted, but in general these would be welcome. Just make sure there is an issue filed already that can be referenced, so that it is clear what the PR is attempting to fix or what feature the PR aims to deliver.
- Become an advocate. If you like Huey, spread the word! Share it with your friends and colleagues, and help them get set up. If Huey was of some help to you in your daily work, consider writing a blog about it, or maybe present your use case at a meeting.
- Become a sponsor. Just click the "Sponsor" button at the top of the Huey github project page:

  ![image](https://github.com/user-attachments/assets/a8fb2c41-5286-467b-b1a6-4a06495dcb51)

  Alternatively, you can sponsor Huey by <a href="https://www.paypal.com/donate/?hosted_button_id=776A6UNZ35M84" target="_blank" rel="noopener noreferrer">making a donation</a>.
- Consultancy: if need help using, installing or deploying Huey, you can always ask for help. If you require professional support, we can work something out too. 
- Commission a feature. If you need custom development, or would like help building your own custom development, then contact me and we'll negotiate the details.
