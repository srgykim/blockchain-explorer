'use strict';

function SigninCtrl($scope, $rootScope, $window,
                    signinService, validationService) {

    $scope.redirectIfSignedIn = function() {
        if ($rootScope.isSignedIn) {
            $window.location.href = "/#!/"
        }
    };

    $scope.validateUsername = function(username) {
        $scope.incorrectUsername = validationService.validateUsername(username);
    };

    $scope.authenticateUser = function(user) {
        signinService.authentcateUser(user, function(success, isAdmin) {
            if (success) {
                $window.localStorage.isSignedIn = true;
                if (isAdmin) {
                    $window.localStorage.isAdmin = true;
                }
                $scope.errorMessage = "";
                $window.location.href = "/#!/";
            } else {
                $scope.errorMessage = "Incorrect email and/or password";
            }
        });
    };
}

module.exports = SigninCtrl;
