//TODO: understand why not all cf headers are being logged
//TODO: Log also the file from which the log line was printed (using stack analyze?)


/**
 * LogDNA logger using their API
 */
class Logger {

    /**
     * Logger constructor
     * @param {Request} request
     */
    constructor(request, {
        logDnaKey,
        host,
        appName
    }) {
        this._log = console.log; // keep reference to original console.log
        this.requestStartTime = Date.now();
        this.appName = appName;
        this.defaultLogData = this.buildDefaultLogData(request);
        this.metaDetails = {};
        this.logs = [];
        this.logDnaKey = logDnaKey;
        this.host = host;
    }

    /**
     * Build up default log data
     * @param request
     * @returns {Object}
     */
    buildDefaultLogData(request) {
        return {
            'app': this.appName,
            // 'env': ENVIRONMENT || 'unknown',
            'meta': {
                'ua': request.headers['user-agent'],
                'referer': request.headers['Referer'] || 'empty',
                'ip': request.headers['CF-Connecting-IP'],
                'countryCode': (request.cf || {}).country,
                'colo': (request.cf || {}).colo,
                'url': request.url,
                'method': request.method,
                'x_forwarded_for': request.headers['x_forwarded_for'] || "0.0.0.0",
                'cfRay': request.headers['cf-ray'],
                'cfWorker': request.headers['cf-worker']
            }
        }
    }

    /**
     * Push the log into and array so it can be sent later
     * This method should not be used directly. Instead use the error/debug/info methods to log
     * @param {string} message
     * @param {string} level
     */
    addLog(message, level) {
        let lineLog = {
            'line': message,
            'timestamp': Date.now(),
            'level': level,
            ...this.defaultLogData
        }
        lineLog.meta = {
            ...lineLog.meta,
            ...this.metaDetails
        }
        this.logs.push(lineLog)
    }

    /**
     * Add an INFO level log
     * @param {string} message
     */
    info(...message) {
        this._log(message);
        this.addLog(message.map(i => typeof i === 'object' ? JSON.stringify(i) : i).join(' ; '), 'INFO')
    }

    /**
     * Add an DEBUG level log
     * @param {string} message
     */
    debug(...message) {
        this._log(message);
        this.addLog(message.map(i => typeof i === 'object' ? JSON.stringify(i) : i).join(' ; '), 'DEBUG')
    }

    /**
     * Add an ERROR level log
     * @param {string} message
     */
    error(...message) {
        this._log(message);
        this.addLog(message.map(i => typeof i === 'object' ? JSON.stringify(i) : i).join(' ; '), 'ERROR')
    }

    /**
     * Add a meta value to the logs
     * Done this way so each log that contains the meta data no matter when its added after
     * @param {string} metaName
     * @param {string|int} metaValue
     */
    setMeta(metaName, metaValue) {
        this.metaDetails[metaName] = metaValue
    }

    /**
     * Post the request to LogDNA
     * This should be used at the end of of the users request
     * When it fails, or when it succeeds
     * @returns {Promise<void>}
     */
    async postRequest() {
        const time = Date.now()
        let headers = {
            'Content-Type': 'application/json; charset=UTF-8',
            'apikey': this.logDnaKey
        }

        // add the executionTime to each of the logs for visibility
        this.logs.forEach(log => {
            log.meta.executionTime = time - this.requestStartTime
        })
        this._log('calling logdna', 'url', 'https://logs.logdna.com/logs/ingest?'
            + '&hostname=' + this.host
            + '&now=' + time, 'headers', JSON.stringify(headers), 'body', JSON.stringify({ 'lines': this.logs }, null, 2));
        try {
            return fetch('https://logs.logdna.com/logs/ingest?'
                + '&hostname=' + this.host
                + '&now=' + time,
                {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({ 'lines': this.logs })
                })
        } catch (err) {
            console.error(err.stack || err)
        }
    }
}


export function logger ({LOG_DNA_KEY, HOSTNAME, APPLICATION_NAME}) {
    return async (ctx, next) => {
        const req = ctx.request;
        ctx.logger = new Logger(req, {
            logDnaKey: LOG_DNA_KEY,
            host: HOSTNAME,
            appName: APPLICATION_NAME
        });


        console.log = function(){
            ctx.logger.info.apply(ctx.logger, arguments);
        };
        console.info = function(){
            ctx.logger.info.apply(ctx.logger, arguments);
        };
        console.warn = function(){
            ctx.logger.info.apply(ctx.logger, arguments);
        };
        console.error = function(){
            ctx.logger.error.apply(ctx.logger, arguments);
        };
        console.debug = function(){
            ctx.logger.debug.apply(ctx.logger, arguments);
        };
        // console.log = () => ctx.logger.info.apply(ctx.logger, arguments);
        // console.error = () => ctx.logger.error.apply(ctx.logger, arguments);
        // console.debug = () => ctx.logger.debug.apply(ctx.logger, arguments);
        // req keys = ["body","headers","host","hostname","href","json","method","origin","path","protocol","query","querystring","search","text"]
        try {
            await next(ctx);
        } catch (err) {
            ctx.logger.error(err)
            throw err
        } finally {
            //end of request, flush
            console.log('responding with code', ctx.status)
            ctx.event.waitUntil(ctx.logger.postRequest.call(ctx.logger))
        }
    }
}


// https://gist.github.com/spmason/1670196
// const util = require('util');
// function formatArgs(args){
//     return [util.format.apply(util.format, Array.prototype.slice.call(args))];
// }
