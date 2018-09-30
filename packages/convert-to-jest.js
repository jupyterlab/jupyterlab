const path = require('path');
const glob = require('glob');
const fs = require('fs-extra');
const utils = require('@jupyterlab/buildutils');

const target = process.argv[2];
if (!target) {
  console.error('Specify a target dir');
  process.exit(1);
}

// Make sure tests folder exists
let testSrc = path.join(__dirname, '..', 'tests', 'test-' + target);
console.log(testSrc); // eslint-disable-line
if (!fs.existsSync(testSrc)) {
  console.log('bailing'); // eslint-disable-line
  process.exit(1);
}

// Update the test files
glob.sync(path.join(testSrc, 'src', '**', '*.ts*')).forEach(function(filePath) {
  console.log(filePath); // eslint-disable-line
  // Convert test files to use jest
  let src = fs.readFileSync(filePath, 'utf8');
  src = src.split('before(').join('beforeAll(');
  src = src.split('context(').join('describe(');
  src = src.split('after(').join('afterAll(');

  // Use imports from /src
  src = src
    .split(`'@jupyterlab/${target}';`)
    .join(`'@jupyterlab/${target}/src';`);

  fs.writeFileSync(filePath, src, 'utf8');
});

// Create jest.config.js.
const jestConfig = `
const func = require('@jupyterlab/testutils/lib/jest-config');
module.exports = func(${target}, __dirname);
```;
fs.writeFileSync(path.join(testSrc, 'jest.config.js'), jestConfig, 'utf8');

// Open coreutils package.json
const coreUtils = path.resolve(__dirname, '..', 'tests', 'test-coreutils');
const coreUtilsData = require('../tests/test-coreutils/package.json');

// Open target package.json
const targetData = require(`../tests/test-${target}/package.json`);

// Assign scripts from coreutils
targetData.scripts = coreUtilsData.scripts;

// Assign dependencies from coreutils
['jest', 'ts-jest', '@jupyterlab/testutils'].forEach(name => {
  targetData.dependencies[name] = coreUtilsData.dependencies[name];
});

// Assign devDependencies from coreutils
targetData.devDependencies = coreUtilsData.devDependencies;

// Write out the package.json file.
utils.writeJSONFile(path.join(testSrc, 'package.json'), targetData);

// Git remove old tests infra
['karma-cov.conf.js', 'karma.conf.js', 'run-test.py'].forEach(name => {
  utils.run(`git rm -f ../tests/test-${target}/${name}`);
});

// Copy run.py from coreutils
fs.copySync(path.join(coreUtils, 'run.py'), path.join(testSrc, 'run.py'));

// Update deps and build all
utils.run('jlpm && jlpm build:packages', {
  cwd: path.resolve(__dirname, '..')
});

// Test
utils.run('jlpm test', { cwd: testSrc });
