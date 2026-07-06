/*
 * Original from-scratch implementation of the PDF Standard Security Handler
 * (ISO 32000-1 §7.6.2–7.6.4: MD5-based key derivation, RC4 stream cipher,
 * Algorithms 1–5) plus a minimal classic-PDF object rewriter used to inject
 * password protection into a PDF that pdf-lib has already normalized.
 *
 * pdf-lib can read/manipulate PDFs but has no API to add an /Encrypt
 * dictionary, so this module is only responsible for the encryption layer —
 * pdf-lib still does all general PDF parsing/serialization.
 *
 * Works unmodified in Node (module.exports) and the browser (window.PDFEncrypt).
 */
(function (root) {
    'use strict';

    // ---- MD5 (RFC 1321) ----
    function md5(bytes) {
        const s = [
            7,12,17,22, 7,12,17,22, 7,12,17,22, 7,12,17,22,
            5, 9,14,20, 5, 9,14,20, 5, 9,14,20, 5, 9,14,20,
            4,11,16,23, 4,11,16,23, 4,11,16,23, 4,11,16,23,
            6,10,15,21, 6,10,15,21, 6,10,15,21, 6,10,15,21
        ];
        const K = new Int32Array(64);
        for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);

        const msg = Array.from(bytes);
        const origLenBits = BigInt(msg.length) * 8n;
        msg.push(0x80);
        while (msg.length % 64 !== 56) msg.push(0);
        for (let i = 0; i < 8; i++) msg.push(Number((origLenBits >> BigInt(8 * i)) & 0xFFn));

        let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
        const rotl = (x, c) => (x << c) | (x >>> (32 - c));

        for (let chunkStart = 0; chunkStart < msg.length; chunkStart += 64) {
            const M = new Int32Array(16);
            for (let j = 0; j < 16; j++) {
                M[j] = msg[chunkStart + j*4] | (msg[chunkStart + j*4+1] << 8) | (msg[chunkStart + j*4+2] << 16) | (msg[chunkStart + j*4+3] << 24);
            }
            let A = a0, B = b0, C = c0, D = d0;
            for (let i = 0; i < 64; i++) {
                let F, g;
                if (i < 16) { F = (B & C) | (~B & D); g = i; }
                else if (i < 32) { F = (D & B) | (~D & C); g = (5*i + 1) % 16; }
                else if (i < 48) { F = B ^ C ^ D; g = (3*i + 5) % 16; }
                else { F = C ^ (B | ~D); g = (7*i) % 16; }
                F = (F + A + K[i] + M[g]) | 0;
                A = D; D = C; C = B;
                B = (B + rotl(F, s[i])) | 0;
            }
            a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
        }

        const out = new Uint8Array(16);
        [a0, b0, c0, d0].forEach((v, i) => {
            out[i*4] = v & 0xFF; out[i*4+1] = (v >>> 8) & 0xFF; out[i*4+2] = (v >>> 16) & 0xFF; out[i*4+3] = (v >>> 24) & 0xFF;
        });
        return out;
    }

    // ---- RC4 ----
    function rc4(keyBytes, dataBytes) {
        const S = new Uint8Array(256);
        for (let i = 0; i < 256; i++) S[i] = i;
        let j = 0;
        for (let i = 0; i < 256; i++) {
            j = (j + S[i] + keyBytes[i % keyBytes.length]) & 0xFF;
            const tmp = S[i]; S[i] = S[j]; S[j] = tmp;
        }
        const out = new Uint8Array(dataBytes.length);
        let i = 0; j = 0;
        for (let n = 0; n < dataBytes.length; n++) {
            i = (i + 1) & 0xFF;
            j = (j + S[i]) & 0xFF;
            const tmp = S[i]; S[i] = S[j]; S[j] = tmp;
            out[n] = dataBytes[n] ^ S[(S[i] + S[j]) & 0xFF];
        }
        return out;
    }

    // ---- PDF32000-1:2008 §7.6.3.3 fixed padding ----
    const PAD = new Uint8Array([
        0x28,0xBF,0x4E,0x5E,0x4E,0x75,0x8A,0x41,0x64,0x00,0x4E,0x56,0xFF,0xFA,0x01,0x08,
        0x2E,0x2E,0x00,0xB6,0xD0,0x68,0x3E,0x80,0x2F,0x0C,0xA9,0xFE,0x64,0x53,0x69,0x7A
    ]);

    function concatBytes(...arrs) {
        const len = arrs.reduce((a, b) => a + b.length, 0);
        const out = new Uint8Array(len);
        let off = 0;
        for (const a of arrs) { out.set(a, off); off += a.length; }
        return out;
    }

    function padPassword(pwBytes) {
        const out = new Uint8Array(32);
        const n = Math.min(pwBytes.length, 32);
        out.set(pwBytes.subarray(0, n), 0);
        out.set(PAD.subarray(0, 32 - n), n);
        return out;
    }

    // Algorithm 3 — compute /O
    function computeOwnerEntry(ownerPwBytes, userPwBytes, keyLenBytes, revision) {
        const padded = padPassword(ownerPwBytes.length ? ownerPwBytes : userPwBytes);
        let digest = md5(padded);
        if (revision >= 3) {
            for (let i = 0; i < 50; i++) digest = md5(digest.subarray(0, keyLenBytes));
        }
        const rc4Key = digest.subarray(0, keyLenBytes);
        let out = rc4(rc4Key, padPassword(userPwBytes));
        if (revision >= 3) {
            for (let i = 1; i <= 19; i++) {
                const xored = new Uint8Array(keyLenBytes);
                for (let j = 0; j < keyLenBytes; j++) xored[j] = rc4Key[j] ^ i;
                out = rc4(xored, out);
            }
        }
        return out;
    }

    // Algorithm 2 — compute the file encryption key
    function computeEncryptionKey(userPwBytes, ownerEntry, permissions, idBytes, keyLenBytes, revision, encryptMetadata) {
        const padded = padPassword(userPwBytes);
        const pUint = permissions >>> 0;
        const pBytes = new Uint8Array([pUint & 0xFF, (pUint >>> 8) & 0xFF, (pUint >>> 16) & 0xFF, (pUint >>> 24) & 0xFF]);

        const parts = [padded, ownerEntry, pBytes, idBytes];
        if (revision >= 4 && !encryptMetadata) parts.push(new Uint8Array([0xFF,0xFF,0xFF,0xFF]));

        let digest = md5(concatBytes(...parts));
        if (revision >= 3) {
            for (let i = 0; i < 50; i++) digest = md5(digest.subarray(0, keyLenBytes));
        }
        return digest.subarray(0, keyLenBytes);
    }

    // Algorithm 5 (R>=3) — compute /U
    function computeUserEntryR3(fileKey, idBytes) {
        const digest = md5(concatBytes(PAD, idBytes));
        let out = rc4(fileKey, digest);
        for (let i = 1; i <= 19; i++) {
            const xored = new Uint8Array(fileKey.length);
            for (let j = 0; j < fileKey.length; j++) xored[j] = fileKey[j] ^ i;
            out = rc4(xored, out);
        }
        const result = new Uint8Array(32);
        result.set(out, 0); // remaining 16 bytes: arbitrary padding, zero-fill (matches common implementations)
        return result;
    }

    // Algorithm 1 — per-object encryption key
    function computeObjectKey(fileKey, objNum, genNum, keyLenBytes) {
        const extra = new Uint8Array([
            objNum & 0xFF, (objNum >> 8) & 0xFF, (objNum >> 16) & 0xFF,
            genNum & 0xFF, (genNum >> 8) & 0xFF
        ]);
        const digest = md5(concatBytes(fileKey, extra));
        const n = Math.min(keyLenBytes + 5, 16);
        return digest.subarray(0, n);
    }

    // ---- byte-level helpers ----
    const HEX = '0123456789ABCDEF';
    function bytesToHexString(bytes) {
        let s = '';
        for (let i = 0; i < bytes.length; i++) s += HEX[bytes[i] >> 4] + HEX[bytes[i] & 0xF];
        return s;
    }
    function bytesToPdfLiteral(bytes) {
        let s = '';
        for (let i = 0; i < bytes.length; i++) {
            const b = bytes[i];
            if (b === 0x5C || b === 0x28 || b === 0x29) s += '\\' + String.fromCharCode(b);
            else if (b < 0x20 || b > 0x7E) s += '\\' + b.toString(8).padStart(3, '0');
            else s += String.fromCharCode(b);
        }
        return s;
    }
    function isDelim(b) {
        return b === 0x20 || b === 0x0A || b === 0x0D || b === 0x09 || b === 0x0C || b === 0x00 ||
               b === 0x28 || b === 0x29 || b === 0x3C || b === 0x3E || b === 0x5B || b === 0x5D ||
               b === 0x2F || b === 0x25;
    }
    function matchKeyword(bytes, pos, kw) {
        for (let i = 0; i < kw.length; i++) {
            if (bytes[pos + i] !== kw.charCodeAt(i)) return false;
        }
        const before = pos === 0 || isDelim(bytes[pos - 1]);
        const afterIdx = pos + kw.length;
        const after = afterIdx >= bytes.length || isDelim(bytes[afterIdx]);
        return before && after;
    }
    function hexVal(b) {
        if (b >= 0x30 && b <= 0x39) return b - 0x30;
        if (b >= 0x41 && b <= 0x46) return b - 0x41 + 10;
        if (b >= 0x61 && b <= 0x66) return b - 0x61 + 10;
        return -1;
    }

    function textEncode(str) {
        if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
        return new Uint8Array(Buffer.from(str, 'utf-8'));
    }

    // Parses one object body (bytes strictly between "N G obj" and "endobj"),
    // encrypting every literal/hex string it contains (re-emitted as hex
    // strings) and, if a stream is present, RC4-encrypting the raw stream
    // bytes wholesale — all using the same per-object key (Algorithm 1).
    function encryptObjectBody(bytes, objKey) {
        const out = [];
        let i = 0;
        const n = bytes.length;
        let lengthValue = null;

        function pushBytes(arr) { for (let k = 0; k < arr.length; k++) out.push(arr[k]); }
        function pushHexString(rawBytes) {
            const enc = rc4(objKey, rawBytes);
            out.push(0x3C);
            for (let k = 0; k < enc.length; k++) {
                out.push(HEX.charCodeAt(enc[k] >> 4), HEX.charCodeAt(enc[k] & 0xF));
            }
            out.push(0x3E);
        }

        while (i < n) {
            const b = bytes[i];

            if (b === 0x28) { // literal string "("
                i++;
                let depth = 1;
                const raw = [];
                while (i < n && depth > 0) {
                    const c = bytes[i];
                    if (c === 0x5C) {
                        i++;
                        if (i >= n) break;
                        const e = bytes[i];
                        if (e === 0x6E) { raw.push(0x0A); i++; }
                        else if (e === 0x72) { raw.push(0x0D); i++; }
                        else if (e === 0x74) { raw.push(0x09); i++; }
                        else if (e === 0x62) { raw.push(0x08); i++; }
                        else if (e === 0x66) { raw.push(0x0C); i++; }
                        else if (e === 0x28) { raw.push(0x28); i++; }
                        else if (e === 0x29) { raw.push(0x29); i++; }
                        else if (e === 0x5C) { raw.push(0x5C); i++; }
                        else if (e === 0x0D) { i++; if (i < n && bytes[i] === 0x0A) i++; }
                        else if (e === 0x0A) { i++; }
                        else if (e >= 0x30 && e <= 0x37) {
                            let oct = 0, cnt = 0;
                            while (cnt < 3 && i < n && bytes[i] >= 0x30 && bytes[i] <= 0x37) {
                                oct = oct * 8 + (bytes[i] - 0x30); i++; cnt++;
                            }
                            raw.push(oct & 0xFF);
                        } else { raw.push(e); i++; }
                    } else if (c === 0x28) { depth++; raw.push(c); i++; }
                    else if (c === 0x29) { depth--; i++; if (depth > 0) raw.push(c); }
                    else { raw.push(c); i++; }
                }
                pushHexString(new Uint8Array(raw));
                continue;
            }

            if (b === 0x3C && bytes[i + 1] === 0x3C) { // dict opener "<<" — pass through as a pair
                out.push(b, bytes[i + 1]);
                i += 2;
                continue;
            }

            if (b === 0x3C) { // hex string "<...>"
                let j = i + 1;
                const digits = [];
                while (j < n && bytes[j] !== 0x3E) {
                    if (hexVal(bytes[j]) >= 0) digits.push(bytes[j]);
                    j++;
                }
                if (digits.length % 2 === 1) digits.push(0x30);
                const raw = new Uint8Array(digits.length / 2);
                for (let k = 0; k < raw.length; k++) raw[k] = (hexVal(digits[k*2]) << 4) | hexVal(digits[k*2+1]);
                pushHexString(raw);
                i = j + 1;
                continue;
            }

            if (b === 0x2F && matchKeyword(bytes, i, '/Length')) { // track /Length for direct-integer case
                pushBytes(textEncode('/Length'));
                i += 7;
                while (i < n && (bytes[i] === 0x20 || bytes[i] === 0x0A || bytes[i] === 0x0D)) { out.push(bytes[i]); i++; }
                let numStart = i;
                while (i < n && bytes[i] >= 0x30 && bytes[i] <= 0x39) i++;
                if (i > numStart) {
                    lengthValue = parseInt(textDecodeAscii(bytes, numStart, i), 10);
                    pushBytes(bytes.subarray(numStart, i));
                }
                continue;
            }

            if (b === 0x73 && matchKeyword(bytes, i, 'stream')) {
                pushBytes(textEncode('stream\n'));
                let s = i + 6;
                if (bytes[s] === 0x0D) s++;
                if (bytes[s] === 0x0A) s++;
                let streamBytes, afterStream;
                if (typeof lengthValue === 'number' && !isNaN(lengthValue)) {
                    streamBytes = bytes.subarray(s, s + lengthValue);
                    afterStream = s + lengthValue;
                    if (bytes[afterStream] === 0x0D) afterStream++;
                    if (bytes[afterStream] === 0x0A) afterStream++;
                } else {
                    // Fallback: no direct /Length found — scan for endstream marker.
                    let k = s;
                    while (k < n && !matchKeyword(bytes, k, 'endstream')) k++;
                    let end = k;
                    if (bytes[end - 1] === 0x0A) end--;
                    if (bytes[end - 1] === 0x0D) end--;
                    streamBytes = bytes.subarray(s, end);
                    afterStream = k;
                }
                const encStream = rc4(objKey, streamBytes);
                pushBytes(encStream);
                pushBytes(textEncode('\nendstream'));
                i = afterStream;
                if (matchKeyword(bytes, i, 'endstream')) i += 9;
                continue;
            }

            out.push(b);
            i++;
        }

        return new Uint8Array(out);
    }

    function textDecodeAscii(bytes, start, end) {
        let s = '';
        for (let i = start; i < end; i++) s += String.fromCharCode(bytes[i]);
        return s;
    }

    // Finds every top-level "N G obj ... endobj" in a classic (non-XRef-stream)
    // PDF body and returns their positions plus the object body's byte range.
    function findObjects(bytes) {
        const objects = [];
        const n = bytes.length;
        let i = 0;
        while (i < n) {
            // find next digit sequence at a delimiter boundary that begins "N G obj"
            if (bytes[i] >= 0x30 && bytes[i] <= 0x39 && (i === 0 || isDelim(bytes[i - 1]))) {
                let p = i;
                while (p < n && bytes[p] >= 0x30 && bytes[p] <= 0x39) p++;
                let q = p;
                while (q < n && (bytes[q] === 0x20 || bytes[q] === 0x0A || bytes[q] === 0x0D)) q++;
                if (q < n && bytes[q] >= 0x30 && bytes[q] <= 0x39) {
                    let r = q;
                    while (r < n && bytes[r] >= 0x30 && bytes[r] <= 0x39) r++;
                    let t = r;
                    while (t < n && (bytes[t] === 0x20 || bytes[t] === 0x0A || bytes[t] === 0x0D)) t++;
                    if (matchKeyword(bytes, t, 'obj')) {
                        const objNum = parseInt(textDecodeAscii(bytes, i, p), 10);
                        const genNum = parseInt(textDecodeAscii(bytes, q, r), 10);
                        let bodyStart = t + 3;
                        if (bytes[bodyStart] === 0x0D) bodyStart++;
                        if (bytes[bodyStart] === 0x0A) bodyStart++;
                        // Scan forward (using the same tokenizer logic, string/stream aware)
                        // to find this object's true "endobj" without false-hitting
                        // stream binary content.
                        const bodyEndInfo = scanToEndobj(bytes, bodyStart);
                        objects.push({ objNum, genNum, bodyStart, bodyEnd: bodyEndInfo.bodyEnd });
                        i = bodyEndInfo.nextPos;
                        continue;
                    }
                }
            }
            i++;
        }
        return objects;
    }

    // Walks an object body purely to find where "endobj" legitimately occurs,
    // correctly skipping over string content and any stream's raw bytes
    // (using /Length when available) so embedded binary can't be
    // mistaken for the "endobj"/"stream" keywords.
    function scanToEndobj(bytes, start) {
        let i = start;
        const n = bytes.length;
        let lengthValue = null;
        while (i < n) {
            const b = bytes[i];
            if (b === 0x28) {
                i++; let depth = 1;
                while (i < n && depth > 0) {
                    const c = bytes[i];
                    if (c === 0x5C) { i += 2; continue; }
                    if (c === 0x28) depth++;
                    else if (c === 0x29) depth--;
                    i++;
                }
                continue;
            }
            if (b === 0x3C && bytes[i + 1] === 0x3C) {
                i += 2;
                continue;
            }
            if (b === 0x3C) {
                let j = i + 1;
                while (j < n && bytes[j] !== 0x3E) j++;
                i = j + 1;
                continue;
            }
            if (b === 0x2F && matchKeyword(bytes, i, '/Length')) {
                i += 7;
                while (i < n && (bytes[i] === 0x20 || bytes[i] === 0x0A || bytes[i] === 0x0D)) i++;
                const numStart = i;
                while (i < n && bytes[i] >= 0x30 && bytes[i] <= 0x39) i++;
                if (i > numStart) lengthValue = parseInt(textDecodeAscii(bytes, numStart, i), 10);
                continue;
            }
            if (b === 0x73 && matchKeyword(bytes, i, 'stream')) {
                let s = i + 6;
                if (bytes[s] === 0x0D) s++;
                if (bytes[s] === 0x0A) s++;
                if (typeof lengthValue === 'number' && !isNaN(lengthValue)) {
                    i = s + lengthValue;
                    if (bytes[i] === 0x0D) i++;
                    if (bytes[i] === 0x0A) i++;
                } else {
                    let k = s;
                    while (k < n && !matchKeyword(bytes, k, 'endstream')) k++;
                    i = k;
                }
                if (matchKeyword(bytes, i, 'endstream')) i += 9;
                continue;
            }
            if (b === 0x65 && matchKeyword(bytes, i, 'endobj')) {
                let bodyEnd = i;
                while (bodyEnd > start && (bytes[bodyEnd - 1] === 0x0A || bytes[bodyEnd - 1] === 0x0D || bytes[bodyEnd - 1] === 0x20)) bodyEnd--;
                return { bodyEnd, nextPos: i + 6 };
            }
            i++;
        }
        return { bodyEnd: n, nextPos: n };
    }

    function findRootRef(bytes) {
        const s = textDecodeAscii(bytes, 0, bytes.length);
        const m = s.match(/\/Root\s+(\d+)\s+(\d+)\s+R/);
        if (!m) throw new Error('PDF trailer missing /Root reference');
        return { num: parseInt(m[1], 10), gen: parseInt(m[2], 10) };
    }

    /**
     * Encrypts a normalized (classic, non-object-stream) PDF byte buffer with
     * the given password. `PDFDocument.save({ useObjectStreams: false })`
     * from pdf-lib produces the expected input shape.
     */
    function encryptClassicPdf(normalizedBytes, password) {
        const keyLenBytes = 16, revision = 3, permissions = -4;

        const fileId = new Uint8Array(16);
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(fileId);
        else for (let i = 0; i < 16; i++) fileId[i] = Math.floor(Math.random() * 256);

        const userPwBytes = textEncode(password || '');
        const ownerPwBytes = new Uint8Array(0);

        const oEntry = computeOwnerEntry(ownerPwBytes, userPwBytes, keyLenBytes, revision);
        const fileKey = computeEncryptionKey(userPwBytes, oEntry, permissions, fileId, keyLenBytes, revision, true);
        const uEntry = computeUserEntryR3(fileKey, fileId);

        const rootRef = findRootRef(normalizedBytes);
        const objects = findObjects(normalizedBytes);

        let maxObjNum = 0;
        for (const o of objects) if (o.objNum > maxObjNum) maxObjNum = o.objNum;
        const encryptObjNum = maxObjNum + 1;

        const chunks = [];
        const offsets = {};
        let running = 0;
        function append(strOrBytes) {
            const b = typeof strOrBytes === 'string' ? textEncode(strOrBytes) : strOrBytes;
            chunks.push(b);
            running += b.length;
        }

        append('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'.replace(/[-￿]/g, ch => String.fromCharCode(ch.charCodeAt(0) & 0xFF)));

        for (const obj of objects) {
            offsets[obj.objNum] = running;
            const objKey = computeObjectKey(fileKey, obj.objNum, obj.genNum, keyLenBytes);
            const rawBody = normalizedBytes.subarray(obj.bodyStart, obj.bodyEnd);
            const encBody = encryptObjectBody(rawBody, objKey);
            append(`${obj.objNum} ${obj.genNum} obj\n`);
            append(encBody);
            append('\nendobj\n');
        }

        offsets[encryptObjNum] = running;
        const oLiteral = bytesToPdfLiteral(oEntry);
        const uLiteral = bytesToPdfLiteral(uEntry);
        append(`${encryptObjNum} 0 obj\n<< /Filter /Standard /V 2 /R ${revision} /Length ${keyLenBytes * 8} /O (${oLiteral}) /U (${uLiteral}) /P ${permissions} >>\nendobj\n`);

        const size = maxObjNum + 2;
        const xrefOffset = running;
        append(`xref\n0 ${size}\n0000000000 65535 f \n`);
        for (let num = 1; num < size; num++) {
            if (Object.prototype.hasOwnProperty.call(offsets, num)) {
                append(String(offsets[num]).padStart(10, '0') + ' 00000 n \n');
            } else {
                append('0000000000 00000 f \n');
            }
        }

        const idHex = bytesToHexString(fileId);
        append(`trailer\n<< /Size ${size} /Root ${rootRef.num} ${rootRef.gen} R /Encrypt ${encryptObjNum} 0 R /ID [<${idHex}> <${idHex}>] >>\nstartxref\n${xrefOffset}\n%%EOF`);

        let total = 0;
        for (const c of chunks) total += c.length;
        const out = new Uint8Array(total);
        let pos = 0;
        for (const c of chunks) { out.set(c, pos); pos += c.length; }
        return out;
    }

    async function addPasswordToPdf(inputBytes, password) {
        if (typeof PDFLib === 'undefined') throw new Error('pdf-lib is required but not loaded');
        const pdfDoc = await PDFLib.PDFDocument.load(inputBytes, { ignoreEncryption: true, updateMetadata: false });
        const normalized = await pdfDoc.save({ useObjectStreams: false });
        return encryptClassicPdf(normalized, password);
    }

    // ---- Password removal (decrypt path) ----
    // RC4 is self-inverse: rc4(key, rc4(key, plaintext)) === plaintext, so the
    // same encryptObjectBody() walk used to lock a PDF also unlocks one, as
    // long as it's fed the correct per-object key (Algorithm 1).

    function indexOfAscii(bytes, str, from) {
        from = from || 0;
        const n = bytes.length, m = str.length;
        outer: for (let i = from; i <= n - m; i++) {
            for (let j = 0; j < m; j++) if (bytes[i + j] !== str.charCodeAt(j)) continue outer;
            return i;
        }
        return -1;
    }

    function lastIndexOfAscii(bytes, str) {
        let last = -1, from = 0;
        for (;;) {
            const idx = indexOfAscii(bytes, str, from);
            if (idx === -1) break;
            last = idx; from = idx + 1;
        }
        return last;
    }

    function skipWsIdx(bytes, i) {
        while (i < bytes.length && (bytes[i] === 0x20 || bytes[i] === 0x0A || bytes[i] === 0x0D || bytes[i] === 0x09)) i++;
        return i;
    }

    function parseNumberAfter(bytes, idx) {
        let i = skipWsIdx(bytes, idx);
        const start = i;
        if (bytes[i] === 0x2D) i++;
        while (i < bytes.length && bytes[i] >= 0x30 && bytes[i] <= 0x39) i++;
        return parseInt(textDecodeAscii(bytes, start, i), 10);
    }

    function parseRefAfter(bytes, idx) {
        let i = skipWsIdx(bytes, idx);
        let s = i;
        while (i < bytes.length && bytes[i] >= 0x30 && bytes[i] <= 0x39) i++;
        const num = parseInt(textDecodeAscii(bytes, s, i), 10);
        i = skipWsIdx(bytes, i);
        s = i;
        while (i < bytes.length && bytes[i] >= 0x30 && bytes[i] <= 0x39) i++;
        const gen = parseInt(textDecodeAscii(bytes, s, i), 10);
        i = skipWsIdx(bytes, i);
        i++; // skip 'R'
        return { num, gen, next: i };
    }

    // Parses a literal "(...)" or hex "<...>" PDF string at position i and
    // returns its raw decoded bytes — shared by /O and /U entry extraction.
    function parseStringAt(bytes, i) {
        const n = bytes.length;
        if (bytes[i] === 0x28) {
            i++; let depth = 1;
            const raw = [];
            while (i < n && depth > 0) {
                const c = bytes[i];
                if (c === 0x5C) {
                    i++;
                    if (i >= n) break;
                    const e = bytes[i];
                    if (e === 0x6E) { raw.push(0x0A); i++; }
                    else if (e === 0x72) { raw.push(0x0D); i++; }
                    else if (e === 0x74) { raw.push(0x09); i++; }
                    else if (e === 0x62) { raw.push(0x08); i++; }
                    else if (e === 0x66) { raw.push(0x0C); i++; }
                    else if (e === 0x28) { raw.push(0x28); i++; }
                    else if (e === 0x29) { raw.push(0x29); i++; }
                    else if (e === 0x5C) { raw.push(0x5C); i++; }
                    else if (e === 0x0D) { i++; if (i < n && bytes[i] === 0x0A) i++; }
                    else if (e === 0x0A) { i++; }
                    else if (e >= 0x30 && e <= 0x37) {
                        let oct = 0, cnt = 0;
                        while (cnt < 3 && i < n && bytes[i] >= 0x30 && bytes[i] <= 0x37) { oct = oct * 8 + (bytes[i] - 0x30); i++; cnt++; }
                        raw.push(oct & 0xFF);
                    } else { raw.push(e); i++; }
                } else if (c === 0x28) { depth++; raw.push(c); i++; }
                else if (c === 0x29) { depth--; i++; if (depth > 0) raw.push(c); }
                else { raw.push(c); i++; }
            }
            return { raw: new Uint8Array(raw), next: i };
        }
        if (bytes[i] === 0x3C) {
            let j = i + 1;
            const digits = [];
            while (j < bytes.length && bytes[j] !== 0x3E) {
                if (hexVal(bytes[j]) >= 0) digits.push(bytes[j]);
                j++;
            }
            if (digits.length % 2 === 1) digits.push(0x30);
            const raw = new Uint8Array(digits.length / 2);
            for (let k = 0; k < raw.length; k++) raw[k] = (hexVal(digits[k * 2]) << 4) | hexVal(digits[k * 2 + 1]);
            return { raw, next: j + 1 };
        }
        throw new Error('Expected a PDF string at the given position');
    }

    /**
     * Removes standard-security-handler (RC4) password protection from a
     * classic (non-XRef-stream) PDF, given the user password. Verifies the
     * password via Algorithm 6 (comparing against the stored /U entry)
     * before decrypting every object.
     */
    function decryptClassicPdf(bytes, password) {
        const trailerIdx = lastIndexOfAscii(bytes, 'trailer');
        if (trailerIdx === -1) throw new Error('Unsupported PDF structure (uses cross-reference streams, not a classic trailer)');

        const encRefIdx = indexOfAscii(bytes, '/Encrypt', trailerIdx);
        if (encRefIdx === -1) throw new Error('This PDF is not password protected');
        const ref = parseRefAfter(bytes, encRefIdx + 8);
        const encNum = ref.num;

        const idIdx = indexOfAscii(bytes, '/ID', trailerIdx);
        let fileId = new Uint8Array(0);
        if (idIdx !== -1) {
            let i = idIdx + 3;
            while (i < bytes.length && bytes[i] !== 0x3C && bytes[i] !== 0x28) i++;
            fileId = parseStringAt(bytes, i).raw;
        }

        const rootRef = findRootRef(bytes);
        const objects = findObjects(bytes);
        const encObj = objects.find(o => o.objNum === encNum);
        if (!encObj) throw new Error('Could not locate the /Encrypt dictionary');
        const encBody = bytes.subarray(encObj.bodyStart, encObj.bodyEnd);

        const vIdx = indexOfAscii(encBody, '/V');
        const V = vIdx !== -1 ? parseNumberAfter(encBody, vIdx + 2) : 1;
        if (V >= 4) throw new Error('AES-encrypted PDFs are not supported yet — only standard RC4 password protection can be removed.');

        const rIdx = indexOfAscii(encBody, '/R');
        const R = rIdx !== -1 ? parseNumberAfter(encBody, rIdx + 2) : 2;
        const lengthIdx = indexOfAscii(encBody, '/Length');
        const keyLenBytes = Math.floor((lengthIdx !== -1 ? parseNumberAfter(encBody, lengthIdx + 7) : 40) / 8);
        const pIdx = indexOfAscii(encBody, '/P');
        const permissions = pIdx !== -1 ? parseNumberAfter(encBody, pIdx + 2) : -1;

        const oIdx = indexOfAscii(encBody, '/O');
        if (oIdx === -1) throw new Error('Could not read the /Encrypt dictionary (missing /O entry)');
        const oParsed = parseStringAt(encBody, skipWsIdx(encBody, oIdx + 2));

        const uIdx = indexOfAscii(encBody, '/U', oParsed.next);
        if (uIdx === -1) throw new Error('Could not read the /Encrypt dictionary (missing /U entry)');
        const uParsed = parseStringAt(encBody, skipWsIdx(encBody, uIdx + 2));

        const userPwBytes = textEncode(password || '');
        const fileKey = computeEncryptionKey(userPwBytes, oParsed.raw, permissions, fileId, keyLenBytes, R, true);

        const computedU = R === 2 ? rc4(fileKey, PAD) : computeUserEntryR3(fileKey, fileId);
        const compareLen = R === 2 ? 32 : 16;
        for (let i = 0; i < compareLen; i++) {
            if (computedU[i] !== uParsed.raw[i]) throw new Error('Incorrect password');
        }

        const chunks = [];
        const offsets = {};
        let running = 0;
        function append(strOrBytes) {
            const b = typeof strOrBytes === 'string' ? textEncode(strOrBytes) : strOrBytes;
            chunks.push(b);
            running += b.length;
        }

        append('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'.replace(/[-￿]/g, ch => String.fromCharCode(ch.charCodeAt(0) & 0xFF)));

        let maxObjNum = 0;
        for (const o of objects) if (o.objNum > maxObjNum) maxObjNum = o.objNum;

        for (const obj of objects) {
            if (obj.objNum === encNum) continue;
            offsets[obj.objNum] = running;
            const objKey = computeObjectKey(fileKey, obj.objNum, obj.genNum, keyLenBytes);
            const rawBody = bytes.subarray(obj.bodyStart, obj.bodyEnd);
            const decBody = encryptObjectBody(rawBody, objKey);
            append(`${obj.objNum} ${obj.genNum} obj\n`);
            append(decBody);
            append('\nendobj\n');
        }

        const size = maxObjNum + 1;
        const xrefOffset = running;
        append(`xref\n0 ${size}\n0000000000 65535 f \n`);
        for (let num = 1; num < size; num++) {
            if (Object.prototype.hasOwnProperty.call(offsets, num)) {
                append(String(offsets[num]).padStart(10, '0') + ' 00000 n \n');
            } else {
                append('0000000000 00000 f \n');
            }
        }

        append(`trailer\n<< /Size ${size} /Root ${rootRef.num} ${rootRef.gen} R >>\nstartxref\n${xrefOffset}\n%%EOF`);

        let total = 0;
        for (const c of chunks) total += c.length;
        const out = new Uint8Array(total);
        let pos = 0;
        for (const c of chunks) { out.set(c, pos); pos += c.length; }
        return out;
    }

    function removePasswordFromPdf(inputBytes, password) {
        return decryptClassicPdf(inputBytes, password);
    }

    const api = { md5, rc4, encryptClassicPdf, addPasswordToPdf, decryptClassicPdf, removePasswordFromPdf };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.PDFEncrypt = api;
})(typeof window !== 'undefined' ? window : globalThis);
