'use strict';

function ValidationService() {
    this.validateUsername = function(username) {
        var regex = /^[A-Za-z0-9_]{3,15}$/;
        if(regex.test(username)) {
            return ""
        }
        return "Username must satisfy these criterias:<br />" +
            "&nbsp;&nbsp;&nbsp;&nbsp;- at least 3 characters long<br />" +
            "&nbsp;&nbsp;&nbsp;&nbsp;- shorter than 15 characters<br />" +
            "&nbsp;&nbsp;&nbsp;&nbsp;- contain only alphabetic symbols and <br />" +
            "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;numbers";
    };

    this.validatePassword = function(password) {
        var regex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/;
        if (regex.test(password)) {
            return ""
        }
        return "Password must satisfy these criterias:<br />" +
            "&nbsp;&nbsp;&nbsp;&nbsp;- at least 8 characters long<br />" +
            "&nbsp;&nbsp;&nbsp;&nbsp;- contain at least 1 digit<br />" +
            "&nbsp;&nbsp;&nbsp;&nbsp;- contain at least 1 upper case letter<br />" +
            "&nbsp;&nbsp;&nbsp;&nbsp;- contain at least 1 lower case letter<br />" +
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