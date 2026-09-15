const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env = {}, argv = {}) => {
  const mode = argv.mode || process.env.NODE_ENV || 'development';
  const isProd = mode === 'production';

  return {
    mode,
    target: 'electron-renderer',
    entry: path.resolve(__dirname, 'src/index.jsx'),
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProd ? '[name].[contenthash:8].renderer.js' : '[name].renderer.js',
      chunkFilename: isProd ? '[name].[contenthash:8].chunk.js' : '[name].chunk.js',
      publicPath: './',
      clean: isProd
    },
    resolve: {
      extensions: ['.js','.jsx'],
      alias: {
        'roughjs/bin/rough': 'roughjs/bin/rough.js',
        'roughjs/bin/math': 'roughjs/bin/math.js',
        'roughjs/bin/generator': 'roughjs/bin/generator.js'
      }
    },
    module: {
      rules: [
        {
          test:/\.(js|jsx)$/,
          exclude:/node_modules/,
          use:{
            loader:'babel-loader',
            options:{
              cacheDirectory: true,
              presets:[
                ['@babel/preset-env', { targets: { electron: '44' }, modules: false }],
                ['@babel/preset-react', { runtime: 'automatic', development: !isProd }]
              ]
            }
          }
        },
        { test:/\.css$/i, use:['style-loader','css-loader'] }
      ]
    },
    plugins:[
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname,'src/index.html'),
        filename:'index.html'
      })
    ],
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          excalidraw: {
            test: /[\/]node_modules[\/](@excalidraw|roughjs|perfect-freehand|pako|fractional-indexing)[\/]/,
            name: 'excalidraw',
            chunks: 'all',
            priority: 20,
            enforce: true
          },
          vendor: {
            test: /[\/]node_modules[\/]/,
            name: 'vendor',
            chunks: 'initial',
            priority: 10
          }
        }
      },
      runtimeChunk: 'single'
    },
    performance: { hints: false },
    devtool: isProd ? false : 'eval-cheap-module-source-map'
  };
};
