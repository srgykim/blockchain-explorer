'use strict';

function SignupService($http, $window) {

    this.createUser = function(user, callback) {
        $http.post('/api/users', user)
            .then(function() {
                return $http.post('/api/auth', user);
            }).then(function(response) {
                $window.localStorage.token = response.data.token;
                $window.localStorage.username = user.username;
                $window.open('/api/users/keys');
                callback(true);
            })
            .catch(function(err) {
                callback(false);
            });
    };
}

module.exports = SignupService;
