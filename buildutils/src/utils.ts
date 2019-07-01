import path = require('path');
import glob = require('glob');
import fs = require('fs-extra');
import childProcess = require('child_process');
import { DepGraph } from 'dependency-graph';
import sortPackageJson = require('sort-package-json');
import coreutils = require('@phosphor/coreutils');

type Dict<T> = { [key: string]: T };

/**
 * Get all of the lerna package paths.
 */
export function getLernaPaths(basePath = '.'): string[] {
  basePath = path.resolve(basePath);
  let baseConfig = require(path.join(basePath, 'package.json'));
  let paths: string[] = [];
  let packages;
  if (baseConfig.workspaces) {
    packages = baseConfig.workspaces.packages || baseConfig.workspaces;
  } else {
    let baseConfig = require(path.join(basePath, 'lerna.json'));
    packages = baseConfig.packages;
  }
  for (let config of packages) {
    paths = paths.concat(glob.sync(path.join(basePath, config)));
  }
  return paths.filter(pkgPath => {
    return fs.existsSync(path.join(pkgPath, 'package.json'));
  });
}

/**
 * Get all of the core package paths.
 */
export function getCorePaths(): string[] {
  let spec = path.resolve(path.join('.', 'packages', '*'));
  return glob.sync(spec);
}

/**
 * Write a package.json if necessary.
 *
 * @param data - The package data.
 *
 * @oaram pkgJsonPath - The path to the package.json file.
 *
 * @returns Whether the file has changed.
 */
export function writePackageData(pkgJsonPath: string, data: any): boolean {
  let text = JSON.stringify(sortPackageJson(data), null, 2) + '\n';
  let orig = fs
    .readFileSync(pkgJsonPath, 'utf8')
    .split('\r\n')
    .join('\n');
  if (text !== orig) {
    fs.writeFileSync(pkgJsonPath, text, 'utf8');
    return true;
  }
  return false;
}

/**
 * Read a json file.
 */
export function readJSONFile(filePath: string): any {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    throw `Cannot read JSON for path ${filePath}: ${e}`;
  }
}

/**
 * Write a json file.
 */
export function writeJSONFile(filePath: string, data: any): boolean {
  function sortObjByKey(value: any): any {
    // https://stackoverflow.com/a/35810961
    return typeof value === 'object'
      ? Array.isArray(value)
        ? value.map(sortObjByKey)
        : Object.keys(value)
            .sort()
            .reduce((o: any, key) => {
              const v = value[key];
              o[key] = sortObjByKey(v);
              return o;
            }, {})
      : value;
  }
  let text = JSON.stringify(data, sortObjByKey(data), 2) + '\n';
  let orig = {};
  try {
    orig = readJSONFile(filePath);
  } catch (e) {
    // no-op
  }
  if (!coreutils.JSONExt.deepEqual(data, orig)) {
    fs.writeFileSync(filePath, text, 'utf8');
    return true;
  }
  return false;
}

/**
 *
 * Call a command, checking its status.
 */
export function checkStatus(cmd: string) {
  const data = childProcess.spawnSync(cmd, { shell: true });
  return data.status;
}

/**
 * Get the current version of JupyterLab
 */
export function getPythonVersion() {
  const cmd = 'python setup.py --version';
  return run(cmd, { stdio: 'pipe' }, true);
}

/**
 * Get the current version of a package
 */
export function getJSVersion(pkg: string) {
  const filePath = path.resolve(
    path.join('.', 'packages', pkg, 'package.json')
  );
  const data = readJSONFile(filePath);
  return data.version;
}

/**
 * Pre-bump.
 */
export function prebump() {
  // Ensure bump2version is installed (active fork of bumpversion)
  run('python -m pip install bump2version');

  // Make sure we start in a clean git state.
  let status = run('git status --porcelain', {
    stdio: 'pipe',
    encoding: 'utf8'
  });
  if (status.length > 0) {
    throw new Error(
      `Must be in a clean git state with no untracked files.
Run "git status" to see the issues.

${status}`
    );
  }
}

/**
 * Post-bump.
 */
export function postbump() {
  // Get the current version.
  const curr = getPythonVersion();

  // Update the dev mode version.
  let filePath = path.resolve(path.join('.', 'dev_mode', 'package.json'));
  let data = readJSONFile(filePath);
  data.jupyterlab.version = curr;
  writeJSONFile(filePath, data);
}

/**
 * Run a command with terminal output.
 *
 * @param cmd - The command to run.
 */
export function run(
  cmd: string,
  options: childProcess.ExecSyncOptions = {},
  quiet?: boolean
): string {
  options = options || {};
  options['stdio'] = options.stdio || 'inherit';
  if (!quiet) {
    console.log('>', cmd);
  }
  const value = childProcess.execSync(cmd, options);
  if (value === null) {
    return '';
  }
  return value
    .toString()
    .replace(/(\r\n|\n)$/, '')
    .trim();
}

/**
 * Get a graph that has all of the package data for the local packages and their
 * first order dependencies.
 */
export function getPackageGraph(): DepGraph<Dict<any>> {
  // Pick up all the package versions.
  const paths = getLernaPaths();
  const locals: Dict<any> = {};

  // These two are not part of the workspaces but should be
  // considered part of the dependency graph.
  paths.push('./jupyterlab/tests/mock_packages/extension');
  paths.push('./jupyterlab/tests/mock_packages/mimeextension');

  // Gather all of our package data.
  paths.forEach(pkgPath => {
    // Read in the package.json.
    let data: any;
    try {
      data = readJSONFile(path.join(pkgPath, 'package.json'));
    } catch (e) {
      console.error(e);
      return;
    }
    locals[data.name] = data;
  });

  // Build up a dependency graph from all our local packages and
  // their first order dependencies.
  const graph = new DepGraph();
  Object.keys(locals).forEach(name => {
    const data = locals[name];
    graph.addNode(name, data);
    const deps: Dict<Array<string>> = data.dependencies || {};
    Object.keys(deps).forEach(depName => {
      if (!graph.hasNode(depName)) {
        let depData: any;
        // get data from locals if available, otherwise from
        // third party library.
        if (depName in locals) {
          depData = locals[depName];
        } else {
          depData = requirePackage(name, depName);
        }
        graph.addNode(depName, depData);
      }
      graph.addDependency(data.name, depName);
    });
  });

  return graph;
}

/**
 * Resolve a `package.json` in the `module` starting at resolution from the `parentModule`.
 *
 * We could just use "require(`${depName}/package.json`)", however this won't work for modules
 * that are not hoisted to the top level.
 */
function requirePackage(parentModule: string, module: string) {
  const packagePath = `${module}/package.json`;
  let parentModulePath: string;
  // This will fail when the parent module cannot be loaded, like `@jupyterlab/test-root`
  try {
    parentModulePath = require.resolve(parentModule);
  } catch {
    return require(packagePath);
  }
  const requirePath = require.resolve(packagePath, {
    paths: [parentModulePath]
  });
  return require(requirePath);
}
