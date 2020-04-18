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
        if (typeof (data) !== 'string') return null;
        const latestBlock = this.latestBlock();
        const index = latestBlock.index + 1;
        const timestamp = Date.now();
        const previousHash = latestBlock.hash;
        return new Block(index, timestamp, data, previousHash, Block.computeHash(index, timestamp, data, previousHash));
    },

    /**
     * blockchain.replace()
     * @description checks length, validates the chain, sets blockchain to the best one
     * @param {Array<Block>} candidateChain
     * @returns {boolean} success
     */
    replace: function (candidateChain) {
        if (candidateChain.length < Blockchain.chain.length) return false;
        if (!Blockchain.isChainValid(candidateChain)) return false;
        Blockchain.blockchain = candidateChain;
        return true;
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
