const version = require('./package.json').version;
const crypto = require('crypto');

// Workaround for loaders using "md4" by default, which is not supported in FIPS-compliant OpenSSL
const cryptoOrigCreateHash = crypto.createHash;
crypto.createHash = algorithm =>
  cryptoOrigCreateHash(algorithm == 'md4' ? 'sha256' : algorithm);

module.exports = {
  entry: './lib',
  output: {
    filename: './dist/index.js',
    library: '@jupyterlab/services',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    publicPath: 'https://unpkg.com/@jupyterlab/services@' + version + '/dist/',
    hashFunction: 'sha256'
  },
  bail: true,
  mode: 'production',
  devtool: 'source-map'
};
