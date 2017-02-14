DROP TABLE IF EXISTS block;
DROP TYPE IF EXISTS block_header;
DROP TYPE IF EXISTS transaction;
DROP TYPE IF EXISTS encrypted_message;

CREATE TYPE block_header (
	previous_block_hash text,
	merkle_root text,
	timestamp timestamp
);

CREATE TYPE encrypted_message (
	iv text,
	ephem_public_key text,
	ciphertext text,
	mac text
);

CREATE TYPE transaction (
	sender_public_key text,
	receiver_public_key text,
	signature text,
	timestamp timestamp,
	message frozen <encrypted_message>
);

CREATE TABLE block (
	header frozen <block_header> PRIMARY KEY,
	transactions list<frozen<transaction>>
);

INSERT INTO block (header, transactions)
VALUES (
	{
		previous_block_hash: 'c9e57582bf59e6abe23438c08ea9a3690c26a846f507c4660612ebb3dc39bbd6',
		merkle_root: '399d675f7580576ba321dd9bb92a46c024c7daeae8370e788a7c3f7e3d8a1d95',
		timestamp: toTimestamp(now())
	},
	[
		{
			sender_public_key: '04b3556349db7fde708992a86980fb78e6f93084e54b6d2eede817bd536ff336b6e70a32c6890c22f98ac83290a79894b0ea397b75fe9c473e134ae9eea23030ed',
			receiver_public_key: '04e3cc51fef11851e4c1b063ab6a80c3cb2580b03116f62dd4a4051c02a5a821efc8040f34a8df6d51d8f4b9b16099fa618254497694c893433690d257e073bc22',
			signature: '304402203fc60830f715887acc997db79b2ae29716c3959fec5bfc709fc27cb3f02911b90220373feee50e931431829b54c8e071d1df4e163b92e9c2d100e732cb50e945e289',
			timestamp: toTimestamp(now()),
			message: {
				iv: 'bf76f10202ecf24d9af86ecbbdd263ae',
				ephem_public_key: '04cb59514e85ae9a9078f5c5d5a545f81bea8501168f42d1b87514279a0e093f1d77233f1fac7e32693e3974358d954524733a119da9f02483e137436ce67ce0de',
				ciphertext: '6f0481682c4aa6fb49d26e4e064eccf5',
				mac: '869f3ec9e763d3ce33754b1f4fad86760df54a9fbdfa4fa034c9489279dfcc91'
			}
		}
	]
);

SELECT JSON * FROM block;

