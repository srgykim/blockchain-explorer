'use strict';

function MainCtrl($scope, $rootScope, $window,
                  mainService, validationService) {

    $scope.initView = function() {
        if ($window.localStorage.token) {
            $scope.invalidPrivateKey = true;
            $scope.invalidPublicKey = true;
            $scope.invalidSend = false;
            $scope.invalidRec = true;
            $scope.invalidSign = true;
            $scope.invalidRecForward = true;
            $scope.invalidSignForward = true;
        } else {
            $scope.invalidPrivateKey = true;
            $scope.invalidPublicKey = true;
            $scope.invalidSend = true;
            $scope.invalidRec = true;
            $scope.invalidSign = true;
        }
    };

    $scope.requestUserInfo = function() {
        $scope.user = {};
        $scope.user.username = $window.localStorage.username;
        $scope.user.first_name = $window.localStorage.first_name;
    };

    $scope.validatePub = function(pub) {
        $scope.invalidPub = validationService.validatePublicKey(pub);

    };

    $scope.validatePriv = function(priv) {
        $scope.invalidPriv = validationService.validatePrivateKey(priv);
        $scope.invalidPrivateKey = $scope.invalidPriv !== "";
    };

    $scope.validateTransactionReceiver = function(receiver) {
        $scope.invalidReceiver = validationService.validatePublicKey(receiver);
        $scope.invalidRec = $scope.invalidReceiver !== "";
    };

    $scope.validateTransactionReceiverUsername = function(receiver) {
        $scope.invalidReceiver = validationService.validateUsername(receiver);
        $scope.invalidRec = $scope.invalidReceiver !== "";
    };

    $scope.validateTransactionReceiverUsernameForward = function(receiver) {
        $scope.invalidReceiverForward = validationService.validateUsername(receiver);
        $scope.invalidRecForward = $scope.invalidReceiverForward !== "";
    };

    $scope.validateTransactionSigningKeyForward = function(privKey) {
        $scope.invalidSigningKeyForward = validationService.validatePrivateKey(privKey);
        $scope.invalidSignForward = $scope.invalidSigningKeyForward !== "";
    };

    $scope.validateTransactionSender = function(sender) {
        $scope.invalidSender = validationService.validatePublicKey(sender);
        $scope.invalidSend = $scope.invalidSender !== "";
    };

    $scope.validateTransactionSigningKey = function(privKey) {
        $scope.invalidSigningKey = validationService.validatePrivateKey(privKey);
        $scope.invalidSign = $scope.invalidSigningKey !== "";
    };

    $scope.initUserState = function() {
        $rootScope.isSignedIn = $window.localStorage.length !== 0;
    };

    $scope.getTransactions = function(authenticated) {
        if ($window.localStorage.username) {
            if ($scope.invalidPriv === "") {
                mainService.getTransactions($window.localStorage.username, $rootScope.isSignedIn,
                    function(success, txs) {
                        $scope.txs = txs;
                        $scope.hidetxs = true;
                    });
            }
        } else {
            if ($scope.invalidPub === "" && $scope.invalidPriv === "") {
                mainService.getTransactions($scope.publicKey, $rootScope.isSignedIn,
                    function(success, txs) {
                        $scope.txs = txs;
                        $scope.hidetxs = true;
                    });
            }
        }
    };

    $scope.hideTransactions = function() {
        $scope.hidetxs = false;
        $scope.txs = [];
    };

    $scope.decryptData= function(data) {
        mainService.decryptData(data, $scope.privateKey,
        function(success, data) {
            if (success) {
                $scope.decrypted = data;
            } else {
                $scope.decrypted = "<span class='validation-message'>" + data + "</span>";
            }
        });
    };

    $scope.verifyTransaction = function(tx) {
        mainService.verifyTransaction(tx, $scope.privateKey,
        function(success, verified) {
            if (success) {
                $scope.verified = verified;
            }
        });
    };

    $scope.signOut = function() {
        $window.localStorage.clear();
        $window.location.reload();
    };

    $scope.downloadKeys = function() {
        mainService.downloadKeys();
    };

    $scope.signEncryptSend = function() {
        var tx = {};

        if ($window.localStorage.token) {
            tx = {
                senderPrivateKey: $scope.tx.senderPrivateKey,
                receiverUsername: $scope.tx.receiverUsername,
                data: $scope.tx.data
            };
        } else {
            tx = {
                senderPrivateKey: $scope.tx.senderPrivateKey,
                senderPublicKey: $scope.tx.senderPublicKey,
                receiverPublicKey: $scope.tx.receiverPublicKey,
                data: $scope.tx.data
            };
        }

        mainService.signEncryptSend(tx, function(success, message) {
            if (success) {
                $scope.transactionSent = true;
                $scope.transactionStatusMessage = message;
            } else {
                $scope.transactionSent = false;
                $scope.transactionStatusMessage = message;
            }
        });
    };

    $scope.forward = function() {
        var txf = {
            senderPrivateKey: $scope.txf.senderPrivateKey,
            receiverUsername: $scope.txf.receiverUsername,
            data: $scope.decrypted
        };
        mainService.forward(txf, function(success, message) {
            if (success) {
                $scope.transactionSent = true;
                $scope.transactionStatusMessage = "Data has been forwarded";
            } else {
                $scope.transactionSent = false;
                $scope.transactionStatusMessage = message;
            }
        });
    };

    $scope.getUserInfo = function(authenticated) {
        if ($window.localStorage.username) {
                mainService.getUserInfo($window.localStorage.username, $rootScope.isSignedIn,
                    function(success, user_info) {
                        $scope.user_info = user_info;
                        $scope.username2 = "vitalya"
                    });

        }
    };
}

module.exports = MainCtrl;
