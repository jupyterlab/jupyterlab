/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as fs from 'fs-extra';
import * as lockfile from '@yarnpkg/lockfile';
import * as path from 'path';
import * as utils from './utils';
import commander from 'commander';

/**
 * Flatten a nested array one level.
 */
function flat(arr: any[]) {
  return arr.reduce((acc, val) => acc.concat(val), []);
}

/**
 * Parse the yarn file at the given path.
 */
function readYarn(basePath: string = '.') {
  const file = fs.readFileSync(path.join(basePath, 'yarn.lock'), 'utf8');
  const json = lockfile.parse(file);

  if (json.type !== 'success') {
    throw new Error('Error reading file');
  }

  return json.object;
}

/**
 * Get a node name corresponding to package@versionspec.
 *
 * The nodes names are of the form "<package>@<resolved version>".
 *
 * Returns undefined if the package is not fund
 */
function getNode(yarnData: any, pkgName: string) {
  if (!(pkgName in yarnData)) {
    console.error(
      `Could not find ${pkgName} in yarn.lock file. Ignore if this is a top-level package.`
    );
    return undefined;
  }
  const name = pkgName[0] + pkgName.slice(1).split('@')[0];
  const version = yarnData[pkgName].version;
  const pkgNode = `${name}@${version}`;
  return pkgNode;
}

/**
 * The type for graphs.
 *
 * Keys are nodes, values are the list of neighbors for the node.
 */
type Graph = { [key: string]: string[] };

/**
 * Build a dependency graph based on the yarn data.
 */
function buildYarnGraph(yarnData: any): Graph {
  // 'a': ['b', 'c'] means 'a' depends on 'b' and 'c'
  const dependsOn: Graph = Object.create(null);

  Object.keys(yarnData).forEach(pkgName => {
    const pkg = yarnData[pkgName];
    const pkgNode = getNode(yarnData, pkgName)!;

    // If multiple version specs resolve to the same actual package version, we
    // only want to record the dependency once.
    if (dependsOn[pkgNode] !== undefined) {
      return;
    }

    dependsOn[pkgNode] = [];
    const deps = pkg.dependencies;
    if (deps) {
      Object.keys(deps).forEach(depName => {
        const depNode = getNode(yarnData, `${depName}@${deps[depName]}`)!;
        dependsOn[pkgNode].push(depNode);
      });
    }
  });
  return dependsOn;
}

/**
 * Construct a subgraph of all nodes reachable from the given nodes.
 */
function subgraph(graph: Graph, nodes: string[]): Graph {
  const sub = Object.create(null);
  // Seed the graph
  let newNodes = nodes;
  while (newNodes.length > 0) {
    const old = newNodes;
    newNodes = [];
    old.forEach(i => {
      if (!(i in sub)) {
        sub[i] = graph[i];
        newNodes.push(...sub[i]);
      }
    });
  }
  return sub;
}

/**
 * Return the package.json data at the given path
 */
function pkgData(packagePath: string) {
  packagePath = path.join(packagePath, 'package.json');
  let data: any;
  try {
    data = utils.readJSONFile(packagePath);
  } catch (e) {
    console.error('Skipping package ' + packagePath);
    return {};
  }
  return data;
}

function convertDot(
  g: { [key: string]: string[] },
  graphOptions: string,
  distinguishRoots = false,
  distinguishLeaves = false
) {
  const edges: string[][] = flat(
    Object.keys(g).map(a => g[a].map(b => [a, b]))
  ).sort();
  const nodes = Object.keys(g).sort();
  // let leaves = Object.keys(g).filter(i => g[i].length === 0);
  // let roots = Object.keys(g).filter(i => g[i].length === 0);
  const dot = `
digraph DEPS {
  ${graphOptions || ''}
  ${nodes.map(node => `"${node}";`).join(' ')}
  ${edges.map(([a, b]) => `"${a}" -> "${b}"`).join('\n  ')}
}
`;
  return dot;
}

interface IMainOptions {
  dependencies: boolean;
  devDependencies: boolean;
  jupyterlab: boolean;
  lerna: boolean;
  lernaExclude: string;
  lernaInclude: string;
  path: string;
  lumino: boolean;
  topLevel: boolean;
}

function main({
  dependencies,
  devDependencies,
  jupyterlab,
  lerna,
  lernaExclude,
  lernaInclude,
  path,
  lumino,
  topLevel
}: IMainOptions) {
  const yarnData = readYarn(path);
  const graph = buildYarnGraph(yarnData);

  const paths: string[] = [path];
  if (lerna !== false) {
    paths.push(...utils.getLernaPaths(path).sort());
  }

  // Get all package data
  let data: any[] = paths.map(p => pkgData(p));

  // Get top-level package names (these won't be listed in yarn)
  const topLevelNames: Set<string> = new Set(data.map(d => d.name));

  // Filter lerna packages if a regex was supplied
  if (lernaInclude) {
    const re = new RegExp(lernaInclude);
    data = data.filter(d => d.name && d.name.match(re));
  }
  if (lernaExclude) {
    const re = new RegExp(lernaExclude);
    data = data.filter(d => d.name && !d.name.match(re));
  }

  const depKinds: string[] = [];
  if (devDependencies) {
    depKinds.push('devDependencies');
  }
  if (dependencies) {
    depKinds.push('dependencies');
  }
  /**
   * All dependency roots *except* other packages in this repo.
   */
  const dependencyRoots: string[][] = data.map(d => {
    const roots: string[] = [];
    for (const depKind of depKinds) {
      const deps = d[depKind];
      if (deps === undefined) {
        continue;
      }
      const nodes = Object.keys(deps)
        .map(i => {
          // Do not get a package if it is a top-level package (and this is
          // not in yarn).
          if (!topLevelNames.has(i)) {
            return getNode(yarnData, `${i}@${deps[i]}`);
          }
        })
        .filter(i => i !== undefined) as string[];
      roots.push(...nodes);
    }
    return roots;
  });

  // Find the subgraph
  const sub = subgraph(graph, flat(dependencyRoots));

  // Add in top-level lerna packages if desired
  if (topLevel) {
    data.forEach((d, i) => {
      sub[`${d.name}@${d.version}`] = dependencyRoots[i];
    });
  }

  // Filter out *all* lumino nodes
  if (!lumino) {
    Object.keys(sub).forEach(v => {
      sub[v] = sub[v].filter(w => !w.startsWith('@lumino/'));
    });
    Object.keys(sub).forEach(v => {
      if (v.startsWith('@lumino/')) {
        delete sub[v];
      }
    });
  }

  // Filter for any edges going into a jlab package, and then for any
  // disconnected jlab packages. This preserves jlab packages in the graph that
  // point to other packages, so we can see where third-party packages come
  // from.
  if (!jupyterlab) {
    Object.keys(sub).forEach(v => {
      sub[v] = sub[v].filter(w => !w.startsWith('@jupyterlab/'));
    });
    Object.keys(sub).forEach(v => {
      if (v.startsWith('@jupyterlab/') && sub[v].length === 0) {
        delete sub[v];
      }
    });
  }

  return sub;
}

commander
  .description(`Print out the dependency graph in dot graph format.`)
  .option('--lerna', 'Include dependencies in all lerna packages')
  .option(
    '--lerna-include <regex>',
    'A regex for package names to include in dependency roots'
  )
  .option(
    '--lerna-exclude <regex>',
    'A regex for lerna package names to exclude from dependency roots (can override the include regex)'
  )
  .option('--path [path]', 'Path to package or monorepo to investigate', '.')
  .option(
    '--no-jupyterlab',
    'Do not include dependency connections TO @jupyterlab org packages nor isolated @jupyterlab org packages'
  )
  .option('--no-lumino', 'Do not include @lumino org packages')
  .option('--no-devDependencies', 'Do not include dev dependencies')
  .option('--no-dependencies', 'Do not include normal dependencies')
  .option('--no-top-level', 'Do not include the top-level packages')
  .option(
    '--graph-options <options>',
    'dot graph options (such as "ratio=0.25; concentrate=true;")'
  )
  .action(args => {
    const graph = main(args);
    console.debug(convertDot(graph, args.graphOptions));
    console.error(`Nodes: ${Object.keys(graph).length}`);
  });

commander.parse(process.argv);
