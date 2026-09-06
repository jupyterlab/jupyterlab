/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

const path = require('node:path');

/**
 * Generate a valid SVG ID to use as a prefix.
 *
 * @param {string} filePath - An SVG file path.
 *
 * @returns {string} A valid SVG ID.
 */
function generateSvgIdFromPath(filePath) {
  let svgId = path.parse(filePath).name.replace(/[^a-z0-9]/gi, '');

  // Ensure the ID does not start with a digit.
  // More info: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/id#id
  if (/^[0-9]/.test(svgId)) {
    svgId = `_${svgId}`;
  }

  return svgId;
}

/**
 * Remove <path> placeholder elements. The removeUselessStrokeAndFill plugin
 * doesn't work because it also removes elements where the fill attribute is
 * none but with classes for interactive styling (e.g., close icon).
 *
 * @type {import('svgo').CustomPlugin}
 */
const removeUselessPaths = {
  name: 'removeUselessPaths',
  fn: () => {
    return {
      element: {
        enter: (node, parentNode) => {
          if (
            node.name === 'path' &&
            node.attributes.fill === 'none' &&
            !Object.hasOwn(node.attributes, 'class')
          ) {
            parentNode.children = parentNode.children.filter(
              child => child !== node
            );
          }
        }
      }
    };
  }
};

/**
 * @type {import('svgo').Config}
 */
module.exports = {
  multipass: true,
  js2svg: {
    eol: 'lf',
    finalNewline: true,
    indent: 2,
    pretty: true
  },
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          removeUnknownsAndDefaults: {
            // To maintain fill and stroke attributes because they are considered for styling (e.g., .jp-icon0[fill] and html5 icon).
            defaultAttrs: false
          },
          removeViewBox: false
        }
      }
    },
    'cleanupListOfValues',
    // To ensure unique IDs (e.g., for the <clipPath> elements of the add-above and add-below icons).
    // More info: https://svgo.dev/docs/plugins/cleanupIds/
    {
      name: 'prefixIds',
      params: {
        delim: '',
        prefix: (_, info) =>
          info.path ? generateSvgIdFromPath(info.path) : '',
        prefixIds: true,
        prefixClassNames: false
      }
    },
    removeUselessPaths
  ]
};
