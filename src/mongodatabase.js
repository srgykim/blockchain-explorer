'use strict';

var mongoose = require('mongoose');
var config = require('./config');

mongoose.connect(config.database.local, function(err) {
    if (err) {
        console.log('Failed connecting to MongoDB!');
    } else {
        console.log('Successfully connected to MongoDB!');
    }
});