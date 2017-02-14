'use strict';

function SigninCtrl($scope, $rootScope, $window,
                    signinService, validationService) {

    $scope.validateEmail = function(email) {
        $scope.incorrectEmail = validationService.validateEmail(email);
    };

    $scope.authenticateUser = function(user) {
        signinService.authentcateUser(user, function(success) {
            if (success) {
                $window.localStorage.isSignedIn = true;
                $scope.errorMessage = "";
                $window.location.href = "/#!/";
            } else {
                $scope.errorMessage = "Incorrect email and/or password";
            }
        });
    };
}

module.exports = SigninCtrl;
