const crypto = require('crypto');

/**
 * @description Block class definition
 */
class Block {
    /**
     * @param {number} index
     * @param {number} timestamp Date.now() value
     * @param {string} data
     * @param {string} previousHash Previous block's hash value
     * @param {string} hash This block's hash value
     */
    constructor(index, timestamp, data, previousHash, hash) {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data;
        this.previousHash = previousHash;
        this.hash = hash;
    }
}

/**
 * Block.computeHash()
 * @param {number} index
 * @param {number} timestamp Date.now() value
 * @param {string} data
 * @param {string} previousHash sha256 hash
 * @returns {string} sha265 hash
 */
const computeHash = (index, timestamp, data, previousHash) =>
    crypto.createHash('sha256')
        .update(String(index) + String(timestamp) + data + previousHash)
        .digest('hex');

/**
 * Block.isValid()
 * @description checks index, prevHash, hash
 * @param { Block } block
 * @param { Block } previousBlock
 * @returns { boolean } 
 */
const isValid = (block, previousBlock) =>
    typeof block.index === "number"
    && typeof block.timestamp === "number"
    && typeof block.data === "string"
    && typeof block.previousHash === "string"
    && typeof block.hash === "string"
    && block.index == previousBlock.index + 1
    && block.previousHash == previousBlock.hash
    && computeHash(block.index, block.timestamp, block.data, block.previousHash) == block.hash

/**
 * Block.genesisBlock
 * @description this is a hard-coded genesisBlock with valid hash value
 */
const genesisBlock = new Block(0, 1587242286317, "Genesis block", null, "3bdc1d49f2bdd7096c20eb6c6314adf8ec3b992948db5959e6ca02b86cc92636");

module.exports = Block, computeHash, isValid, genesisBlock;