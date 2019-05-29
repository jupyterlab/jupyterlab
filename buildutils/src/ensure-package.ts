/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as fs from 'fs-extra';
import * as glob from 'glob';
import * as path from 'path';
import * as ts from 'typescript';
import { getDependency } from './get-dependency';
import * as utils from './utils';

/**
 * Ensure the integrity of a package.
 *
 * @param options - The options used to ensure the package.
 *
 * @returns A list of changes that were made to ensure the package.
 */
export async function ensurePackage(
  options: IEnsurePackageOptions
): Promise<string[]> {
  let { data, pkgPath } = options;
  let deps: { [key: string]: string } = data.dependencies || {};
  let devDeps: { [key: string]: string } = data.devDependencies || {};
  let seenDeps = options.depCache || {};
  let missing = options.missing || [];
  let unused = options.unused || [];
  let messages: string[] = [];
  let locals = options.locals || {};

  // Verify dependencies are consistent.
  let promises = Object.keys(deps).map(async name => {
    if (!(name in seenDeps)) {
      seenDeps[name] = await getDependency(name);
    }
    if (deps[name] !== seenDeps[name]) {
      messages.push(`Updated dependency: ${name}@${seenDeps[name]}`);
    }
    deps[name] = seenDeps[name];
  });

  await Promise.all(promises);

  // Verify devDependencies are consistent.
  promises = Object.keys(devDeps).map(async name => {
    if (!(name in seenDeps)) {
      seenDeps[name] = await getDependency(name);
    }
    if (devDeps[name] !== seenDeps[name]) {
      messages.push(`Updated devDependency: ${name}@${seenDeps[name]}`);
    }
    devDeps[name] = seenDeps[name];
  });

  await Promise.all(promises);

  // For TypeScript files, verify imports match dependencies.
  let filenames: string[] = [];
  filenames = glob.sync(path.join(pkgPath, 'src/*.ts*'));
  filenames = filenames.concat(glob.sync(path.join(pkgPath, 'src/**/*.ts*')));

  if (!fs.existsSync(path.join(pkgPath, 'tsconfig.json'))) {
    if (utils.writePackageData(path.join(pkgPath, 'package.json'), data)) {
      messages.push('Updated package.json');
    }
    return messages;
  }

  let imports: string[] = [];

  // Extract all of the imports from the TypeScript files.
  filenames.forEach(fileName => {
    let sourceFile = ts.createSourceFile(
      fileName,
      fs.readFileSync(fileName).toString(),
      (ts.ScriptTarget as any).ES6,
      /*setParentNodes */ true
    );
    imports = imports.concat(getImports(sourceFile));
  });
  let names: string[] = Array.from(new Set(imports)).sort();
  names = names.map(function(name) {
    let parts = name.split('/');
    if (name.indexOf('@') === 0) {
      return parts[0] + '/' + parts[1];
    }
    return parts[0];
  });

  // Look for imports with no dependencies.
  promises = names.map(async name => {
    if (missing.indexOf(name) !== -1) {
      return;
    }
    if (name === '.' || name === '..') {
      return;
    }
    if (!deps[name]) {
      if (!(name in seenDeps)) {
        seenDeps[name] = await getDependency(name);
      }
      deps[name] = seenDeps[name];
      messages.push(`Added dependency: ${name}@${seenDeps[name]}`);
    }
  });

  await Promise.all(promises);

  // Look for unused packages
  Object.keys(deps).forEach(name => {
    if (options.noUnused === false) {
      return;
    }
    if (unused.indexOf(name) !== -1) {
      return;
    }
    const isTest = data.name.indexOf('test') !== -1;
    if (isTest) {
      const testLibs = ['jest', 'ts-jest', '@jupyterlab/testutils'];
      if (testLibs.indexOf(name) !== -1) {
        return;
      }
    }
    if (names.indexOf(name) === -1) {
      let version = data.dependencies[name];
      messages.push(
        `Unused dependency: ${name}@${version}: remove or add to list of known unused dependencies for this package`
      );
    }
  });

  // Handle typedoc config output.
  const tdOptionsPath = path.join(pkgPath, 'tdoptions.json');
  if (fs.existsSync(tdOptionsPath)) {
    const tdConfigData = utils.readJSONFile(tdOptionsPath);
    const pkgDirName = pkgPath.split('/').pop();
    tdConfigData['out'] = `../../docs/api/${pkgDirName}`;
    utils.writeJSONFile(tdOptionsPath, tdConfigData);
  }

  // Handle references.
  let references: { [key: string]: string } = Object.create(null);
  Object.keys(deps).forEach(name => {
    if (!(name in locals)) {
      return;
    }
    const target = locals[name];
    if (!fs.existsSync(path.join(target, 'tsconfig.json'))) {
      return;
    }
    let ref = path.relative(pkgPath, locals[name]);
    references[name] = ref.split(path.sep).join('/');
  });
  if (
    data.name.indexOf('example-') === -1 &&
    Object.keys(references).length > 0
  ) {
    const tsConfigPath = path.join(pkgPath, 'tsconfig.json');
    const tsConfigData = utils.readJSONFile(tsConfigPath);
    tsConfigData.references = [];
    Object.keys(references).forEach(name => {
      tsConfigData.references.push({ path: references[name] });
    });
    utils.writeJSONFile(tsConfigPath, tsConfigData);
  }

  // Get a list of all the published files.
  // This will not catch .js or .d.ts files if they have not been built,
  // but we primarily use this to check for files that are published as-is,
  // like styles, assets, and schemas.
  const published = new Set<string>(
    data.files
      ? data.files.reduce((acc: string[], curr: string) => {
          return acc.concat(glob.sync(path.join(pkgPath, curr)));
        }, [])
      : []
  );

  // Ensure that the `schema` directories match what is in the `package.json`
  const schemaDir = data.jupyterlab && data.jupyterlab.schemaDir;
  const schemas = glob.sync(
    path.join(pkgPath, schemaDir || 'schema', '*.json')
  );
  if (schemaDir && !schemas.length) {
    messages.push(`No schemas found in ${path.join(pkgPath, schemaDir)}.`);
  } else if (!schemaDir && schemas.length) {
    messages.push(`Schemas found, but no schema indicated in ${pkgPath}`);
  }
  for (let schema of schemas) {
    if (!published.has(schema)) {
      messages.push(`Schema ${schema} not published in ${pkgPath}`);
    }
  }

  // Ensure that the `style` directories match what is in the `package.json`
  const styles = glob.sync(path.join(pkgPath, 'style', '**/*.*'));
  for (let style of styles) {
    if (!published.has(style)) {
      messages.push(`Style file ${style} not published in ${pkgPath}`);
    }
  }

  // Ensure dependencies and dev dependencies.
  data.dependencies = deps;
  data.devDependencies = devDeps;

  if (Object.keys(data.dependencies).length === 0) {
    delete data.dependencies;
  }
  if (Object.keys(data.devDependencies).length === 0) {
    delete data.devDependencies;
  }

  // Make sure there are no gitHead keys, which are only temporary keys used
  // when a package is actually being published.
  delete data.gitHead;

  // Ensure there is a minimal prepublishOnly script
  if (!data.private && !data.scripts.prepublishOnly) {
    messages.push(`prepublishOnly script missing in ${pkgPath}`);
    data.scripts.prepublishOnly = 'npm run build';
  }

  if (utils.writePackageData(path.join(pkgPath, 'package.json'), data)) {
    messages.push('Updated package.json');
  }
  return messages;
}

/**
 * The options used to ensure a package.
 */
export interface IEnsurePackageOptions {
  /**
   * The path to the package.
   */
  pkgPath: string;

  /**
   * The package data.
   */
  data: any;

  /**
   * The cache of dependency versions by package.
   */
  depCache?: { [key: string]: string };

  /**
   * A list of dependencies that can be unused.
   */
  unused?: string[];

  /**
   * A list of dependencies that can be missing.
   */
  missing?: string[];

  /**
   * A map of local package names and their relative path.
   */
  locals?: { [key: string]: string };

  /**
   * Whether to enforce that dependencies get used.  Default is true.
   */
  noUnused?: boolean;
}

/**
 * Extract the module imports from a TypeScript source file.
 *
 * @param sourceFile - The path to the source file.
 *
 * @returns An array of package names.
 */
function getImports(sourceFile: ts.SourceFile): string[] {
  let imports: string[] = [];
  handleNode(sourceFile);

  function handleNode(node: any): void {
    switch (node.kind) {
      case ts.SyntaxKind.ImportDeclaration:
        imports.push(node.moduleSpecifier.text);
        break;
      case ts.SyntaxKind.ImportEqualsDeclaration:
        imports.push(node.moduleReference.expression.text);
        break;
      default:
      // no-op
    }
    ts.forEachChild(node, handleNode);
  }
  return imports;
}
