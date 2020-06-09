const ec = require('elliptic');
const EC = new ec.ec('secp256k1');

/**
 * Wallet.generateKeypair()
 * @description create a new keypair
 * @returns {{string, string}} {privateKey, publicKey}
 */
function generateKeypair() {

    const kp = EC.genKeyPair()
    const x = kp.getPrivate('hex');
    const y = kp.getPublic('hex');

    return { privateKey: x, publicKey: y };
}

/**
 * wallet.sign()
 * @description create a new keypair
 * @param {string} privatekey
 * @param {string} data
 * @returns {string} signature
 */
function sign(privateKey, data) {
    const kp = EC.keyFromPrivate(privateKey, 'hex');

    return kp.sign(JSON.stringify(data), 'utf-8').toDER('hex');
}

/**
 * wallet.isSignatureValid()
 * @param {string} signature
 * @param {string} publicKey
 * @param {string} data
 * @returns {boolean} isValid
 */
function isSignatureValid(signature, publicKey, data) {
    const kp = EC.keyFromPublic(publicKey, 'hex');

    return kp.verify(JSON.stringify(data), signature);
}

/**
 * Wallet.signTxIn()
 * @description sign txIn using the specified private key
 * @param {Transaction} transaction
 * @param {number} txInIndex
 * @param {string} privateKey
 * @returns {string} signature
 */
function signTxIn(transaction, txInIndex, privateKey) {
    const txIn = transaction.txIns[txInIndex];
    console.log("Not Implemented");

    // const referencedUnspentTxOut = findUnspentTxOut(txIn.txOutId, txIn.txOutIndex, allUnspentTxOuts);
    // if (referencedUnspentTxOut == null) {
    //     console.log('could not find referenced txOut');
    //     return null;
    // }

    // const referencedAddress = referencedUnspentTxOut.address;
    // if (publicKey !== referencedAddress) {
    //     console.log('trying to sign an input with private' +
    //         ' key that does not match the address that is referenced in txIn');
    //     return null;
    // }
    return sign(privateKey, transaction.id);
}


module.exports = {
    generateKeypair, sign, isSignatureValid
    //signTxIn
}


// const Extras = require('./Extras');
// const txUtil = require('./Transaction');

// const DEFAULT_PATH = 'blockchain/wallet/private_key';

// /**
//  * Wallet.getBalance()
//  * @description sum unspent balance
//  * @returns {{number, Extras}} {ammount, extras}
//  */
// function getBalance(address, unspentTxOuts) {
//     let amount = 0;
//     let masks = 0;
//     let respirators = 0;
//     let volunteers = 0;
//     let doctors = 0;
//     let ventilators = 0;
//     let hazmats = 0;
//     let researches = 0;
//     for(let i = 0; i < unspentTxOuts.length; i++) {
//         let uTxO = unspentTxOuts[i]
//         if (uTxO.address === address) {
//             amount += uTxO.amount;
//             masks += uTxO.extras.masks;
//             respirators += uTxO.extras.respirators;
//             volunteers += uTxO.extras.volunteers;
//             doctors += uTxO.extras.doctors;
//             ventilators += uTxO.extras.ventilators;
//             hazmats += uTxO.extras.hazmats;
//             researches += uTxO.extras.researches;
//         }
//     }
//     let extras = new Extras(masks, respirators, volunteers, doctors, ventilators, hazmats, researches);
//     return { amount, extras };
// };

// /**
//  * Wallet.findTxOuts()
//  * @description select unspentTxOuts for a transaction
//  * @returns {{UnspentTxOut[], number, Extras}} triplet of unspentTxOuts and leftovers
//  */
// function findTxOuts(targetAmount, targetExtras, myUnspentTxOuts) {
//     let amount = 0;
//     let masks = 0;
//     let respirators = 0;
//     let volunteers = 0;
//     let doctors = 0;
//     let ventilators = 0;
//     let hazmats = 0;
//     let researches = 0;
//     const includedUnspentTxOuts = [];
//     for(let i = 0; i < myUnspentTxOuts.length; i++) {
//         let uTxO = myUnspentTxOuts[i];
//         includedUnspentTxOuts.push(uTxO);
//         amount += uTxO.amount;
//         masks += uTxO.extras.masks;
//         respirators += uTxO.extras.respirators;
//         volunteers += uTxO.extras.volunteers;
//         doctors += uTxO.extras.doctors;
//         ventilators += uTxO.extras.ventilators;
//         hazmats += uTxO.extras.hazmats;
//         researches += uTxO.extras.researches;
//         if (amount >= targetAmount
//             && masks >= targetExtras.masks
//             && respirators >= targetExtras.respirators
//             && volunteers >= targetExtras.volunteers
//             && doctors >= targetExtras.doctors
//             && ventilators >= targetExtras.ventilators
//             && hazmats >= targetExtras.hazmats
//             && researches >= targetExtras.researches) {
//             const leftOverAmount = amount - targetAmount;
//             const leftOverExtras = new Extras(
//                 masks - targetExtras.masks,
//                 respirators - targetExtras.respirators,
//                 volunteers - targetExtras.volunteers,
//                 doctors - targetExtras.doctors,
//                 ventilators - targetExtras.ventilators,
//                 hazmats - targetExtras.hazmats,
//                 researches - targetExtras.researches,
//             );
//             return { includedUnspentTxOuts, leftOverAmount, leftOverExtras };
//         }
//     }
//     console.log('Insufficient funds');
//     return { includedUnspentTxOuts: null, leftOverAmount: null, leftOverAmount: null };
// };

// /**
//  * Wallet.createTxOuts()
//  * @description prepare the txOut[] for a new transaction
//  * @returns {{TxOut, TxOut}} pair of txOut, txOutLefovers
//  */
// function createTxOuts(receiver, sender, amount, extras, leftOverAmount, leftOverExtras) {
//     const txOut = new txUtil.TxOut(receiver, amount, extras);
//     const leftOverTx = new txUtil.TxOut(sender, leftOverAmount, leftOverExtras);
//     return { txOut, leftOverTx };
// }

// /**
//  * Wallet.createTransaction()
//  * @description combine txOuts with to-be-generated txIns
//  * @returns {Transaction}
//  */
// function createTransaction(receiver, amount, extras, privateKey, unspentTxOuts) {
//     const sender = getPublicKey(privateKey);
//     const myUnspentTxOuts = unspentTxOuts.filter((uTxO) => uTxO.address === sender);
//     const { includedUnspentTxOuts, leftOverAmount, leftOverExtras } = findTxOuts(amount, extras, myUnspentTxOuts);

//     if(!includedUnspentTxOuts)
//         return null;

//     const toUnsignedTxIn = (unspentTxOut) => {
//         const txIn = new txUtil.TxIn();
//         txIn.txOutId = unspentTxOut.txOutId;
//         txIn.txOutIndex = unspentTxOut.txOutIndex;
//         return txIn;
//     };

//     const unsignedTxIns = includedUnspentTxOuts.map(toUnsignedTxIn);
//     const { txOut, leftOverTx } = createTxOuts(receiver, sender, amount, extras, leftOverAmount, leftOverExtras);

//     /* TODO what to do with leftOverTx!? */

//     let tx = new txUtil.Transaction(null, unsignedTxIns, [txOut]);
//     tx.id = txUtil.getTxId(tx);

//     tx.txIns = tx.txIns.map((txIn, index) => {
//         txIn.signature = txUtil.signTxIn(tx, index, privateKey, getPublicKey(privateKey), unspentTxOuts);
//         return txIn;
//     });

//     return tx;
// }

// /**
//  * Wallet.createCoinbaseTransaction()
//  * @description generate init transaction
//  * @returns {Transaction}
//  */
// function getCoinbaseTransaction(address, blockIndex) {
//     const coinbaseTxIn = new txUtil.TxIn("", blockIndex, "");
//     coinbaseTxIn.signature = "COINBASE_TRANSACTION";
//     let coinbaseTxOut = new txUtil.TxOut(address, 500, new Extras(100, 70, 50, 25, 15, 5, 2));
//     let coinbaseTransaction = new txUtil.Transaction("", null, null);
//     coinbaseTransaction.txIns = [coinbaseTxIn];
//     coinbaseTransaction.txOuts = [coinbaseTxOut];
//     coinbaseTransaction.id = txUtil.getTxId(JSON.parse(JSON.stringify(coinbaseTransaction)));
//     return coinbaseTransaction;
// }
