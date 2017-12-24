module.exports = {
  resolve: {
    extensions: ['.ts', '.js']
  },
  bail: true,
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'awesome-typescript-loader',
            query: {
              sourceMap: false,
              inlineSourceMap: true,
              compilerOptions: {
                removeComments: true
              }
            }
          }
        ]
      },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      { test: /\.(json|ipynb)$/, use: 'json-loader' },
      { test: /\.html$/, use: 'file-loader' },
      { test: /\.md$/, use: 'raw-loader' },
      { test: /\.(jpg|png|gif)$/, use: 'file-loader' },
      { test: /\.js.map$/, use: 'file-loader' },
      { test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/, use: 'url-loader?limit=10000&mimetype=application/font-woff' },
      { test: /\.woff(\?v=\d+\.\d+\.\d+)?$/, use: 'url-loader?limit=10000&mimetype=application/font-woff' },
      { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, use: 'url-loader?limit=10000&mimetype=application/octet-stream' },
      { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, use: 'file-loader' },
      { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, use: 'url-loader?limit=10000&mimetype=image/svg+xml' },
    ]
  },
};
