'use strict';

function BlockService($http) {

    this.getBlocks = function(callback) {
        $http.get('/api/blocks')
            .then(function(response) {
                callback(true, response.data.blocks);
            })
            .catch(function(err) {
                callback(false, []);
            });
    };
}

module.exports = BlockService;
