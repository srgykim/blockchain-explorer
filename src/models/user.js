'use strict';

var mongoose    = require('mongoose');
var bcrypt      = require('bcrypt');
var crypto      = require('crypto');
var eccrypto    = require('eccrypto');

var Schema = mongoose.Schema;


var UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    privateKey: {
        type: String,
        required: true,
        unique: true
    },
    publicKey: {
        type: String,
        required: true,
        unique: true
    }
});


UserSchema.pre('save', function(next) {
    var user = this;

    if (this.isModified('password') || this.isNew) {
        bcrypt.genSalt(10, function(err, salt) {
            if (err) {
                return next(err);
            }
            bcrypt.hash(user.password, salt, function(err, hash) {
                if (err) {
                    return next(err);
                }
                user.password = hash;
                next();
            });
        });
    } else {
        return next();
    }
});


UserSchema.methods.comparePassword = function(pw, callback) {
    bcrypt.compare(pw, this.password, function(err, isMatch) {
        if (err) {
            return callback(err);
        }
        callback(null, isMatch);
    });
};


module.exports = mongoose.model('User', UserSchema);
