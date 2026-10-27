/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import path from 'path';
import semver from 'semver';
import { getYarnPaths, readJSONFile, writePackageData } from './utils';

/**
 * The options for bumping the versions of workspace packages.
 */
export interface IBumpWorkspaceOptions {
  /**
   * The prerelease identifier, by default the current one or `alpha`.
   */
  preid?: string;

  /**
   * The names of the packages to bump, by default all of them.
   */
  packages?: ReadonlySet<string>;

  /**
   * The root of the workspaces.
   */
  basePath?: string;
}

/**
 * Bump the versions of workspace packages, and the dependency ranges that
 * refer to them while keeping the `^` or `~` prefix.
 *
 * @returns The new versions, by package name.
 */
export function bumpWorkspaceVersions(
  release: semver.ReleaseType,
  options: IBumpWorkspaceOptions = {}
): Map<string, string> {
  const pkgs = getYarnPaths(options.basePath).map(pkgPath => {
    const pkgJsonPath = path.join(pkgPath, 'package.json');
    return { pkgJsonPath, data: readJSONFile(pkgJsonPath) };
  });
  const oldVersions = new Map<string, string>(
    pkgs.map(({ data }) => [data.name, data.version])
  );

  const newVersions = new Map<string, string>();
  oldVersions.forEach((version, name) => {
    if (options.packages && !options.packages.has(name)) {
      return;
    }
    const preid =
      options.preid ?? String(semver.prerelease(version)?.[0] ?? 'alpha');
    const newVersion = semver.inc(version, release, preid);
    if (!newVersion) {
      throw new Error(`Cannot apply ${release} to ${name}@${version}`);
    }
    console.debug(`${name}: ${version} => ${newVersion}`);
    newVersions.set(name, newVersion);
  });

  pkgs.forEach(({ pkgJsonPath, data }) => {
    data.version = newVersions.get(data.name) ?? data.version;
    for (const field of [
      'dependencies',
      'devDependencies',
      'optionalDependencies'
    ]) {
      const deps: Record<string, string> = data[field] ?? {};
      Object.entries(deps).forEach(([name, range]) => {
        const newVersion = newVersions.get(name);
        // A range that the local version does not satisfy refers to a
        // published version.
        if (!newVersion || !semver.satisfies(oldVersions.get(name)!, range)) {
          return;
        }
        deps[name] = `${/^[~^]?/.exec(range)![0]}${newVersion}`;
      });
    }
    writePackageData(pkgJsonPath, data);
  });

  return newVersions;
}
