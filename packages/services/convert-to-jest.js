const path = require('path');
const glob = require('glob');
const fs = require('fs-extra');

const target = path.resolve(process.argv[2]);
if (!target) {
  console.error('Specify a target dir');
  process.exit(1);
}

glob.sync(path.join(target, 'src', '**', '*.ts*')).forEach(function(filePath) {
  let src = fs.readFileSync(filePath, 'utf8');
  src = src.split('before(').join('beforeAll(');
  src = src.split('context(').join('describe(');
  src = src.split('after(').join('afterAll(');
  fs.writeFileSync(filePath, src, 'utf8');
});
