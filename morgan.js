const morgan = require('morgan');

class LogEntry {
    /**
     * @param {string} method 
     * @param {number} status 
     * @param {string} url 
     * @param {string} remote_addr 
     * @param {string} date
     */
    constructor(method, status, url, remote_addr, date) {
        this.method = method;
        this.status = status;
        this.url = url;
        this.remote_addr = remote_addr;
        this.date = date;
    }
}

/**
 * @type LogEntry[]
 */
const entries = [];

module.exports = {

    getLog: function () {
        return entries;
    },

    morgan: function () {
        return morgan(function (tokens, req, res) {
            entries.push(new LogEntry(
                tokens.method(req, res),
                tokens.status(req, res),
                tokens.url(req, res),
                tokens['remote-addr'](req, res),
                tokens.date(req, res)
            ));

            return [
                tokens.method(req, res),
                tokens.status(req, res),
                tokens.url(req, res),
                tokens['remote-addr'](req, res),
                tokens.date(req, res)
            ].join(' ')
        })
    }

}