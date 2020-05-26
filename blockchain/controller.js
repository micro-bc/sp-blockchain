const lodash = require('lodash');

const blockUtil = require("./models/Block");
const txUtil = require("./models/Transaction");
const walletUtil = require("./models/Wallet");
const util = require("./util");

/**
 * genesisBlock
 * @description this is a hard-coded genesisBlock with valid hash value
 */
const genesisBlock = new blockUtil.Block(0, 1587319248, "Genesis block", [], 1, 0, null, "0c101a50fc7bf726f6c0242d880c3da44eb567ef52ef4520a80804c94b5c4a61");
const GENERATION_INTERVAL = 10; /* seconds */
const ADJUSTMENT_INTERVAL = 10; /* blocks */
blockchain = [genesisBlock];

/* All confirmed transaction txOuts */
let unspentTxOuts = [];
/* Valid transactions waiting to be mined into blocks */
let transactionPool = [];

let lastBackup = 0;
let nodePort = "";
let nodePublicKey = null;

/**
 * @description set of public function for blockchain manipulation
 */
module.exports = {
    /**
     * blockchain.get()
     * @returns {blockUtil.Block[]} returns the entire blockchain
     */
    get: function () {
        return blockchain;
    },

    /**
     * blockchain.latestBlock()
     * @returns {blockUtil.Block} returns the latest block
     */
    latestBlock: function () {
        return blockchain[blockchain.length - 1];
    },

    /**
     * blockchain.getDifficulty()
     * @returns {number} returns blockchain difficulty
     */
    getDifficulty: function () {
        const latestBlock = this.latestBlock();
        if (latestBlock.index % ADJUSTMENT_INTERVAL !== 0 || latestBlock.index === 0)
            return latestBlock.difficulty;
        const adjustmentBlock = blockchain[blockchain.length - ADJUSTMENT_INTERVAL];
        const currentDifficulty = adjustmentBlock.difficulty;
        const timeExpected = GENERATION_INTERVAL * ADJUSTMENT_INTERVAL;
        const timeTaken = latestBlock.timestamp - adjustmentBlock.timestamp;
        if (timeTaken < timeExpected / 2)
            return currentDifficulty + 1;
        else if (timeTaken > timeExpected * 2)
            return currentDifficulty - 1;
        return currentDifficulty;
    },

    /**
     * blockchain.createBlock()
     * @param {string} data
     * @param {Transaction[]} transactions
     * @param {createBlockCallback} callback
     */
    createBlock: function (data, callback = (err, block) => { if (err) console.log(err); }) {
        if (typeof (data) !== "string")
            return callback(new Error("Incorrect parameter type"));

        /* Determine which transactions to mine (all) */
        const transactions = transactionPool;
        const latestBlock = this.latestBlock();
        const index = latestBlock.index + 1;
        const timestamp = Math.floor(Date.now() / 1000);
        const difficulty = this.getDifficulty();
        const previousHash = latestBlock.hash;
        /* TODO - break while loop if blockchain changes */

        let nonce = -1;
        do {
            hash = blockUtil.getHash(index, timestamp, data, transactions, difficulty, ++nonce, previousHash);
        } while (!blockUtil.isHashValid(hash, difficulty) && blockUtil.isTimestampValid(timestamp, latestBlock.timestamp))

        const block = new blockUtil.Block(index, timestamp, data, transactions, difficulty, nonce, previousHash, hash);

        this.appendBlock(block, (err) => {
            if (err)
                return callback(new Error("Falied to append block"));

            /* TODO: update transaction pool */
            return callback(null, block);
        });
    },

    /**
     * blockchain.replace()
     * @description checks length, validates the chain, sets blockchain to the best one
     * @param {blockUtil.Block[]} candidateChain
     * @param {replaceBlockchainCallback} callback
     */
    replace: function (candidateChain, callback = (err, bc) => { if (err) console.log(err); }) {
        if (!(candidateChain instanceof Array))
            return callback(new Error("Incorrect parameter type"));
        else if (!util.isChainValid(candidateChain))
            return callback(new Error("Invaild chain"));
        else if (util.computeCumulativeDifficulty(blockchain) > util.computeCumulativeDifficulty(candidateChain))
            return callback(new Error("Stronger chain exists"));
        blockchain = candidateChain;

        this.backup();
        return callback(null, blockchain);
    },

    /**
     * blockchain.appendBlock()
     * @description checks validity, appends Block
     * @param {blockUtil.Block} candidateBlock
     * @param {appendBlockCallback} callback
     */
    appendBlock: function (candidateBlock, callback = (err) => { }) {
        if (!(candidateBlock instanceof blockUtil.Block))
            return callback(new Error("Incorrect parameter type"));
        if (!blockUtil.isBlockValid(candidateBlock, this.latestBlock()))
            return callback(new Error("Invalid block"));
        blockchain.push(candidateBlock);

        // TODO - resetable backup timer (jakobkordez)
        this.backup();
        return callback();
    },

    initBackup: function (port) {
        nodePort = port;
        this.restoreBackup((err) => {
            if (err) {
                console.error("Failed to restore backup from %s:", nodePort);
                console.error(err.message);
            }
        });
    },

    /**
     * blockchain.backup()
     * @description saves active chain to json
     * @param {backupCallback} callback
     */
    backup: function (callback = (err) => { if (err) console.log(err); }) {
        if (!nodePort)
            return callback();
        if (blockchain.length < 2)
            return callback(new Error("Chain too short"));

        util.backup(blockchain, nodePort, (err) => {
            return callback(err);
        });
    },

    /**
     * blockchain.restoreBackup()
     * @description reads, verifies backup, calls replace()
     * @param {restoreBackupCallback} callback
     */
    restoreBackup: function (callback = (err) => { if (err) console.log(err) }) {
        if (!nodePort)
            return callback();

        util.restoreBackup(nodePort, (err, bc) => {
            if (err)
                return callback(err);
            if (!bc)
                return callback();

            this.replace(bc, (err) => {
                if (err)
                    return callback(err);
                return callback(null, bc);
            });
        });
    },

    /**
      * blockchain.getWallet()
      * @description initializes a wallet (new or existing)
      * @returns {string} publicKey
      */
    getWallet: function () {
        const privateKey = walletUtil.getPrivateKey(nodePort);
        nodePublicKey = walletUtil.getPublicKey(privateKey);
        /* TODO: check if new wallet -> add CoinbaseTx */
        console.log("Not implemented");
        return nodePublicKey;
    },

    /**
      * blockchain.getBalance()
      * @description get a specific address's balance
      * @param {string} address self if null
      * @returns {[number, Extras]} [amount, extras]
      */
    getBalance: function (address) {
        if (!address)
            address = nodePublicKey;
        /* TODO: test */
        console.log("Not implemented");
        return walletUtil.getBalance(address, unspentTxOuts);
    },

    /**
      * blockchain.createTransaction()
      * @description 
      * @param {string} receiverAddress
      * @param {number} amount
      * @param {Extras} extras
      * @param {createTransactionCallback} callback
      * @returns {Transaction} transaction
      */
    createTransaction: function (receiverAddress, amount, extras, callback = (err, tx) => { }) {
        let tx = walletUtil.createTransaction(receiverAddress, amount, extras, unspentTxOuts);
        /* TODO: error handling */
        console.log("Not implemented");
        if (!tx)
            return callback(new Error("Error"), null);
        return callback(null, tx);
    }
}

/**
 * @callback createBlockCallback
 * @param {Error} err
 * @param {blockUtil.Block} block
 * @returns {void}
 */

/**
 * @callback replaceBlockchainCallback
 * @param {Error} err
 * @param {blockUtil.Block[]} blockchain
 * @returns {void}
 */

/**
 * @callback appendBlockCallback
 * @param {Error} err
 * @returns {void}
 */

/**
 * @callback backupCallback
 * @param {Error} err
 * @returns {void}
 */

/**
 * @callback restoreBackupCallback
 * @param {Error} err
 * @param {blockUtil.Block[]} blockchain
 * @returns {void}
 */

/**
 * @callback createTransactionCallback
 * @param {Error} err
 * @param {Transaction} transaction
 * @returns {void}
 */