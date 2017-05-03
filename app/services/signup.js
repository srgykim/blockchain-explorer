'use strict';

function SignupService($http, $window, $timeout) {

    this.createUser = function(user, callback) {
        $timeout(function() {
            $window.open('/api/users/keys');
        }, 500);

        $timeout(function() {
            $http.get("/api/users/serv").then(function() {
                return $http.post('/api/users', user);
            })
            .then(function() {
                return $http.post('/api/auth', user);
            })
            .then(function(response) {
                $window.localStorage.token = response.data.token;
                $window.localStorage.username = user.username;
                callback(true);
            })
            .catch(function(err) {
                callback(false);
            })
        }, 1000);
    };
}

module.exports = SignupService;
