const crypto = require('crypto');

/**
 * @description Block class definition
 */
class Block {
    /**
     * @param {number} index
     * @param {number} timestamp Math.floor(Date.now() / 1000)
     * @param {string} data
     * @param {number} difficulty Number of required zeroes in the begining of the hash
     * @param {number} nonce Random integer value used to find a hash with corresponding difficulty
     * @param {string} previousHash Previous block's hash value
     * @param {string} hash This block's hash value
     */
    constructor(index, timestamp, data, difficulty, nonce, previousHash, hash) {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data;
        this.difficulty = difficulty;
        this.nonce = nonce;
        this.previousHash = previousHash;
        this.hash = hash;
    }
}

/**
 * Block.getHash()
 * @param {number} index
 * @param {number} timestamp Math.floor(Date.now() / 1000) value
 * @param {string} data
 * @param {number} difficulty
 * @param {number} nonce
 * @param {string} previousHash sha256 hash
 * @returns {string} sha265 hash
 */
function getHash(index, timestamp, data, difficulty, nonce, previousHash) {
    return crypto.createHash('sha256')
        .update(String(index) + String(timestamp) + data + String(difficulty) + String(nonce) + previousHash)
        .digest('hex');
}

/**
 * Block.isHashValid()
 * @description checks that hash starts with difficulty-zeroes
 * @param {string} hash
 * @param {number} difficulty
 * @returns {boolean}
 */
function isHashValid(hash, difficulty) {
    return hash.startsWith('0'.repeat(difficulty));
}

/**
 * Block.isTimestampValid()
 * @description checks that hash starts with difficulty-zeroes
 * @param {number} timestamp
 * @param {number} previousTimestamp
 * @returns {boolean}
 */
function isTimestampValid(timestamp, previousTimestamp) {
    return (previousTimestamp - 60 < timestamp)
        && timestamp - 60 < Math.floor(Date.now() / 1000);
}

/**
 * Block.isValid()
 * @description checks index, prevHash, hash
 * @param {Block} block
 * @param {Block} previousBlock
 * @returns {boolean}
 */
function isValid(block, previousBlock) {
    return block.index === previousBlock.index + 1
        && block.previousHash === previousBlock.hash
        && this.isTimestampValid(block.timestamp, previousBlock.timestamp)
        && this.isHashValid(block.hash, block.difficulty)
        && this.getHash(block.index, block.timestamp, block.data, block.difficulty, block.nonce, block.previousHash) === block.hash;
}

/**
 * Blockchain.containsDupes()
 * @description check if a block contains duplicate transactions
 * @param {TxIn[]} txIns 
 * @returns {boolean}
 */
function containsDupes(TxIns) {
    const groups = _.countBy(txIns, (txIn) => txIn.txOutId + txIn.txOutId);
    return _(groups)
        .map((value, key) => {
            if (value > 1)
                return true;
            else
                return false;
        })
        .includes(true);
}

/**
 * Blockchain.isTransactionArrayValid()
 * @description check if transaction is valid
 * @param {Transaction[]} transactions
 * @param {UnspentTxOut[]} unspentTxOuts
 * @param {number} blockIndex
 * @returns {boolean}
 */
function isTransactionArrayValid(transactions, unspentTxOuts, blockIndex, callback = (err) => { }) {
    const coinbaseTx = transactions[0];

    if (!validateCoinbaseTx(coinbaseTx, blockIndex))
        return callback('invalid coinbase transaction: ' + JSON.stringify(coinbaseTx), false);

    const txIns = _(transactions)
        .map((tx) => tx.txIns)
        .flatten()
        .value();

    if (this.hasDuplicateTxs(txIns))
        return callback("Block contains transaction duplicates", false);

    const normalTransactions = transactions.slice(1);
    const result = normalTransactions.map((tx) => this.isTxValid(tx, unspentTxOuts))
        .reduce((a, b, c) => (a && b && c), true);
    if (!result)
        return callback("Invalid transacion(s) found", false);

    return callback(null, true);
}

module.exports = {
    Block,
    getHash,
    isHashValid, isTimestampValid, isValid, containsDupes, isTransactionArrayValid
}