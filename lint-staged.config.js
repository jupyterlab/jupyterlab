const escape = require('shell-quote').quote;
const fs = require('fs');
const isWin = process.platform === 'win32';

const escapeFileNames = filenames =>
  filenames
    .filter(filename => fs.existsSync(filename))
    .map(filename => `"${isWin ? filename : escape([filename])}"`)
    .join(' ');

module.exports = {
  '**/*{.css,.json,.md}': filenames => {
    const escapedFileNames = escapeFileNames(filenames);
    return [
      `prettier --write ${escapedFileNames}`,
      `git add -f ${escapedFileNames}`
    ];
  },
  '**/*{.ts,.tsx,.js,.jsx}': filenames => {
    const escapedFileNames = escapeFileNames(filenames);
    return [
      `prettier --write ${escapedFileNames}`,
      `eslint --fix ${escapedFileNames}`,
      `git add -f ${escapedFileNames}`
    ];
  }
};
