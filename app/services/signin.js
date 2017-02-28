'use strict';

function SigninService($http, $window) {

    this.authentcateUser = function(user, callback) {
        $http.post('/api/auth', user)
            .then(function(response) {
                $window.localStorage.token = response.data.token;
                $window.localStorage.username = user.username;
                callback(true);
            })
            .catch(function(err) {
                callback(false);
            });
    };
}

module.exports = SigninService;
