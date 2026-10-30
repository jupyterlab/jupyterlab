/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import { program as commander } from 'commander';
import * as path from 'path';
import * as os from 'os';
import packageJson from 'package-json';
import { handlePackage } from './update-dist-tag';
import * as utils from './utils';

interface IPublishOptions {
  skipBuild?: boolean;
  skipPublish?: boolean;
  skipTags?: boolean;
  dryRun?: boolean;
}

/**
 * Sleep for a specified period.
 *
 * @param wait The time in milliseconds to wait.
 */
async function sleep(wait: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, wait));
}

/**
 * Whether a package version is on the registry.
 *
 * @param spec - The package name and version, as `name@version`.
 */
function isPublished(spec: string): boolean {
  try {
    return (
      utils.run(`npm view ${spec} version`, { stdio: 'pipe' }, true) !== ''
    );
  } catch (e) {
    // E404 means that the package or the version is not on the registry.
    if (!String(e).includes('E404')) {
      console.warn(`Assuming that ${spec} is not published: ${String(e)}`);
    }
    return false;
  }
}

/**
 * Wait until the registry lists the local version of a public package.
 *
 * The registry lists a new version a minute or more after `npm publish`
 * returns, and the dist-tags must be computed from data that includes it.
 */
async function waitForRegistry(pkgPath: string): Promise<void> {
  const data = utils.readJSONFile(path.join(pkgPath, 'package.json'));
  if (data.private) {
    return;
  }
  for (let attempt = 0; attempt < 20; attempt++) {
    const npmData = await packageJson(data.name, { allVersions: true });
    if (data.version in npmData.versions) {
      return;
    }
    console.log(
      `Waiting for the registry to list ${data.name}@${data.version}`
    );
    await sleep(30 * 1000);
  }
  throw new Error(`The registry does not list ${data.name}@${data.version}`);
}

// Specify the program signature.
commander
  .description('Publish the JS packages')
  .option(
    '--skip-build',
    'Skip the build step (if there was a network error during a JS publish'
  )
  .option('--skip-publish', 'Skip publish and only handle tags')
  .option('--skip-tags', 'publish assets but do not handle tags')
  .option('--dry-run', 'Do not actually push any assets')
  .action(async (options: IPublishOptions) => {
    utils.exitOnUncaughtException();

    // No-op if we're in release helper dry run
    if (process.env.RH_DRY_RUN === 'true') {
      return;
    }

    if (!options.skipPublish) {
      if (!options.skipBuild) {
        utils.run('jlpm build:all');
      }

      if (!options.dryRun) {
        // Make sure we are logged in.
        if (utils.checkStatus('npm whoami') !== 0) {
          console.error('Please run `npm login`');
          process.exit(1);
        }
      }

      // Ensure a clean git environment
      if (!options.dryRun && utils.checkStatus('git diff --quiet HEAD') !== 0) {
        utils.run('git commit -am "[ci skip] bump version"');
      }

      // Publish JS to the appropriate tag.
      const curr = utils.getPythonVersion();
      let cmd = 'npm publish';
      if (options.dryRun) {
        cmd += ' --dry-run';
      }

      let tag = 'latest';
      if (!/\d+\.\d+\.\d+$/.test(curr)) {
        tag = 'next';
      }
      for (const pkgPath of utils.getYarnPaths().sort()) {
        const data = utils.readJSONFile(path.join(pkgPath, 'package.json'));
        if (data.private === true) {
          continue;
        }
        const spec = `${data.name}@${data.version}`;
        if (isPublished(spec)) {
          console.log(`${spec} is already published`);
          continue;
        }
        utils.run(`${cmd} --tag=${tag}`, { cwd: pkgPath });
      }
    }

    // Fix up any tagging issues.
    if (!options.skipTags) {
      const basePath = path.resolve('.');
      const paths = utils.getYarnPaths(basePath).sort();
      // A dry run published nothing, so there is nothing to wait for.
      if (!options.dryRun) {
        await Promise.all(paths.map(waitForRegistry));
      }
      const cmds = await Promise.all(paths.map(handlePackage));
      cmds.forEach(cmdList => {
        cmdList.forEach(cmd => {
          if (!options.dryRun) {
            utils.run(cmd);
          } else {
            console.log(`Would run: ${cmd}`);
          }
        });
      });
    }

    // A dry run published nothing, so there is nothing to install.
    if (options.dryRun) {
      return;
    }

    // Make sure all current JS packages are published.
    // Try and install them into a temporary local npm package.
    console.log('Checking for published packages...');
    const installDir = os.tmpdir();
    utils.run('npm init -y', { cwd: installDir, stdio: 'pipe' }, true);
    const specifiers: string[] = [];
    utils.getCorePaths().forEach(async pkgPath => {
      const pkgJson = path.join(pkgPath, 'package.json');
      const pkgData = utils.readJSONFile(pkgJson);
      specifiers.push(`${pkgData.name}@${pkgData.version}`);
    });

    let attempt = 0;
    while (attempt < 10) {
      try {
        utils.run(`npm install ${specifiers.join(' ')}`, { cwd: installDir });
        break;
      } catch (e) {
        console.error(e);
        console.log('Sleeping for one minute...');
        await sleep(1 * 60 * 1000);
        attempt += 1;
      }
    }
    if (attempt == 10) {
      console.error('Could not install packages');
      process.exit(1);
    }

    // Emit a system beep.
    process.stdout.write('\x07');
  });

commander.parse(process.argv);
