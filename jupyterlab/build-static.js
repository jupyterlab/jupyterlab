var fs = require('fs');

if (!fs.existsSync('./static')){
    fs.mkdirSync('./static');
}

// Copy the templates.
fs.createReadStream('./package.template.json')
    .pipe(fs.createWriteStream('./static/package.json'));

fs.createReadStream('./webpack.config.js')
    .pipe(fs.createWriteStream('./static/webpack.config.js'));

fs.createReadStream('./index.template.js')
    .pipe(fs.createWriteStream('./static/index.template.js'));
