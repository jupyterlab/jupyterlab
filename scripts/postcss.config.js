// for the integrity2 CI in scripts/ci_script.sh
module.exports = {
  // use a postcss plugin that already exists in the top-level project
  plugins: [require('postcss-selector-parser')]
};
