'use strict';

function MainService($http, $window, $timeout) {

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
        $timeout(function() {
            $http.get("/api/blocks/1");
        }, 100);
        $timeout(function() {
            $http(settings)
                .then(function(response) {
                    if (response.data.success) {
                        callback(true, response.data.message)
                    } else {
                        callback(false, response.data.message);
                    }
                });
        }, 200);


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
                $window.location.reload();
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

        $http.get("/api/transactions/1").then(function() {
            return $http(settings);
        })
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
                tx: tx
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
    };

    this.getUserInfo = function(parameter, authenticated, callback) {
        var settings = {};
        if (authenticated) {
            settings = {
                method: 'POST',
                url: '/api/user_info/' + parameter,
                data: {
                },
                headers: {
                    'Authorization': $window.localStorage.token
                }
            };
        }
        $http(settings)
            .then(function(response) {
                if (response.data.success) {
                    callback(true, response.data.user_info)
                } else {
                    callback(false, response.data.message);
                }
            });
    };


    this.getUsersList = function(parameter, authenticated, callback) {
        var settings = {};
        if (authenticated) {
            settings = {
                method: 'POST',
                url: '/api/users_list/' + parameter,
                data: {
                },
                headers: {
                    'Authorization': $window.localStorage.token
                }
            };
        }
        $http(settings)
            .then(function(response) {
                if (response.data.success) {
                    callback(true, response.data.users)
                } else {
                    callback(false, response.data.message);
                }
            });
    };

    this.updateUserInfo = function(parameter, authenticated, user_info, callback) {
        var settings = {};
        if (authenticated) {
            settings = {
                method: 'PUT',
                url: '/api/user_info/' + parameter,
                data: {
                    user_info: user_info
                },
                headers: {
                    'Authorization': $window.localStorage.token
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
}
module.exports = MainService;
