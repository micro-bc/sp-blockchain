var crypto = require('crypto')
var fs = require('fs')
var buffer = require('buffer')
var rl = require('readline-sync')

var args = process.argv.slice(2)

const port = process.env.PORT || args[0] || 8080
const address = process.env.ADDRESS || args[1] || "127.0.0.1"

var io = require('socket.io').listen(port)
console.log("Listening on %d", port)

var incoming = []
var outgoing = []
var backend = undefined

//===============================================================================

var Blockchain = []
const gen_interval = 1000*10 //10 seconds
const corr_interval = 10 //10 blocks
var diff = 1
var comulative_diff = 0
var blocks_mined = 0
var blocks_from_corr = 0

function update_difficulty(){
    blocks_from_corr = 0
    const expected_time = gen_interval*corr_interval
    var last = Blockchain[Blockchain.length - corr_interval]
    var actual_time = Blockchain[Blockchain.length-1].timestamp - last.timestamp

    if(actual_time < (expected_time / 2)){
        diff = last.diffuculty + 1
    }else if (actual_time > (expected_time*2)){
        diff = last.diffuculty - 1
    }
}

function update_comulative_difficulty(){
    var d = 0
    for (var i = Blockchain.length-1; i >= 0; i--){
        d += 2**Blockchain[i].diffuculty
    }
    comulative_diff = d
}

function validate_block(chain, block){
    var current = block
    var buf = undefined
    const minute = 1000*60
    var index = chain.length - 2
    while(current.prev_hash != 0){
        var prev = chain[index]
        if (current.id != prev.id + 1) return false
        if (current.prev_hash != prev.hash) return false
        buf = [current.id, current.data, current.timestamp, current.prev_hash, current.diffuculty, current.nonce].toString()
        if (crypto.createHash('sha256').update(buf).digest('hex') != current.hash) return false
        if (current.timestamp < new Date().getTime() - minute) return false
        if (current.timestamp < prev.timestamp - minute) return false
        current = prev
        index--
    }
    return true
}

function brute_force_nonce(block){
    var start_time = new Date().getTime()
    var new_hash = undefined
    var nonce = 0
    while(true){
        if(new Date().getTime() - start_time > 1000*20) return 0
        var buf = [block.id, block.data, block.timestamp, block.prev_hash, block.diffuculty, nonce].toString()
        new_hash = crypto.createHash('sha256').update(buf).digest('hex');
        console.log("Trying hash ", new_hash)
        var hash_ok = true
        for (var i = 0; i < block.diffuculty; i++) {
            if (new_hash[i].toString() != "0") hash_ok = false
        }
        if(hash_ok) return [new_hash, nonce]
        nonce++
    }
}

class Block {
    constructor(_id, _data, _timestamp, _prev_hash, _diffuculty){
        this.id = _id
        this.data = _data
        this.timestamp = _timestamp
        this.hash = undefined
        this.prev_hash = _prev_hash
        this.diffuculty = _diffuculty
        this.nonce = undefined
    }
}

//===============================================================================

io.on('connection', function (socket) {
    if (socket.handshake.headers['user-agent'] == 'node-XMLHttpRequest') {
        console.log('Incoming connection')
        console.log('Waiting for incomming info')
    } else {
        if(backend){
            console.log("Backend already connected")
            socket.disconnect()
        }
        console.log('Backend connected')
        backend = socket
        backend.emit("backend")

        for (var i = 0; i < incoming.length; i++) {
            io.to(backend.id).emit("incoming", incoming[i][1], incoming[i][2])
        }

        for (var i = 0; i < outgoing.length; i++) {
            io.to(backend.id).emit("outgoing_status", outgoing[i][1], outgoing[i][2], "New connection", true)
        }

        for (var i = 0; i < Blockchain.length; i++) {
            io.to(backend.id).emit("new_block", Blockchain[i], blocks_mined)
        }
    }

    //BACKEND
    socket.on("outgoing", function (_address, _port) {
        console.log("New outgoing connection request: %s@%d", _address, _port)

        for (var i = 0; i < outgoing.length; i++) {
            if (outgoing[i][1] == _address && outgoing[i][2] == _port) {
                console.log("Outgoing connection failed [exists]")
                io.to(backend.id).emit("outgoing_status", _address, _port, "Node already connected", false)
                return
            }
        }

        var conn = require('socket.io-client').connect("http://" + _address + ":" + _port)

        conn.on("connect_error", function () {
            console.log("Outgoing connection failed [error]")
            if(backend)
                io.to(backend.id).emit("outgoing_status", _address, _port, "Failed to connect to " + _address + "@" + _port, false)


            for (var i = 0; i < outgoing.length; i++) {
                if (outgoing[i][1] == _address && outgoing[i][2] == _port) {
                    outgoing.splice(i,1)
                    break
                }
            }

            io.to(backend.id).emit("remove_connection", 0, _address, _port)
            conn.disconnect()
        })

        conn.on("connect", function () {
            console.log("Outgoing connection successful")
            outgoing.push([conn, _address, _port])
            if(backend)
                io.to(backend.id).emit("outgoing_status", _address, _port, "Connection successful", true)
            conn.emit("incoming_info", address, port)
        })

        conn.on("sync_chain", function (chain, comul) {
            console.log("Sync chain request")
            if (comul > comulative_diff && validate_block(chain, chain[chain.length - 1])) {
                console.log("Overwriting current chain")
                Blockchain = chain
                diff = chain[chain.length - 1].diffuculty
                blocks_from_corr++
                io.to(backend.id).emit("global_update", Blockchain)
            } else {
                for(var i = 0; i < outgoing.length; i++){
                    io.to(outgoing[i].id).emit("sync_chain", Blockchain, comulative_diff)
                    console.log("I have a better chain")
                }
            }
        })
    })

    socket.on("disconnect_outgoing", function (_address, _port) {
        console.log("Removing outgoing connection: %s@%d", _address, _port)

        for (var i = 0; i < outgoing.length; i++) {
            if (outgoing[i][1] == _address && outgoing[i][2] == _port) {
                outgoing[i][0].disconnect()
                outgoing.splice(i, 1)
                if (backend)
                    io.to(backend.id).emit("remove_connection", 0, _address, _port)
            }
        }
    })

    socket.on("incoming_info", function (_address, _port) {
        console.log("Recieved incoming info: %s@%d", _address, _port)
        incoming.push([socket, _address, _port])
        console.log("Incoming:")
        for (var i = 0; i < incoming.length; i++) {
            console.log("%s@%d", incoming[i][1], incoming[i][2])
        }
        if (backend)
            io.to(backend.id).emit("incoming", _address, _port)
    })

    function mine_block(){
        var block = undefined
        var latest = undefined
        var pair = undefined
        var genesis = !Blockchain.length

        if (genesis) {
            block = new Block(0, "GENESIS BLOCK", new Date().getTime(), 0, diff)
        }else{
            latest = Blockchain[Blockchain.length-1]
            block = new Block(latest.id + 1, "DATA", new Date().getTime(), latest.hash, diff)
        }
        var pair = brute_force_nonce(block)
        if(pair == 0){
            return false
        }
        block.hash = pair[0]
        block.nonce = pair[1]

        Blockchain.push(block)

        if (validate_block(Blockchain, block)) {
            update_comulative_difficulty()
            blocks_mined++
            blocks_from_corr++
            return block
        }else{
            Blockchain.pop()
        }
        return false
    }

    socket.on("mine", function() {
        console.log("Mining request recieved")
        if (blocks_from_corr >= corr_interval) {
            update_difficulty()
        }

        var block = mine_block()
        if (block){
            io.emit("sync_chain", Blockchain, comulative_diff)
            if(backend)
            io.to(backend.id).emit("new_block", block, blocks_mined)
        }
    })

    socket.on('disconnect', function (ev) {
        if (socket == backend) {
            console.log("Backend disconnected")
            backend = 0
            return
        }
        for (var i = 0; i < incoming.length; i++) {
            if (incoming[i][0] == socket) {
                const _address = incoming[i][1]
                const _port = incoming[i][2]
                console.log("Removing incomming connection")
                incoming.splice(i, 1)
                if(backend)
                    io.to(backend.id).emit("remove_connection", 1, _address, _port)
            }
        }
    })
})
