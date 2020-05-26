const fs = require('fs');
const lodash = require('lodash');
const ecdsa = new require('elliptic');
const ec = new ecdsa.ec('secp256k1');

const Extras = require('./Extras');
const txUtil = require('./Transaction');

/**
 * Wallet.generateKeypair()
 * @description check if a private key exists otherwise generate a keypair.
 * @returns {void}
 */
function generateKeypair(filepath) {
    if (!fs.existsSync('blockchain/wallet/'))
        fs.mkdirSync('blockchain/wallet');
    if (filepath == null)
        filepath = 'blockchain/wallet/private_key';

    if (fs.existsSync(filepath))
        return null;

    const keyPair = ec.genKeyPair();
    const privateKey = keyPair.getPrivate();
    fs.writeFileSync(filepath, privateKey.toString(16));
    return privateKey.toString(16);
};

function getPrivateKey(filepath) {
    let buffer = fs.readFileSync(filepath, 'utf8');
    return buffer.toString();
};

function getPublicKey(privateKey) {
    const key = ec.keyFromPrivate(privateKey, 'hex');
    return key.getPublic().encode('hex');
};

/**
 * Wallet.getBalance()
 * @description sum unspent balance
 * @returns {{number, Extras}} {ammount, extras}
 */
function getBalance(address, unspentTxOuts) {
    let amount = 0;
    let masks = 0;
    let respirators = 0;
    let volunteers = 0;
    let doctors = 0;
    let ventilators = 0;
    let hazmats = 0;
    let researches = 0;
    for(let i = 0; i < unspentTxOuts.length; i++) {
        let uTxO = unspentTxOuts[i];
        if (uTxO.address === address) {
            amount += uTxO.amount;
            masks += uTxO.extras.masks;
            respirators += uTxO.extras.respirators;
            volunteers += uTxO.extras.volunteers;
            doctors += uTxO.extras.doctors;
            ventilators += uTxO.extras.ventilators;
            hazmats += uTxO.extras.hazmats;
            researches += uTxO.extras.researches;
        }
    }
    let extras = new Extras(masks, respirators, volunteers, doctors, ventilators, hazmats, researches);
    return { amount, extras };
};

/**
 * Wallet.findTxOuts()
 * @description select unspentTxOuts for a transaction
 * @returns {{UnspentTxOut[], number, Extras}} triplet of unspentTxOuts and leftovers
 */
function findTxOuts(targetAmount, targetExtras, myUnspentTxOuts) {
    let amount = 0;
    let masks = 0;
    let respirators = 0;
    let volunteers = 0;
    let doctors = 0;
    let ventilators = 0;
    let hazmats = 0;
    let researches = 0;
    const includedUnspentTxOuts = [];
    for(let i = 0; i < myUnspentTxOuts.length; i++) {
        let uTxO = myUnspentTxOuts[i];
        includedUnspentTxOuts.push(uTxO);
        amount += uTxO.amount;
        masks += uTxO.extras.masks;
        respirators += uTxO.extras.respirators;
        volunteers += uTxO.extras.volunteers;
        doctors += uTxO.extras.doctors;
        ventilators += uTxO.extras.ventilators;
        hazmats += uTxO.extras.hazmats;
        researches += uTxO.extras.researches;
        if (amount >= targetAmount
            && masks >= targetExtras.masks
            && respirators >= targetExtras.respirators
            && volunteers >= targetExtras.volunteers
            && doctors >= targetExtras.doctors
            && ventilators >= targetExtras.ventilators
            && hazmats >= targetExtras.hazmats
            && researches >= targetExtras.researches) {
            const leftOverAmount = amount - targetAmount;
            const leftOverExtras = new Extras(
                masks - targetExtras.masks,
                respirators - targetExtras.respirators,
                volunteers - targetExtras.volunteers,
                doctors - targetExtras.doctors,
                ventilators - targetExtras.ventilators,
                hazmats - targetExtras.hazmats,
                researches - targetExtras.researches,
            );
            return { includedUnspentTxOuts, leftOverAmount, leftOverExtras };
        }
    }
    console.log('Insufficient funds');
    return null;
};

/**
 * Wallet.createTxOuts()
 * @description prepare the txOut[] for a new transaction
 * @returns {{TxOut, TxOut}} pair of txOut, txOutLefovers
 */
function createTxOuts(receiver, sender, amount, extras, leftOverAmount, leftOverExtras) {
    const txOut = new txUtil.TxOut(receiver, amount, extras);
    const leftOverTx = new txUtil.TxOut(sender, leftOverAmount, leftOverExtras);
    return { txOut, leftOverTx };
}

/**
 * Wallet.createTransaction()
 * @description combine txOuts with to-be-generated txIns
 * @returns {Transaction}
 */
function createTransaction(receiver, amount, extras, privateKey, unspentTxOuts) {
    const sender = getPublicKey(privateKey);
    const myUnspentTxOuts = unspentTxOuts.filter((uTxO) => uTxO.address === sender);
    const { includedUnspentTxOuts, leftOverAmount, leftOverExtras } = findTxOuts(amount, extras, myUnspentTxOuts);

    const toUnsignedTxIn = (unspentTxOut) => {
        const txIn = new txUtil.TxIn();
        txIn.txOutId = unspentTxOut.txOutId;
        txIn.txOutIndex = unspentTxOut.txOutIndex;
        return txIn;
    };

    const unsignedTxIns = includedUnspentTxOuts.map(toUnsignedTxIn);
    const { txOut, leftOverTx } = createTxOuts(receiver, sender, amount, extras, leftOverAmount, leftOverExtras);

    /* TODO what to do with leftOverTx!? */

    let tx = new txUtil.Transaction(null, unsignedTxIns, [txOut]);
    tx.id = txUtil.getTxId(tx);

    tx.txIns = tx.txIns.map((txIn, index) => {
        txIn.signature = txUtil.signTxIn(tx, index, privateKey, getPublicKey(privateKey), unspentTxOuts);
        return txIn;
    });

    return tx;
}

/**
 * Wallet.createCoinbaseTransaction()
 * @description generate init transaction
 * @returns {Transaction}
 */
function getCoinbaseTransaction(address, blockIndex) {
    const coinbaseTxIn = new txUtil.TxIn("", blockIndex, "");
    coinbaseTxIn.signature = "COINBASE_TRANSACTION";
    let coinbaseTxOut = new txUtil.TxOut(address, 500, new Extras(100, 70, 50, 25, 15, 5, 2));
    let coinbaseTransaction = new txUtil.Transaction("", null, null);
    coinbaseTransaction.txIns = [coinbaseTxIn];
    coinbaseTransaction.txOuts = [coinbaseTxOut];
    coinbaseTransaction.id = txUtil.getTxId(JSON.parse(JSON.stringify(coinbaseTransaction)));
    return coinbaseTransaction;
}

module.exports = {
    generateKeypair, getPrivateKey, getPublicKey,
    getBalance, createTransaction, getCoinbaseTransaction
};
