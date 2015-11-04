var cp = require('glob-copy');
cp.sync('src/*.css', 'lib');
cp.sync('test/src/*.css', 'test/build');
