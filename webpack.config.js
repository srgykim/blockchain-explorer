var webpack = require('webpack');
var path = require('path');

module.exports = {
    context: __dirname + '/app',
    entry: {
        app: './app.js',
        vendor: ['angular', 'jquery', 'bootstrap']
    },
    output: {
        path: __dirname + '/public/scripts',
        filename: 'blockchain-explorer.bundle.js'
    },
    plugins: [
        new webpack.optimize.CommonsChunkPlugin({ name: 'vendor', filename: 'vendor.bundle.js' }),
        new webpack.ProvidePlugin({$: "jquery", jQuery: "jquery"})
    ]
};
