const fs = require('fs');
const lodash = require('lodash');
const ecdsa = new require('elliptic');
const ec = new ecdsa.ec('secp256k1');

const Extras = require('./Extras');
const txUtil = require('./Transaction');

const PK_PATH = 'blockchain/wallet/';

/**
 * Wallet.generateKeypair()
 * @description check if a private key exists otherwise generate a keypair.
 * @returns {void}
 */
function generateKeypair(port) {
    if (fs.existsSync(PK_PATH + port + '_private_key'))
        return;
    const keyPair = ec.genKeyPair();
    const privateKey = keyPair.getPrivate();
    fs.writeFileSync(PK_PATH + port + '_private_key', privateKey.toString(16));
};

function getPrivateKey(port) {
    generateKeypair(port);
    let buffer = fs.readFileSync(PK_PATH + port + '_private_key', 'utf8');
    return buffer.toString();
};

function getPublicKey(privateKey) {
    const key = ec.keyFromPrivate(privateKey, 'hex');
    return key.getPublic().encode('hex');
};


/**
 * Wallet.getBalance()
 * @description sum unspent balance
 * @returns {{amount, extras}} balance pair
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
    for(let uTxO in unspentTxOuts) {
        if(uTxO.address === address) {
            amount += uTxO.amount;
            masks += uTxO.extras.masks;
            respirators += uTxO.extras.respirators;
            volunteers += uTxO.extras.volunteers;
            doctors += uTxO.extras.doctors;
            ventilators += uTxO.extras.ventilators;
            hazemats += uTxO.extras.hazemats;
            researches += uTxO.extras.researches;
        }
    }
    let extras = new Extras(masks, respirators, volunteers, doctors, ventilators, hazemats, researches);
    return { amount: amount, extras: extras};
};

/**
 * Wallet.findTxOuts()
 * @description select unspentTxOuts for a transaction
 * @returns {{UnspentTxOut[], number, Extras}} triplet of unspentTxOuts and leftovers
 */
function findTxOuts(targetAmount, targetExtras, myUnspentTxOuts, callback = (err, data) => { if (err) console.log(err); }) {
    let amount = 0;
    let masks = 0;
    let respirators = 0;
    let volunteers = 0;
    let doctors = 0;
    let ventilators = 0;
    let hazmats = 0;
    let researches = 0;
    const includedUnspentTxOuts = [];
    for (let uTxO in myUnspentTxOuts) {
        includedUnspentTxOuts.push(uTxO);
        amount += uTxO.amount;
        masks += uTxO.extras.masks;
        respirators += uTxO.extras.respirators;
        volunteers += uTxO.extras.volunteers;
        doctors += uTxO.extras.doctors;
        ventilators += uTxO.extras.ventilators;
        hazemats += uTxO.extras.hazemats;
        researches += uTxO.extras.researches;
        if(amount >= targetAmount
            && masks >= targetExtras.masks
            && respirators >= targetExtras.respirators
            && volunteers >= targetExtras.volunteers
            && doctors >= targetExtras.doctors
            && ventilators >= targetExtras.ventilators
            && hazemats >= targetExtras.hazemats
            && researches >= targetExtras.researches) {
                const leftOverAmount = amount - targetAmount;
                const leftOverExtras = new Extras(
                    masks - targetExtras.masks,
                    respirators - targetExtras.respirators,
                    volunteers - targetExtras.volunteers,
                    doctors - targetExtras.doctors,
                    ventilators - targetExtras.ventilators,
                    hazemats - targetExtras.hazemats,
                    researches - targetExtras.researches,
                ); 
                return callback(null, { includedUnspentTxOuts, leftOverAmount, leftOverExtras });
            }
    }
    return callback('Insufficient balance', null);
};

/**
 * Wallet.createTxOuts()
 * @description prepare the txOut[] for a new transaction
 * @returns {[TxOut[], TxOut]} pair of TxOuts, Leftovers
 */
function createTxOuts(receiverAddress, myAddress, amount, extras, leftOverAmount, leftOverExtras) {
    /* TODO why only 1 txOut */
    const txOut = new TxOut(receiverAddress, amount, extras);
    const leftOverTx = new TxOut(myAddress, leftOverAmount, leftOverExtras);
    return [txOut, leftOverTx];
}

/**
 * Wallet.createTransaction()
 * @description combine txOuts with to-be-generated txIns
 * @returns {Transaction}
 */
function createTransaction(receiverAddress, amount, extras, privateKey, unspentTxOuts) {
    const myAddress = getPublicKey(privateKey);
    const myUnspentTxOuts = unspentTxOuts.filter((uTxO) => uTxO.address === myAddress);

    const { includedUnspentTxOuts, leftOverAmount, leftOverExtras } = findTxOuts(amount, extras, myUnspentTxOuts);

    const toUnsignedTxIn = (unspentTxOut) => {
        const txIn = new TxIn();
        txIn.txOutId = unspentTxOut.txOutId;
        txIn.txOutIndex = unspentTxOut.txOutIndex;
        return txIn;
    };

    const unsignedTxIns = includedUnspentTxOuts.map(toUnsignedTxIn);

    const tx = new Transaction(unsignedTxIns, createTxOuts(receiverAddress, myAddress, amount, extras, leftOverAmount, leftOverExtras));
    tx.id = getTransactionId(tx);

    tx.txIns = tx.txIns.map((txIn, index) => {
        txIn.signature = signTxIn(tx, index, privateKey, unspentTxOuts);
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
    let coinbaseTxOut = new txUtil.TxOut(address, 0, new Extras(0, 0, 0, 0, 0, 0, 0));

    let coinbaseTransaction = new txUtil.Transaction("", null, null);
    coinbaseTransaction.txIns = [coinbaseTxIn];
    coinbaseTransaction.txOuts = [coinbaseTxOut];
    coinbaseTransaction.id = txUtil.getTxId(coinbaseTransaction);
    return coinbaseTransaction;
}

module.exports = {
    getPrivateKey, getPublicKey, createTransaction, getCoinbaseTransaction
    // createTransaction, getPublicKey,
    // getPrivateKey, getBalance, generatePrivateKey, generateKeypair
};