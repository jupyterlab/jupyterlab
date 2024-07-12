/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

/* eslint-disable camelcase */
import * as fs from 'fs-extra';
import * as child_process from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as ps from 'process';
import glob from 'glob';

import { Command } from 'commander';

import * as utils from './utils';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const DEFAULT_OUT_DIR = path.join(os.tmpdir(), 'verdaccio');
const DEFAULT_PORT = 4873;

/**
 * Start a local npm registry.
 */
async function startLocalRegistry(out_dir: string, port = DEFAULT_PORT) {
  await stopLocalRegistry(out_dir);

  // make the out dir if it does not exist
  if (!fs.existsSync(out_dir)) {
    fs.mkdirSync(out_dir);
  }

  // Get current registry values
  let prev_npm = utils.run('npm config get registry', { stdio: 'pipe' }, true);
  let prev_jlpm = '';
  try {
    prev_jlpm = utils.run(
      'jlpm config get npmRegistryServer',
      { stdio: 'pipe' },
      true
    );
  } catch (e) {
    // Do nothing
  }
  if (!prev_npm || prev_npm.indexOf('0.0.0.0') !== -1) {
    prev_npm = 'https://registry.npmjs.org/';
  }
  if (prev_jlpm.indexOf('0.0.0.0') !== -1) {
    prev_jlpm = '';
  }

  // write the config file
  const config = path.join(out_dir, 'verdaccio.yml');
  const config_text = `
storage: ${out_dir}/storage
auth:
  htpasswd:
    file: ${out_dir}/htpasswd
uplinks:
    npmjs:
        url: ${prev_npm}
        timeout: 10m
packages:
  '@*/*':
    access: $all
    publish: $authenticated
    unpublish: $authenticated
    proxy: npmjs
  '**':
    access: $all
    publish: $authenticated
    unpublish: $authenticated
    proxy: npmjs`;
  fs.writeFileSync(config, config_text, { encoding: 'utf-8' });

  const log_file = path.join(out_dir, 'verdaccio.log');

  // Start local registry
  const args = `-c verdaccio.yml -l 0.0.0.0:${port}`;
  console.log(`Starting verdaccio on port ${port} in ${out_dir}`);

  // Ensure a clean log file
  if (fs.existsSync(log_file)) {
    fs.unlinkSync(log_file);
  }

  // Assign as `any`` for compatibility with spawn `OpenMode`` options
  const out: any = fs.openSync(log_file, 'a');
  const err: any = fs.openSync(log_file, 'a');

  const options = { cwd: out_dir, detached: true, stdio: ['ignore', out, err] };

  const subproc = child_process.spawn(
    'npx',
    ['verdaccio'].concat(args.split(' ')),
    options
  );
  subproc.unref();

  // Wait for Verdaccio to boot
  let content = '';
  let delays = 12000;
  while (delays > 0) {
    ps.stdout.write('.');
    if (content.indexOf('http address') !== -1) {
      break;
    }
    if (content.toLowerCase().indexOf('error') !== -1) {
      console.error(content);
      ps.exit(1);
    }
    await delay(100);
    if (fs.existsSync(log_file)) {
      content = fs.readFileSync(log_file, { encoding: 'utf-8' });
    }
    delays -= 100;
  }
  if (delays <= 0) {
    console.error('Timed out!\nLOG:');
    console.log(content);
    process.exit(1);
  }
  console.log('\nVerdaccio started');

  // Store registry values and pid in files
  const info_file = path.join(out_dir, 'info.json');
  const data = {
    prev_npm,
    prev_jlpm,
    pid: subproc.pid
  };
  utils.writeJSONFile(info_file, data);

  // Set registry to local registry
  const local_registry = `http://0.0.0.0:${port}`;
  child_process.execFileSync('npm', [
    'config',
    'set',
    'registry',
    local_registry
  ]);
  try {
    child_process.execFileSync('jlpm', [
      'config',
      'set',
      'npmRegistryServer',
      local_registry
    ]);
    child_process.execFileSync('jlpm', [
      'config',
      'set',
      'unsafeHttpWhitelist',
      '--json',
      '["0.0.0.0"]'
    ]);
  } catch (e) {
    // jlpm not available
  }

  // Log in using cli and temp credentials
  const user = 'foo';
  const pass = 'bar';
  const email = 'foo@bar.com';
  console.log('Logging in');
  const loginPs = child_process.spawn('npm', [
    'login',
    '--auth-type=legacy',
    '-r',
    local_registry
  ]);

  const loggedIn = new Promise<void>((accept, reject) => {
    loginPs.stdout.on('data', (chunk: string) => {
      const data = Buffer.from(chunk, 'utf-8').toString().trim();
      console.log('stdout:', data);
      if (!data) {
        console.log('Ignoring empty stdout.');
        return;
      }
      if (data.indexOf('Logged in ') !== -1) {
        loginPs.stdin.end();
        // do not accept here yet, the token may not have been written
      } else {
        switch (data) {
          case 'Username:':
            console.log('Passing username...');
            loginPs.stdin.write(user + '\n');
            break;
          case 'Password:':
            console.log('Passing password...');
            loginPs.stdin.write(pass + '\n');
            break;
          case 'Email: (this IS public)':
            console.log('Passing email...');
            loginPs.stdin.write(email + '\n');
            break;
          default:
            reject(`Unexpected prompt: "${data}"`);
        }
      }
      loginPs.stderr.on('data', (chunk: string) => {
        const data = Buffer.from(chunk, 'utf-8').toString().trim();
        console.log('stderr:', data);
      });
    });
    loginPs.on('error', error => reject(error));
    loginPs.on('close', () => accept());
  });

  try {
    await loggedIn;
  } finally {
    loginPs.kill();
  }

  console.log('Running in', out_dir);
  ps.exit(0);
}

/**
 * Stop the local npm registry running in the given directory
 */
async function stopLocalRegistry(out_dir: string) {
  if (!fs.existsSync(out_dir)) {
    return;
  }
  const info_file = path.join(out_dir, 'info.json');
  if (!fs.existsSync(info_file)) {
    return;
  }
  const data = utils.readJSONFile(info_file);

  // Kill the pid
  console.log(`Killing existing process ${data.pid}`);
  try {
    ps.kill(data.pid);
  } catch (e) {
    // No process running
  }

  // Restore the previous registry entries
  console.log('Restoring registry settings');
  if (data.prev_npm) {
    child_process.execSync(`npm set registry ${data.prev_npm}`);
  } else {
    child_process.execSync(`npm config rm registry`);
  }
  if (data.prev_jlpm) {
    child_process.execSync(
      `jlpm config set npmRegistryServer ${data.prev_jlpm}`
    );
    child_process.execSync(`jlpm config unset unsafeHttpWhitelist`);
  } else {
    try {
      child_process.execSync(`jlpm config unset npmRegistryServer`);
      child_process.execSync(`jlpm config unset unsafeHttpWhitelist`);
    } catch (e) {
      // jlpm not available
    }
  }
}

/**
 * Publish the npm tar files in a given directory
 */
function publishPackages(dist_dir: string) {
  const paths = glob.sync(path.join(dist_dir, '*.tgz'));
  const curr = utils.getPythonVersion();
  let tag = 'latest';
  if (!/\d+\.\d+\.\d+$/.test(curr)) {
    tag = 'next';
  }
  paths.forEach(package_path => {
    const filename = path.basename(package_path);
    utils.run(`npm publish ${filename} --tag ${tag}`, {
      cwd: dist_dir,
      stdio: 'pipe'
    });
  });
}

const program = new Command();

program
  .command('start')
  .option('--port <port>', 'Port to use for the registry')
  .option('--path <path>', 'Path to use for the registry')
  .action(async (options: any) => {
    utils.exitOnUncaughtException();
    const out_dir = options.path || DEFAULT_OUT_DIR;
    await startLocalRegistry(out_dir, options.port || DEFAULT_PORT);
  });

program
  .command('stop')
  .option('--path <path>', 'Path to use for the registry')
  .action(async (options: any) => {
    utils.exitOnUncaughtException();
    const out_dir = options.path || DEFAULT_OUT_DIR;
    await stopLocalRegistry(out_dir);
  });

program
  .command('publish-dists')
  .option('--path <path>', 'Path to the directory with npm tar balls')
  .action((options: any) => {
    utils.exitOnUncaughtException();
    publishPackages(options.path || process.cwd());
  });

if (require.main === module) {
  program.parse(process.argv);
}
