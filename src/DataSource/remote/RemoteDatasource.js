/**
 * RemoteDatasource: fetches schema and query results from QueryService.
 * Use with RemoteDatasourceConfig. Implements getId(), getType(), getManagedConnection()
 * for compatibility with Huey; connection exposes getSchema(), fetchTuples(), fetchCells(), fetchPicklist().
 */
(function () {
  function buildEnvelope(datasetId, dateRange, query, clientContext) {
    var envelope = {
      dataset_id: datasetId,
      date_range: dateRange || { type: 'single', date: new Date().toISOString().slice(0, 10) },
      query: query || {}
    };
    if (clientContext) {
      envelope.client_context = clientContext;
    }
    return envelope;
  }

  function RemoteConnection(datasource) {
    this._datasource = datasource;
    this._abortController = null;
    this._state = 'queried';
  }

  RemoteConnection.prototype.getConnectionId = function () {
    return 'remote';
  };

  RemoteConnection.prototype.getState = function () {
    return this._state;
  };

  RemoteConnection.prototype.getSchema = function () {
    var baseUrl = this._datasource.getBaseUrl();
    var datasetId = this._datasource.getDatasetId();
    var url = baseUrl + '/schema?dataset_id=' + encodeURIComponent(datasetId);
    this._abortController = new AbortController();
    return fetch(url, { signal: this._abortController.signal })
      .then(function (res) {
        if (!res.ok) {
          return res.json().then(function (body) {
            var err = new Error(body.detail || res.statusText);
            err.status = res.status;
            throw err;
          }).catch(function () {
            throw new Error(res.statusText || 'Schema request failed');
          });
        }
        return res.json();
      });
  };

  RemoteConnection.prototype.fetchTuples = function (dateRange, query, clientContext) {
    var baseUrl = this._datasource.getBaseUrl();
    var datasetId = this._datasource.getDatasetId();
    var envelope = buildEnvelope(datasetId, dateRange, query, clientContext);
    this._abortController = new AbortController();
    return fetch(baseUrl + '/query/tuples', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
      signal: this._abortController.signal
    }).then(function (res) {
      if (!res.ok) {
        return res.json().then(function (body) {
          var err = new Error(body.detail || res.statusText);
          err.status = res.status;
          throw err;
        }).catch(function () {
          throw new Error(res.statusText || 'Tuples request failed');
        });
      }
      return res.json();
    });
  };

  RemoteConnection.prototype.fetchCells = function (dateRange, query, clientContext) {
    var baseUrl = this._datasource.getBaseUrl();
    var datasetId = this._datasource.getDatasetId();
    var envelope = buildEnvelope(datasetId, dateRange, query, clientContext);
    this._abortController = new AbortController();
    return fetch(baseUrl + '/query/cells', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
      signal: this._abortController.signal
    }).then(function (res) {
      if (!res.ok) {
        return res.json().then(function (body) {
          var err = new Error(body.detail || res.statusText);
          err.status = res.status;
          throw err;
        }).catch(function () {
          throw new Error(res.statusText || 'Cells request failed');
        });
      }
      return res.json();
    });
  };

  RemoteConnection.prototype.fetchPicklist = function (dateRange, query, clientContext) {
    var baseUrl = this._datasource.getBaseUrl();
    var datasetId = this._datasource.getDatasetId();
    var envelope = buildEnvelope(datasetId, dateRange, query, clientContext);
    this._abortController = new AbortController();
    return fetch(baseUrl + '/query/picklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
      signal: this._abortController.signal
    }).then(function (res) {
      if (!res.ok) {
        return res.json().then(function (body) {
          var err = new Error(body.detail || res.statusText);
          err.status = res.status;
          throw err;
        }).catch(function () {
          throw new Error(res.statusText || 'Picklist request failed');
        });
      }
      return res.json();
    });
  };

  RemoteConnection.prototype.query = function () {
    return Promise.reject(new Error('Remote datasource does not support SQL; use fetchTuples, fetchCells, or fetchPicklist.'));
  };

  RemoteConnection.prototype.cancelPendingQuery = function () {
    if (this._abortController) {
      this._state = 'canceled';
      this._abortController.abort();
      this._abortController = null;
    }
    return Promise.resolve();
  };

  function RemoteDatasource(config) {
    if (typeof EventEmitter === 'undefined') {
      throw new Error('RemoteDatasource requires EventEmitter');
    }
    EventEmitter.call(this, ['destroy', 'change']);
    if (!RemoteDatasourceConfig.isRemoteDatasourceConfig(config)) {
      throw new Error('Invalid remote datasource config');
    }
    this._baseUrl = config.baseUrl.replace(/\/$/, '');
    this._datasetId = config.datasetId;
    this._id = config.id || ('remote:' + this._baseUrl + ':' + this._datasetId);
    this._connection = new RemoteConnection(this);
  }

  RemoteDatasource.prototype = Object.create(EventEmitter.prototype);
  RemoteDatasource.prototype.constructor = RemoteDatasource;

  RemoteDatasource.prototype.getType = function () {
    return RemoteDatasourceConfig.REMOTE_DATASOURCE_TYPE;
  };

  RemoteDatasource.prototype.getId = function () {
    return this._id;
  };

  RemoteDatasource.prototype.getBaseUrl = function () {
    return this._baseUrl;
  };

  RemoteDatasource.prototype.getDatasetId = function () {
    return this._datasetId;
  };

  RemoteDatasource.prototype.getManagedConnection = function () {
    return this._connection;
  };

  RemoteDatasource.prototype.getSchema = function () {
    return this._connection.getSchema();
  };

  RemoteDatasource.prototype.getRejects = function () {
    return Promise.resolve();
  };

  RemoteDatasource.prototype.destroy = function () {
    this.fireEvent('destroy', {});
  };

  window.RemoteDatasource = RemoteDatasource;
})();
