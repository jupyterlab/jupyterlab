// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { LoaderDefinitionFunction } from '@rspack/core';

/**
 * A webpack/rspack loader that tags CSS content with the originating
 * package name. The tag is a CSS comment prepended to the source:
 *
 *   /* @css-package: @jupyterlab/launcher * /
 *
 * This comment is parsed at runtime by styleTagTransform to set a
 * `data-package` attribute on the injected `<style>` element.
 */
const cssPackageLoader: LoaderDefinitionFunction = function (source) {
  const resourcePath = this.resourcePath.replace(/\\/g, '/');

  // Determine package name from the file path.
  // Handles scoped packages like @lumino/widgets and @jupyterlab/launcher.
  let packageName: string | null = null;

  // Match path patterns like:
  //   .../node_modules/@scope/name/...
  //   .../packages/name/...
  const scopedMatch = resourcePath.match(
    /(?:node_modules|packages)\/((?:@[^/]+\/)?[^/]+)\//
  );
  if (scopedMatch) {
    packageName = scopedMatch[1];
    // In the monorepo, packages/ directory uses unscoped names;
    // check if this is a @jupyterlab package.
    if (
      !packageName.startsWith('@') &&
      resourcePath.includes('/packages/' + packageName)
    ) {
      packageName = '@jupyterlab/' + packageName;
    }
  }

  if (packageName) {
    return `/* @css-package: ${packageName} */\n${source}`;
  }

  return source as string;
};

module.exports = cssPackageLoader;
