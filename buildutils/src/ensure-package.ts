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
export function ensurePackage(options: IEnsurePackageOptions): string[] {
  let { data, pkgPath } = options;
  let deps: { [key: string]: string } = data.dependencies || {};
  let devDeps: { [key: string]: string } = data.devDependencies || {};
  let seenDeps = options.depCache || {};
  let missing = options.missing || [];
  let unused = options.unused || [];
  let messages: string[] = [];

  // Verify dependencies are consistent.
  Object.keys(deps).forEach(name => {
    if (!(name in seenDeps)) {
      seenDeps[name] = getDependency(name);
    }
    if (deps[name] !== seenDeps[name]) {
      messages.push(`Updated dependency: ${name}@${seenDeps[name]}`);
    }
    deps[name] = seenDeps[name];
  });

  // Verify devDependencies are consistent.
  Object.keys(devDeps).forEach(name => {
    if (!(name in seenDeps)) {
      seenDeps[name] = getDependency(name);
    }
    if (devDeps[name] !== seenDeps[name]) {
      messages.push(`Updated devDependency: ${name}@${seenDeps[name]}`);
    }
    devDeps[name] = seenDeps[name];
  });

  // For TypeScript files, verify imports match dependencies.
  let filenames: string[] = [];
  filenames = glob.sync(path.join(pkgPath, 'src/*.ts*'));
  filenames = filenames.concat(glob.sync(path.join(pkgPath, 'src/**/*.ts*')));

  if (filenames.length === 0) {
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
  names.forEach(name => {
    if (missing.indexOf(name) !== -1) {
      return;
    }
    if (name === '.' || name === '..') {
      return;
    }
    if (!deps[name]) {
      if (!(name in seenDeps)) {
        seenDeps[name] = getDependency(name);
      }
      deps[name] = seenDeps[name];
      messages.push(`Added dependency: ${name}@${seenDeps[name]}`);
    }
  });

  // Look for unused packages
  Object.keys(deps).forEach(name => {
    if (unused.indexOf(name) !== -1) {
      return;
    }
    if (names.indexOf(name) === -1) {
      let version = data.dependencies[name];
      messages.push(
        `Unused dependency: ${name}@${version}: remove or add to list of known unused dependencies for this package`
      );
    }
  });

  // Ensure dependencies and dev dependencies.
  data.dependencies = deps;
  data.devDependencies = devDeps;

  if (Object.keys(data.dependencies).length === 0) {
    delete data.dependencies;
  }
  if (Object.keys(data.devDependencies).length === 0) {
    delete data.devDependencies;
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
