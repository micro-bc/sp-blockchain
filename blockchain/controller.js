// const lodash = require('lodash');
const blockUtil = require("./models/Block");
const txUtil = require("./new_models/Transaction");
const walletUtil = require("./new_models/Wallet");
const util = require("./util");

/**
 * genesisBlock
 * @description this is a hard-coded genesisBlock with valid hash value
 */
const genesisBlock = new blockUtil.Block(0, 1587319248, [], 1, 0, null, blockUtil.getHash(0, 1587319248, [], 1, 0, null));
const GENERATION_INTERVAL = 10; /* seconds */
const ADJUSTMENT_INTERVAL = 10; /* blocks */
blockchain = [genesisBlock];

/* Valid transactions waiting to be mined into blocks */
let mempool = [];

let lastBackup = 0;
let nodePort = '';
let nodePublicKey = '';

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
     * @param {createBlockCallback} callback
     */
    createBlock: function (callback = (err, block) => {}) {
        if (!mempool.length)
            return callback(new Error("Transaction pool is empty"), null);

        /* Determine which transactions to mine (all) */
        const transactions = JSON.parse(JSON.stringify(mempool));
        const latestBlock = this.latestBlock();
        const index = latestBlock.index + 1;
        const timestamp = Math.floor(Date.now() / 1000);
        const difficulty = this.getDifficulty();
        const previousHash = latestBlock.hash;
        /* TODO - break while loop if blockchain changes */

        let nonce = -1;
        do {
            hash = blockUtil.getHash(index, timestamp, transactions, difficulty, ++nonce, previousHash);
        } while (!blockUtil.isHashValid(hash, difficulty) && blockUtil.isTimestampValid(timestamp, latestBlock.timestamp))

        const block = new blockUtil.Block(index, timestamp, transactions, difficulty, nonce, previousHash, hash);
        this.appendBlock(block, (err) => {
            if (err)
                return callback(new Error("Falied to append block"), null);

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
            return callback(new Error("replace chain: Incorrect parameter type"));
        else if (!util.isChainValid(candidateChain))
            return callback(new Error("Invaild chain"));
        else if (util.computeCumulativeDifficulty(blockchain) > util.computeCumulativeDifficulty(candidateChain)) {
            return callback(new Error("Stronger chain exists"));
        }
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
            return callback(new Error("appendBlock: Incorrect parameter type"));
        if (!blockUtil.isBlockValid(candidateBlock, this.latestBlock()))
            return callback(new Error("Invalid block"));

        // const retVal = txUtil.processTransactions(candidateBlock.transactions, unspentTxOuts, candidateBlock.index);
        //     if(!retVal) return callback('Unable to process transactions')
        //unspentTxOuts = retVal;

        blockchain.push(candidateBlock);
        /* update mempool */
        for (var i = 0; i < candidateBlock.transactions.length; i++) {
            let tx = candidateBlock.transactions[i];
            for (var j = 0; j < mempool.length; j++) {
                if (mempool[j].id == tx.id) {
                    mempool.splice(j, 1);
                    continue;
                }
            }
        }

        // TODO - reset-able backup timer (jakobkordez)
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
                unspentTxOuts = txUtil.updateUnspentTxOuts(this.latestBlock(), unspentTxOuts);
                return callback(null, bc);
            });
        });
    },

    /**
      * blockchain.initWallet()
      * @description initializes a wallet (new or existing)
      * @param {string} publicKey
      * @param {string} signature
      * @param {callback} initWalletCallback
      * @returns {bool} status
      */
        initWallet: function(publicKey, signature, callback = (err, userExists) => { }) {
                if(!walletUtil.isSignatureValid(signature, publicKey, "initWallet"))
                        return callback(new Error("Invalid signature!"), undefined);
                nodePublicKey = publicKey;
                if(this.userExists(publicKey))
                         return callback(null, true);
                return callback(null, false);
        },

        /**
         * blockchain.getBalance()
         * @description get a specific address's balance
         * @param {string} publicKey (if null publicKey := nodePublicKey)
         * @param {callback} getBalanceCallback
         * @returns {{number, number, ...}} balance
         */
        getBalance: function(publicKey, callback = (err, balance) => { if(err) console.log(err) }) {
                if(!publicKey)
                        publicKey = nodePublicKey;
                if(!publicKey)
                        return callback(new Error("Undefined public key"), null);
                // if(!txUtil.userExists(publicKey))
                //         return callback(new Error("No such user"));
                console.log("No implemented");
                return callback(null, txUtil.getBalance(publicKey));
        },

        /**
         * blockchain.appendTransaction()
         * @description checks validity, appends to mempool
         * @param {txUtil.Transaction} candidateTransaction
         * @param {appendTransactionCallback} callback
         */
        appendTransaction: function (candidateTransaction, callback = (err) => { }) {
            if (!(candidateTransaction instanceof txUtil.Transaction))
                return callback(new Error("appendTransaction: Incorrect parameter type"));
            //if (!txUtil.isTxValid(candidateTransaction, unspentTxOuts))
            //     return callback(new Error("Invalid transaction"));

            for (let i = 0; i < mempool.length; i++)
                if (mempool[i].id == candidateTransaction.id)
                    return callback(new Error("Mempool already contains transaction: " + candidateTransaction.id));

            mempool.push(candidateTransaction);
            return callback(null);
        },

        /**
          * blockchain.getMempool()
          * @description
          * @returns {Transaction[]} mempool
          */
        getMempool: function () {
            return mempool;
        },

        userExists: function(publicKey) {
                for(let i = 0; i < blockchain.length; i++) {
                        let block = blockchain[i];
                        for(let j = 0; j < block.transactions.length; j++){
                                let tx = block.transactions[j];
                                if(tx.txIns.length == 1 && tx.txOuts.length == 1
                                        && tx.txIns[0].txOutId == null
                                        && tx.txOuts[0].address == publicKey)
                                        return true;
                        }
                }
                return false;
        }

        // initWallet: function (privateKey, callback = (err, privateKey, publicKey) => { }) {
        //     if (!privateKey) {
        //         privateKey = walletUtil.generateKeypair();
        //         let tx = walletUtil.getCoinbaseTransaction(walletUtil.getPublicKey(privateKey),
        //         this.latestBlock().index);
        //         /* todo broadcast? */
        //         mempool.push(tx);
        //     }
        //     nodePrivateKey = privateKey;
        //     nodePublicKey = walletUtil.getPublicKey(privateKey);
        //     console.info('Node address:', nodePublicKey);
        //     return callback(null, nodePrivateKey, nodePublicKey);
        // },

        // /**
        //   * blockchain.getBalance()
        //   * @description get a specific address's balance
        //   * @param {string} address self if null
        //   * @returns {[number, Extras]} [amount, extras]
        //   */
        // getBalance: function (address) {
        //     if (!address)
        //         address = nodePublicKey;
        //     return walletUtil.getBalance(address, unspentTxOuts);
        // },

        // /**
        //   * blockchain.createTransaction()
        //   * @description
        //   * @param {string} receiver
        //   * @param {number} amount
        //   * @param {Extras} extras
        //   * @param {string} privateKey
        //   * @param {createTransactionCallback} callback
        //   * @returns {Transaction} transaction
        //   */
        // createTransaction: function (receiver, amount, extras, privateKey, callback = (err, tx) => { if (err) console.log(err); }) {
        //     let tx = walletUtil.createTransaction(receiver, amount, extras, privateKey, unspentTxOuts);
        //     if (!tx)
        //         return callback(new Error("Error when creating transaction"), null);

        //     this.appendTransaction(tx, (err) => {
        //         if (err) {
        //             console.log(err);
        //             return callback(new Error("Failed to append transaction"));
        //         }

        //         return callback(null, tx);
        //     });
        // },

        // /**
        //   * blockchain.getTransactions()
        //   * @description
        //   * @param {string} address
        //   * @returns {Transaction[]} transactions
        //   */
        // getTransactions: function (address) {
        //     /* entire blockchain? */
        //     return unspentTxOuts.filter((uTxO) => uTxO.address === address);
        // },

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
 * @callback initWalletCallback
 * @param {Error} err
 * @returns {void}
 */

/**
 * @callback getBalanceCallback
 * @param {Error} err
 * @param {number, ..} balance
 * @returns {void}
 */
