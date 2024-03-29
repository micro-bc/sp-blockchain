const fs = require('fs');

const blockUtil = require("./models/Block");

const BACKUP_DIR = "./blockchain/cache/";

/**
 * @description set of internal utility functions for managing backups, etc.
 */
module.exports = {
    /**
     * util.computeCumulativeDifficulty()
     * @param {blockUtil.Block[]} chain
     * @returns {number} sum of 2^block.difficulties
     */
    computeCumulativeDifficulty: function (chain) {
        let cumulativeDifficulty = 0;
        for (block in chain)
            cumulativeDifficulty += 2 ** block.difficulty;
        return cumulativeDifficulty;
    },

    /**
     * util.isChainValid()
     * @description checks block validity for all blocks in the chain
     * @param {blockUtil.Block[]} chain
     * @returns {boolean}
     */
    isChainValid: function (chain) {
        const genesisBlock = chain[0];
        if (genesisBlock.hash != blockUtil.getHash(genesisBlock.index, genesisBlock.timestamp, genesisBlock.transactions, genesisBlock.difficulty, genesisBlock.nonce, genesisBlock.previousHash))
            return false;

        for (let i = 1; i < chain.length; i++)
            if (!blockUtil.isBlockValid(chain[i], chain[i - 1]))
                return false;

        return true;
    },

    /**
     * util.backup()
     * @description converts blockchain to JSON and writes it to cache/chain_port.json
     * @param {blockUtil.Block[]} chain
     * @param {string} filename
     * @param {backupCallback} callback
     * @returns {boolean} success
     */
    backup: function (chain, filename, callback = (err) => { }) {
        filename = 'bkp_' + filename + '.json';
        if (!fs.existsSync(BACKUP_DIR))
            fs.mkdirSync(BACKUP_DIR);

        const json = JSON.stringify(chain, null, 4);
        fs.writeFileSync(BACKUP_DIR + filename, json, 'utf8', function (err) {
            if (err) {
                return callback(err);
            }
        });

        if (!filename in fs.readdirSync(BACKUP_DIR))
            return callback(new Error('Failed to create file'));

        return callback();
    },

    /**
     * util.restoreBackup()
     * @description converts backup to object array
     * @param {string} filename
     * @param {restoreBackupCallback} callback
     * @returns {blockUtil.Block[]} chain
     */
    restoreBackup: function (filename, callback = (err, bc) => { }) {
        filename = BACKUP_DIR + 'bkp_' + filename + '.json';
        if (!fs.existsSync(filename))
            return callback(new Error('Backup does not exist:' + filename), null);

        try {
                return callback(null, JSON.parse(fs.readFileSync(filename, 'utf8')));
        } catch {
                return callback(new Error("Error parsing " + filename), null);
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
 * @param {blockUtil.Block[]} blockchain
 * @returns {void}
 */
