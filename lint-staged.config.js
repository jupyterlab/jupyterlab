const escape = require('shell-quote').quote;
const isWin = process.platform === 'win32';

module.exports = {
  '**/*{.ts,.tsx,.js,.jsx,.css,.json,.md}': filenames => {
    const escapedFileNames = filenames
      .map(filename => `"${isWin ? filename : escape([filename])}"`)
      .join(' ');
    return [
      `prettier --write ${escapedFileNames}`,
      `git add ${escapedFileNames}`
    ];
  }
};
