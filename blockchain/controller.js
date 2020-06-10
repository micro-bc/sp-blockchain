// const lodash = require('lodash');
const blockUtil = require("./models/Block");
const txUtil = require("./models/Transaction");
const walletUtil = require("./models/Wallet");
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
/* Unsigned transactions */
let pendingTransactions = [];
/*
 * Keep a list of unspent transactions to prevent
 * parsing the entire chain each time
 * a new transaction is processed.
 */
let uTxOs = [];


let lastBackup = 0;
let nodePort = '';

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
         * @param {string} publicKey
         * @param {createBlockCallback} callback
         */
        createBlock: function (publicKey, signature, callback = (err, block) => {}) {
                if(!walletUtil.isSignatureValid(signature, publicKey, txUtil.COINBASE_DATA))
                        return callback(new Error("Invalid signature!"), null);

                const userExists = this.userExists(publicKey);
                const coinbaseTransaction = txUtil.coinbaseTransaction(publicKey, this.latestBlock().index + 1);
                if (!mempool.length && userExists)
                        return callback(new Error("Transaction pool is empty"), null);

                let transactions = [];
                if(!mempool.length)
                        transactions = [coinbaseTransaction];
                else {
                        transactions = JSON.parse(JSON.stringify(mempool));
                        transactions.push(transactions[0]);
                        transactions[0] = coinbaseTransaction;
                }

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
                                return callback(err, null);

                        return callback(null, block);
                });
        },

        /**
         * blockchain.replace()
         * @description checks length, validates the chain, sets blockchain to the best one
         * @param {blockUtil.Block[]} candidateChain
         * @param {replaceBlockchainCallback} callback
         */
        replace: function (candidateChain, callback = (err, bc) => {}) {
                if (!(candidateChain instanceof Array))
                        return callback(new Error("replace chain: Incorrect parameter type"));
                else if (!util.isChainValid(candidateChain))
                        return callback(new Error("Invaild chain"));
                else if (util.computeCumulativeDifficulty(blockchain) > util.computeCumulativeDifficulty(candidateChain)) {
                        return callback(new Error("Stronger chain exists"));
                }
                blockchain = candidateChain;
                for(let i = 0; i < blockchain.length; i++)
                        this.processTransactions(blockchain[i], uTxOs, (err, updated) => {
                                if(err)
                                        return callback(err, null);
                                uTxOs = updated;
                        });

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

                this.processTransactions(candidateBlock, uTxOs, (err, updated) => {
                        if(err)
                                return callback(err);
                        uTxOs = updated;
                });

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

                /* TODO: reset-able backup timer (jakobkordez) */
                this.backup();
                return callback(null);
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
        backup: function (callback = (err) => {}) {
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
        restoreBackup: function (callback = (err) => {}) {
                if (!nodePort)
                        return callback(new Error('restoreBackup: undefined port'));

                util.restoreBackup(nodePort, (err, bc) => {
                        if (err)
                                return callback(err);
                        this.replace(bc, (err) => {
                                if (err)
                                        return callback(err);
                                console.log('Backup restored successfully for ' + nodePort);
                                return callback(null);
                        });
                });
        },

        /**
         * blockchain.getBalance()
         * @description get a specific address's balance
         * @param {string} publicKey
         * @param {callback} getBalanceCallback
         * @returns {{number, number, ...}} balance
         */
        getBalance: function(publicKey, callback = (err, balance) => { }) {
                const balance = txUtil.getBalance(publicKey, uTxOs);
                if(!balance)
                        return callback(new Error("Error getting balance"), null);
                return callback(null, balance);
        },


        /**
         * blockchain.createTransaction()
         * @param {string} sender
         * @param {string} reciever
         * @param {number, number, ..} data
         * @returns {string} transactionId
         */
        createTransaction: function(sender, reciever, data, callback = (err, id) => {}) {
                let senderUTxOs = [];
                for(let i = 0; i < uTxOs.length; i++)
                        if(uTxOs[i].address == sender)
                                senderUTxOs.push(uTxOs[i]);

                let sufficientFunds = false;
                let currentBalance = {
                        clicks: 0,
                        masks: 0,
                        respirators: 0,
                        volunteers: 0,
                        doctors: 0,
                        ventilators: 0,
                        researches: 0
                }
                let leftoverBalance = {
                        clicks: 0,
                        masks: 0,
                        respirators: 0,
                        volunteers: 0,
                        doctors: 0,
                        ventilators: 0,
                        researches: 0
                }
                let includedUTxOs = [];
                for(let i = 0; i < senderUTxOs.length; i++) {
                        includedUTxOs.push(senderUTxOs[i]);
                        currentBalance.clicks += senderUTxOs[i].clicks;
                        currentBalance.masks += senderUTxOs[i].masks;
                        currentBalance.respirators += senderUTxOs[i].respirators;
                        currentBalance.volunteers += senderUTxOs[i].volunteers;
                        currentBalance.doctors += senderUTxOs[i].doctors;
                        currentBalance.ventilators += senderUTxOs[i].ventilators;
                        currentBalance.researches += senderUTxOs[i].researches;
                        if (currentBalance.clicks >= data.clicks
                                && currentBalance.masks >= data.masks
                                && currentBalance.respirators >= data.respirators
                                && currentBalance.volunteers >= data.volunteers
                                && currentBalance.doctors >= data.doctors
                                && currentBalance.ventilators >= data.ventilators
                                && currentBalance.researches >= data.researches) {
                                leftoverBalance.clicks = currentBalance.clicks - data.clicks;
                                leftoverBalance.masks = currentBalance.masks - data.masks;
                                leftoverBalance.respirators = currentBalance.respirators - data.respirators;
                                leftoverBalance.volunteers = currentBalance.volunteers - data.volunteers;
                                leftoverBalance.doctors = currentBalance.doctors - data.doctors;
                                leftoverBalance.ventilators = currentBalance.ventilators - data.ventilators;
                                leftoverBalance.researches = currentBalance.researches - data.researches;
                                sufficientFunds = true;
                                break;
                        }
                }
                if(!sufficientFunds)
                        return callback(new Error('Insufficient funds'), null);

                let unsignedTxIns = [];
                for(let i = 0; i < includedUTxOs.length; i++)
                        unsignedTxIns.push(new txUtil.TxIn(includedUTxOs[i].txOutId, includedUTxOs[i].txOutIndex));

                let txOut = new txUtil.TxOut(reciever);
                txOut.clicks = data.clicks;
                txOut.masks = data.masks;
                txOut.respirators = data.respirators;
                txOut.volunteers = data.volunteers;
                txOut.doctors = data.doctors;
                txOut.ventilators = data.ventilators;
                txOut.researches = data.researches;
                let leftoverTxOut = new txUtil.TxOut(sender);
                leftoverTxOut.clicks = leftoverBalance.clicks
                leftoverTxOut.masks = leftoverBalance.masks;
                leftoverTxOut.respirators = leftoverBalance.respirators;
                leftoverTxOut.volunteers = leftoverBalance.volunteers;
                leftoverTxOut.doctors = leftoverBalance.doctors;
                leftoverTxOut.ventilators = leftoverBalance.ventilators;
                leftoverTxOut.researches = leftoverBalance.researches;

                let transaction = new txUtil.Transaction(unsignedTxIns, [txOut, leftoverTxOut]);
                transaction.id = txUtil.getHash(JSON.parse(JSON.stringify(transaction.txIns)), JSON.parse(JSON.stringify(transaction.txOuts)));

                pendingTransactions.push(transaction);

                return callback(null, transaction.id);
        },

        /**
         * blockchain.appendTransaction()
         * @description checks validity, appends to mempool
         * @param {string} id
         * @param {string} publicKey
         * @param {string} signature
         * @param {appendTransactionCallback} callback
         */
        appendTransaction: function (id, publicKey, signature, callback = (err, transaction) => { }) {
                if(!walletUtil.isSignatureValid(signature, publicKey, id))
                        return callback(new Error("Invalid signature!"), null);

                let transaction = null;
                for(let i = 0; i < pendingTransactions.length; i++)
                        if(pendingTransactions[i].id == id) {
                                transaction = pendingTransactions[i];
                                pendingTransactions.splice(i, 1);
                                break;
                        }

                if(!transaction)
                        return callback(new Error('No such pending transaction'), null);

                for(let i = 0; i < transaction.txIns.length; i++) {
                        let referencedUTxO = uTxOs.find((uTxO) => uTxO.txOutId === transaction.txIns[i].txOutId && uTxO.txOutIndex === transaction.txIns[i].txOutIndex);

                        if (!referencedUTxO == null)
                                return callback(new Error('Unable to find referenced txOut'), null);

                        if (publicKey !== referencedUTxO.address)
                                return callback(new Error('Invalid publicKey'), null);

                        transaction.txIns[i].signature = signature;
                }

                this.updateMempool(transaction, (err) => {
                        if(err)
                                return callback(err, null);
                        return callback(null, transaction);
                });
        },

        /**
         * blockchain.updateMempool()
         * @description adds transaction to mempool
         * @param {Transaction} transaction
         * @callback {updateMempoolCallback}
         */
        updateMempool: function(transaction, callback = (err) => {}) {
                for (let i = 0; i < mempool.length; i++)
                        if (mempool[i].id == transaction.id)
                                return callback(new Error("Mempool already contains transaction: " + transaction.id));
                mempool.push(transaction);
                return callback(null);
        },

        /**
         * blockchain.processTransactions()
         * @param {Block} block
         * @param {UnspentTxOut[]} uTxOs
         * @param {callback} processTransactionsCallback
         * @returns {UnspentTxOut[]} updated uTxOs
         */
        processTransactions: function(block, uTxOs, callback = (err, uTxOs) => {}) {
                if(!block.index)
                        return callback(null, []);
                const transactions = block.transactions;
                if(!transactions.length)
                        return callback(new Error('Block contains no transactions!'), null);

                for(let i = 0; i < transactions.length; i++) {
                        if(!txUtil.isTransactionStructureValid(transactions[i]))
                                return callback(new Error('Invalid structure detected'), null);
                }

                const coinbaseTransaction = transactions[0];
                if(!txUtil.isCoinbaseTransactionValid(coinbaseTransaction, block.index))
                        return callback(new Error('Invalid coinbase transaction'), null);

                let txIns = [];
                for(let i = 0; i < transactions.length; i++)
                        for(let j = 0; j < transactions[i].txIns.length; j++)
                                txIns.push(transactions[i].txIns[j]);

                /* TODO: test dupicates */
                for(let i = 0; i < txIns.length; i++)
                        for(let j = 0; j < txIns.length; j++)
                                if(j != i && txIns[i].txOutId == txIns[j].txOutId)
                                        return callback(new Error('Transaction contains dupicate txIns'), null);

                for(let i = 1; i < transactions.length; i++)
                        if(!txUtil.isTransactionValid(transactions[i], uTxOs))
                                return callback(new Error('Block contains invalid transactions'), null);

                return callback(null, txUtil.updateUnspent(block.transactions, uTxOs));
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
                                        && tx.txIns[0].txOutId == ''
                                        && tx.txOuts[0].address == publicKey)
                                        return true;
                        }
                }
                return false;
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
 * @callback initWalletCallback
 * @param {Error} err
 * @param {boolean} userExists
 * @returns {void}
 */

/**
 * @callback getBalanceCallback
 * @param {Error} err
 * @param {number, ..} balance
 * @returns {void}
 */

/**
 * @callback processTransactionsCallback
 * @param {Error} err
 * @param {UnspentTxOut[]} uTxOs
 * @returns {void}
 */


/**
 * @callback createTransactionCallback
 * @param {Error} err
 * @param {UnspentTxOut[]} uTxOs
 * @returns {void}
 */

/**
 * @callback appendTransactionCallback
 * @param {Error} err
 * @param {Transaction} transaction
 * @returns {void}
 */

/**
 * @callback updateMempoolCallback
 * @param {Error} err
 * @returns {void}
 */
