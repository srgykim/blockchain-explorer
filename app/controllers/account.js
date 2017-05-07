'use strict';

function AccountCtrl($scope, $rootScope, $interval, $window, $state,
                  mainService, validationService, accountService) {

    $scope.initAdminState = function() {
        $rootScope.isAdmin = $window.localStorage.isAdmin;
    };

    $scope.getTransactions_for_account = function(authenticated) {
        if ($window.localStorage.username) {
            mainService.getTransactions($window.localStorage.username, $rootScope.isSignedIn,
                function(success, txs) {
                    $scope.txs = txs;
                    $scope.hidetxs = true;
                });
        }
    };

    $scope.getUserInfo = function(authenticated) {
        if ($window.localStorage.username) {
                mainService.getUserInfo($window.localStorage.username, $rootScope.isSignedIn,
                    function(success, user_info) {
                        $scope.user_info = user_info;
                    });

        }
    };

    $scope.getUsersList = function(authenticated) {
        if ($window.localStorage.username == "admin") {
                mainService.getUsersList($window.localStorage.username, $rootScope.isSignedIn,
                    function(success, users) {
                        $scope.users = users;
                    });

        }
    };

    $scope.updateUserInfo = function(authenticated) {
        $scope.incorrectPassword = "";
        $scope.passwordsDoNotMatch = "";
        $scope.errorMessage = "";

        if ($scope.UserInfoForm.password.$pristine && $scope.UserInfoForm.confirm.$pristine) {
            $scope.user_info.changePass = false;
        } else if ((!$scope.UserInfoForm.password.$pristine && $scope.UserInfoForm.confirm.$pristine) || ($scope.UserInfoForm.password.$pristine && $scope.UserInfoForm.confirm.$pristine)){
            $scope.errorMessage = "Please fill both password and password confirmation fields to change password";
        } else {
            if ($scope.user_info.password == "" || $scope.user_info.confirmation == "") {
                $scope.user_info.changePass = false;
            } else {
                $scope.incorrectPassword = validationService.validatePassword($scope.user_info.password);
                $scope.passwordsDoNotMatch = validationService.confirmPassword($scope.user_info.password, $scope.user_info.confirmation);
                $scope.user_info.changePass = true;
            }
        }

        if ($scope.incorrectPassword == "" && $scope.passwordsDoNotMatch == "" && $scope.errorMessage == "") {
            mainService.updateUserInfo($window.localStorage.username, $rootScope.isSignedIn, $scope.user_info,
                function(success, message) {
                    $scope.isUpdated = success;
                });
        }
    };
}

module.exports = AccountCtrl;
