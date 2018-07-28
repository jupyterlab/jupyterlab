const path = require('path');
const glob = require('glob');
const fs = require('fs-extra');
const utils = require('@jupyterlab/buildutils/lib/utils');

// yarn add chai && yarn add --dev @types/chai
// Remove expect.js from package.json
const source = path.resolve('./test-apputils');
const pkgSrc = utils.readJSONFile(path.join(source, 'package.json'));
const chaiVer = pkgSrc.dependencies['chai'];
const chaiTypeVer = pkgSrc.devDependencies['@types/chai'];

const target = path.resolve(process.argv[2]);
if (!target) {
  console.error('Specify a target dir');
  process.exit(1);
}

const targetPkg = utils.readJSONFile(path.join(target, 'package.json'));
delete targetPkg.dependencies['expect.js'];
targetPkg.dependencies['chai'] = chaiVer;
targetPkg.devDependencies['@types/chai'] = chaiTypeVer;

utils.writePackageData(path.join(target, 'package.json'), targetPkg);

glob.sync(path.join(target, 'src', '*.ts*')).forEach(function(filePath) {
  let src = fs.readFileSync(filePath, 'utf8');
  src = src
    .split("import expect = require('expect.js')")
    .join("import { expect } from 'chai'");
  src = src.split('to.be(').join('to.equal(');
  src = src.split('to.eql(').join('to.deep.equal(');
  src = src.split('to.be.a(').join('to.be.an.instanceof(');
  src = src.split('to.be.an(').join('to.be.an.instanceof(');
  src = src.split(').to.be.empty()').join('.length).to.equal(0)');
  fs.writeFileSync(filePath, src, 'utf8');
});
