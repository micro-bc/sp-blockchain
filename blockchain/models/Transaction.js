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
     * @param {string} id
     * @param {txIn[]} txIns array of mapped inputs
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
     * @param {string} signature identity verification
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
     * @param {number} clicks (coins)
     * @param {number} masks
     * @param {number} respirators
     * @param {number} volunteers
     * @param {number} doctors
     * @param {number} ventilators
     * @param {number} researches
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
 * Transaction.getHash()
 * @description Use data from txIn[] and txOut[] to
 * compute a hash that represents given transaction.
 * @param {TxIn[]} txIns
 * @param {TxOut[]} txOuts
 * @returns {string} transactionId sha265 hash
 */
function getHash(txIns, txOuts) {
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
 * @returns {UnspentTxOut[]} delta
 */
function updateUnspent(transactions, uTxOs) {
    let newUTxOs = [];
    let consumedTxOs = [];
    for(let i = 0; i < transactions.length; i++) {
        let tx = transactions[i];
        for(let j = 0; j < tx.txOuts.length; j++) {
            let txOut = tx.txOuts[j];
            newUTxOs.push(new UnspentTxOut(tx.id, j, txOut.address,
                txOut.clicks, txOut.masks, txOut.respirators, txOut.volunteers,
                txOut.doctors, txOut.ventilators, txOut.researches));
        }
        for(let j = 0; j < tx.txIns.length; j++) {
            let txIn = tx.txIns[j];
            consumedTxOs.push(new UnspentTxOut(txIn.txOutId, txIn.txOutIndex, null,
                0, 0, 0, 0, 0, 0, 0));
        }
    }

    const findUnspentTxOut = (transactionId, index, uTxOs) => {
        return uTxOs.find((uTxO) => uTxO.txOutId === transactionId && uTxO.txOutIndex === index);
    };

    const updated = uTxOs.filter(((uTxO) =>
        !findUnspentTxOut(uTxO.txOutId, uTxO.txOutIndex, consumedTxOs)))
            .concat(newUTxOs);

    return updated;
}

/**
 * Transaction.coinbaseTransaction()
 * @description initializes a new user into the chain
 * @param {string} publicKey
 * @param {number} index
 * @returns {Transaction} coinbaseTransaction
 */
function coinbaseTransaction(publicKey, index) {
    let initTxOut = new TxOut(publicKey);
    initTxOut.clicks = COINBASE_DATA.clicks;
    initTxOut.masks = COINBASE_DATA.masks;
    initTxOut.respirators = COINBASE_DATA.respirators;
    initTxOut.volunteers = COINBASE_DATA.volunteers;
    initTxOut.doctors = COINBASE_DATA.doctors;
    initTxOut.ventilators = COINBASE_DATA.ventilators;
    initTxOut.researches = COINBASE_DATA.researches;

    let initTxIn = new TxIn('', index);

    let initTx = new Transaction([ JSON.parse(JSON.stringify(initTxIn))], [JSON.parse(JSON.stringify(initTxOut))]);
    initTx.id = getHash(initTx.txIns, initTx.txOuts);

    return initTx;
}

/**
 * Transaction.getBalance()
 * @description parse the chain for total balance
 * @param {string} publicKey
 * @param {UnspentTxOut[]} uTxOs
 * @returns {{number, number,... }} {clicks, masks, ...}
 */
function getBalance(publicKey, uTxOs) {
    let sum = {
        clicks: 0,
        masks: 0,
        respirators: 0,
        volunteers: 0,
        doctors: 0,
        ventilators: 0,
        researches: 0
    }
    for(let i = 0; i < uTxOs.length; i++) {
        if(uTxOs[i].address == publicKey) {
            sum.clicks += uTxOs[i].clicks;
            sum.masks += uTxOs[i].masks;
            sum.respirators += uTxOs[i].respirators;
            sum.volunteers += uTxOs[i].volunteers;
            sum.doctors += uTxOs[i].doctors;
            sum.ventilators += uTxOs[i].ventilators;
            sum.researches += uTxOs[i].researches;
        }
    }

    return {
        clicks: sum.clicks,
        masks: sum.masks,
        respirators: sum.respirators,
        volunteers: sum.volunteers,
        doctors: sum.doctors,
        ventilators: sum.ventilators,
        researches: sum.researches
    };
}

/**
 * Transaction.isTransactionValid()
 * @param {Transaction} transaction
 * @param {UnspentTxOut[]} uTxOs
 * @returns {boolean} validity
 */
function isTransactionValid(transaction, uTxOs) {
    if (getHash(transaction.txIns, transaction.txOuts) != transaction.id) {
        console.log('Invalid transaction id:', transaction.id);
        return false;
    }

    for(let i = 0; i < transaction.txIns.length; i++) {
        let txIn = transaction.txIns[i];
        const referencedUTxO = uTxOs.find((uTxO) => uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex);
        if (!referencedUTxO) {
            console.log('Referenced txIn->txOut not found');
            return false;
        }
        const data = {
            clicks: referencedUTxO.clicks,
            masks: referencedUTxO.masks,
            respirators: referencedUTxO.respirators,
            volunteers: referencedUTxO.volunteers,
            doctors: referencedUTxO.doctors,
            ventilators: referencedUTxO.ventilators,
            researches: referencedUTxO.researches
        }

        /* TODO */
        // if(!walletUtil.isSignatureValid(txIn.signature, referencedUTxO.address, data)) {
        //     console.log('Invalid signature found');
        //     return false;
        // }
    }

    let totalTxInValues = {
        clicks: 0,
        masks: 0,
        respirators: 0,
        volunteers: 0,
        doctors: 0,
        ventilators: 0,
        researches: 0
    }
    for(let i = 0; i < transaction.txIns.length; i++) {
        let txIn = transaction.txIns[i];
        let referencedUTxOut = uTxOs.find((uTxO) => uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex);
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
    }
    for(let i = 0; i < transaction.txOuts.length; i++) {
        let txOut = transaction.txOuts[i];
        totalTxOutValues.clicks += txOut.clicks;
        totalTxOutValues.masks += txOut.masks;
        totalTxOutValues.respirators += txOut.respirators;
        totalTxOutValues.volunteers += txOut.volunteers;
        totalTxOutValues.doctors += txOut.doctors;
        totalTxOutValues.ventilators += txOut.ventilators;
        totalTxOutValues.researches += txOut.researches;
    }

    if(totalTxInValues.length != totalTxOutValues.length) {
        console.log('Total txIns does not equal totalTxOuts');
        return false;
    }

    return true;
}


function isTransactionStructureValid(transaction) {
    if(transaction == null) {
        console.log('No transaction specified');
        return false;
    }
    if (typeof transaction.id !== 'string') {
        console.log('Transaction has no id');
        return false;
    }
    if (!(transaction.txIns instanceof Array)) {
        console.log('Transaction txIns is not an Array');
        return false;
    }
    for(let i = 0; i < transaction.txIns.length; i++)
        if(!isTxInStructureValid(transaction.txIns[i]))
            return false;

    if (!(transaction.txOuts instanceof Array)) {
        console.log('Transaction txOuts is not an Array');
        return false;
    }

    for(let i = 0; i < transaction.txOuts.length; i++)
        if(!isTxOutStructureValid(transaction.txOuts[i]))
            return false;
    return true;
}

function isTxInStructureValid(txIn) {
    if(txIn == null) {
        console.log('No txIn specified');
        return false;
    }
    if (typeof txIn.signature !== 'string') {
        console.log('TxIn signature is missing');
        return false;
    }
    if (typeof txIn.txOutId !== 'string') {
        console.log('TxIn txOutId is not a string');
        return false;
    }
    if (typeof txIn.txOutIndex !== 'number') {
        console.log('TxIn txOutIndex is not a number');
        return false;
    }
    return true;
}

function isTxOutStructureValid(txOut) {
    if(txOut == null) {
        console.log('No txOut specified');
        return false;
    }
    if (typeof txOut.address !== 'string') {
        console.log('TxOut address is not a string');
        return false;
    }
    if(txOut.address.length !== 130) {
        console.log('TxOut invalid address length');
        return false;
    }
    if(txOut.address.match('^[a-fA-F0-9]+$') === null) {
        console.log('TxOut address must contains non hex characters');
        return false;
    }
    if (!txOut.address.startsWith('04')) {
        console.log('TxOut address does not start with 04');
        return false;
    }
    if (typeof txOut.clicks !== 'number'
        || typeof txOut.masks !== 'number'
        || typeof txOut.respirators !== 'number'
        || typeof txOut.volunteers !== 'number'
        || typeof txOut.doctors !== 'number'
        || typeof txOut.ventilators !== 'number'
        || typeof txOut.researches !== 'number') {
        console.log('TxOut data contains a non number type');
        return false;
    }
    /* TODO: Does sub 0 check belong here? */
    if (txOut.clicks < 0
        || txOut.masks < 0
        || txOut.respirators < 0
        || txOut.volunteers < 0
        || txOut.doctors < 0
        || txOut.ventilators < 0
        || txOut.researches < 0) {
        console.log('TxOut data contains a negative value');
        return false;
    }
    return true;
}
function isCoinbaseTransactionValid(coinbaseTransaction, blockIndex) {
    if (getHash(coinbaseTransaction.txIns, coinbaseTransaction.txOuts) != coinbaseTransaction.id) {
        console.log('Invalid coinbase transaction id');
        return false;
    }
    if (coinbaseTransaction.txIns.length != 1) {
        console.log('Coinbase transaction does not contain exactly 1 txIn');
        return;
    }
    if (coinbaseTransaction.txIns[0].txOutIndex != blockIndex) {
        console.log('Coinbase transaction txOutIndex does not equal blockIndex');
        return false;
    }
    if (coinbaseTransaction.txOuts.length != 1) {
        console.log('Coinbase transaction does not contain exactly 1 txOut');
        return false;
    }
    if (coinbaseTransaction.txOuts[0].clicks != COINBASE_DATA.clicks
        || coinbaseTransaction.txOuts[0].masks != COINBASE_DATA.masks
        || coinbaseTransaction.txOuts[0].respirators != COINBASE_DATA.respirators
        || coinbaseTransaction.txOuts[0].volunteers != COINBASE_DATA.volunteers
        || coinbaseTransaction.txOuts[0].doctors != COINBASE_DATA.doctors
        || coinbaseTransaction.txOuts[0].ventilators != COINBASE_DATA.ventilators
        || coinbaseTransaction.txOuts[0].researches != COINBASE_DATA.researches) {
        console.log('Coinbase transaction contains illegal values');
        return false;
    }
    return true;
}

module.exports = {
    COINBASE_DATA, Transaction, TxIn, TxOut, UnspentTxOut,
    getHash, getBalance,
    isTransactionValid, isTransactionStructureValid, isCoinbaseTransactionValid,
    updateUnspent,
    coinbaseTransaction
}
