/**
 * Remote datasource configuration model.
 * Describes a dataset served by QueryService (see docs/huey-large-scale-olap-tech-spec.md).
 *
 * Config shape:
 * - type: 'remote'
 * - baseUrl: string (QueryService base URL, e.g. 'https://api.example.com')
 * - datasetId: string (logical dataset id, e.g. 'trades_v1')
 * - id: string (optional; stable id for this datasource instance in the UI)
 */
var RemoteDatasourceConfig = (function () {
  var REMOTE_DATASOURCE_TYPE = 'remote';
  var REMOTE_CONFIG_KEYS = ['type', 'baseUrl', 'datasetId'];

  function createRemoteDatasourceConfig(opts) {
    var baseUrl = opts && opts.baseUrl;
    var datasetId = opts && opts.datasetId;
    var id = opts && opts.id;
    if (typeof baseUrl !== 'string' || !baseUrl.trim()) {
      throw new Error('Remote datasource config requires baseUrl');
    }
    if (typeof datasetId !== 'string' || !datasetId.trim()) {
      throw new Error('Remote datasource config requires datasetId');
    }
    var config = {
      type: REMOTE_DATASOURCE_TYPE,
      baseUrl: baseUrl.replace(/\/$/, ''),
      datasetId: datasetId.trim()
    };
    if (id != null && String(id).trim()) {
      config.id = String(id).trim();
    }
    return config;
  }

  function isRemoteDatasourceConfig(config) {
    if (!config || typeof config !== 'object') return false;
    if (config.type !== REMOTE_DATASOURCE_TYPE) return false;
    if (typeof config.baseUrl !== 'string' || !config.baseUrl.trim()) return false;
    if (typeof config.datasetId !== 'string' || !config.datasetId.trim()) return false;
    return true;
  }

  return {
    REMOTE_DATASOURCE_TYPE: REMOTE_DATASOURCE_TYPE,
    REMOTE_CONFIG_KEYS: REMOTE_CONFIG_KEYS,
    createRemoteDatasourceConfig: createRemoteDatasourceConfig,
    isRemoteDatasourceConfig: isRemoteDatasourceConfig
  };
})();
