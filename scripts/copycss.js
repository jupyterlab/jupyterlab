var fs = require('fs-extra');
fs.copySync('src/', 'lib/', { filter: /\.css$/ });
