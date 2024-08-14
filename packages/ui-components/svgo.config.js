/**
 * @type {import('svgo').Config}
 */
module.exports = {
  multipass: true,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          collapseGroups: false,
          removeTitle: false,
          removeUnknownsAndDefaults: {
            defaultAttrs: false
          },
          removeUselessStrokeAndFill: {
            removeNone: true
          },
          removeViewBox: false
        }
      }
    }
  ]
};
