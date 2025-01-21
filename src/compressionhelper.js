const MAX_POST_LENGTH = 5000000;

export function compress(options) {
    let callback = null;
    let data = null;
        
    if(options) {
        if(options.callback) {
            callback = options.callback;
        }

        if(options.data) {
            data = options.data;
        }
    }

    if(!callback || !data) {

        if(callback) {
            callback(null);
        }

        return;
    }

    doCompressionWork(data, "compress", callback);
}

export function decompress(options) {
    let callback = null;
    let data = null;
    
    if(options) {

        if(options.callback) {
            callback = options.callback;
        }

        if(options.data) {
            data = options.data;
        }
    }

    if(!callback || !data) {

        if(callback) {
            callback(null);
        }

        return;
    }

    doCompressionWork(data, "decompress", callback);
}

function doCompressionWork(data, method, callback) {

    const cw = new Worker("compressionworker.js");

    let inChunks = [];
    let outStr = "";

    cw.onmessage = function(ev) {
        const data = ev.data;

        if(data && data.method) {

            if(data.method == "outDone") {
                callback(outStr);
            }

            if(data.method == "nextOut") {
                outStr += data.data;

                cw.postMessage({
                    method: "outChunkReq"
                });
            }

            if(data.method == "result") {
                if(data.status && data.status == "complete") {
                    if(data.chunked) {

                        outStr = "";

                        cw.postMessage({
                            method: "outChunkReq"
                        });
                    } else {
                        callback(data.data);
                    }
                } else {
                    callback(null);
                }
            }

            if(data.method == "chunkReq") {
                if(inChunks && inChunks.length > 0) {
                    const part = inChunks.shift();

                    cw.postMessage({
                        method: "nextChunk",
                        data: part
                    });
                } else {
                    cw.postMessage({
                        method: "chunkComplete",
                        type: method
                    });
                }
            }
        }
    };

    cw.onerror = function(){
        callback(null);
    };

    if(data.length > MAX_POST_LENGTH) {

        inChunks = chunkString(data, MAX_POST_LENGTH);

        cw.postMessage({
            method: method,
            chunked: true
        });
    } else {
        cw.postMessage({
            method: method,
            data: data,
            chunked: false
        });
    }

    data = null;
}

function chunkString(str, length) {
    return str.match(new RegExp(".{1," + length + "}", "g"));
}