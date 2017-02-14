'use strict';

function MainService($http, $window) {

    this.requestUserInfo = function(callback) {
        $http({method: 'GET', url: 'api/users/' + $window.localStorage.email,
            headers: {
                'Authorization': $window.localStorage.token
            }
        }).then(function(response) {
            if (response.data.success) {
                callback(response.data.user, true);
            } else {
                callback(response.data.message, false);
            }
        });
    };

    this.downloadKeys = function() {
        $window.open('/api/generate');
    };

    this.signEncryptSend = function(transaction, authenticated, callback) {
        var query = "";
        if (authenticated) {
            query = "yes";
        } else {
            query = "no";
        }
        $http({
            method: 'POST',
            url: '/api/blocks?authenticated=' + query,
            data: transaction,
            headers: {
                'Authorization': $window.localStorage.token
            }
        })
        .then(function(response) {
            if (response.data.success) {
                callback(true, response.data.message)
            } else {
                callback(false, response.data.message);
            }
        });
    };

    this.getTransactions = function(publicKey, authenticated, callback) {
        var query = "";
        var settings = {};
        if (authenticated) {
            query = "yes";
            settings = {
                method: 'POST',
                url: '/api/transactions?authenticated=' + query,
                data: {
                    email: $window.localStorage.email
                },
                headers: {
                    'Authorization': $window.localStorage.token
                }
            };
        } else {
            query = "no";
            settings = {
                method: 'POST',
                data: {
                    publicKey: publicKey
                },
                url: '/api/transactions?authenticated=' + query
            };
        }
        $http(settings)
        .then(function(response) {
            if (response.data.success) {
                callback(true, response.data.txs)
            } else {
                callback(false, response.data.txs);
            }
        });
    };

    this.decryptMessage = function(message, privateKey, authenticated, callback) {
        var query = "";
        var settings = {};
        if (authenticated) {
            query = "yes";
            settings = {
                method: 'POST',
                url: '/api/decrypt?authenticated=' + query,
                data: {
                    message: message,
                    email: $window.localStorage.email
                },
                headers: {
                    'Authorization': $window.localStorage.token
                }
            };
        } else {
            query = "no";
            settings = {
                method: 'POST',
                url: '/api/decrypt?authenticated=' + query,
                data: {
                    message: message,
                    privateKey: privateKey
                }
            };
        }
        $http(settings)
        .then(function(response) {
            if (response.data.success) {
                callback(true, response.data.message)
            } else {
                callback(false, response.data.message);
            }
        });
    };

    this.verifyTransaction = function(tx, privateKey, authenticated, callback) {
        var query = "";
        var settings = {};
        if (authenticated) {
            query = "yes";
            settings = {
                method: 'POST',
                url: '/api/verify?authenticated=' + query,
                data: {
                    tx: tx,
                    email: $window.localStorage.email
                },
                headers: {
                    'Authorization': $window.localStorage.token
                }
            };
        } else {
            query = "no";
            settings = {
                method: 'POST',
                url: '/api/verify?authenticated=' + query,
                data: {
                    tx: tx,
                    privateKey: privateKey
                },
                headers: {
                    'Authorization': $window.localStorage.token
                }
            };
        }
        $http(settings)
        .then(function(response) {
            if (response.data.success) {
                callback(true, response.data.verified)
            } else {
                callback(false, response.data.verified);
            }
        });
    }
}

module.exports = MainService;
