var fs = require('fs-extra');
var filter = { filter: /\.css$/ };
fs.copySync('src/theme/index.css', 'example/build/theme.css', filter);
