'use strict';

function ValidationService() {
    this.validateEmail = function(email) {
        var regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if(regex.test(email)) {
            return ""
        }
        return "Incorrect Email";
    };

    this.validatePassword = function(password) {
        var regex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/;
        if (regex.test(password)) {
            return ""
        }
        return "Password must satisfy these criterias:<br />" +
            "&nbsp;&nbsp;&nbsp;&nbsp;- at least 8 characters long<br/ >" +
            "&nbsp;&nbsp;&nbsp;&nbsp;- contain at least 1 digit<br/ >" +
            "&nbsp;&nbsp;&nbsp;&nbsp;- contain at least 1 upper case letter<br/ >" +
            "&nbsp;&nbsp;&nbsp;&nbsp;- contain at least 1 lower case letter<br/ >" +
            "&nbsp;&nbsp;&nbsp;&nbsp;- must not contain special characters";
    };

    this.confirmPassword = function(password, confirmation) {
        if (password === confirmation) {
            return "";
        }
        return "Passwords do not match";
    };

    this.validatePrivateKey = function(privateKey) {
        var regex = /\b[0-9A-F]{64}\b/gi;
        if (regex.test(privateKey)) {
            return "";
        }
        return "Invalid private key";
    };

    this.validatePublicKey = function(privateKey) {
        var regex = /\b[0-9A-F]{130}\b/gi;
        if (regex.test(privateKey)) {
            return "";
        }
        return "Invalid public key";
    }
}

module.exports = ValidationService;