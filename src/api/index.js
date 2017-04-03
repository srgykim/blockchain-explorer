'use strict';

var express     = require('express');
var zip         = require('express-zip');
var jwt         = require('jsonwebtoken');
var crypto      = require('crypto');
var eccrypto    = require('eccrypto');
var fs          = require('fs');
var cassandra   = require('cassandra-driver');
var merkle      = require('merkle');

var config      = require('../config');

var router      = express.Router();
var client      = new cassandra.Client(config.cassandra);


// create a new user
router.post("/users", function(req, res) {
    var user = req.body;

    user.password = crypto.createHash("sha256").update(user.password).digest().toString("hex");

    user.privateKey = crypto.randomBytes(32);
    user.publicKey = eccrypto.getPublic(user.privateKey);
    user.privateKey = user.privateKey.toString("hex");
    user.publicKey = user.publicKey.toString("hex");

    var userExistsQuery = "SELECT * FROM user WHERE username = ?";
    client.execute(userExistsQuery, [user.username])
        .then(function(result) {
            if (result.rows[0]) {
                res.status(409);
                res.json({
                    success: false,
                    error: "User already exists"
                })
            } else {
                var userInsertQuery = "INSERT INTO user (username, first_name, last_name, organization, password, public_key) VALUES (?, ?, ?, ?, ?, ?)";
                return client.execute(userInsertQuery, [user.username, user.first_name, user.last_name, user.organization, user.password, user.publicKey]);
            }
        })
        .then(function(result) {
            var privPath = __dirname + '/tmp/ECC_PRIVATE_KEY.txt';
            var pubPath = __dirname + '/tmp/ECC_PUBLIC_KEY.txt';

            var privateKey = user.privateKey;
            var publicKey = user.publicKey;

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

            res.json({
                success: true,
                message: "A new user has been created"
            });
        })
        .catch(function(err) {
            res.status(500);
            res.json({
                success: false,
                error: err.message
            });
        });
});



// get user private information
router.post("/user_info/:username", function(req, res) {
    var output = [];
    var user_info = null;
    var token = req.headers.authorization;

    if (req.params.username) {
        jwt.verify(token, config.auth.secret, function(err, decoded) {
            if (err) {
                res.json({
                    success: false,
                    message: "Invalid token"
                });
            }
            var pubKeyQuery = "SELECT username, first_name, last_name, organization FROM user WHERE username = ?";
            client.execute(pubKeyQuery, [req.params.username])
                .then(function(result) {
                    output = result.rows[0];

                    if (result.length == 0) {
                        res.json({
                            publicKey: output.public_key,
                            success: false,
                            message: "No transactions found"
                        });
                    } else {
                        res.json({
                            success: true,
                            user_info: output
                        });
                    }
                });
        });
    }
});

// download key pair of registered user
router.get("/users/keys", function(req, res) {
    var privPath = __dirname + '/tmp/ECC_PRIVATE_KEY.txt';
    var pubPath = __dirname + '/tmp/ECC_PUBLIC_KEY.txt';
    var readmePath = __dirname + '/tmp/readme.txt';

    res.zip([
        { path: privPath, name: 'ECC_PRIVATE_KEY.txt' },
        { path: pubPath, name: 'ECC_PUBLIC_KEY.txt' },
        { path: readmePath, name: 'readme.txt' }
    ]);
});

// authenticate a user
router.post("/auth", function(req, res) {
    var user = req.body;

    user.password = crypto.createHash("sha256").update(user.password).digest().toString("hex");

    var passVerQuery = "SELECT password FROM user WHERE username = ?";
    client.execute(passVerQuery, [user.username])
        .then(function(result) {
            if (user.password === result.rows[0].password) {
                var token = jwt.sign(user, config.auth.secret, {
                    expiresIn: "2 days"
                });
                res.json({
                    success: true,
                    message: "User authenticated",
                    token: token
                });
            } else {
                res.status(300);
                res.json({
                    success: false,
                    message: "Authentication failed"
                });
            }
    });
});


// create a new block
router.post("/blocks", function(req, res) {
    var bindVariables = {};
    var token = req.headers.authorization;
    bindVariables.tx = req.body.tx;

    if (token) {
        jwt.verify(token, config.auth.secret, function(err, decoded) {
            if (err) {
                res.json({
                    success: false,
                    message: "Invalid token"
                });
            }
            var pubKeyQuery = "SELECT public_key FROM user WHERE username = ?";
            client.execute(pubKeyQuery, [req.body.username])
                .then(function(result) {
                    bindVariables.tx.senderPublicKey = new Buffer(result.rows[0].public_key, "hex");

                    // find block height
                    var heightQuery = "SELECT MAX(height) AS max_height FROM block";
                    return client.execute(heightQuery);
                })
                .then(function(result) {
                    bindVariables.height = result.rows[0].max_height + 1;

                    // make block header
                    var lastBlockHeaderQuery = "SELECT * FROM block WHERE height = " + (bindVariables.height - 1).toString();
                    return client.execute(lastBlockHeaderQuery);
                })
                .then(function(result) {
                    // hash previous block header twice
                    var lastHeader = result.rows[0];
                    var concatenatedLastHeader = lastHeader.previous_block_hash +
                        lastHeader.merkle_root +
                        lastHeader.timestamp.toString();
                    var lastHeaderHash = crypto.createHash("sha256")
                        .update(concatenatedLastHeader).digest()
                        .toString("hex");
                    lastHeaderHash = crypto.createHash("sha256")
                        .update(lastHeaderHash).digest()
                        .toString("hex");
                    bindVariables.previousBlockHash = lastHeaderHash;

                    var merkleRootQuery = "SELECT transaction FROM block";
                    return client.execute(merkleRootQuery);
                })
                .then(function(result) {
                    var concatendatedTxs = [];
                    result.rows.forEach(function(row) {
                        var concatenatedTx = "";
                        concatenatedTx += row.transaction.sender_public_key;
                        concatenatedTx += row.transaction.receiver_public_key;
                        concatenatedTx += row.transaction.signature;
                        concatenatedTx += row.transaction.timestamp;
                        concatenatedTx += row.transaction.data.iv;
                        concatenatedTx += row.transaction.data.ephem_public_key;
                        concatenatedTx += row.transaction.data.ciphertext;
                        concatenatedTx += row.transaction.data.mac;
                        concatendatedTxs.push(concatenatedTx);
                    });
                    bindVariables.merkleRoot = merkle("sha256").sync(concatendatedTxs).root();

                    // sign a new transaction
                    bindVariables.tx.senderPrivateKey = new Buffer(bindVariables.tx.senderPrivateKey, "hex");
                    var hash = crypto.createHash("sha256").update(bindVariables.tx.data).digest();
                    return eccrypto.sign(bindVariables.tx.senderPrivateKey, hash);
                })
                .then(function(signature) {
                    bindVariables.tx.signature = signature.toString("hex");

                    // find receiver's public key by username
                    var receiverPubQuery = "SELECT public_key FROM user WHERE username = ?";
                    return client.execute(receiverPubQuery, [bindVariables.tx.receiverUsername]);
                })
                .then(function(result) {
                    if (result.rows[0].public_key) {
                        // encrypt transaction data
                        bindVariables.tx.data = new Buffer(bindVariables.tx.data);
                        bindVariables.tx.receiverPublicKey = new Buffer(result.rows[0].public_key, "hex");
                        return eccrypto.encrypt(bindVariables.tx.receiverPublicKey, bindVariables.tx.data);
                    } else {
                        res.json({
                            success: false,
                            message: "User not found"
                        });
                    }
                })
                .then(function(encrypted) {
                    bindVariables.tx.data = {
                        iv: encrypted.iv.toString("hex"),
                        ephemPublicKey: encrypted.ephemPublicKey.toString("hex"),
                        ciphertext: encrypted.ciphertext.toString("hex"),
                        mac: encrypted.mac.toString("hex")
                    };

                    bindVariables.tx.senderPublicKey = bindVariables.tx.senderPublicKey.toString("hex");
                    bindVariables.tx.receiverPublicKey = bindVariables.tx.receiverPublicKey.toString("hex");

                    // insert a new block
                    var blockInsertQuery = "" +
                        "INSERT INTO block (height, previous_block_hash, merkle_root, timestamp, transaction) " +
                        "VALUES (" + bindVariables.height + ", '" +
                        bindVariables.previousBlockHash + "', '" +
                        bindVariables.merkleRoot + "', " + "toTimeStamp(now()), " +
                        "	{" +
                        "		sender_public_key: '" + bindVariables.tx.senderPublicKey + "', " +
                        "		receiver_public_key: '" + bindVariables.tx.receiverPublicKey + "', " +
                        "		signature: '" + bindVariables.tx.signature + "', " +
                        "		timestamp: toTimeStamp(now()), " +
                        "		data: {" +
                        "			iv: '" + bindVariables.tx.data.iv + "', " +
                        "			ephem_public_key: '" + bindVariables.tx.data.ephemPublicKey + "', " +
                        "			ciphertext: '" + bindVariables.tx.data.ciphertext + "', " +
                        "			mac: '" + bindVariables.tx.data.mac + "'" +
                        "		}" +
                        "	})";
                    return client.execute(blockInsertQuery);
                })
                .then(function(result) {
                    res.json({
                        success: true,
                        message: "Data has been sent."
                    })
                });
        });
    } else {
        // find block height
        var heightQuery = "SELECT MAX(height) AS max_height FROM block";
        client.execute(heightQuery)
            .then(function(result) {
                bindVariables.height = result.rows[0].max_height + 1;

                // make block header
                var lastBlockHeaderQuery = "SELECT * FROM block WHERE height = " + (bindVariables.height - 1).toString();
                return client.execute(lastBlockHeaderQuery);
            })
            .then(function(result) {
                // hash previous block header twice
                var lastHeader = result.rows[0];
                var concatenatedLastHeader = lastHeader.previous_block_hash +
                    lastHeader.merkle_root +
                    lastHeader.timestamp.toString();
                var lastHeaderHash = crypto.createHash("sha256")
                    .update(concatenatedLastHeader).digest()
                    .toString("hex");
                lastHeaderHash = crypto.createHash("sha256")
                    .update(lastHeaderHash).digest()
                    .toString("hex");
                bindVariables.previousBlockHash = lastHeaderHash;

                var merkleRootQuery = "SELECT transaction FROM block";
                return client.execute(merkleRootQuery);
            })
            .then(function(result) {
                var concatendatedTxs = [];
                result.rows.forEach(function(row) {
                    var concatenatedTx = "";
                    concatenatedTx += row.transaction.sender_public_key;
                    concatenatedTx += row.transaction.receiver_public_key;
                    concatenatedTx += row.transaction.signature;
                    concatenatedTx += row.transaction.timestamp;
                    concatenatedTx += row.transaction.data.iv;
                    concatenatedTx += row.transaction.data.ephem_public_key;
                    concatenatedTx += row.transaction.data.ciphertext;
                    concatenatedTx += row.transaction.data.mac;
                    concatendatedTxs.push(concatenatedTx);
                });
                bindVariables.merkleRoot = merkle("sha256").sync(concatendatedTxs).root();

                // sign a new transaction
                bindVariables.tx.senderPrivateKey = new Buffer(bindVariables.tx.senderPrivateKey, "hex");
                var hash = crypto.createHash("sha256").update(bindVariables.tx.data).digest();
                return eccrypto.sign(bindVariables.tx.senderPrivateKey, hash);
            })
            .then(function(signature) {
                bindVariables.tx.signature = signature.toString("hex");

                // encrypt transaction data
                bindVariables.tx.data = new Buffer(bindVariables.tx.data);
                bindVariables.tx.receiverPublicKey = new Buffer(bindVariables.tx.receiverPublicKey, "hex");
                return eccrypto.encrypt(bindVariables.tx.receiverPublicKey, bindVariables.tx.data);
            })
            .then(function(encrypted) {
                bindVariables.tx.data = {
                    iv: encrypted.iv.toString("hex"),
                    ephemPublicKey: encrypted.ephemPublicKey.toString("hex"),
                    ciphertext: encrypted.ciphertext.toString("hex"),
                    mac: encrypted.mac.toString("hex")
                };

                bindVariables.tx.senderPublicKey = bindVariables.tx.senderPublicKey.toString("hex");
                bindVariables.tx.receiverPublicKey = bindVariables.tx.receiverPublicKey.toString("hex");

                // insert a new block
                var blockInsertQuery = "" +
                    "INSERT INTO block (height, previous_block_hash, merkle_root, timestamp, transaction) " +
                    "VALUES (" + bindVariables.height + ", '" +
                    bindVariables.previousBlockHash + "', '" +
                    bindVariables.merkleRoot + "', " + "toTimeStamp(now()), " +
                    "	{" +
                    "		sender_public_key: '" + bindVariables.tx.senderPublicKey + "', " +
                    "		receiver_public_key: '" + bindVariables.tx.receiverPublicKey + "', " +
                    "		signature: '" + bindVariables.tx.signature + "', " +
                    "		timestamp: toTimeStamp(now()), " +
                    "		data: {" +
                    "			iv: '" + bindVariables.tx.data.iv + "', " +
                    "			ephem_public_key: '" + bindVariables.tx.data.ephemPublicKey + "', " +
                    "			ciphertext: '" + bindVariables.tx.data.ciphertext + "', " +
                    "			mac: '" + bindVariables.tx.data.mac + "'" +
                    "		}" +
                    "	})";
                return client.execute(blockInsertQuery);
            })
            .then(function(result) {
                res.json({
                    success: true,
                    message: "Message has been sent."
                })
            });
    }
});

// get all blocks
router.get("/blocks", function(req, res) {

    var blocks = [];
    var query = "SELECT * FROM block";
    client.execute(query)
        .then(function(result) {
            result.rows.forEach(function(row) {
                blocks.push(row);
            });
            res.json({
                success: true,
                blocks: blocks
            });
        });
});


// get all transactions
router.post("/transactions/:username", function(req, res) {
    var txs = [];
    var publicKey = null;
    var token = req.headers.authorization;
    var txsQuery = "SELECT transaction FROM block";

    if (req.params.username) {
        jwt.verify(token, config.auth.secret, function(err, decoded) {
            if (err) {
                res.json({
                    success: false,
                    message: "Invalid token"
                });
            }
            var pubKeyQuery = "SELECT public_key FROM user WHERE username = ?";
            client.execute(pubKeyQuery, [req.params.username])
                .then(function(result) {
                    publicKey = result.rows[0].public_key;
                    return client.execute(txsQuery);
                })
                .then(function(result) {
                    result.rows.forEach(function(row) {
                        if (row.transaction.receiver_public_key === publicKey) {
                            txs.push(row.transaction);
                        }
                    });
                    if (txs.length === 0) {
                        res.json({
                            publicKey: publicKey,
                            success: false,
                            message: "No transactions found"
                        });
                    } else {
                        res.json({
                            success: true,
                            txs: txs
                        });
                    }
                });
        });
    } else {
        publicKey = req.body.publicKey;
        client.execute(txsQuery)
        .then(function(result) {
            result.rows.forEach(function(row) {
                if (row.transaction.receiver_public_key === publicKey) {
                    txs.push(row.transaction);
                }
            });
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
        });
    }
});


// get all transactions
router.post("/transactions", function(req, res) {
    var txs = [];
    var publicKey = null;
    var token = req.headers.authorization;
    var txsQuery = "SELECT transaction FROM block";



    console.log("22222")
    publicKey = req.body.publicKey;
    client.execute(txsQuery)
    .then(function(result) {
        result.rows.forEach(function(row) {
            if (row.transaction.receiver_public_key === publicKey) {
                txs.push(row.transaction);
            }
        });
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
    });
});




router.post("/decrypt", function(req, res) {
    var data = req.body.data;
    data.iv = new Buffer(data.iv, "hex");
    data.ephemPublicKey = new Buffer(data.ephem_public_key, "hex");
    data.ciphertext = new Buffer(data.ciphertext, "hex");
    data.mac = new Buffer(data.mac, "hex");

    var privateKey = new Buffer(req.body.privateKey, "hex");

    eccrypto.decrypt(privateKey, data)
        .then(function(decrypted) {
            res.json({
                success: true,
                data: decrypted.toString()
            });
        })
        .catch(function(err) {
            res.json({
                success: false,
                data: "Unable to decrypt the data."
            });
        });
});

// verify a transaction
router.post("/verify", function(req, res) {
    var senderPublicKey = req.body.tx.sender_public_key;
    var signature = new Buffer(req.body.tx.signature, "hex");
    var data = req.body.tx.data;
    data.iv = new Buffer(data.iv, "hex");
    data.ephemPublicKey = new Buffer(data.ephem_public_key, "hex");
    data.ciphertext = new Buffer(data.ciphertext, "hex");
    data.mac = new Buffer(data.mac, "hex");
    try {
        var privKey = new Buffer(req.body.privateKey, "hex");
    } catch(err) {
        res.json({
            success: false,
            message: "Unable to verify the transaction: bad private key."
        });
    }
    eccrypto.decrypt(privKey, data)
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

// generate a new key pair
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










module.exports = router;
