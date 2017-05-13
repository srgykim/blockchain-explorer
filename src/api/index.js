'use strict';

var express     = require('express');
var zip         = require('express-zip');
var jwt         = require('jsonwebtoken');
var crypto      = require('crypto');
var eccrypto    = require('eccrypto');
var fs          = require('fs');
var cassandra   = require('cassandra-driver');
var merkle      = require('merkle');
var shell       = require('shelljs');
var multer      = require('multer');
var fs          = require('fs');

var config      = require('../config');

var router      = express.Router();
var client      = new cassandra.Client(config.cassandra);


router.get("/users/serv", function(req, res) {
    shell.exec("openssl x509 -pubkey -noout -in src/api/tmp/public.pem > src/api/tmp/public_key.pem");
    res.json({success:true});
});
// create a new user
router.post("/users", function(req, res) {
    var user = req.body;

    user.password = crypto.createHash("sha256").update(user.password).digest().toString("hex");

    shell.exec("openssl ec -pubin -inform PEM -text -noout < src/api/tmp/public_key.pem -out src/api/tmp/public_key_hex.txt");
    var publicKey = fs.readFileSync(__dirname + '/tmp/public_key_hex.txt').toString().split("\n");

    var pubKey = "";
    for (var i = 1; i <= 5; i++) {
        publicKey[i].trim().split(":").forEach(function(num) {
            pubKey += num;
        });
    }

    user.publicKey = pubKey;

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
            var selectQuery = "SELECT username, first_name, last_name, organization FROM user WHERE username = ?";
            client.execute(selectQuery, [req.params.username])
                .then(function(result) {
                    output = result.rows[0];

                    if (result.length == 0) {
                        res.json({
                            publicKey: output.public_key,
                            success: false,
                            message: "Error no such username"
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



// change user private information
router.put("/user_info/:username", function(req, res) {

    var output = [];
    var user_info = req.body.user_info;
    var token = req.headers.authorization;

    if (req.params.username) {
        jwt.verify(token, config.auth.secret, function(err, decoded) {
            if (err) {
                res.json({
                    success: false,
                    message: "Invalid token"
                });
            }

            var selectQuery = "Select username From user Where username = ?";
            var updateQuery;

            if (user_info.changePass){
                updateQuery = "UPDATE user Set first_name = ?, last_name = ?, organization = ?, password = ?  WHERE username = ?";

                user_info.password = crypto.createHash("sha256").update(user_info.password).digest().toString("hex");

                client.execute(selectQuery, [user_info.username])
                    .then(function(result) {
                        if(result.rows[0]) {
                            updateQuery = "UPDATE user Set first_name = ?, last_name = ?, organization = ?, password = ? WHERE username = ?";
                            client.execute(updateQuery, [user_info.first_name, user_info.last_name, user_info.organization, user_info.password, user_info.username])
                                .then(function(result) {
                                    res.json({
                                        success: true,
                                        message: "Information was successfully saved"
                                    });
                                });
                        } else {
                            res.json({
                                success: false,
                                message: "No account with such username"
                            });
                        }
                    });

            } else {
                client.execute(selectQuery, [user_info.username])
                    .then(function(result) {
                        if(result.rows[0]) {
                            updateQuery = "UPDATE user Set first_name = ?, last_name = ?, organization = ? WHERE username = ?";
                            client.execute(updateQuery, [user_info.first_name, user_info.last_name, user_info.organization, user_info.username])
                                .then(function(result) {
                                    res.json({
                                        success: true,
                                        message: "Information was successfully saved"
                                    });
                                });
                        } else {
                            res.json({
                                success: false,
                                message: "No account with such username"
                            });
                        }
                    });
            }
        });
    }
});



// download key pair of registered user
router.get("/users/keys", function(req, res) {
    var privPath = __dirname + '/tmp/private.key';
    var pubPath = __dirname + '/tmp/public.pem';
    var readmePath = __dirname + '/tmp/readme.txt';

    shell.exec("openssl ecparam -genkey -name secp256k1 -out src/api/tmp/private.key");
    shell.exec("openssl req -new -SHA256 -key src/api/tmp/private.key -nodes -out src/api/tmp/public.csr -batch");
    shell.exec("openssl x509 -req -SHA256 -days 3650 -in src/api/tmp/public.csr -CA src/api/tmp/certificate_authority.pem -CAkey src/api/tmp/certificate_authority.key -CAcreateserial -out src/api/tmp/public.pem");

    res.zip([
        { path: privPath, name: 'private.key' },
        { path: pubPath, name: 'public.pem' },
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


router.get("/blocks/1", function(req, res) {
    shell.exec("openssl x509 -pubkey -noout -in src/api/uploads/public.pem > src/api/tmp/public_key.pem");
    res.json({success:true});
});

// create a new block
router.post("/blocks", function(req, res) {
    var bindVariables = {};
    var token = req.headers.authorization;
    bindVariables.tx = req.body.tx;
    // console.log(bindVariables.tx.sendFileUploaded + "    " + bindVariables.tx.sendFileName);

    if (token) {
        jwt.verify(token, config.auth.secret, function (err, decoded) {
            if (err) {
                res.json({
                    success: false,
                    message: "Invalid token"
                });
            }
            var pubKeyQuery = "SELECT public_key FROM user WHERE username = ?";
            client.execute(pubKeyQuery, [req.body.username])
                .then(function (result) {

                    bindVariables.tx.senderPublicKey = new Buffer(result.rows[0].public_key, "hex");

                    // find block height
                    var heightQuery = "SELECT MAX(height) AS max_height FROM block";
                    return client.execute(heightQuery);
                })
                .then(function (result) {
                    bindVariables.height = result.rows[0].max_height + 1;

                    // make block header
                    var lastBlockHeaderQuery = "SELECT * FROM block WHERE height = " + (bindVariables.height - 1).toString();
                    return client.execute(lastBlockHeaderQuery);
                })
                .then(function (result) {
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
                .then(function (result) {
                    var concatendatedTxs = [];
                    result.rows.forEach(function (row) {
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

                    shell.exec("openssl ec -inform PEM -text -noout < src/api/uploads/private.key -out src/api/tmp/private_key_hex.txt");
                    var privateKey = fs.readFileSync(__dirname + '/tmp/private_key_hex.txt').toString().split("\n");

                    var privKey = "";
                    for (var i = 2; i <= 4; i++) {
                        privateKey[i].trim().split(":").forEach(function (num) {
                            privKey += num;
                        });
                    }
                    if (privKey.substr(0, 2) == "00") {
                        privKey = privKey.substr(2, privKey.length);
                    }

                    bindVariables.tx.senderPrivateKey = new Buffer(privKey, "hex");
                    var hash = crypto.createHash("sha256").update(bindVariables.tx.data).digest();

                    return eccrypto.sign(bindVariables.tx.senderPrivateKey, hash);
                })
                .then(function (signature) {
                    bindVariables.tx.signature = signature.toString("hex");
                    bindVariables.tx.file_signature = "";
                    if(bindVariables.tx.sendFileUploaded){
                        bindVariables.tx.file_data = fs.readFileSync(__dirname + '/uploads/' + bindVariables.tx.sendFileName);
                        // console.log("Synchronouse read: " + file_data);

                        var hash = crypto.createHash("sha256").update(bindVariables.tx.file_data).digest();
                        eccrypto.sign(bindVariables.tx.senderPrivateKey, hash)
                            .then(function(file_signature) {
                                bindVariables.tx.file_signature = file_signature.toString("hex");
                                // console.log("File Signature: " + bindVariables.tx.file_signature);
                            });
                    }

                    // find receiver's public key by username
                    var receiverPubQuery = "SELECT public_key FROM user WHERE username = ?";
                    return client.execute(receiverPubQuery, [bindVariables.tx.receiverUsername]);
                })
                .then(function (result) {
                    // encrypt transaction data
                    bindVariables.tx.data = new Buffer(bindVariables.tx.data);
                    bindVariables.tx.receiverPublicKey = new Buffer(result.rows[0].public_key, "hex");

                    if(bindVariables.tx.sendFileUploaded){
                        eccrypto.encrypt(bindVariables.tx.receiverPublicKey, bindVariables.tx.file_data)
                            .then(function(encrypted) {
                                bindVariables.tx.file_data = {
                                    iv: encrypted.iv.toString("hex"),
                                    ephemPublicKey: encrypted.ephemPublicKey.toString("hex"),
                                    ciphertext: encrypted.ciphertext.toString("hex"),
                                    mac: encrypted.mac.toString("hex")
                                };
                            });
                    } else {
                        bindVariables.tx.file_data = {
                                    iv: "",
                                    ephemPublicKey: "",
                                    ciphertext: "",
                                    mac: ""
                                };
                    }

                    return eccrypto.encrypt(bindVariables.tx.receiverPublicKey, bindVariables.tx.data);
                })
                .then(function (encrypted) {

                    bindVariables.tx.data = {
                        iv: encrypted.iv.toString("hex"),
                        ephemPublicKey: encrypted.ephemPublicKey.toString("hex"),
                        ciphertext: encrypted.ciphertext.toString("hex"),
                        mac: encrypted.mac.toString("hex")
                    };
                    // console.log(bindVariables.tx);

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
                        "       file_signature: '" + bindVariables.tx.file_signature + "', " +
                        "       filename: '" + bindVariables.tx.sendFileName + "', " +
                        "		timestamp: toTimeStamp(now()), " +
                        "		data: {" +
                        "			iv: '" + bindVariables.tx.data.iv + "', " +
                        "			ephem_public_key: '" + bindVariables.tx.data.ephemPublicKey + "', " +
                        "			ciphertext: '" + bindVariables.tx.data.ciphertext + "', " +
                        "			mac: '" + bindVariables.tx.data.mac + "'" +
                        "		}" + ", " +
                        "       file_data: {" +
                        "           iv: '" + bindVariables.tx.file_data.iv + "', " +
                        "           ephem_public_key: '" + bindVariables.tx.file_data.ephemPublicKey + "', " +
                        "           ciphertext: '" + bindVariables.tx.file_data.ciphertext + "', " +
                        "           mac: '" + bindVariables.tx.file_data.mac + "'" +
                        "       }" +
                        "	})";
                    return client.execute(blockInsertQuery);
                })
                .then(function (result) {
                    res.json({
                        success: true,
                        message: "Data has been sent."
                    })
                })
                .catch(function (error) {
                    console.log(error);
                    res.json({
                        success: false,
                        message: "Send Message Error: check inputs for correctness"
                    });
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

                shell.exec("openssl ec -inform PEM -text -noout < src/api/uploads/private.key -out src/api/tmp/private_key_hex.txt");
                var privateKey = fs.readFileSync(__dirname + '/tmp/private_key_hex.txt').toString().split("\n");

                var privKey = "";
                for (var i = 2; i <= 4; i++) {
                    privateKey[i].trim().split(":").forEach(function (num) {
                        privKey += num;
                    });
                }
                if (privKey.substr(0, 2) == "00") {
                    privKey = privKey.substr(2, privKey.length);
                }

                bindVariables.tx.senderPrivateKey = new Buffer(privKey, "hex");
                var hash = crypto.createHash("sha256").update(bindVariables.tx.data).digest();

                return eccrypto.sign(bindVariables.tx.senderPrivateKey, hash);
            })
            .then(function(signature) {
                bindVariables.tx.signature = signature.toString("hex");

                // find receiver's public key by username
                var receiverPubQuery = "SELECT public_key FROM user WHERE username = ?";
                return client.execute(receiverPubQuery, [bindVariables.tx.receiverUsername]);
            })
            .then(function (result) {
                // encrypt transaction data
                bindVariables.tx.data = new Buffer(bindVariables.tx.data);
                bindVariables.tx.receiverPublicKey = new Buffer(result.rows[0].public_key, "hex");

                return eccrypto.encrypt(bindVariables.tx.receiverPublicKey, bindVariables.tx.data);
            })
            .then(function(encrypted) {
                bindVariables.tx.data = {
                    iv: encrypted.iv.toString("hex"),
                    ephemPublicKey: encrypted.ephemPublicKey.toString("hex"),
                    ciphertext: encrypted.ciphertext.toString("hex"),
                    mac: encrypted.mac.toString("hex")
                };

                shell.exec("openssl ec -pubin -inform PEM -text -noout < src/api/tmp/public_key.pem -out src/api/tmp/public_key_hex.txt");
                var spublicKey = fs.readFileSync(__dirname + '/tmp/public_key_hex.txt').toString().split("\n");

                var spubKey = "";
                for (var i = 1; i <= 5; i++) {
                    spublicKey[i].trim().split(":").forEach(function(num) {
                        spubKey += num;
                    });
                }


                bindVariables.tx.senderPublicKey = spubKey;
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
            })
            .catch(function () {
                    res.json({
                        success: false,
                        message: "Send Message Error: check inputs for correctness"
                    });
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


router.get("/transactions/1", function(req, res) {
    shell.exec("openssl x509 -pubkey -noout -in src/api/uploads/public.pem > src/api/tmp/public_key.pem");
    res.json({status: true});
});
// get all transactions
router.post("/transactions", function(req, res) {
    var txs = [];
    var publicKey = null;
    var token = req.headers.authorization;
    var txsQuery = "SELECT transaction FROM block";

    shell.exec("openssl ec -pubin -inform PEM -text -noout < src/api/tmp/public_key.pem -out src/api/tmp/public_key_hex.txt");
    publicKey = fs.readFileSync(__dirname + '/tmp/public_key_hex.txt').toString().split("\n");

    var pubKey = "";
    for (var i = 1; i <= 5; i++) {
        publicKey[i].trim().split(":").forEach(function(num) {
            pubKey += num;
        });
    }

    client.execute(txsQuery)
    .then(function(result) {
        result.rows.forEach(function(row) {
            if (row.transaction.receiver_public_key === pubKey) {
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
    console.log(data);
    data.iv = new Buffer(data.iv, "hex");
    data.ephemPublicKey = new Buffer(data.ephem_public_key, "hex");
    data.ciphertext = new Buffer(data.ciphertext, "hex");
    data.mac = new Buffer(data.mac, "hex");

    shell.exec("openssl ec -inform PEM -text -noout < src/api/uploads/private.key -out src/api/tmp/private_key_hex.txt");
    var privateKey = fs.readFileSync(__dirname + '/tmp/private_key_hex.txt').toString().split("\n");

    var privKey = "";
    for (var i = 2; i <= 4; i++) {
        privateKey[i].trim().split(":").forEach(function(num) {
            privKey += num;
        });
    }

    if (privKey.substr(0, 2) == "00") {
        privKey = privKey.substr(2, privKey.length);
    }
    var privKeyBuff = new Buffer(privKey, "hex");

    eccrypto.decrypt(privKeyBuff, data)
        .then(function(decrypted) {
            res.json({
                success: true,
                data: decrypted.toString()
            });
        })
        .catch(function(err) {
            console.log(err);
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

    shell.exec("openssl ec -inform PEM -text -noout < src/api/uploads/private.key -out src/api/tmp/private_key_hex.txt");
    var privateKey = fs.readFileSync(__dirname + '/tmp/private_key_hex.txt').toString().split("\n");

    var privKey = "";
    for (var i = 2; i <= 4; i++) {
        privateKey[i].trim().split(":").forEach(function(num) {
            privKey += num;
        });
    }

    if (privKey.substr(0, 2) == "00") {
        privKey = privKey.substr(2, privKey.length);
    }

    var privKeyBuff = new Buffer(privKey, "hex");

    eccrypto.decrypt(privKeyBuff, data)
        .then(function(decrypted) {
            return decrypted.toString();
        })
        .then(function(decrypted) {
            console.log(decrypted);
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
            console.log("ERROR: " +  err.message);
            res.json({
                success: true,
                verified: false
            });
        });
});


// get all transactions
router.post("/users_list/:username", function(req, res) {
    var users = [];
    var token = req.headers.authorization;

    if (req.params.username == "admin") {
        jwt.verify(token, config.auth.secret, function(err, decoded) {
            if (err) {
                res.json({
                    success: false,
                    message: "Invalid token"
                });
            }
            var pubKeyQuery = "SELECT username, first_name, last_name, organization FROM user";
            client.execute(pubKeyQuery)
                .then(function(result) {
                    users = result.rows;
                    if (users.length === 0) {
                        res.json({
                            success: false,
                            message: "Something went wrong during receiving of userslist"
                        });
                    } else {
                        res.json({
                            success: true,
                            users: users
                        });
                    }
                });
        });
    }
});



// generate a new key pair
router.get("/generate", function(req, res) {
    var privPath = __dirname + '/tmp/private.key';
    var pubPath = __dirname + '/tmp/public.pem';
    var readmePath = __dirname + '/tmp/readme.txt';

    shell.exec("openssl ecparam -genkey -name secp256k1 -out src/api/tmp/private.key");
    shell.exec("openssl req -new -SHA256 -key src/api/tmp/private.key -nodes -out src/api/tmp/public.csr -batch");
    shell.exec("openssl x509 -req -SHA256 -days 3650 -in src/api/tmp/public.csr -CA src/api/tmp/certificate_authority.pem -CAkey src/api/tmp/certificate_authority.key -CAcreateserial -out src/api/tmp/public.pem");

    res.zip([
        { path: privPath, name: 'private.key' },
        { path: pubPath, name: 'public.pem' },
        { path: readmePath, name: 'readme.txt' }
    ]);
});



var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, __dirname + '/uploads/')
    },
    filename: function (req, file, cb) {
        var datetimestamp = Date.now();
        cb(null, file.originalname);
    }
});

var upload = multer({
    storage: storage
}).single('file');

// upload a file
router.post('/upload', function(req, res) {
    upload(req,res,function(err){
        if(err){
            res.json({error_code:1,err_desc:err});
            return;
        }
        res.json({error_code:0,err_desc:null});
    });
});



module.exports = router;
