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

module.exports = Block;