'use strict';

function MainCtrl($scope, $rootScope, $window,
                  mainService, validationService, Upload) {

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



    $scope.getTransactions = function(file) {
        if ($window.localStorage.username) {
            mainService.getTransactions($window.localStorage.username, $rootScope.isSignedIn,
                function(success, txs) {
                    $scope.txs = txs;
                    $scope.hidetxs = true;
                });
        } else {
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
        $window.location.href = "/#!/";
        $window.location.reload();
    };

    $scope.downloadKeys = function() {
        mainService.downloadKeys();
    };

    $scope.signEncryptSend = function() {
        var tx = {};

        if ($window.localStorage.token) {
            tx = {
                receiverUsername: $scope.tx.receiverUsername,
                sendFileUploaded: $scope.sendFileUploaded,
                sendFileName: $scope.sendFileName,
                data: $scope.tx.data
            };
        } else {
            tx = {
                receiverUsername: $scope.tx.receiverUsername,
                receiverPublicKey: $scope.tx.receiverPublicKey,
                sendFileUploaded: $scope.sendFileUploaded,
                sendFileName: $scope.sendFileName,
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
    $scope.pubFileInput = true;
    $scope.privFileInput = true;

    $scope.pubFileInputChanged = function(name) {
        $scope.pubFileInput = false;
    };
    $scope.privFileInputChanged = function(name) {
        $scope.privFileInput = false;
    };

    $scope.upload = function(file) {
        console.log(file);
        Upload.upload({
            url: 'http://localhost:9000/api/upload', //webAPI exposed to upload the file
            data:{file:file} //pass file as data, should be user ng-model
        }).then(function (resp) { //upload function returns a promise
            if(resp.data.error_code === 0){ //validate success
                $scope.uploadFileStatusMessage = "Successfully uploaded your file";
                $scope.isUploaded = true;
                // $window.alert('Success ' + resp.config.data.file.name + ' uploaded. Response: ');
            } else {
                $scope.uploadFileStatusMessage = "An Error Occurred";
                $scope.isUploaded = false;
            }
        }, function (resp) { //catch error
            console.log('Error status: ' + resp.status);
            $window.alert('Error status: ' + resp.status);
        }, function (evt) {
            console.log(evt);
            var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
            console.log('progress: ' + progressPercentage + '% ' + evt.config.data.file.name);
        });
    };
    $scope.sendFileUploaded = false;
    $scope.sendFileName = "";
        $scope.upload_file = function(file) {
        // console.log(file);
        Upload.upload({
            url: 'http://localhost:9000/api/upload', //webAPI exposed to upload the file
            data:{file:file} //pass file as data, should be user ng-model
        }).then(function (resp) { //upload function returns a promise
            if(resp.data.error_code === 0){ //validate success
                $scope.uploadFileStatusMessage = "Successfully uploaded your file";
                $scope.isUploaded = true;
                $scope.sendFileUploaded = true;
                $scope.sendFileName = file.name;
                // $window.alert('Success ' + resp.config.data.file.name + ' uploaded. Response: ');
            } else {
                $scope.uploadFileStatusMessage = "An Error Occurred";
                $scope.isUploaded = false;
            }
        }, function (resp) { //catch error
            console.log('Error status: ' + resp.status);
            $window.alert('Error status: ' + resp.status);
        }, function (evt) {
            console.log(evt);
            var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
            console.log('progress: ' + progressPercentage + '% ' + evt.config.data.file.name);
        });
    };
}

module.exports = MainCtrl;
