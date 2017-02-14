'use strict';

function SigninService($http, $window) {

    this.authentcateUser = function(user, callback) {
        $http.post('/api/auth', user).then(function(response) {
            if (response.data.success) {
                $window.localStorage.token = response.data.token;
                $window.localStorage.email = user.email;
                callback(true);
            } else {
                callback(false);
            }
        });
    };
}

module.exports = SigninService;
