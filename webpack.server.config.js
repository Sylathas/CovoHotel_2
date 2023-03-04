//Webpack Server Config
//Date: 30.1.23 6:42

//Vars & Consts
const path = require("path");
const fs = require("fs");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin")
const nodeExternals = require('webpack-node-externals')
const appDirectory = fs.realpathSync(process.cwd());

//Export
module.exports = {
    entry: {
        server: "./server/server.js",
    }, //Path to the express server file
    output: {
        path: path.join(__dirname, 'dist'),
        publicPath: '/',
        filename: '[name].js',
      }, //Output server.js
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
    externals: [nodeExternals()], // Need this to avoid error when working with Express
    module: {
        rules: [
            {
                // Transpiles ES6-8 into ES5
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader"
                }
            }
        ],
    },
    plugins: [
        new NodePolyfillPlugin(),
    ], //Resolve Polyfill bug in WP5
    target: 'node',
    node: {
        // Need this when working with express, otherwise the build fails
        __dirname: false,   // if you don't put this is, __dirname
        __filename: false,  // and __filename return blank or /
    },
    mode: "development", //TO CHANGE IN PROD
    externals: {
        bufferutil: "bufferutil",
        "utf-8-validate": "utf-8-validate",
      } 
};
