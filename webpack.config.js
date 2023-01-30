//Webpack Client Config
//Date: 30.1.23 6:42

//Vars & Consts
const path = require("path");
const fs = require("fs");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin")
const CopyWebpackPlugin = require("copy-webpack-plugin")
const appDirectory = fs.realpathSync(process.cwd());

//Export
module.exports = {
  entry: {
    main: "./src/app.ts",
  }, //Path to the BARS file
  output: {
    path: path.join(__dirname, 'dist'),
    publicPath: '/',
    filename: '[name].js'
  }, //Output main.js
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  }, //Resolving files extension
  target: 'web',   
  module: {
    rules: [
        {
            test: /\.tsx?$/,
            use: "ts-loader",
            exclude: /node_modules/,
        },
        {
            // Transpiles ES6-8 into ES5
            test: /\.js$/,
            exclude: /node_modules/,
            use: {
                loader: "babel-loader"
            }
        },
        {
            // Loads the javacript into html template provided.
            // Entry point is set below in HtmlWebPackPlugin in Plugins 
            test: /\.html$/,
            use: [{loader: "html-loader"}]
        },
        {
            test: /\.css$/,
            use: [ 'style-loader', 'css-loader' ]
          },
    ]
  }, //Compatibility for JS, CSS, HTML exports
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "./public/models", to: "models" },
        { from: "./public/textures", to: "textures" },
      ]
    }),
    new HtmlWebpackPlugin({
        inject: true,
        template: "./public/index.html",
        excludeChunks: [ 'server' ]
    }), //Rendering index.html based on public/index.html template
  ],
  mode: "development",
}