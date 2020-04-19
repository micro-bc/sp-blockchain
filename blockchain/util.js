const crypto = require('crypto');
const Block = require("./Block");

/**
 * @description set of internal functions for validating blocks, chains
 */
module.exports = {
    /**
     * Block.computeHash()
     * @param {number} index
     * @param {number} timestamp Date.now() value
     * @param {string} data
     * @param {number} difficulty
     * @param {number} nonce
     * @param {string} previousHash sha256 hash
     * @returns {string} sha265 hash
     */
    computeHash: function (index, timestamp, data, difficulty, nonce, previousHash) {
        return crypto.createHash('sha256')
            .update(String(index) + String(timestamp) + data + String(difficulty) + String(nonce) + previousHash)
            .digest('hex');
    },

    /**
     * Block.isHashValid()
     * @description checks that hash starts with difficulty-zeroes
     * @param {string} hash
     * @param {number} difficulty
     * @returns {boolean} 
     */
    isHashValid: function(hash, difficulty) {
        return hash.startsWith('0'.repeat(difficulty));
    },

    /**
     * Block.isBlockValid()
     * @description checks index, prevHash, hash
     * @param { Block } block
     * @param { Block } previousBlock
     * @returns { boolean } 
     */
    isBlockValid: function (block, previousBlock) {
        return block.index == previousBlock.index + 1
            && block.previousHash == previousBlock.hash
            && this.isHashValid(block.hash, block.difficulty)
            && this.computeHash(block.index, block.timestamp, block.data, block.previousHash) == block.hash;
    },

    /**
     * Blockchain.isChainValid()
     * @description checks block validity for all blocks in the chain
     * @param {Block[]}
     * @returns {boolean}
     */
    isChainValid: function(chain) {
        const genesisBlock = chain[0];
        if (genesisBlock.hash != this.computeHash(genesisBlock.index, genesisBlock.timestamp, genesisBlock.data, genesisBlock.previousHash))
            return false;

        for (let i = 1; i < chain.length; i++)
            if (!this.isBlockValid(chain[i], chain[i - 1]))
                return false;

        return true;
    }
}
