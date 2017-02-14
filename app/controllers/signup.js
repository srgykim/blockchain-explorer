'use strict';

function SignupCtrl($scope, $rootScope, $window,
                    signupService, validationService) {

    $scope.validateEmail = function(email) {
        $scope.incorrectEmail = validationService.validateEmail(email);
    };

    $scope.validatePassword = function(password) {
        $scope.incorrectPassword = validationService.validatePassword(password);
    };

    $scope.confirmPassword = function(password, confirmation) {
        $scope.passwordsDoNotMatch = validationService.confirmPassword(password, confirmation);
    };

    $scope.canContinue = function() {
        return ($scope.incorrectEmail === "" &&
                $scope.incorrectPassword === "" &&
                $scope.passwordsDoNotMatch === "" &&
                $scope.user.email != "" &&
                $scope.user.password != "" &&
                $scope.user.confirmation != "");
    };

    $scope.createUser = function(user) {
        if ($scope.canContinue()) {
            signupService.createUser(user, function(success) {
                if (success) {
                    $window.localStorage.isSignedIn = true;
                    $scope.errorMessage = "";
                    $window.location.href = "/#!/";
                } else {
                    $scope.errorMessage = "Email is already registered.";
                }
            });
        }
    };
}

module.exports = SignupCtrl;
