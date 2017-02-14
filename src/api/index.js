'use strict';

var express     = require('express');
var zip         = require('express-zip');
var jwt         = require('jsonwebtoken');
var config      = require('../config');
var User        = require('../models/user');
var crypto      = require('crypto');
var eccrypto    = require('eccrypto');
var fs          = require('fs');
var cassandra   = require('cassandra-driver');
var merkle      = require('merkle');

var router      = express.Router();
var client      = new cassandra
                      .Client({
                          contactPoints: [
                              '127.0.0.1',
                              '127.0.0.2',
                              '127.0.0.3'
                          ],
                          keyspace: 'blockchain'
                      });


router.post('/users', function(req, res) {
    var user = req.body;

    user.privateKey = crypto.randomBytes(32);
    user.publicKey = eccrypto.getPublic(user.privateKey);

    user.privateKey = user.privateKey.toString("hex");
    user.publicKey = user.publicKey.toString("hex");

    User.create(user, function(err) {
        if (err) {
            return res.json({
                success: false,
                err: err.message
            });
        }
        res.json({
            'user': user,
            success: true
        });
    });
});


router.post('/auth', function(req, res) {
    User.findOne({ email: req.body.email }, function(err, user) {
        if (err) throw err;

        if (!user) {
            res.send({
                success: false,
                message: 'Authentication failed. User not found.'
            });
        } else {
            user.comparePassword(req.body.password, function(err, isMatch) {
                if (isMatch && !err) {
                    var token = jwt.sign(user, config.auth.secret, {
                        expiresIn: "2 days"
                    });
                    res.json({
                        success: true,
                        message: 'Authentication successfull',
                        token: token
                    });
                } else {
                    res.json({
                        success: false,
                        message: 'Authentication failed. Passwords did not match.'
                    });
                }
            });
        }
    });
});


router.get("/users/:email", function(req, res) {
    var token = req.headers.authorization;
    jwt.verify(token, config.auth.secret, function(err, decoded) {
        if (err) {
            res.json({
                success: false,
                message: "Invalid token"
            });
        }

        res.json({
            success: true,
            user: decoded._doc
        });
    });
});


router.get("/generate", function(req, res) {
    var privPath = __dirname + '/tmp/ECC_PRIVATE_KEY.txt';
    var pubPath = __dirname + '/tmp/ECC_PUBLIC_KEY.txt';
    var readmePath = __dirname + '/tmp/readme.txt';

    var privateKey = crypto.randomBytes(32);
    var publicKey = eccrypto.getPublic(privateKey);

    privateKey = privateKey.toString("hex");
    publicKey = publicKey.toString("hex");

    fs.writeFile(privPath, privateKey, function(err) {
        if (err) {
            console.log(err)
        }
    });
    fs.writeFile(pubPath, publicKey, function(err) {
        if (err) {
            console.log(err)
        }
    });

    res.zip([
        { path: privPath, name: 'ECC_PRIVATE_KEY.txt' },
        { path: pubPath, name: 'ECC_PUBLIC_KEY.txt' },
        { path: readmePath, name: 'readme.txt' }
    ]);
});


var blockInsertQueryParams = {};
var makeBlockHeader = function(callback) {
    blockInsertQueryParams = {};
    var lastBlockHeaderQuery = "SELECT header FROM block LIMIT 1";
    client.execute(lastBlockHeaderQuery)
    .then(function(result) {
        var lastHeader = result.rows[0].header;
        var concatenatedLastHeader = lastHeader.previous_block_hash +
            lastHeader.merkle_root +
            lastHeader.timestamp.toString();
        var lastHeaderHash = crypto.createHash("sha256")
            .update(concatenatedLastHeader).digest()
            .toString("hex");
        lastHeaderHash = crypto.createHash("sha256")
            .update(lastHeaderHash).digest()
            .toString("hex");
        blockInsertQueryParams.previousBlockHash = lastHeaderHash;
    })
    .then(function() {
        var merkleRootQuery = "SELECT transactions FROM block";
        return client.execute(merkleRootQuery);
    })
    .then(function(result) {
        var concatendatedTransactions = [];
        for (var i = 0; i < result.rows.length; i++) {
            for (var j = 0; j < result.rows[i].transactions.length; j++) {
                var concatenatedTx = "";
                concatenatedTx += result.rows[i].transactions[j].sender_public_key;
                concatenatedTx += result.rows[i].transactions[j].receiver_public_key;
                concatenatedTx += result.rows[i].transactions[j].signature;
                concatenatedTx += result.rows[i].transactions[j].message.iv;
                concatenatedTx += result.rows[i].transactions[j].message.ephem_public_key;
                concatenatedTx += result.rows[i].transactions[j].message.ciphertext;
                concatenatedTx += result.rows[i].transactions[j].message.mac;
                concatendatedTransactions.push(concatenatedTx);
            }
        }
        blockInsertQueryParams.merkleRoot = merkle("sha256").sync(concatendatedTransactions).root();
        callback();
    });
};
var insertBlock = function(bindVariables, callback) {
    var blockInsertQuery = "" +
    "INSERT INTO block (header, transactions)" +
    "VALUES (" +
    "	{" +
    "		previous_block_hash: '" + bindVariables[0] + "', " +
    "		merkle_root: '" + bindVariables[1] + "', " +
    "		timestamp: toTimeStamp(now())" +
    "	}," +
    "	[" +
    "		{" +
    "			sender_public_key: '" + bindVariables[2] + "', " +
    "			receiver_public_key: '" + bindVariables[3] + "', " +
    "			signature: '" + bindVariables[4] + "', " +
    "			timestamp: toTimeStamp(now()), " +
    "			message: {" +
    "				iv: '" + bindVariables[5] + "', " +
    "				ephem_public_key: '" + bindVariables[6] + "', " +
    "				ciphertext: '" + bindVariables[7] + "', " +
    "				mac: '" + bindVariables[8] + "'" +
    "			}" +
    "		}" +
    "	])";

    client.execute(blockInsertQuery, [], { prepare: false })
    .then(function(result) {
        console.log("inserted");
        callback();
    });
};


router.post("/blocks", function(req, res) {
    makeBlockHeader(function() {
        var transaction = {};
        if (req.query.authenticated === "yes") {

            var token = req.headers.authorization;
            jwt.verify(token, config.auth.secret, function(err, decoded) {
                if (err) {
                    res.json({
                        success: false,
                        message: err.message
                    });
                }

                User.findOne({
                    email: req.body.email
                }, function(err, sender) {
                    if (err) {
                        res.json({
                            success: false,
                            message: err.message
                        });
                    }

                    transaction.senderPublicKey = new Buffer(sender.publicKey, "hex");

                    try {
                        transaction.receiverPublicKey = new Buffer(req.body.receiver, "hex");
                    } catch(err) {
                        res.json({
                            success: false,
                            message: "Unable to send a message: invalid public key address."
                        });
                    }

                    transaction.message = req.body.message;

                    var senderPrivateKey = new Buffer(sender.privateKey, "hex");
                    try {
                        var hash = crypto.createHash("sha256").update(transaction.message).digest();
                    } catch(err) {
                        console.log(err.message);
                    }
                    eccrypto.sign(senderPrivateKey, hash)
                    .then(function(signature) {
                        transaction.signature = signature.toString("hex");
                        return eccrypto.encrypt(transaction.receiverPublicKey, new Buffer(transaction.message));
                    })
                    .then(function(encrypted) {
                        transaction.message = {
                            iv: encrypted.iv.toString("hex"),
                            ephemPublicKey: encrypted.ephemPublicKey.toString("hex"),
                            ciphertext: encrypted.ciphertext.toString("hex"),
                            mac: encrypted.mac.toString("hex")
                        };
                        transaction.senderPublicKey = transaction.senderPublicKey.toString("hex");
                        transaction.receiverPublicKey =transaction.receiverPublicKey.toString("hex");

                        var qParamsArray = [
                            blockInsertQueryParams.previousBlockHash,
                            blockInsertQueryParams.merkleRoot,
                            transaction.senderPublicKey,
                            transaction.receiverPublicKey,
                            transaction.signature,
                            transaction.message.iv,
                            transaction.message.ephemPublicKey,
                            transaction.message.ciphertext,
                            transaction.message.mac
                        ];

                        insertBlock(qParamsArray, function() {
                            res.json({
                                success: true,
                                message: "Message has been sent"
                            });
                        });
                    })
                    .catch(function(err) {
                        res.json({
                            success: false,
                            message: "Unable to send a message. Try again"
                        });
                    });
                });
            });
        } else if (req.query.authenticated === "no") {
            try {
                transaction.senderPublicKey = new Buffer(req.body.senderPublicKey, "hex");
                transaction.receiverPublicKey = new Buffer(req.body.receiver, "hex");
                transaction.message = req.body.message;
                var senderPrivateKey = new Buffer(req.body.senderPrivateKey, "hex");
            } catch(err) {
                res.json({
                    success: false,
                    message: "Unable to send a message: invalid credentials."
                });
            }
            try {
                var hash = crypto.createHash("sha256").update(transaction.message).digest();
            } catch(err) {
                res.json({
                    success: false,
                    message: "Unable to send a message"
                });
            }
            eccrypto.sign(senderPrivateKey, hash)
            .then(function(signature) {
                transaction.signature = signature.toString("hex");
                return eccrypto.encrypt(transaction.receiverPublicKey, new Buffer(transaction.message));
            })
            .then(function(encrypted) {
                transaction.message = {
                    iv: encrypted.iv.toString("hex"),
                    ephemPublicKey: encrypted.ephemPublicKey.toString("hex"),
                    ciphertext: encrypted.ciphertext.toString("hex"),
                    mac: encrypted.mac.toString("hex")
                };
                transaction.senderPublicKey = transaction.senderPublicKey.toString("hex");
                transaction.receiverPublicKey =transaction.receiverPublicKey.toString("hex");

                var qParamsArray = [
                    blockInsertQueryParams.previousBlockHash,
                    blockInsertQueryParams.merkleRoot,
                    transaction.senderPublicKey,
                    transaction.receiverPublicKey,
                    transaction.signature,
                    transaction.message.iv,
                    transaction.message.ephemPublicKey,
                    transaction.message.ciphertext,
                    transaction.message.mac
                ];

                insertBlock(qParamsArray, function() {
                    res.json({
                        success: true,
                        message: "Message has been sent"
                    });
                });
            })
            .catch(function(err) {
                res.json({
                    success: false,
                    message: err.message
                });
            });
        }
    });
});


router.post("/transactions", function(req, res) {
    if (req.query.authenticated === "yes") {
        var token = req.headers.authorization;
        jwt.verify(token, config.auth.secret, function (err, decoded) {
            if (err) {
                res.json({
                    success: false,
                    message: err.message
                });
            }

            User.findOne({
                email: req.body.email
            }, function (err, user) {

                if (err) {
                    res.json({
                        success: false,
                        message: err.message
                    });
                }

                var txs = [];
                var query = 'SELECT transactions FROM block';
                client.execute(query, [])
                .then(function(result) {
                    for (var i = 0; i < result.rows.length; i++) {
                        for (var j = 0; j < result.rows[i].transactions.length; j++) {
                            if (result.rows[i].transactions[j].receiver_public_key == user.publicKey) {
                                txs.push(result.rows[i].transactions[j]);
                            }
                        }
                    }
                })
                .then(function() {
                    if (txs.length === 0) {
                        res.json({
                            success: false,
                            message: "No transactions found"
                        });
                    } else {
                        res.json({
                            success: true,
                            txs: txs
                        });
                    }
                })
                .catch(function(err) {
                    console.log(err.message);
                });
            });
        });
    } else if (req.query.authenticated === "no") {
        var txs = [];
        var query = 'SELECT transactions FROM block';
        client.execute(query, [])
        .then(function(result) {
            for (var i = 0; i < result.rows.length; i++) {
                for (var j = 0; j < result.rows[i].transactions.length; j++) {
                    if (result.rows[i].transactions[j].receiver_public_key == req.body.publicKey) {
                        txs.push(result.rows[i].transactions[j]);
                    }
                }
            }
        })
        .then(function() {
            if (txs.length === 0) {
                res.json({
                    success: false,
                    message: "No transactions found"
                });
            } else {
                res.json({
                    success: true,
                    txs: txs
                });
            }
        })
        .catch(function(err) {
            console.log(err.message);
        });
    }
});


router.post("/decrypt", function(req, res) {
    if (req.query.authenticated === "yes") {
        var token = req.headers.authorization;
        jwt.verify(token, config.auth.secret, function (err, decoded) {
            if (err) {
                res.json({
                    success: false,
                    message: err.message
                });
            }

            User.findOne({
                email: req.body.email
            }, function (err, user) {
                var message = req.body.message;
                message.iv = new Buffer(message.iv, "hex");
                message.ephemPublicKey = new Buffer(message.ephem_public_key, "hex");
                message.ciphertext = new Buffer(message.ciphertext, "hex");
                message.mac = new Buffer(message.mac, "hex");
                var privKey = new Buffer(user.privateKey, "hex");
                eccrypto.decrypt(privKey, message)
                .then(function(decrypted) {
                    res.json({
                        success: true,
                        message: decrypted.toString()
                    })
                })
                .catch(function(err) {
                    console.log(err.message);
                });
            });
        });
    } else if (req.query.authenticated === "no") {
        var message = req.body.message;
        message.iv = new Buffer(message.iv, "hex");
        message.ephemPublicKey = new Buffer(message.ephem_public_key, "hex");
        message.ciphertext = new Buffer(message.ciphertext, "hex");
        message.mac = new Buffer(message.mac, "hex");
        try {
            var privKey = new Buffer(req.body.privateKey, "hex");
        } catch(err) {
            res.json({
                success: false,
                message: "Unable to decrypt the message: bad private key."
            });
        }
        eccrypto.decrypt(privKey, message)
        .then(function(decrypted) {
            res.json({
                success: true,
                message: decrypted.toString()
            });
        })
        .catch(function(err) {
            res.json({
                success: false,
                message: "Unable to decrypt the message: bad private key."
            });
        });
    }
});


router.post("/verify", function(req, res) {
    if (req.query.authenticated === "yes") {
        var token = req.headers.authorization;
        jwt.verify(token, config.auth.secret, function (err, decoded) {
            if (err) {
                res.json({
                    success: false,
                    message: err.message
                });
            }
            User.findOne({
                email: req.body.email
            }, function (err, user) {
                var senderPublicKey = req.body.tx.sender_public_key;
                var signature = new Buffer(req.body.tx.signature, "hex");
                var message = req.body.tx.message;
                message.iv = new Buffer(message.iv, "hex");
                message.ephemPublicKey = new Buffer(message.ephem_public_key, "hex");
                message.ciphertext = new Buffer(message.ciphertext, "hex");
                message.mac = new Buffer(message.mac, "hex");
                var privKey = new Buffer(user.privateKey, "hex");
                eccrypto.decrypt(privKey, message)
                .then(function(decrypted) {
                    return decrypted.toString();
                })
                .then(function(decrypted) {
                    var hash = crypto.createHash("sha256").update(decrypted).digest();
                    var pubKey = new Buffer(senderPublicKey, "hex");

                    return eccrypto.verify(new Buffer(pubKey, "hex"), hash, signature);
                })
                .then(function() {
                    res.json({
                        success: true,
                        verified: true
                    });
                })
                .catch(function(err) {
                    console.log(err.message);
                    res.json({
                        success: true,
                        verified: false
                    });
                });
            });
        });
    } else if (req.query.authenticated === "no") {
        var senderPublicKey = req.body.tx.sender_public_key;
        var signature = new Buffer(req.body.tx.signature, "hex");
        var message = req.body.tx.message;
        message.iv = new Buffer(message.iv, "hex");
        message.ephemPublicKey = new Buffer(message.ephem_public_key, "hex");
        message.ciphertext = new Buffer(message.ciphertext, "hex");
        message.mac = new Buffer(message.mac, "hex");
        try {
            var privKey = new Buffer(req.body.privateKey, "hex");
        } catch(err) {
            res.json({
                success: false,
                message: "Unable to verify the transaction: bad private key."
            });
        }
        eccrypto.decrypt(privKey, message)
            .then(function(decrypted) {
                return decrypted.toString();
            })
            .then(function(decrypted) {
                var hash = crypto.createHash("sha256").update(decrypted).digest();
                var pubKey = new Buffer(senderPublicKey, "hex");

                return eccrypto.verify(new Buffer(pubKey, "hex"), hash, signature);
            })
            .then(function() {
                res.json({
                    success: true,
                    verified: true
                });
            })
            .catch(function(err) {
                console.log(err.message);
                res.json({
                    success: true,
                    verified: false
                });
            });
    }
});


module.exports = router;
