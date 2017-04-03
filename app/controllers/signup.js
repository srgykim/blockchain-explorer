'use strict';

function SignupCtrl($scope, $rootScope, $window, $interval,
                    signupService, validationService) {

    $scope.redirectIfSignedIn = function() {
        if ($rootScope.isSignedIn) {
            $window.location.href = "/#!/"
        }
    };

    $scope.validateUsername = function(username) {
        $scope.incorrectUsername = validationService.validateUsername(username);
    };

    $scope.validatePassword = function(password) {
        $scope.incorrectPassword = validationService.validatePassword(password);
    };

    $scope.confirmPassword = function(password, confirmation) {
        $scope.passwordsDoNotMatch = validationService.confirmPassword(password, confirmation);
    };

    $scope.canSignUp = function() {
        $interval(function() {
            $scope.canContinue = $scope.incorrectUsername == "" &&
                $scope.incorrectPassword == "" &&
                $scope.passwordsDoNotMatch == "" &&
                $scope.username != "" &&
                $scope.password != "" &&
                $scope.confirmation != "";
        }, 100);
    };

    $scope.createUser = function(user) {
        signupService.createUser(user, function(success) {
            if (success) {
                $scope.errorMessage = "";
                $window.location.href = "/#!/";
            } else {
                $scope.errorMessage = "This username is already exist.";
            }
        });
    };
}

module.exports = SignupCtrl;
