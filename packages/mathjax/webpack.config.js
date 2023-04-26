const path = require('path');
const PACKAGE = require('mathjax-full/components/webpack.common.js');

const config = PACKAGE(
  'custom-component', // the package to build
  '../../node_modules/mathjax-full/js', // location of the MathJax js library
  [], // packages to link to
  path.join(__dirname, 'src'), // our directory
  'lib' // dist directory
);

console.log(config);

module.exports = {
  //   ...config,
  entry: './src/custom-component.js',
  output: {
    filename: 'custom-component.js',
    path: path.resolve(__dirname, 'lib')
  }
  //   module: {
  //     rules: []
  //   }
};
