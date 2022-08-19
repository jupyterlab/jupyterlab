/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

// Since postcss 8.4.0, parsing the CSS is done only if some plugin are defined
// As we only want to check that the CSS files can be processed by postcss
// this adds a no-op plugin.
const plugin = () => {
  return {
    postcssPlugin: 'no-op',
    Once(root) {
      // no-op plugin
    }
  };
};
plugin.postcss = true;

module.exports = {
  plugins: [plugin]
};
