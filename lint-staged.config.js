const escape = require('shell-quote').quote;
const fs = require('fs');
const isWin = process.platform === 'win32';

module.exports = {
  '**/*{.css,.json,.md}': filenames => {
    const escapedFileNames = filenames
      .filter(filename => fs.existsSync(filename))
      .map(filename => `"${isWin ? filename : escape([filename])}"`)
      .join(' ');
    return [
      `prettier --write ${escapedFileNames}`,
      `git add ${escapedFileNames}`
    ];
  },
  '**/*{.ts,.tsx}': filenames => {
    const escapedFileNames = filenames
      .filter(filename => fs.existsSync(filename))
      .map(filename => `"${isWin ? filename : escape([filename])}"`)
      .join(' ');
    return [`tslint --fix ${escapedFileNames}`, `git add ${escapedFileNames}`];
  },
  '**/*{.ts,.tsx,.js,.jsx}': filenames => {
    const escapedFileNames = filenames
      .filter(filename => fs.existsSync(filename))
      .map(filename => `"${isWin ? filename : escape([filename])}"`)
      .join(' ');
    return [
      `prettier --write ${escapedFileNames}`,
      `eslint --fix ${escapedFileNames}`,
      `git add ${escapedFileNames}`
    ];
  }
};
