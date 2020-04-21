const Block = require("./Block");
const util = require("./util");

/**
 * genesisBlock
 * @description this is a hard-coded genesisBlock with valid hash value
 */
const genesisBlock = new Block(0, 1587319248, "Genesis block", 1, 0, null, "0c101a50fc7bf726f6c0242d880c3da44eb567ef52ef4520a80804c94b5c4a61");
const GENERATION_INTERVAL = 10; /* seconds */
const ADJUSTMENT_INTERVAL = 10; /* blocks */
blockchain = [genesisBlock];

let lastBackup = 0;
let backupFilename = "";

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
     * @param {createBlockCallback} callback
     */
    createBlock: function (data, callback = (err, block) => { }) {
        if (typeof (data) !== "string")
            return callback(new Error("Incorrect parameter type"));
        const latestBlock = this.latestBlock();
        const index = latestBlock.index + 1;
        const timestamp = Math.floor(Date.now() / 1000);
        const difficulty = this.getDifficulty();
        const previousHash = latestBlock.hash;
        /* TODO - break while loop if blockchain changes */

        let nonce = -1;
        do {
            hash = util.computeHash(index, timestamp, data, difficulty, ++nonce, previousHash);
        } while (!util.isHashValid(hash, difficulty) && util.isTimestampValid(timestamp, latestBlock.timestamp))

        const block = new Block(index, timestamp, data, difficulty, nonce, previousHash, hash);
        this.appendBlock(block, (err) => {
            if (err) {
                return callback(new Error("Falied to append block"));
            }

            return callback(null, block);
        });
    },

    /**
     * blockchain.replace()
     * @description checks length, validates the chain, sets blockchain to the best one
     * @param {Block[]} candidateChain
     * @param {replaceBlockchainCallback} callback
     */
    replace: function (candidateChain, callback = (err, bc) => { }) {
        if (!(candidateChain instanceof Array))
            return callback(new Error("Incorrect parameter type"));
        else if (!util.isChainValid(candidateChain)) {
            return callback(new Error("Invaild chain"));
        }
        else if (util.computeCumulativeDifficulty(blockchain) > util.computeCumulativeDifficulty(candidateChain))
            return callback(new Error("Stronger chain exists"));
        blockchain = candidateChain;

        this.backup();
        return callback(null, blockchain);
    },

    /**
     * blockchain.appendBlock()
     * @description checks validity, appends Block
     * @param {Block} candidateBlock
     * @param {appendBlockCallback} callback
     */
    appendBlock: function (candidateBlock, callback = (err) => { }) {
        if (!(candidateBlock instanceof Block))
            callback(new Error("Incorrect parameter type"));
        if (!util.isBlockValid(candidateBlock, this.latestBlock()))
            callback(new Error("Invalid block"));
        blockchain.push(candidateBlock);

        // TODO - resetable backup timer (jakobkordez)
        this.backup();
        return callback();
    },

    initBackup: function (filename) {
        backupFilename = filename;
        this.restoreBackup((err) => {
            if (err) {
                console.error("Failed to restore backup from %s:", filename);
                console.error(err.message);
            }
        });
    },

    /**
     * blockchain.backup()
     * @description saves active chain to json
     * @param {backupCallback} callback
     */
    backup: function (callback = (err) => { }) {
        if (!backupFilename) {
            return callback();
        }

        if (blockchain.length < 2) {
            return callback(new Error("Chain too short"));
        }

        util.backup(blockchain, backupFilename, (err) => {
            return callback(err);
        });
    },

    /**
     * blockchain.restoreBackup()
     * @description reads, verifies backup, calls replace()
     * @param {restoreBackupCallback} callback
     */
    restoreBackup: function (callback = (err) => { }) {
        if (!backupFilename) {
            return callback();
        }

        util.restoreBackup(backupFilename, (err, bc) => {
            if (err) {
                return callback(err);
            }

            if (!bc) {
                return callback();
            }

            this.replace(bc, (err) => {
                if (err) {
                    return callback(err);
                }

                callback(null, bc);
            });
        });
    }
}

/**
 * @callback createBlockCallback
 * @param {Error} err
 * @param {Block} block
 * @returns {void}
 */

/**
 * @callback replaceBlockchainCallback
 * @param {Error} err
 * @param {Block[]} blockchain
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
 * @param {Block[]} blockchain
 * @returns {void}
 */