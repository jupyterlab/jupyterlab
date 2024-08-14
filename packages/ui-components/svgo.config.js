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
