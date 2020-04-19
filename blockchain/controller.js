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
    createBlock: function (data, callback) {
        if (typeof (data) !== 'string')
            return callback(new Error("Wrong data type"));
        const latestBlock = this.latestBlock();
        const index = latestBlock.index + 1;
        const timestamp = Date.now();
        const previousHash = latestBlock.hash;
        const hash = util.computeHash(index, timestamp, data, previousHash);
        const block = new Block(index, timestamp, data, previousHash, hash);
        if (!block)
            return callback(new Error("Error creating block"));
        return callback(null, block);
    },

    /**
     * blockchain.replace()
     * @description checks length, validates the chain, sets blockchain to the best one
     * @param {Block[]} candidateChain
     * @returns {boolean} success
     */
    replace: function (candidateChain, callback) {
        const error = false;
        if (!(candidateChain instanceof Array))
            return callback(new Error("Wrong candidateChain type"));
        else if (candidateChain.length < blockchain.length || !util.isChainValid(candidateChain))
            return callback(new Error("candidateChain rejected"));
        blockchain = candidateChain;
        return callback(null, blockchain);
    },

    /**
     * blockchain.appendBlock()
     * @description checks validity, appends Block
     * @param {Block} candidateBlock
     * @returns {boolean} success
     */
    appendBlock: function (candidateBlock) {
        if (!(candidateBlock instanceof Block))
            return callback(new Error("Wrong candidateBlock type"));
        if (!util.isBlockValid(candidateBlock, this.latestBlock()))
            return callback(new Error("candidateBlock is invalid"));
        blockchain.push(candidateBlock);
        return true;
    }
}
