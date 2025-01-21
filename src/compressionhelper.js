import { chunkString } from "common-helpers";

const MAX_POST_LENGTH = 5000000;

export async function compress(data) {
    if(!data) {
        return null;
    }

    return await doCompressionWork(data, "compress");
}

export async function decompress(data) {
    if(!data) {
        return null;
    }

    return await doCompressionWork(data, "decompress");
}

function doCompressionWork(data, method) {

    return new Promise((resolve, reject) => {
        const cw = new Worker("compressionworker.js");

        let inChunks = [];
        let outStr = "";

        cw.onmessage = function(ev) {
            const data = ev.data;

            if(data && data.method) {

                if(data.method == "outDone") {
                    resolve(outStr);
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
                            resolve(data.data);
                        }
                    } else {
                        reject({
                            error: "failed"
                        });
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

        cw.onerror = function(e) {
            reject(e);
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
    });
}