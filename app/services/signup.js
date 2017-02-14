'use strict';

function SignupService($http, $window) {

    this.createUser = function(user, callback) {
        $http.post('/api/users', user)
        .then(function(response) {
            if (response.data.success) {
                $http.post('/api/auth', user).then(function(response) {
                    if (response.data.success) {
                        $window.localStorage.token = response.data.token;
                        $window.localStorage.email = user.email;
                        callback(true);
                    } else {
                        callback(false);
                    }
                });
            } else {
                callback(false);
            }
        });
    };
}

module.exports = SignupService;
