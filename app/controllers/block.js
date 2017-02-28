'use strict';

function BlockCtrl($scope, $interval, blockService) {
    $scope.getBlocks = function() {
        blockService.getBlocks(function(success, blocks) {
            if (success) {
                $scope.blocks = blocks;
            }
        });
    };

    $scope.saveTempDetails = function(tx) {
        $scope.details = tx;
    };
}

module.exports = BlockCtrl;
