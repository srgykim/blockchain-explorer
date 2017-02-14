'use strict';

function MainCtrl($scope, $rootScope, $window,
                  mainService, validationService) {

    $scope.validatePub = function(pub) {
        $scope.invalidPub = validationService.validatePublicKey(pub);
    };

    $scope.validatePriv = function(priv) {
        $scope.invalidPriv = validationService.validatePrivateKey(priv);
    };

    $scope.validateTransactionReceiver = function(receiver) {
        $scope.invalidReceiver = validationService.validatePublicKey(receiver);
    };

    $scope.validateTransactionSender = function(sender) {
        $scope.invalidSender = validationService.validatePublicKey(sender);
    };

    $scope.validateTransactionSigningKey = function(privKey) {
        $scope.invalidSigningKey = validationService.validatePrivateKey(privKey);
    };

    $scope.initUserState = function() {
        var user = {};
        if ($window.localStorage.token != "undefined") {
            $rootScope.isSignedIn = true;
        } else {
            $rootScope.isSignedIn = false;
        }
    };

    $scope.requestUserInfo = function() {
        mainService.requestUserInfo(function(user, success) {
            if (success) {
                $scope.user = user;
            } else {
                console.log("User not found")
            }
        });
    };

    $scope.getTransactions = function() {
        if ($scope.invalidPub === "" && $scope.invalidPriv === "") {
            mainService.getTransactions($scope.publicKey, $rootScope.isSignedIn,
            function(success, txs) {
                $scope.txs = txs;
                $scope.hidetxs = true;
            });
        }
    };

    $scope.hideTransactions = function() {
        $scope.hidetxs = false;
        $scope.txs = [];
    };

    $scope.decryptMessage = function(message) {
        mainService.decryptMessage(message, $scope.privateKey, $rootScope.isSignedIn,
        function(success, message) {
            if (success) {
                $scope.decrypted = message;
            } else {
                $scope.decrypted = message;
            }
        });
    };

    $scope.verifyTransaction = function(tx) {
        mainService.verifyTransaction(tx, $scope.privateKey, $rootScope.isSignedIn,
        function(success, verified) {
            if (success) {
                $scope.verified = verified;
                $scope.invalidPrivateKey = false;
            } else {
                $scope.invalidPrivateKey = true;
            }
        });
    };

    $scope.signOut = function() {
        $window.localStorage.token = undefined;
        $window.localStorage.email = undefined;
        $rootScope.isSignedIn = false;
        $window.location.reload();
    };

    $scope.downloadKeys = function() {
        mainService.downloadKeys();
    };

    $scope.signEncryptSend = function(authenticated) {

        var transaction = {};
        if (authenticated) {
            transaction = {
                email: $window.localStorage.email,
                receiver: $scope.transaction.receiver,
                message: $scope.transaction.message
            };
        } else {
            transaction = {
                senderPublicKey: $scope.transaction.sender,
                receiver: $scope.transaction.receiver,
                message: $scope.transaction.message,
                senderPrivateKey: $scope.transaction.signature
            };
        }
            mainService.signEncryptSend(transaction, authenticated, function(success, message) {
                $scope.isTransactionSuccessful = success;
                if (success) {
                    $scope.transactionSent = true;
                    $scope.transactionStatusMessage = message;
                } else {
                    $scope.transactionSent = false;
                    $scope.transactionStatusMessage = message;
                }
            });
    };
}

module.exports = MainCtrl;
