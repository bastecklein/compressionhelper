console.log("worker created");

import LZString from "lz-string";
import { chunkString } from "common-helpers";

console.log(LZString);
console.log(chunkString);

const MAX_COMPRESS_LENGTH = 10000000;
const MAX_POST_LENGTH = 5000000;

let inDatBuild = "";
let outChunks = null;

self.addEventListener("message",function(e) {

    const method = e.data.method;

    if(method == "compress" || method == "decompress") {
        const chunked = e.data.chunked;

        if(chunked) {
            inDatBuild = "";

            self.postMessage({
                method: "chunkReq"
            });
        } else {
            const fileString = e.data.data;

            if(method == "compress") {
                doCompressOp(fileString);
            }
        
            if(method == "decompress") {
                doDecompressOp(fileString);
            }
        }
    }

    if(method == "nextChunk") {
        inDatBuild += e.data.data;

        self.postMessage({
            method: "chunkReq"
        });
    }

    if(method == "chunkComplete" && inDatBuild) {
        const type = e.data.type;

        if(type) {
            if(type == "compress") {
                doCompressOp(inDatBuild);
            }
        
            if(type == "decompress") {
                doDecompressOp(inDatBuild);
            }
        }
    }

    if(method == "outChunkReq") {
        if(outChunks && outChunks.length > 0) {
            const part = outChunks.shift();

            self.postMessage({
                method: "nextOut",
                data: part
            });
        } else {
            self.postMessage({
                method: "outDone"
            });

            self.close();
        }
    }
});

function doCompressOp(fileString) {
    let compressed = ""; 

    const parts = Math.ceil(fileString.length / MAX_COMPRESS_LENGTH);

    if(parts > 1) {

        compressed = "SPLITCOM#$#$";

        for(let i = 0; i <= parts; i++) {

            const startPos = i * MAX_COMPRESS_LENGTH;
            const endPos = startPos + MAX_COMPRESS_LENGTH;

            const sub = fileString.substring(startPos,endPos);

            compressed += LZString.compressToEncodedURIComponent(sub);
            compressed += "#$#$";
        }
    } else {
        compressed += LZString.compressToEncodedURIComponent(fileString);
    }

    postCompletedData(compressed);

    
}

function doDecompressOp(fileString) {
    let compressed = "";

    if(fileString.indexOf("SPLITCOM#$#$") == 0) {
        const parts = fileString.split("#$#$");

        for(let i = 1; i < parts.length; i++) {
            const compart = parts[i].trim();

            if(compart.length > 0) {
                compressed += LZString.decompressFromEncodedURIComponent(compart);
            }

            

            
        }
    } else {
        compressed = LZString.decompressFromEncodedURIComponent(fileString);
    }

    postCompletedData(compressed);
}

function postCompletedData(data) {
    if(data == null || data.trim().length == 0) {
        self.postMessage({
            method: "result",
            status: "fail",
            data: null,
            chunked: false
        });
    } else {
        if(data.length > MAX_POST_LENGTH) {
            outChunks = chunkString(data, MAX_POST_LENGTH);

            self.postMessage({
                method: "result",
                status: "complete",
                chunked: true
            });

            return;
        } else {
            self.postMessage({
                method: "result",
                status: "complete",
                data: data,
                chunked: false
            });
        }
        
    }

    self.close();
}