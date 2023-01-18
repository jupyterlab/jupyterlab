const webpack = require('webpack');
const crypto = require('crypto');

// Workaround for loaders using "md4" by default, which is not supported in FIPS-compliant OpenSSL
const cryptoOrigCreateHash = crypto.createHash;
crypto.createHash = algorithm =>
  cryptoOrigCreateHash(algorithm == 'md4' ? 'sha256' : algorithm);

module.exports = {
  entry: './build/index.js',
  mode: 'development',
  output: {
    path: require('path').join(__dirname, 'build'),
    filename: 'bundle.js',
    hashFunction: 'sha256'
  },
  plugins: [
    new webpack.DefinePlugin({
      // Needed for Blueprint. See https://github.com/palantir/blueprint/issues/4393
      'process.env': '{}',
      // Needed for various packages using cwd(), like the path polyfill
      process: { cwd: () => '/' }
    })
  ],
  bail: true
};
