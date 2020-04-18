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

module.exports = Block, computeHash, isValid;