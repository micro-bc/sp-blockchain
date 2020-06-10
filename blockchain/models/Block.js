const crypto = require('crypto');

/**
 * @description Block class definition
 */
class Block {
    /**
     * @param {number} index
     * @param {number} timestamp Math.floor(Date.now() / 1000)
     * @param {Transaction[]} transactions
     * @param {number} difficulty Number of required zeroes in the begining of the hash
     * @param {number} nonce Random integer value used to find a hash with corresponding difficulty
     * @param {string} previousHash Previous block's hash value
     * @param {string} hash This block's hash value
     */
    constructor(index, timestamp, transactions, difficulty, nonce, previousHash, hash) {
        this.index = index;
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.difficulty = difficulty;
        this.nonce = nonce;
        this.previousHash = previousHash;
        this.hash = hash;
    }
}

/**
 * Block.getHash()
 * @param {number} index
 * @param {number} timestamp
 * @param {Transaction[]} transactions
 * @param {number} difficulty
 * @param {number} nonce
 * @param {string} previousHash
 * @returns {string} hash
 */
function getHash(index, timestamp, transactions, difficulty, nonce, previousHash) {
    return crypto.createHash('sha256')
        .update(String(index) + String(timestamp) + transactions + String(difficulty) + String(nonce) + previousHash)
        .digest('hex');
}

/**
 * Block.isHashValid()
 * @description checks whether the hash starts with difficulty-zeroes
 * @param {string} hash
 * @param {number} difficulty
 * @returns {boolean}
 */
function isHashValid(hash, difficulty) {
    return hash.startsWith('0'.repeat(difficulty));
}

/**
 * Block.isTimestampValid()
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
 * @param {Block} block
 * @param {Block} previousBlock
 * @returns {boolean}
 */
function isBlockValid(block, previousBlock) {
    return block.index === previousBlock.index + 1
        && block.previousHash === previousBlock.hash
        && this.isTimestampValid(block.timestamp, previousBlock.timestamp)
        && this.isHashValid(block.hash, block.difficulty)
        && this.getHash(block.index, block.timestamp, block.transactions, block.difficulty, block.nonce, block.previousHash) === block.hash;
}

module.exports = {
    Block,
    getHash,
    isHashValid, isTimestampValid, isBlockValid
}
