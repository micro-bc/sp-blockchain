const Block = require("./Block");
const util = require("./util");

/**
 * genesisBlock
 * @description this is a hard-coded genesisBlock with valid hash value
 */
const genesisBlock = new Block(0, 1587242286317, "Genesis block", null, "3bdc1d49f2bdd7096c20eb6c6314adf8ec3b992948db5959e6ca02b86cc92636");
let blockchain = [genesisBlock];

/**
 * @description set of public function for blockchain manipulation
 */
module.exports = {
    /**
     * blockchain.get()
     * @returns {Block[]} returns the entire blockchain
     */
    get: function () {
        return blockchain;
    },

    /**
     * blockchain.latestBlock()
     * @returns {Block} returns the latest block
     */
    latestBlock: function () {
        return blockchain[blockchain.length - 1];
    },

    /**
     * blockchain.createBlock()
     * @param {string} data
     * @returns {Block} returns a new block
     */
    createBlock: function (data) {
        if (typeof (data) !== 'string') return null; /* TODO: error status */
        const latestBlock = this.latestBlock();
        const index = latestBlock.index + 1;
        const timestamp = Date.now();
        const previousHash = latestBlock.hash;
        const hash = util.computeHash(index, timestamp, data, previousHash);
        return new Block(index, timestamp, data, previousHash, hash);
    },

    /**
     * blockchain.replace()
     * @description checks length, validates the chain, sets blockchain to the best one
     * @param {Block[]} candidateChain
     * @returns {boolean} success
     */
    replace: function (candidateChain) {
        if (
            !(candidateChain instanceof Array)
            || candidateChain.length < blockchain.length
            || !util.isChainValid(candidateChain)
        ) return false; /* TODO: error status */
        blockchain = candidateChain;
        return true;
    },

    /**
     * blockchain.appendBlock()
     * @description checks validity, appends Block
     * @param {Block} candidateBlock
     * @returns {boolean} success
     */
    appendBlock: function (candidateBlock) {
        if (
            !(candidateBlock instanceof Block)
            || !util.isBlockValid(candidateBlock, this.latestBlock())
        ) return false; /* TODO: error status */
        blockchain.push(candidateBlock);
        return true;
    }
}
