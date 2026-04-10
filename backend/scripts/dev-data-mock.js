/**
 * Sobe o servidor com DATA_SOURCE=mock para testes sem depender do banco.
 * Uso: node --watch scripts/dev-data-mock.js
 */
process.env.DATA_SOURCE = 'mock';
require('../server.js');
