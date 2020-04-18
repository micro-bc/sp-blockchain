const Block = require("./Block.js");
const Blockchain = require("./Blockchain.js");

/**
 * @description Functions to manipulate the blockchain
 */
module.exports = {
    /**
     * blockchain.get()
     * @returns {Array<Block>} returns the entire blockchain
     */
    get: function () {
        return blockchain;
    },

    /**
     * blockchain.latestBlock()
     * @returns {Block} returns the latest block
     */
    latestBlock: function () {
        return Blockchain.chain[Blockchain.chain.length - 1];
    },

    /**
     * blockchain.createBlock()
     * @param {string} data
     * @returns {Block} returns a new block
     */
    createBlock: function (data) {
    },

    /**
     * blockchain.replace()
     * @description checks length, validates the chain, sets blockchain to the best one
     * @param {Array<Block>} candidateChain
     * @returns {boolean} success
     */
    replace: function (candidateChain) {
    },

    /**
     * blockchain.appendBlock()
     * @description checks validity, appends Block
     * @param {Block} candidateBlock
     * @returns {boolean} success
     */
    appendBlock: function (candidateBlock) {
    }
}
