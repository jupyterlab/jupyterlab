const path = require('path');
const glob = require('glob');
const fs = require('fs-extra');
const utils = require('@jupyterlab/buildutils');

let target = process.argv[2];
if (!target) {
  console.error('Specify a target dir');
  process.exit(1);
}
if (target.indexOf('test-') !== 0) {
  target = 'test-' + target;
}

// Make sure folder exists
let testSrc = path.join(__dirname, target);

console.log(testSrc); // eslint-disable-line
if (!fs.existsSync(testSrc)) {
  console.log('bailing'); // eslint-disable-line
  process.exit(1);
}

const name = target.replace('test-', '');

// Update the test files
glob.sync(path.join(testSrc, 'src', '**', '*.ts*')).forEach(function(filePath) {
  console.log(filePath); // eslint-disable-line
  // Convert test files to use jest
  let src = fs.readFileSync(filePath, 'utf8');
  src = src.split('before(').join('beforeAll(');
  src = src.split('context(').join('describe(');
  src = src.split('after(').join('afterAll(');

  // Use imports from /src
  src = src.split(`'@jupyterlab/${name}';`).join(`'@jupyterlab/${name}/src';`);

  fs.writeFileSync(filePath, src, 'utf8');
});

// Create jest.config.js.
const jestConfig = `
const func = require('@jupyterlab/testutils/lib/jest-config');
module.exports = func('${name}', __dirname);
`;
fs.writeFileSync(path.join(testSrc, 'jest.config.js'), jestConfig, 'utf8');

// Open coreutils package.json
const coreUtils = path.resolve(__dirname, 'test-coreutils');
const coreUtilsData = require('./test-coreutils/package.json');

// Open target package.json
const targetData = utils.readJSONFile(path.join(testSrc, 'package.json'));

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

// Update tsconfig to use jest types.
const tsData = utils.readJSONFile(path.join(testSrc, 'tsconfig.json'));
const index = tsData.compilerOptions.types.indexOf('mocha');
tsData.compilerOptions.types[index] = 'jest';
utils.writeJSONFile(path.join(testSrc, 'tsconfig.json'), tsData);

// Git remove old tests infra
['karma-cov.conf.js', 'karma.conf.js', 'run-test.py'].forEach(fname => {
  utils.run(`git rm -f ./test-${name}/${fname} || true`);
});

// Copy common files from coreutils
['run.py', 'babel.config.js'].forEach(fname => {
  fs.copySync(path.join(coreUtils, fname), path.join(testSrc, fname));
});

// Add new files to git
utils.run(`git add ./test-${name}/run.py ./test-${name}/jest.config.js`);

// Update deps and build test
utils.run('jlpm && jlpm build', { cwd: testSrc });

// Test
utils.run('jlpm test', { cwd: testSrc });
