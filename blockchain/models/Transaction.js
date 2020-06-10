const crypto = require('crypto');
const walletUtil = require('./Wallet');

const COINBASE_DATA = {
    clicks: 500,
    masks: 200,
    respirators: 100,
    volunteers: 50,
    doctors: 20,
    ventilators: 5,
    researches: 3
};

/**
 * @description Transaction class definition.
 */
class Transaction {
    /**
     * @param {txIn[]} txIns array of unspent inputs
     * @param {txOut[]} txOuts array of target outputs
     */
    constructor(txIns, txOuts) {
        this.id = '';
        this.txIns = txIns;
        this.txOuts = txOuts;
    }
}

/**
 * @description TxIn class definition.
 * This class serves the purpose of verifying
 * that goods specified in txOut are available
 * and ready to be transfered. It prevents duping
 * and confirms the owner's identity.
 */
class TxIn {
    /**
     * @param {string} txOutId previousTransactionId
     * @param {number} txOutIndex previousTransaction.TxIns.index
     */
    constructor(txOutId, txOutIndex) {
        this.txOutId = txOutId;
        this.txOutIndex = txOutIndex;
        this.signature = '';
    }
}

/**
 * @description TxOut class definition.
 * This class is used when preparing a new
 * transaction. It represents the state of
 * user's (address's) balance changes after
 * the transaction that contains it is processed.
 */
class TxOut {
    /**
     * @param {string} address receiver address
     */
    constructor(address) {
        this.address = address;
        this.clicks = 0;
        this.masks = 0;
        this.respirators = 0;
        this.volunteers = 0;
        this.doctors = 0;
        this.ventilators = 0;
        this.researches = 0;
    }

    toString() {
        return this.address +
            this.clicks.toString() +
            this.masks.toString() +
            this.respirators.toString() +
            this.volunteers.toString() +
            this.doctors.toString() +
            this.ventilators.toString() +
            this.researches.toString();
    }
}

/**
 * @description UnspentTxOut class definition.
 * This class is used for quick unspent credits
 * access. It removes the need to search the
 * entire blockchain each time a transaction gets
 * processed. UnspentTxOut array gets updated with
 * each new block.
 */
class UnspentTxOut {
    /**
     * @param {string} txOutId transactionId
     * @param {number} txOutIndex transaction.txOuts.index
     * @param {string} address receiver address
     * @param {number} clicks (coins)
     * @param {number} masks
     * @param {number} respirators
     * @param {number} volunteers
     * @param {number} doctors
     * @param {number} ventilators
     * @param {number} researches
     */
    constructor(txOutId, txOutIndex, address,
        clicks, masks, respirators, volunteers,
        doctors, ventilators, researches) {
        this.txOutId = txOutId;
        this.txOutIndex = txOutIndex;
        this.address = address;
        this.clicks = clicks;
        this.masks = masks;
        this.respirators = respirators;
        this.volunteers = volunteers;
        this.doctors = doctors;
        this.ventilators = ventilators;
        this.researches = researches;
    }
}

/**
 * Transaction.getTransactionId()
 * @description Use data from txIn[] and txOut[] to
 * compute a hash that represents given transaction.
 * @param {TxIn[]} txIns
 * @param {TxOut[]} txOuts
 * @returns {string} hash (sha256)
 */
function getTransactionId(txIns, txOuts) {
    let txInData;
    for (let i = 0; i < txIns.length; i++)
        txInData += txIns[i].txOutId + txIns[i].txOutIndex.toString();

    let txOutData;
    for (let i = 0; i < txOuts.length; i++)
        txOutData += txOuts[i].toString();

    return crypto.createHash('sha256')
        .update(txInData + txOutData)
        .digest('hex');
}

/**
 * Transaction.updateUnspent()
 * @param {Transaction[]} transactions
 * @param {UnspentTxOut[]} uTxOs
 * @returns {UnspentTxOut[]} updatedUTxOs
 */
function updateUnspent(transactions, uTxOs) {
    let newUTxOs = [];
    let consumedTxOs = [];
    for(let i = 0; i < transactions.length; i++) {
        for(let j = 0; j < transactions[i].txOuts.length; j++) {
            const txOut = transactions[i].txOuts[j];
            newUTxOs.push(new UnspentTxOut(transactions[i].id, j, txOut.address,
                txOut.clicks, txOut.masks, txOut.respirators, txOut.volunteers,
                txOut.doctors, txOut.ventilators, txOut.researches));
        }
        for(let j = 0; j < transactions[i].txIns.length; j++) {
            const txIn = transactions[i].txIns[j];
            consumedTxOs.push(new UnspentTxOut(txIn.txOutId, txIn.txOutIndex, null,
                0, 0, 0, 0, 0, 0, 0));
        }
    }

    return uTxOs.filter(((uTxO) => !consumedTxOs
        .find((tmpUTxO) => tmpUTxO.txOutId === uTxO.txOutId && tmpUTxO.txOutIndex === uTxO.txOutIndex)))
        .concat(newUTxOs);
}

/**
 * Transaction.getCoinbaseTransaction()
 * @param {string} publicKey
 * @param {number} index
 * @returns {Transaction} coinbaseTransaction
 */
function getCoinbaseTransaction(publicKey, index) {
    let initTxOut = new TxOut(publicKey);
    initTxOut.clicks = COINBASE_DATA.clicks;
    initTxOut.masks = COINBASE_DATA.masks;
    initTxOut.respirators = COINBASE_DATA.respirators;
    initTxOut.volunteers = COINBASE_DATA.volunteers;
    initTxOut.doctors = COINBASE_DATA.doctors;
    initTxOut.ventilators = COINBASE_DATA.ventilators;
    initTxOut.researches = COINBASE_DATA.researches;

    let initTx = new Transaction([JSON.parse(JSON.stringify(new TxIn('', index)))],
        [JSON.parse(JSON.stringify(initTxOut))]);
    initTx.id = getTransactionId(initTx.txIns, initTx.txOuts);

    return initTx;
}

/**
 * Transaction.getBalance()
 * @description get address's balance
 * @param {string} publicKey
 * @param {UnspentTxOut[]} uTxOs
 * @returns {{number, number,... }} {clicks, masks, ...}
 */
function getBalance(publicKey, uTxOs) {
    let balance = {
        clicks: 0,
        masks: 0,
        respirators: 0,
        volunteers: 0,
        doctors: 0,
        ventilators: 0,
        researches: 0
    };
    for(let i = 0; i < uTxOs.length; i++) {
        if(uTxOs[i].address == publicKey) {
            balance.clicks += uTxOs[i].clicks;
            balance.masks += uTxOs[i].masks;
            balance.respirators += uTxOs[i].respirators;
            balance.volunteers += uTxOs[i].volunteers;
            balance.doctors += uTxOs[i].doctors;
            balance.ventilators += uTxOs[i].ventilators;
            balance.researches += uTxOs[i].researches;
        }
    }

    return balance;
}

/**
 * Transaction.isTransactionValid()
 * @param {Transaction} transaction
 * @param {UnspentTxOut[]} uTxOs
 * @callback {isTransactionValidCallback}
 * @returns {boolean} validity
 */
function isTransactionValid(transaction, uTxOs, callback = (err) => {}) {
    if (getTransactionId(transaction.txIns, transaction.txOuts) != transaction.id)
        return callback(new Error('Invalid transaction id:', transaction.id));

    for(let i = 0; i < transaction.txIns.length; i++) {
        const referencedUTxO = uTxOs.find((uTxO) => uTxO.txOutId === transaction.txIns[i].txOutId
            && uTxO.txOutIndex === transaction.txIns[i].txOutIndex);

        if (!referencedUTxO)
            return callback(new Error('Referenced txIn->txOut not found'));

        if(!walletUtil.isSignatureValid(transaction.txIns[i].signature, referencedUTxO.address, transaction.id))
            return callback(new Error('Invalid signature found'));
    }

    let totalTxInValues = {
        clicks: 0,
        masks: 0,
        respirators: 0,
        volunteers: 0,
        doctors: 0,
        ventilators: 0,
        researches: 0
    };
    for(let i = 0; i < transaction.txIns.length; i++) {
        const referencedUTxOut = uTxOs.find((uTxO) => uTxO.txOutId === transaction.txIns[i].txOutId
            && uTxO.txOutIndex === transaction.txIns[i].txOutIndex);
        totalTxInValues.clicks += referencedUTxOut.clicks;
        totalTxInValues.masks += referencedUTxOut.masks;
        totalTxInValues.respirators += referencedUTxOut.respirators;
        totalTxInValues.volunteers += referencedUTxOut.volunteers;
        totalTxInValues.doctors += referencedUTxOut.doctors;
        totalTxInValues.ventilators += referencedUTxOut.ventilators;
        totalTxInValues.researches += referencedUTxOut.researches;
    }

    let totalTxOutValues = {
        clicks: 0,
        masks: 0,
        respirators: 0,
        volunteers: 0,
        doctors: 0,
        ventilators: 0,
        researches: 0
    };
    for(let i = 0; i < transaction.txOuts.length; i++) {
        const txOut = transaction.txOuts[i];
        totalTxOutValues.clicks += txOut.clicks;
        totalTxOutValues.masks += txOut.masks;
        totalTxOutValues.respirators += txOut.respirators;
        totalTxOutValues.volunteers += txOut.volunteers;
        totalTxOutValues.doctors += txOut.doctors;
        totalTxOutValues.ventilators += txOut.ventilators;
        totalTxOutValues.researches += txOut.researches;
    }

    if(totalTxInValues.length != totalTxOutValues.length)
        return callback(new Error('Number of txIns does not equal totalTxOuts'));

    return callback(null);
}
function isTransactionStructureValid(transaction, callback = (err) => {}) {
    if(transaction == null)
        return callback(new Error('No transaction specified'));

    if (typeof transaction.id !== 'string')
        return callback(new Error('Transaction has no id'));

    if (!(transaction.txIns instanceof Array))
        return callback(new Error('Transaction txIns is not an Array'));

    for(let i = 0; i < transaction.txIns.length; i++)
        isTxInStructureValid(transaction.txIns[i], (err) => {
            if(err)
                return callback(err);
        });

    if (!(transaction.txOuts instanceof Array))
        return callback(new Error('Transaction txOuts is not an Array'));


    for(let i = 0; i < transaction.txOuts.length; i++)
        isTxOutStructureValid(transaction.txOuts[i], (err) => {
            if(err)
                return callback(err);
        });

    return callback(null);
}
function isTxInStructureValid(txIn, callback = (err) => {}) {
    if(txIn == null)
        return callback(new Error('No txIn specified'));

    if (typeof txIn.signature !== 'string')
        return callback(new Error('TxIn signature is missing'));

    if (typeof txIn.txOutId !== 'string')
        return callback(new Error('TxIn txOutId is not a string'));

    if (typeof txIn.txOutIndex !== 'number')
        return callback(new Error('TxIn txOutIndex is not a number'));

    return callback(null);
}
function isTxOutStructureValid(txOut, callback = (err) => {}) {
    if(txOut == null)
        return callback(new Error('No txOut specified'));

    if (typeof txOut.address !== 'string')
        return callback(new Error('TxOut address is not a string'));

    if(txOut.address.length !== 130)
        return callback(new Error('TxOut invalid address length'));

    if(txOut.address.match('^[a-fA-F0-9]+$') === null)
        return callback(new Error('TxOut address must contains non hex characters'));

    if (!txOut.address.startsWith('04'))
        return callback(new Error('TxOut address does not start with 04'));

    if (typeof txOut.clicks !== 'number'
        || typeof txOut.masks !== 'number'
        || typeof txOut.respirators !== 'number'
        || typeof txOut.volunteers !== 'number'
        || typeof txOut.doctors !== 'number'
        || typeof txOut.ventilators !== 'number'
        || typeof txOut.researches !== 'number')
        return callback(new Error('TxOut data contains a non number type'));

    /* TODO: Does sub 0 check belong here? */
    if (txOut.clicks < 0
        || txOut.masks < 0
        || txOut.respirators < 0
        || txOut.volunteers < 0
        || txOut.doctors < 0
        || txOut.ventilators < 0
        || txOut.researches < 0)
        return callback(new Error('TxOut data contains a negative value'));

    return callback(null);
}
function isCoinbaseTransactionValid(coinbaseTransaction, blockIndex, callback = (err) => {}) {
    if (getTransactionId(coinbaseTransaction.txIns, coinbaseTransaction.txOuts) != coinbaseTransaction.id)
        return callback(new Error('Invalid coinbase transaction id'));

    if (coinbaseTransaction.txIns.length != 1)
        return callback(new Error('Coinbase transaction does not contain exactly 1 txIn'));

    if (coinbaseTransaction.txIns[0].txOutIndex != blockIndex)
        return callback(new Error('Coinbase transaction txOutIndex does not equal blockIndex'));

    if (coinbaseTransaction.txOuts.length != 1)
        return callback(new Error('Coinbase transaction does not contain exactly 1 txOut'));

    if (coinbaseTransaction.txOuts[0].clicks != COINBASE_DATA.clicks
        || coinbaseTransaction.txOuts[0].masks != COINBASE_DATA.masks
        || coinbaseTransaction.txOuts[0].respirators != COINBASE_DATA.respirators
        || coinbaseTransaction.txOuts[0].volunteers != COINBASE_DATA.volunteers
        || coinbaseTransaction.txOuts[0].doctors != COINBASE_DATA.doctors
        || coinbaseTransaction.txOuts[0].ventilators != COINBASE_DATA.ventilators
        || coinbaseTransaction.txOuts[0].researches != COINBASE_DATA.researches)
        return callback(new Error('Coinbase transaction contains illegal values'));

    return callback(null);
}

module.exports = {
    COINBASE_DATA, Transaction, TxIn, TxOut, UnspentTxOut,
    getTransactionId, getBalance,
    isTransactionValid, isTransactionStructureValid, isCoinbaseTransactionValid,
    updateUnspent,
    getCoinbaseTransaction
}

/**
 * @callback isTransactionValidCallback
 * @param {Error} err
 * @returns {void}
 */

/**
 * @callback isTransactionStructureValidCallback
 * @param {Error} err
 * @returns {void}
 */

/**
 * @callback isTxInStructureValidCallback
 * @param {Error} err
 * @returns {void}
 */

/**
 * @callback isTxOutStructureValidCallback
 * @param {Error} err
 * @returns {void}
 */

/**
 * @callback isCoinbaseTransactionValidCallback
 * @param {Error} err
 * @returns {void}
 */
