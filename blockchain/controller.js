const Block = require("./Block");
const util = require("./util");

/**
 * genesisBlock
 * @description this is a hard-coded genesisBlock with valid hash value
 */
const genesisBlock = new Block(0, 1587242286317, "Genesis block", 1, 21, null, "0c480a977840892176e4798257257fde997e8a3eb6fa26a37417cc2c74f09a05");
blockchain = [genesisBlock];

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
        if (typeof (data) !== "string")
            return callback(new Error("Wrong data type"));
        const latestBlock = this.latestBlock();
        const index = latestBlock.index + 1;
        const timestamp = Date.now();
        const difficulty = latestBlock.difficulty;
        const previousHash = latestBlock.hash;

        let hash;
        let nonce = -1;
        while(!util.isHashValid(hash, difficulty))
            hash = util.computeHash(index, timestamp, data, difficulty, ++nonce, previousHash);

        const block = new Block(index, timestamp, data, difficulty, nonce, previousHash, hash);
        if (!block)
            return callback(new Error("Error creating block"));
        if (!util.isBlockValid(block, latestBlock)) /* TODO: Remove-> block validity is checked in appendBlock */
            return callback(new Error("Invalid block created"));
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
