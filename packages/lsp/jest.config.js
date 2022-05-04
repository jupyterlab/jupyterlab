const func = require('@jupyterlab/testutils/lib/jest-config');
const config = func(__dirname);
config['transformIgnorePatterns'] = [
  '/node_modules/(?!lib0|y\\-protocols|y\\-websocket|yjs|lsp-ws-connection).+'
];
module.exports = config;
