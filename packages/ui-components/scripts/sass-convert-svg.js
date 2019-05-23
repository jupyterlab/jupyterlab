// Inspired from https://github.com/palantir/blueprint/blob/develop/packages/core/scripts/sass-inline-svg.js
const types = require('node-sass').types;

function convertToJP() {
  // Map between BluePrint JS image and jp CSS variables
  var bp2jp = {
    'chevron-right.svg': 'var(--jp-icon-caretright)',
    'more.svg': 'var(--jp-icon-more)',
    'small-tick.svg': 'var(--jp-icon-checkmark)',
    // TODO nothing fits this
    'small-minus.svg': 'var(--jp-icon-circle)'
  };
  return function(path) {
    var parts = path.getValue().split('/');
    var filename = parts[parts.length - 1];
    return new types.String(bp2jp[filename]);
  };
}

module.exports = {
  'svg-icon': convertToJP()
};
