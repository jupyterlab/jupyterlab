module.exports = {
  preset: "ts-jest/presets/js-with-babel",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  transformIgnorePatterns: ["/node_modules/(?!(@jupyterlab/.*)/)"],
  globals: {
    "ts-jest": {
      tsConfig: "./tsconfig.json"
    }
  },
  transform: {
    "\\.(ts|tsx)?$": "ts-jest"
  }
};
