DROP TABLE IF EXISTS block;
DROP TABLE IF EXISTS user;
DROP TYPE IF EXISTS transaction;
DROP TYPE IF EXISTS encrypted_data;

CREATE TYPE encrypted_data (
	iv text,
	ephem_public_key text,
	ciphertext text,
	mac text
);

CREATE TYPE transaction (
    sender_public_key text,
    receiver_public_key text,
    signature text,
    file_signature text,
    filename text,
    timestamp timestamp,
    data frozen <encrypted_data>,
    file_data frozen <encrypted_data>
);

CREATE TABLE block (
	height int PRIMARY KEY,
	previous_block_hash text,
	merkle_root text,
	timestamp timestamp,
	transaction frozen<transaction>
);

CREATE TABLE user (
    username text PRIMARY KEY,
    password text,
    public_key text,
    first_name text,
    last_name text,
    organization text
);

INSERT INTO block (height, previous_block_hash, merkle_root, timestamp, transaction)
VALUES (0, 'c9e57582bf59e6abe23438c08ea9a3690c26a846f507c4660612ebb3dc39bbd6',
	'399d675f7580576ba321dd9bb92a46c024c7daeae8370e788a7c3f7e3d8a1d95', toTimestamp(now()),
    {
        sender_public_key: '04b3556349db7fde708992a86980fb78e6f93084e54b6d2eede817bd536ff336b6e70a32c6890c22f98ac83290a79894b0ea397b75fe9c473e134ae9eea23030ed',
        receiver_public_key: '04e3cc51fef11851e4c1b063ab6a80c3cb2580b03116f62dd4a4051c02a5a821efc8040f34a8df6d51d8f4b9b16099fa618254497694c893433690d257e073bc22',
        signature: '304402203fc60830f715887acc997db79b2ae29716c3959fec5bfc709fc27cb3f02911b90220373feee50e931431829b54c8e071d1df4e163b92e9c2d100e732cb50e945e289',
        timestamp: toTimestamp(now()),
        data: {
            iv: 'bf76f10202ecf24d9af86ecbbdd263ae',
            ephem_public_key: '04cb59514e85ae9a9078f5c5d5a545f81bea8501168f42d1b87514279a0e093f1d77233f1fac7e32693e3974358d954524733a119da9f02483e137436ce67ce0de',
            ciphertext: '6f0481682c4aa6fb49d26e4e064eccf5',
            mac: '869f3ec9e763d3ce33754b1f4fad86760df54a9fbdfa4fa034c9489279dfcc91'
        }
    }
);

SELECT JSON * FROM block;
SELECT JSON * FROM user;
