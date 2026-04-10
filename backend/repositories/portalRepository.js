const { isMock } = require('../config/dataSource');

const impl = isMock()
  ? require('./portalRepository.mock')
  : require('./portalRepository.postgres');

module.exports = impl;
