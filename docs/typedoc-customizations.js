/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */
const { JSX } = require('typedoc');

/**
 * @param {import('typedoc').Application} app
 */
exports.load = function (app) {
  // Inject JupyterLab favicon
  app.renderer.hooks.on('head.begin', context => {
    return JSX.createElement(
      JSX.Fragment,
      null,
      // Add favicon
      JSX.createElement('link', {
        rel: 'icon',
        type: 'image/png',
        href: '../_static/logo-icon.png'
      })
    );
  });
  // Inject Plausible.io analytics in the footer of the head section
  app.renderer.hooks.on('head.end', context => {
    return JSX.createElement(
      JSX.Fragment,
      null,
      // Plausible.io main script (async)
      JSX.createElement('script', {
        src: 'https://plausible.io/js/pa-Tem97Eeu4LJFfSRY89aW1.js',
        async: true
      }),
      // Plausible.io initialization script with hash-based routing
      JSX.createElement(
        'script',
        null,
        'window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init({hashBasedRouting:true});'
      )
    );
  });
};
