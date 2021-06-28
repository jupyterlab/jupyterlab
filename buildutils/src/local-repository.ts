import * as fs from 'fs-extra';
import * as child_process from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as ps from 'process';

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
  const prev_npm =
    utils.run('npm config get registry', { stdio: 'pipe' }, true) ||
    'https://registry.npmjs.org/';
  let prev_yarn = '';
  try {
    prev_yarn = utils.run('yarn config get registry', { stdio: 'pipe' }, true);
  } catch (e) {
    // Do nothing
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
  const args = `-c verdaccio.yml -l localhost:${port}`;
  console.log(`Starting verdaccio on port ${port} in ${out_dir}`);

  // Ensure a clean log file
  if (fs.existsSync(log_file)) {
    fs.unlinkSync(log_file);
  }

  // Assign as `any`` for compatibility with spawn `OpenMode`` options
  const out: any = fs.openSync(log_file, 'a');
  const err: any = fs.openSync(log_file, 'a');

  const options = { cwd: out_dir, detached: true, stdio: ['ignore', out, err] };

  const bin_dir = utils.run('npm bin', { stdio: 'pipe' }, true);
  const verdaccio_bin = path.join(bin_dir, 'verdaccio');
  const subproc = child_process.spawn(verdaccio_bin, args.split(' '), options);
  subproc.unref();

  // Wait for Verdaccio to boot
  let content = '';
  let delays = 0;
  while (delays < 100) {
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
    delays += 1;
  }
  if (delays === 100) {
    console.error('Timed out!');
    process.exit(1);
  }
  console.log('\nVerdaccio started');

  // Store registry values and pid in files
  const info_file = path.join(out_dir, 'info.json');
  const data = {
    prev_npm,
    prev_yarn,
    pid: subproc.pid
  };
  utils.writeJSONFile(info_file, data);

  // Set registry to local registry
  const local_registry = `http://localhost:${port}`;
  child_process.execSync(`npm config set registry "${local_registry}"`);
  try {
    child_process.execSync(`yarn config set registry "${local_registry}"`);
  } catch (e) {
    // yarn not available
  }

  // Log in using cli and temp credentials
  const env = {
    ...process.env,
    NPM_USER: 'foo',
    NPM_PASS: 'bar',
    NPM_EMAIL: 'foo@bar.com',
    NPM_REGISTRY: local_registry
  };
  const npm_cli_login_bin = path.join(bin_dir, 'npm-cli-login');
  console.log('Logging in');
  child_process.execSync(npm_cli_login_bin, { env, stdio: 'pipe' });

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
  if (data.prev_yarn) {
    child_process.execSync(`yarn config set registry ${data.prev_yarn}`);
  } else {
    try {
      child_process.execSync(`yarn config delete registry`);
    } catch (e) {
      // yarn not available
    }
  }
}

const program = new Command();

program
  .command('start')
  .option('--port', 'Port to use for the registry')
  .option('--path', 'Path to use for the registry')
  .action(async (options: any) => {
    const out_dir = options.path || DEFAULT_OUT_DIR;
    await startLocalRegistry(out_dir, options.port || DEFAULT_PORT);
  });

program
  .command('stop')
  .option('--path', 'Path to use for the registry')
  .action(async (options: any) => {
    const out_dir = options.path || DEFAULT_OUT_DIR;
    await stopLocalRegistry(out_dir);
  });

if (require.main === module) {
  program.parse(process.argv);
}
