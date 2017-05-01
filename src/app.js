'use strict';

var express    = require('express');
var parser     = require('body-parser');
var router     = require('./api');

var app        = express();

app.use('/', express.static('public'));

app.use(parser.json());

app.use('/api', router);

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://localhost");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.listen(9000, function() {
    console.log("The server is running on port 9000.")
});