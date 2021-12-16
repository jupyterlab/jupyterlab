// TODO: remove
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

/**
 * Create the webpack ``shared`` configuration
 */
export function createShared({ extensions, resolutions, singletonPackages }) {
  // Set up module federation sharing config
  const shared = {};

  // Deduplicated list of extension package names.
  const extensionPackages = [...new Set(extensions)];

  // Make sure any resolutions are shared
  for (let [pkg, requiredVersion] of Object.entries(resolutions)) {
    shared[pkg] = { requiredVersion };
  }

  // Add any extension packages that are not in resolutions (i.e., installed from npm)
  for (let pkg of extensionPackages) {
    if (!shared[pkg]) {
      shared[pkg] = {
        requiredVersion: require(`${pkg}/package.json`).version
      };
    }
  }

  // Add dependencies and sharedPackage config from extension packages if they
  // are not already in the shared config. This means that if there is a
  // conflict, the resolutions package version is the one that is shared.
  const extraShared = [];
  for (let pkg of extensionPackages) {
    let pkgShared = {};
    let {
      dependencies = {},
      jupyterlab: { sharedPackages = {} } = {}
    } = require(`${pkg}/package.json`);
    for (let [dep, requiredVersion] of Object.entries(dependencies)) {
      if (!shared[dep]) {
        pkgShared[dep] = { requiredVersion };
      }
    }

    // Overwrite automatic dependency sharing with custom sharing config
    for (let [dep, config] of Object.entries(sharedPackages)) {
      if (config === false) {
        delete pkgShared[dep];
      } else {
        if ('bundled' in config) {
          config.import = config.bundled;
          delete config.bundled;
        }
        pkgShared[dep] = config;
      }
    }
    extraShared.push(pkgShared);
  }

  // Now merge the extra shared config
  const mergedShare = {};
  for (let sharedConfig of extraShared) {
    for (let [pkg, config] of Object.entries(sharedConfig)) {
      // Do not override the basic share config from resolutions
      if (shared[pkg]) {
        continue;
      }

      // Add if we haven't seen the config before
      if (!mergedShare[pkg]) {
        mergedShare[pkg] = config;
        continue;
      }

      // Choose between the existing config and this new config. We do not try
      // to merge configs, which may yield a config no one wants
      let oldConfig = mergedShare[pkg];

      // if the old one has import: false, use the new one
      if (oldConfig.import === false) {
        mergedShare[pkg] = config;
      }
    }
  }

  Object.assign(shared, mergedShare);

  // Transform any file:// requiredVersion to the version number from the
  // imported package. This assumes (for simplicity) that the version we get
  // importing was installed from the file.
  for (let [pkg, { requiredVersion }] of Object.entries(shared)) {
    if (requiredVersion && requiredVersion.startsWith('file:')) {
      shared[pkg].requiredVersion = require(`${pkg}/package.json`).version;
    }
  }

  // Add singleton package information
  for (let pkg of singletonPackages) {
    shared[pkg].singleton = true;
  }

  return shared;
}
