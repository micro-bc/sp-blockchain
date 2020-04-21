const crypto = require('crypto');
const fs = require('fs');
const Block = require("./Block");

const BACKUP_DIR = "./blockchain/cache/";

/**
 * @description set of internal functions for validating blocks, chains
 */
module.exports = {
    /**
     * Block.computeHash()
     * @param {number} index
     * @param {number} timestamp Math.floor(Date.now() / 1000) value
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
    isHashValid: function (hash, difficulty) {
        return hash.startsWith('0'.repeat(difficulty));
    },

    /**
     * Block.isTimestampValid()
     * @description checks that hash starts with difficulty-zeroes
     * @param {number} timestamp
     * @param {number} previousTimestamp
     * @returns {boolean}
     */
    isTimestampValid: function (timestamp, previousTimestamp) {
        return (previousTimestamp - 60 < timestamp)
            && timestamp - 60 < Math.floor(Date.now() / 1000);
    },

    /**
     * Block.isBlockValid()
     * @description checks index, prevHash, hash
     * @param {Block} block
     * @param {Block} previousBlock
     * @returns {boolean} 
     */
    isBlockValid: function (block, previousBlock) {
        return block.index === previousBlock.index + 1
            && block.previousHash === previousBlock.hash
            && this.isTimestampValid(block.timestamp, previousBlock.timestamp)
            && this.isHashValid(block.hash, block.difficulty)
            && this.computeHash(block.index, block.timestamp, block.data, block.difficulty, block.nonce, block.previousHash) === block.hash;
    },

    /**
     * Blockchain.computeCumulativeDifficulty()
     * @param {Block[]} chain
     * @returns {number} sum of 2^block.difficulties
     */
    computeCumulativeDifficulty: function (chain) {
        let cumulativeDifficulty = 0;
        for (block in chain)
            cumulativeDifficulty += 2 ** block.difficulty;
        return cumulativeDifficulty;
    },

    /**
     * Blockchain.isChainValid()
     * @description checks block validity for all blocks in the chain
     * @param {Block[]} chain
     * @returns {boolean}
     */
    isChainValid: function (chain) {
        const genesisBlock = chain[0];
        if (genesisBlock.hash != this.computeHash(genesisBlock.index, genesisBlock.timestamp, genesisBlock.data, genesisBlock.difficulty, genesisBlock.nonce, genesisBlock.previousHash))
            return false;

        for (let i = 1; i < chain.length; i++)
            if (!this.isBlockValid(chain[i], chain[i - 1]))
                return false;

        return true;
    },

    /**
     * Blockchain.backup()
     * @description converts blockchain to JSON and writes it to cache/chain_port.json
     * @param {Block[]} chain
     * @param {string} filename
     * @param {backupCallback} callback
     * @returns {boolean} success
     */
    backup: function (chain, filename, callback = (err) => { }) {
        filename = filename + '.json';
        if (!fs.existsSync(BACKUP_DIR))
            fs.mkdirSync(BACKUP_DIR);
            
        const json = JSON.stringify(chain, null, 4);
        fs.writeFileSync(BACKUP_DIR + filename, json, 'utf8', function (err) {
            if (err) {
                return callback(err);
            }
        });

        if (!(filename in fs.readdirSync(BACKUP_DIR))) {
            return callback(new Error('Failed to create file'));
        }

        return callback();
    },

    /**
     * Blockchain.restoreBackup()
     * @description converts backup to object array
     * @param {string} filename
     * @param {restoreBackupCallback} callback
     * @returns {Block[]} chain
     */
    restoreBackup: function (filename, callback = (err, bc) => { }) {
        filename = BACKUP_DIR + filename + '.json';
        if (!fs.existsSync(filename)) {
            return callback();
        }

        try {
            const chain = JSON.parse(fs.readFileSync(filename, 'utf8'));
            return callback(null, chain);
        } catch {
            return callback(new Error("Failed to restore backup"));
        }
    }
}

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