'use strict';

module.exports = {
    cassandra: {
        contactPoints: [
            '127.0.0.1',
            '127.0.0.2',
            '127.0.0.3'
        ],
        keyspace: 'blockchain'
    },

    auth: {
        secret: 'Authentication Token Secret Key'
    }
};
