'use strict';

function MainService($http, $window) {

    this.downloadKeys = function() {
        $window.open('/api/generate');
    };

    this.signEncryptSend = function(tx, callback) {
        var settings = {};
        if ($window.localStorage.token) {
            settings =
                {
                    method: 'POST',
                    url: '/api/blocks',
                    data: {
                        tx: tx,
                        username: $window.localStorage.username
                    },
                    headers: {
                        'Authorization': $window.localStorage.token
                    }
                }
        } else {
            settings =
                {
                    method: 'POST',
                    url: '/api/blocks',
                    data: {
                        tx: tx
                    }
                }
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

    this.forward = function(txf, callback) {
        $http(
            {
                method: 'POST',
                url: '/api/blocks',
                data: {
                    tx: txf,
                    username: $window.localStorage.username
                },
                headers: {
                    'Authorization': $window.localStorage.token
                }
            }
        )
            .then(function(response) {
                if (response.data.success) {
                    callback(true, response.data.message)
                } else {
                    callback(false, response.data.message);
                }
            });
    };

    this.getTransactions = function(parameter, authenticated, callback) {
        var settings = {};
        if (authenticated) {
            settings = {
                method: 'POST',
                url: '/api/transactions/' + parameter,
                data: {
                },
                headers: {
                    'Authorization': $window.localStorage.token
                }
            };
        } else {
            settings = {
                method: 'POST',
                url: '/api/transactions',
                data: {
                    publicKey: parameter
                }
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

    this.decryptData = function(data, privateKey, callback) {
        $http(
        {
            method: 'POST',
            url: '/api/decrypt',
            data: {
                data: data,
                privateKey: privateKey
            }
        })
            .then(function(response) {
                if (response.data.success) {
                    callback(true, response.data.data)
                } else {
                    callback(false, response.data.data);
                }
            });
    };

    this.verifyTransaction = function(tx, privateKey, callback) {
        $http(
        {
            method: 'POST',
            url: '/api/verify',
            data: {
                tx: tx,
                privateKey: privateKey
            },
            headers: {
                'Authorization': $window.localStorage.token
            }
        })
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
