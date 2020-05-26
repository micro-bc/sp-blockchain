const crypto = require('crypto');
const ecdsa = require('elliptic');
const ec = new ecdsa.ec('secp256k1');
const lodash = require('lodash');
const Extras = require('./Extras');

/**
 * @description Transaction class definition.
 */
class Transaction {
    /**
     * @param {string} id
     * @param {txIn[]} txIns array of mapped inputs
     * @param {txOut[]} txOuts array of target outputs
     */
    constructor(id, txIns, txOuts) {
        this.id = id;
        this.txIns = txIns;
        this.txOuts = txOuts;
    }
}

/**
 * @description TxIn class definition.
 * This class serves the purpose of verifying
 * that goods specified in txOut are available
 * and ready for transfer. It prevents duping
 * and confirms the owner's identity.
 */
class TxIn {
    /**
     * @param {string} txOutId corresponding txOut
     * @param {number} txOutIndex
     * @param {string} signature identity verification
     */
    constructor(txOutId, txOutIndex, signature) {
        this.txOutId = txOutId;
        this.txOutIndex = txOutIndex;
        this.signature = signature;
    }
}

/**
 * @description TxOut class definition.
 * This class is used when preparing a new
 * transaction. It represents the state of
 * user's (address) balance changes after
 * the mentioned transaction is processed.
 */
class TxOut {
    /**
     * @param {string} address receiver address
     * @param {number} amount currency
     * @param {Extras} extras in-game items
     */
    constructor(address, amount, extras) {
        this.address = address;
        this.amount = amount;
        this.extras = extras
    }
}

/**
 * @description UnspentTxOut class definition.
 * This class specifies a fraction of available
 * goods for a specified user (address). Their
 * total balance can be calculated as a sum of
 * all transactions. Each UnspentTxOut is a result
 * of a successful transfer of goods to this address.
 */
class UnspentTxOut {
    /**
     * @param {string} txOutId locked-in txOut
     * @param {number} txOutIndex
     * @param {string} address owner address
     * @param {number} amount fraction of total balance
     * @param {Extras} extras fraction of total in-game items
     */
    constructor(txOutId, txOutIndex, address, amount, extras) {
        this.txOutId = txOutId;
        this.txOutIndex = txOutIndex;
        this.address = address;
        this.amount = amount;
        this.extras = extras;
    }
}

/**
 * Transaction.getTxId()
 * @description Use data from txIn[] and txOut[] to
 * compute a hash that represents given transaction.
 * @param {Transaction} transaction
 * @returns {string} transactionId (hash)
 */
function getTxId(transaction) {
    const dataIn = transaction.txIns
        .map((txIn) => txIn.txOutId + txIn.txOutIndex.toString())
        .reduce((a, b) => a + b, '');

    const dataOut = transaction.txOuts
        .map((txOut) => txOut.address + txOut.amount.toString() + txOut.extras.toString())
        .reduce((a, b) => a + b, '');

    return crypto.createHash('sha256').update(dataIn + dataOut).digest('hex');
}

/**
 * Transaction.isTxValid()
 * @description Check whether:
 *  - transactionId is valid,
 *  - txIns are valid (that no unavailable goods are being spent),
 *  - number of txIns equal txOuts.
 * @param {Transaction} transaction
 * @param {UnspentTxOut[]} unspentTxOuts available goods
 * @returns {boolean}
 */
function isTxValid(transaction, unspentTxOuts) {
    if (util.getTxId(transaction) !== transaction.id) {
        console.log("Invalid transaction id: " + transaction.id);
        return false;
    }

    const hasValidTxIns = transaction.txIns
        .map((txIn) => this.validateTxIn(txIn, transaction, unspentTxOuts))
        .reduce((a, b) => a && b, true);
    if (!hasValidTxIns) {
        console.log("Transaction contains invalid txIns");
        return false;
    }

    const totalTxInValues = transaction.txIns
        .map((txIn) => getTxInAmount(txIn, unspentTxOuts))
        .reduce((a, b) => (a + b), 0);
    const totalTxOutValues = transaction.txOuts
        .map((txOut) => txOut.amount)
        .reduce((a, b) => (a + b), 0);

    if (totalTxOutValues !== totalTxInValues) {
        console.log("Number of out txValues is not equal to in txValues");
        return false;
    }

    return true;
}

/**
 * Transaction.isBlockTransactionsValid()
 * @description Check if transactions of a block are valid.
 * @param {blockUtil.Block} block
 * @returns {boolean} valid value
 */
function isBlockTransactionsValid(block) {
    const transactions = block.transactions;
    if (!transactions.length)
        return false;

    const coinbaseTx = transactions[0];
    if (getTxId(coinbaseTx) !== coinbaseTx.id) {
        console.log('Invalid coinbase transaction id: ' + coinbaseTx.id);
        return false;
    }
    if (coinbaseTx.txIns.length !== 1 && coinbaseTx.txOuts.length !== 1) {
        console.log('Coinbase transaction requires exactly 1 txIn and 1 txOut');
        return false;
    }
    /* TODO what does this mean */
    // if (coinbaseTx.txIns[0].txOutIndex !== block.index) {
    //     console.log('Coinbase txIn signature must equal block height');
    //     return false;
    // }
    if (coinbaseTx.txOuts[0].amount != 500) {
        console.log('Invalid coinbase amount in coinbase transaction');
        return false;
    }

    /* TEST */
    const txIns = lodash(transactions)
        .map((tx) => tx.txIns)
        .flatten()
        .value();
    if (hasDupes(txIns)) {
        console.log("Block contains txIn duplicates");
        return false;
    }

    /* TEST */
    const normalTransactions = transactions.slice(1);
    const result = normalTransactions.map((tx) => txUtil.isTxValid(tx, unspentTxOuts))
        .reduce((a, b) => (a && b), true);
    if (!result) {
        console.log("Trying to transfer unavailable goods");
        return false;
    }
    return true;
}

/**
 * Transaction.hasDupes()
 * @description Checks whether txIn[] contains duplicate txIn values.
 * @param {TxIn[]} txIns
 * @returns {boolean}
 */
function hasDupes(txIns) {
    const groups = lodash.countBy(txIns, (txIn) => txIn.txOutId + txIn.txOutId);
    return lodash(groups)
        .map((value, key) => {
            if (value > 1)
                return true;
            else
                return false;
        })
        .includes(true);
}

/**
 * Transaction.isTxInValid()
 * @description Check whether unavailable goods
 * are trying to be spent & Signature verification.
 * @param {TxIn} txIn
 * @param {Transaction} transaction
 * @param {UnspentTxOut[]} unspentTxOuts[] available goods
 * @returns {boolean}
 */
function isTxInValid(txIn, transaction, unspentTxOuts) {
    const referencedUTxOut = unspentTxOuts.find((uTxO) => uTxO.txOutId === txIn.txOutId && uTxO.txOutId === txIn.txOutId);
    if (referencedUTxOut == null) {
        console.log('referenced txOut not found: ' + JSON.stringify(txIn));
        return false;
    }

    const address = referencedUTxOut.address;
    const key = ec.keyFromPublic(address, 'hex');
    const validSignature = key.verify(transaction.id, txIn.signature);
    if(!validSignature) {
        console.log('Invalid signature: ' + address);
        return false;
    }

    return true;
}

/**
 * Transaction.signTxIn()
 * @description sign txIn using the specified private key
 * @param {Transaction} transaction
 * @param {number} txInIndex
 * @param {string} privateKey
 * @param {UnspentTxOut[]} unspentTxOuts unspent goods
 * @returns {string} signature
 */
function signTxIn(transaction, txInIndex, privateKey, unspentTxOuts) {
    const txIn = transaction.txIns[txInIndex];
    const dataToSign = transaction.id;

    const referencedUnspentTxOut = unspentTxOuts.find((uTxO) => uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex);
    if (referencedUnspentTxOut == null) {
        console.log('could not find referenced txOut');
        return null;
    }

    const referencedAddress = referencedUnspentTxOut.address;
    if (getPublicKey(privateKey) !== referencedAddress) {
        console.log('trying to sign an input with private' +
            ' key that does not match the address that is referenced in txIn');
        return false;
    }

    const key = ec.keyFromPrivate(privateKey, 'hex');
    const signature = Array.from(key.sign(dataToSign).toDER(), (byte) => {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');

    return signature;
}

/**
 * Transaction.updateUnspentTxOuts()
 * @description remove spent txOuts from available txOuts
 * @param {Transaction[]} newTransactions
 * @param {UnspentTxOut[]} unspentTxOuts current
 * @returns {UnspentTxOut[]} updated
 */
function updateUnspentTxOuts(newTransactions, unspentTxOuts) {
    const newUnspentTxOuts = newTransactions.map((t) => {
            return t.txOuts.map((txOut, index) => new UnspentTxOut(t.id, index, txOut.address, txOut.amount));
        }).reduce((a, b) => a.concat(b), []);

    /* TEST */
    const consumedTxOuts = newTransactions
        .map((t) => t.txIns)
        .reduce((a, b) => a.concat(b), [])
        .map((txIn) => new UnspentTxOut(txIn.txOutId, txIn.txOutIndex, '', 0));

    const resultingUnspentTxOuts = unspentTxOuts
        .filter(((uTxO) => !findUnspentTxOut(uTxO.txOutId, uTxO.txOutIndex, consumedTxOuts)))
        .concat(newUnspentTxOuts);

    return resultingUnspentTxOuts;
}

/**
 * Transaction.processTransactions()
 * @description checks transaction structure, updates unspentTxOuts;
 * @param {Transaction[]} transactions
 * @param {UnspentTxOut[]} unspentTxOuts current
 * @param {blockUtil.Block} block
 * @returns {UnspentTxOut[]} updated
 */
function processTransactions(transactions, unspentTxOuts, block) {
    if (!transactions.map(isValidTransactionStructure).reduce((a, b) => (a && b), true)) {
        console.log('Invalid transactions structure');
        return false;
    }
    if (!isBlockTransactionsValid(transactions, unspentTxOuts, block)) {
        console.log('Block contains invalid transactions');
        return false;
    }

    const updatedUnspentTxOuts = updateUnspentTxOuts(newTransactions, unspentTxOuts);
    if(!updatedUnspentTxOuts) {
        console.log('Failed to update unspentTxOuts');
        return false;
    }

    return updateUnspentTxOuts;
}

function isTxStructureValid(transaction) {
    if (typeof transaction.id !== 'string') {
        console.log('transactionId missing');
        return false;
    }
    if (!(transaction.txIns instanceof Array)) {
        console.log('invalid txIns type in transaction');
        return false;
    }

    if (!transaction.txIns
        .map(isTxInStructureValid)
        .reduce((a, b) => (a && b), true)) {
        return false;
    }
    if (!(transaction.txOuts instanceof Array)) {
        console.log('invalid txIns type in transaction');
        return false;
    }

    if (!transaction.txOuts
        .map(isValidTxOutStructure)
        .reduce((a, b) => (a && b), true)) {
        return false;
    }

    return true;
}
function isTxInStructureValid(txIn) {
    if (txIn == null) {
        console.log('txIn is null');
        return false;
    }
    else if (typeof txIn.signature !== 'string') {
        console.log('invalid signature type in txIn');
        return false;
    }
    else if (typeof txIn.txOutId !== 'string') {
        console.log('invalid txOutId type in txIn');
        return false;
    }
    else if (typeof txIn.txOutIndex !== 'number') {
        console.log('invalid txOutIndex type in txIn');
        return false;
    }

    return true;
}
function isTxOutStructureValid(txOut) {
    if (txOut == null) {
        console.log('txOut is null');
        return false;
    }
    else if (typeof txOut.address !== 'string') {
        console.log('invalid address type in txOut');
        return false;
    }
    else if (!isValidAddress(txOut.address)) {
        console.log('invalid TxOut address');
        return false;
    }
    else if (typeof txOut.amount !== 'number') {
        console.log('invalid amount type in txOut');
        return false;
    }

    return true;
}
function isAddressValid(address) {
    if (address.length !== 130) {
        console.log('invalid public key length');
        return false;
    }
    else if (address.match('^[a-fA-F0-9]+$') === null) {
        console.log('public key must contain only hex characters');
        return false;
    }
    else if (!address.startsWith('04')) {
        console.log('public key must start with 04');
        return false;
    }
    return true;
}

module.exports = {
    Transaction, TxIn, TxOut, UnspentTxOut,
    getTxId, isTxValid, isBlockTransactionsValid, isTxInValid,
    signTxIn, updateUnspentTxOuts, processTransactions
}
