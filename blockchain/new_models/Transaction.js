const crypto = require('crypto');
// const ecdsa = require('elliptic');
// const ec = new ecdsa.ec('secp256k1');
// const lodash = require('lodash');


const INIT_DATA = {
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
        this.id = null;
        this.txIns = txIns;
        this.txOuts = txOuts;
    }

    isValid() {
        // if(!isTransactionStructureValid) return false;
        // if(!areFundsAvailable) return false;
        // if(!areSignaturesValid) return false;
        return this.txIns.length
            && this.txOuts.length
            && this.txIns.length <= this.txOuts.length
            && getHash(this.txIns, this.TxOuts) == this.hash
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
        this.signature = null;
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

    // isInit() {
    //     if (this.clicks == INIT_DATA.clicks
    //         && this.masks == INIT_DATA.masks
    //         && this.respirators == INIT_DATA.respirators
    //         && this.volunteers == INIT_DATA.volunteers
    //         && this.doctors == INIT_DATA.doctors
    //         && this.ventilators == INIT_DATA.ventilators
    //         && this.researches == INIT_DATA.researches)
    //         return true;
    //     return false;
    // }

    setInit() {
        this.clicks = INIT_DATA.clicks;
        this.masks = INIT_DATA.masks;
        this.respirators = INIT_DATA.respirators;
        this.volunteers = INIT_DATA.volunteers;
        this.doctors = INIT_DATA.doctors;
        this.ventilators = INIT_DATA.ventilators;
        this.researches = INIT_DATA.researches;
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

    add(other) {
        this.clicks += other.clicks;
        this.masks += other.masks;
        this.respirators += other.respirators;
        this.volunteers += other.volunteers;
        this.doctors += other.doctors;
        this.ventilators += other.ventilators;
        this.researches += other.researches;
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

    let updated = [];
    if(uTxOs.length == 0)
        updated = newUTxOs;
    else {
        for(let i = 0; i < uTxOs.length; i++) {
            let uTxO = uTxOs[i];
            for(let j = 0; j < consumedTxOs.length; j++){
                let cTxO = consumedTxOs[j];
                if(cTxO.txOutId != uTxO.txOutId || cTxO.txOutIndex != uTxO.txOutIndex)
                    updated.push(uTxO);
            }
        }
        for(let i = 0; i < uTxOs.length; i++) {
            let uTxO = uTxOs[i];
            for(let j = 0; j < newUTxOs.length; j++){
                let nTxO = newUTxOs[j];
                if(nTxO.txOutId != uTxO.txOutId || nTxO.txOutIndex != uTxO.txOutIndex)
                    updated.push(nTxO);
            }
        }
    }
    return updated;
}


/**
 * Transaction.processTransactions()
 * @param {Block} block
 * @param {UnspentTxOut[]} uTxOs
 * @returns {UnspentTxOut[]} updated uTxOs
 */
function processTransactions(block, uTxOs) {
    // if (!isValidTransactionsStructure(aTransactions)) {
    //     return null;
    // }

    // if (!validateBlockTransactions(aTransactions, aUnspentTxOuts, blockIndex)) {
    //     console.log('invalid block transactions');
    //     return null;
    // }

    /* TODO */
    console.log("Not implemented")
    return updateUnspent(block.transactions, uTxOs);
}

/**
 * Transaction.initialTransaction()
 * @description initializes a new user into the chain
 * @param {string} publicKey
 * @param {number} index
 * @param {string} signature
 * @returns {Transaction} initialTransaction
 */
function initialTransaction(publicKey, index, signature) {
    let initTxOut = new TxOut(publicKey);
    initTxOut.setInit();

    let initTxIn = new TxIn(null, index);

    let initTx = new Transaction([initTxIn], [initTxOut]);
    initTx.id = getHash(initTx.txIns, initTx.txOuts);

    initTxIn.signature = signature;

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
    let sumTxOut = new UnspentTxOut(null, null, null, 0, 0, 0, 0, 0, 0, 0);
    for(let i=0; i < uTxOs.length; i++)
        if(uTxOs[i].address === publicKey)
            sumTxOut.add(uTxOs[i]);
    return {
        clicks: sumTxOut.clicks,
        masks: sumTxOut.masks,
        respirators: sumTxOut.respirators,
        volunteers: sumTxOut.volunteers,
        doctors: sumTxOut.doctors,
        ventilators: sumTxOut.ventilators,
        researches: sumTxOut.researches
    };
}


module.exports = {
    INIT_DATA, Transaction, TxIn, TxOut, UnspentTxOut,
    getHash, processTransactions, getBalance,
    initialTransaction
}


// /**
//  * @description UnspentTxOut class definition.
//  * This class specifies a fraction of available
//  * goods for a specified user (address). Their
//  * total balance can be calculated as a sum of
//  * all transactions. Each UnspentTxOut is a result
//  * of a successful transfer of goods to this address.
//  */
// class UnspentTxOut {
//     /**
//      * @param {string} txOutId locked-in txOut
//      * @param {number} txOutIndex
//      * @param {string} address owner address
//      * @param {number} amount fraction of total balance
//      * @param {InGameItems} extras fraction of total in-game items
//      */
//     constructor(txOutId, txOutIndex, address, amount, extras) {
//         this.txOutId = txOutId;
//         this.txOutIndex = txOutIndex;
//         this.address = address;
//         this.amount = amount;
//         this.extras = extras;
//     }
// }

// /**
//  * Transaction.isTxValid()
//  * @description Check whether:
//  *  - transactionId is valid,
//  *  - txIns are valid (that no unavailable goods are being spent),
//  *  - number of txIns equal txOuts.
//  * @param {Transaction} transaction
//  * @param {UnspentTxOut[]} unspentTxOuts available goods
//  * @returns {boolean}
//  */
// function isTxValid(transaction, unspentTxOuts) {
//     if (getTxId(transaction) !== transaction.id) {
//         console.log("Invalid transaction id: " + transaction.id);
//         return false;
//     }

//     const hasValidTxIns = transaction.txIns
//         .map((txIn) => isTxInValid(txIn, transaction, unspentTxOuts))
//         .reduce((a, b) => a && b, true);
//     if (!hasValidTxIns) {
//         console.log("Transaction contains invalid txIns");
//         return false;
//     }

//     const totalTxInValues = transaction.txIns
//         .map((txIn) => getTxInAmount(txIn, unspentTxOuts))
//         .reduce((a, b) => (a + b), 0);
//     const totalTxOutValues = transaction.txOuts
//         .map((txOut) => txOut.amount)
//         .reduce((a, b) => (a + b), 0);

//     if (totalTxOutValues >= totalTxInValues) {
//         console.log("Number of out txValues is not equal to in txValues");
//         return false;
//     }

//     return true;
// }

// /**
//  * Transaction.isBlockTransactionsValid()
//  * @description Check if transactions of a block are valid.
//  * @param {Transaction[]} allTransactions
//  * @param {UnspentTxOut[]} allUnspentTxOuts
//  * @param {number} blockIndex
//  * @returns {boolean} valid value
//  */
// function isBlockTransactionsValid(allTransactions, allUnspentTxOuts, blockIndex) {
//     console.log(allTransactions)
//     const coinbaseTx = allTransactions[0];
//     // if (getTxId(coinbaseTx) !== coinbaseTx.id) {
//     //     console.log('Invalid coinbase transaction id: ' + coinbaseTx.id);
//     //     return false;
//     // }
//     // if (coinbaseTx.txIns.length !== 1 && coinbaseTx.txOuts.length !== 1) {
//     //     console.log('Coinbase transaction requires exactly 1 txIn and 1 txOut');
//     //     return false;
//     // }
//     // if (coinbaseTx.txIns[0].txOutIndex !== blockIndex) {
//     //     console.log('Coinbase txIn signature must equal block height');
//     //     return false;
//     // }
//     // if (coinbaseTx.txOuts[0].amount != 500) {
//     //     console.log('Invalid coinbase amount in coinbase transaction');
//     //     return false;
//     // }

//     const txIns = lodash(allTransactions)
//         .map((tx) => tx.txIns)
//         .flatten()
//         .value();
//     if (hasDupes(txIns)) {
//         console.log("Block contains txIn duplicates");
//         return false;
//     }

//     const normalTransactions = allTransactions.slice(1);
//     const result = normalTransactions.map((tx) => txUtil.isTxValid(tx, allUnspentTxOuts))
//         .reduce((a, b) => (a && b), true);
//     if (!result) {
//         console.log("Trying to transfer unavailable goods");
//         return false;
//     }
//     return true;
// }

// /**
//  * Transaction.hasDupes()
//  * @description Checks whether txIn[] contains duplicate txIn values.
//  * @param {TxIn[]} txIns
//  * @returns {boolean}
//  */
// function hasDupes(txIns) {
//     const groups = lodash.countBy(txIns, (txIn) => txIn.txOutId + txIn.txOutId);
//     return lodash(groups)
//         .map((value, key) => {
//             if (value > 1) {
//                 console.log('duplicate txIn: ' + key);
//                 return true;
//             } else
//                 return false;
//         })
//         .includes(true);
// }

// /**
//  * Transaction.isTxInValid()
//  * @description Check whether unavailable goods
//  * are trying to be spent & Signature verification.
//  * @param {TxIn} txIn
//  * @param {Transaction} transaction
//  * @param {UnspentTxOut[]} allUnspentTxOuts
//  * @returns {boolean}
//  */
// function isTxInValid(txIn, transaction, allUnspentTxOuts) {
//     const referencedUTxOut =
//         allUnspentTxOuts.find((uTxO) => uTxO.txOutId === txIn.txOutId && uTxO.txOutId === txIn.txOutId);
//     if (referencedUTxOut == null) {
//         console.log('referenced txOut not found: ' + JSON.stringify(txIn));
//         return false;
//     }
//     const address = referencedUTxOut.address;
//     const key = ec.keyFromPublic(address, 'hex');
//     const validSignature = key.verify(transaction.id, txIn.signature);
//     if (!validSignature) {
//         console.log('Invalid signature: ' + address);
//         return false;
//     }
//     return true;
// }

// /**
//  * Transaction.signTxIn()
//  * @description sign txIn using the specified private key
//  * @param {Transaction} transaction
//  * @param {number} txInIndex
//  * @param {string} privateKey
//  * @param {UnspentTxOut[]} allUnspentTxOuts
//  * @returns {string} signature
//  */
// function signTxIn(transaction, txInIndex, privateKey, publicKey, allUnspentTxOuts) {
//     const txIn = transaction.txIns[txInIndex];
//     const dataToSign = transaction.id;


//     const referencedUnspentTxOut = findUnspentTxOut(txIn.txOutId, txIn.txOutIndex, allUnspentTxOuts);
//     if (referencedUnspentTxOut == null) {
//         console.log('could not find referenced txOut');
//         return null;
//     }

//     const referencedAddress = referencedUnspentTxOut.address;
//     if (publicKey !== referencedAddress) {
//         console.log('trying to sign an input with private' +
//             ' key that does not match the address that is referenced in txIn');
//         return false;
//     }

//     const key = ec.keyFromPrivate(privateKey, 'hex');
//     const signature = Array.from(key.sign(dataToSign).toDER(), (byte) => {
//         return ('0' + (byte & 0xFF).toString(16)).slice(-2);
//     }).join('');

//     return signature;
// }

// /**
//  * Transaction.processTransactions()
//  * @description checks transaction structure, updates unspentTxOuts;
//  * @param {Transaction[]} allTransactions
//  * @param {UnspentTxOut[]} allUnspentTxOuts
//  * @param {number} blockIndex
//  * @returns {UnspentTxOut[]} updated
//  */
// function processTransactions(allTransactions, allUnspentTxOuts, blockIndex) {
//     if (!allTransactions.map(isTxStructureValid).reduce((a, b) => (a && b), true)) {
//         console.log('Invalid transactions structure');
//         return false;
//     }
//     if (!isBlockTransactionsValid(allTransactions, allUnspentTxOuts, blockIndex)) {
//         console.log('Block contains invalid transactions');
//         return false;
//     }

//     const updatedUnspentTxOuts = updateUnspentTxOuts(allTransactions, allUnspentTxOuts);
//     if (!updatedUnspentTxOuts) {
//         console.log('Failed to update unspentTxOuts');
//         return false;
//     }

//     return updatedUnspentTxOuts;
// }

// function isTxStructureValid(transaction) {
//     if (typeof transaction.id !== 'string') {
//         console.log('transactionId missing');
//         return false;
//     }
//     if (!(transaction.txIns instanceof Array)) {
//         console.log('invalid txIns type in transaction');
//         return false;
//     }

//     if (!transaction.txIns
//         .map(isTxInStructureValid)
//         .reduce((a, b) => (a && b), true)) {
//         return false;
//     }
//     if (!(transaction.txOuts instanceof Array)) {
//         console.log('invalid txIns type in transaction');
//         return false;
//     }

//     if (!transaction.txOuts
//         .map(isTxOutStructureValid)
//         .reduce((a, b) => (a && b), true)) {
//         return false;
//     }

//     return true;
// }
// function isTxInStructureValid(txIn) {
//     if (txIn == null) {
//         console.log('txIn is null');
//         return false;
//     }
//     else if (typeof txIn.signature !== 'string') {
//         console.log('invalid signature type in txIn');
//         return false;
//     }
//     else if (typeof txIn.txOutId !== 'string') {
//         console.log('invalid txOutId type in txIn');
//         return false;
//     }
//     else if (typeof txIn.txOutIndex !== 'number') {
//         console.log('invalid txOutIndex type in txIn');
//         return false;
//     }

//     return true;
// }
// function isTxOutStructureValid(txOut) {
//     if (txOut == null) {
//         console.log('txOut is null');
//         return false;
//     }
//     else if (typeof txOut.address !== 'string') {
//         console.log('invalid address type in txOut');
//         return false;
//     }
//     else if (!isAddressValid(txOut.address)) {
//         console.log('invalid TxOut address');
//         return false;
//     }
//     else if (typeof txOut.amount !== 'number') {
//         console.log('invalid amount type in txOut');
//         return false;
//     }

//     return true;
// }
// function isAddressValid(address) {
//     // if (address.length !== 130) {
//     //     console.log('invalid public key length');
//     //     return false;
//     // }
//     if (address.match('^[a-fA-F0-9]+$') === null) {
//         console.log('public key must contain only hex characters');
//         return false;
//     }
//     if (!address.startsWith('04')) {
//         console.log('public key must start with 04');
//         return false;
//     }
//     return true;
// }

// function getTxInAmount(txIn, unspentTxOuts) {
//     return findUnspentTxOut(txIn.txOutId, txIn.txOutIndex, unspentTxOuts).amount;
// }

// function findUnspentTxOut(transactionId, index, unspentTxOuts) {
//     return unspentTxOuts.find((uTxO) => uTxO.txOutId === transactionId && uTxO.txOutIndex === index);
// }
