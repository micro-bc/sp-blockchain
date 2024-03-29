#!/usr/bin/env node
const request = require('request');
const crypto = require('crypto');
const walletUtil = require('../models/Wallet');

const privateKey1 = '8a915a32c8a143ce81ec467e6ea24c7ff5965bd791be0acf5a92dfdcc76cf425'
const publicKey1 = '0417e97758468edb4adf37980925482e610c2cd73c803f7514d7bed409e383287a3a6a435db1280a54f490bc4234106a478d8ff4523805e9b59445562846f8e6c9'
const privateKey2 = '23cd3d786399f09be23b38ee3d5d9d62aa67729579a068d4ff4405c01d64ab5f'
const publicKey2 = '04de85eced4341035ecc8a7e8e232b01f90caab462f6888ee5d7f3fa85f3fda6c04a35dcc4d96d08d340ca1a2f73b2aa30f9118644b208efa8c41ebce548abc05a'

request({
    uri: 'http://localhost:3001/initWallet',
    method: 'POST',
    json: {
        publicKey: publicKey1,
        signature: walletUtil.sign(privateKey1, "mineBlock")
    }
}, (err, res, body) => {
    if (res.statusCode != 201)
        console.log("Wallet initialization failed");
    else
        console.log("Wallet initialized successfully");
    if(body)
        console.log(body)
});

request({
    uri: 'http://localhost:3001/initWallet',
    method: 'POST',
    json: {
        publicKey: publicKey2,
        signature: walletUtil.sign(privateKey2, "mineBlock")
    }
}, (err, res, body) => {
    if (res.statusCode != 201)
        console.log("Wallet initialization failed");
    else
        console.log("Wallet initialized successfully");
    if(body)
        console.log(body)
});

request({
    uri: 'http://localhost:3001/prepareTransaction',
    method: 'POST',
    json: {
        sender: publicKey1,
        reciever: publicKey2,
        data: {
            clicks: 1,
            masks: 1,
            respirators: 1,
            volunteers: 1,
            doctors: 1,
            ventilators: 1,
            researches: 1
        }
    }
}, (err, res, body) => {
    if(res.statusCode != 201){
        console.log("ERROR PREPARING TRANSACTION");
        console.log(body);
        return;
    }
    const txId = body;
    console.log('Recieved transactionId: ' , txId);
    request({
        uri: 'http://localhost:3001/sendTransaction',
        method: 'POST',
        json: {
            id: txId,
            publicKey: publicKey1,
            signature: walletUtil.sign(privateKey1, txId)
        }
    }, (err, res, body) => {
        if(body) console.log(body);
        request({
            uri: 'http://localhost:3001/mineBlock',
            method: 'POST',
            json: {
                publicKey: publicKey1,
                signature: walletUtil.sign(privateKey1, 'mineBlock')
            }
        }, (err, res, body) => {
            if(body) console.log(body);
        });
    });
});
