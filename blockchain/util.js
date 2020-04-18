const crypto = require('crypto');
const Block = require("./Block.js");

module.exports = {
    /**
     * Block.computeHash()
     * @param {number} index
     * @param {number} timestamp Date.now() value
     * @param {string} data
     * @param {string} previousHash sha256 hash
     * @returns {string} sha265 hash
     */
    computeHash: function (index, timestamp, data, previousHash) {
        return crypto.createHash('sha256')
            .update(String(index) + String(timestamp) + data + previousHash)
            .digest('hex');
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
            && this.computeHash(block.index, block.timestamp, block.data, block.previousHash) == block.hash;
    },

    /* ====================================================================================== */

    /**
     * Blockchain.isChainValid()
     * @description checks block validity for all blocks in the chain
     * @param {Array<Block>}
     * @returns {boolean}
     */
    isChainValid: function(chain) {
        const genesisBlock = chain[0];
        if (genesisBlock.hash != this.computeHash(genesisBlock.index, genesisBlock.timestamp, genesisBlock.data, genesisBlock.previousHash))
            return false;

        for (let i = 1; i < chain.length; i++) {
            if (!this.isBlockValid(chain[i], chain[i - 1]))
                return false
        }

        return true;
    }
}
