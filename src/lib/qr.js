// Self-contained QR Code encoder — Byte mode only, auto version selection, selectable EC level.
// Ported to ISO/IEC 18004 structure (Reed-Solomon + standard placement rules). No external deps.

const CODEWORDS_COUNT = [
  0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346,
  404, 466, 532, 581, 655, 733, 815, 901, 991, 1085,
  1156, 1258, 1364, 1474, 1588, 1706, 1828, 1921, 2051, 2185,
  2323, 2465, 2611, 2761, 2876, 3034, 3196, 3362, 3532, 3706,
];

const EC_LEVELS = { L: 1, M: 0, Q: 3, H: 2 }; // bit value used in format info
const EC_LEVEL_INDEX = { L: 0, M: 1, Q: 2, H: 3 }; // column in the tables below

const EC_BLOCKS_TABLE = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1, 2, 2, 4, 1, 2, 4, 4, 2, 4, 4, 4, 2, 4, 6, 5, 2, 4, 6, 6,
  2, 5, 8, 8, 4, 5, 8, 8, 4, 5, 8, 11, 4, 8, 10, 11, 4, 9, 12, 16, 4, 9, 16, 16, 6, 10, 12, 18,
  6, 10, 17, 16, 6, 11, 16, 19, 6, 13, 18, 21, 7, 14, 21, 25, 8, 16, 20, 25, 8, 17, 23, 25,
  9, 17, 23, 34, 9, 18, 25, 30, 10, 20, 27, 32, 12, 21, 29, 35, 12, 23, 34, 37, 12, 25, 34, 40,
  13, 26, 35, 42, 14, 28, 38, 45, 15, 29, 40, 48, 16, 31, 43, 51, 17, 33, 45, 54, 18, 35, 48, 57,
  19, 37, 51, 60, 19, 38, 53, 63, 20, 40, 56, 66, 21, 43, 59, 70, 22, 45, 62, 74, 24, 47, 65, 77,
  25, 49, 68, 81,
];

const EC_CODEWORDS_TABLE = [
  7, 10, 13, 17, 10, 16, 22, 28, 15, 26, 36, 44, 20, 36, 52, 64, 26, 48, 72, 88, 36, 64, 96, 112,
  40, 72, 108, 130, 48, 88, 132, 156, 60, 110, 160, 192, 72, 130, 192, 224, 80, 150, 224, 264,
  96, 176, 260, 308, 104, 198, 288, 352, 120, 216, 320, 384, 132, 240, 360, 432, 144, 280, 408, 480,
  168, 308, 448, 532, 180, 338, 504, 588, 196, 364, 546, 650, 224, 416, 600, 700, 224, 442, 644, 750,
  252, 476, 690, 816, 270, 504, 750, 900, 300, 560, 810, 960, 312, 588, 870, 1050, 336, 644, 952, 1110,
  360, 700, 1020, 1200, 390, 728, 1050, 1260, 420, 784, 1140, 1350, 450, 812, 1200, 1440, 480, 868, 1290, 1530,
  510, 924, 1350, 1620, 540, 980, 1440, 1710, 570, 1036, 1530, 1800, 570, 1064, 1590, 1890, 600, 1120, 1680, 1980,
  630, 1204, 1770, 2100, 660, 1260, 1860, 2220, 720, 1316, 1950, 2310, 750, 1372, 2040, 2430,
];

function getSymbolSize(version) { return version * 4 + 17; }
function getBlocksCount(version, eclIndex) { return EC_BLOCKS_TABLE[(version - 1) * 4 + eclIndex]; }
function getECCodewordsCount(version, eclIndex) { return EC_CODEWORDS_TABLE[(version - 1) * 4 + eclIndex]; }
function getCharCountBits(version) { return version < 10 ? 8 : 16; } // byte mode only

function getByteCapacity(version, eclIndex) {
  const total = CODEWORDS_COUNT[version];
  const ec = getECCodewordsCount(version, eclIndex);
  const dataBits = (total - ec) * 8;
  const usable = dataBits - (4 + getCharCountBits(version));
  return Math.floor(usable / 8);
}

function getBCHDigit(data) {
  let digit = 0;
  while (data !== 0) { digit++; data >>>= 1; }
  return digit;
}

// ---- Galois Field GF(256) ----
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);
(function initTables() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP_TABLE[i] = EXP_TABLE[i - 255];
})();
function gfMul(x, y) { if (x === 0 || y === 0) return 0; return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]]; }

function polyMul(p1, p2) {
  const coeff = new Uint8Array(p1.length + p2.length - 1);
  for (let i = 0; i < p1.length; i++) for (let j = 0; j < p2.length; j++) coeff[i + j] ^= gfMul(p1[i], p2[j]);
  return coeff;
}
function polyMod(dividend, divisor) {
  let result = new Uint8Array(dividend);
  while (result.length - divisor.length >= 0) {
    const coeff = result[0];
    for (let i = 0; i < divisor.length; i++) result[i] ^= gfMul(divisor[i], coeff);
    let offset = 0;
    while (offset < result.length && result[offset] === 0) offset++;
    result = result.slice(offset);
  }
  return result;
}
function generateECPolynomial(degree) {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) poly = polyMul(poly, new Uint8Array([1, EXP_TABLE[i]]));
  return poly;
}
function reedSolomonEncode(data, ecCount) {
  const genPoly = generateECPolynomial(ecCount);
  const padded = new Uint8Array(data.length + ecCount);
  padded.set(data);
  const remainder = polyMod(padded, genPoly);
  const start = ecCount - remainder.length;
  const buf = new Uint8Array(ecCount);
  buf.set(remainder, start > 0 ? start : 0);
  return buf;
}

// ---- Bit buffer ----
function makeBitBuffer() {
  return {
    buffer: [], length: 0,
    putBit(bit) {
      const idx = Math.floor(this.length / 8);
      if (this.buffer.length <= idx) this.buffer.push(0);
      if (bit) this.buffer[idx] |= (0x80 >>> (this.length % 8));
      this.length++;
    },
    put(num, len) { for (let i = 0; i < len; i++) this.putBit(((num >>> (len - i - 1)) & 1) === 1); },
  };
}

// ---- BitMatrix ----
function makeBitMatrix(size) {
  return {
    size, data: new Uint8Array(size * size), reservedBit: new Uint8Array(size * size),
    set(row, col, value, reserved) { const i = row * size + col; this.data[i] = value; if (reserved) this.reservedBit[i] = 1; },
    get(row, col) { return this.data[row * size + col]; },
    xor(row, col, value) { this.data[row * size + col] ^= value; },
    isReserved(row, col) { return this.reservedBit[row * size + col]; },
  };
}

// ---- Alignment pattern positions ----
function getAlignmentPositions(version) {
  if (version === 1) return [];
  const posCount = Math.floor(version / 7) + 2;
  const size = getSymbolSize(version);
  const intervals = size === 145 ? 26 : Math.ceil((size - 13) / (2 * posCount - 2)) * 2;
  const positions = [size - 7];
  for (let i = 1; i < posCount - 1; i++) positions[i] = positions[i - 1] - intervals;
  positions.push(6);
  positions.reverse();
  const coords = [];
  const n = positions.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
      coords.push([positions[i], positions[j]]);
    }
  }
  return coords;
}

// ---- Format / version info (BCH codes) ----
const G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
const G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);
const G15_BCH = getBCHDigit(G15);
function getFormatBits(eclBit, mask) {
  const data = (eclBit << 3) | mask;
  let d = data << 10;
  while (getBCHDigit(d) - G15_BCH >= 0) d ^= (G15 << (getBCHDigit(d) - G15_BCH));
  return ((data << 10) | d) ^ G15_MASK;
}
const G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
const G18_BCH = getBCHDigit(G18);
function getVersionBits(version) {
  let d = version << 12;
  while (getBCHDigit(d) - G18_BCH >= 0) d ^= (G18 << (getBCHDigit(d) - G18_BCH));
  return (version << 12) | d;
}

// ---- Matrix assembly ----
function setupFinder(matrix) {
  const size = matrix.size;
  const positions = [[0, 0], [size - 7, 0], [0, size - 7]];
  for (const [row, col] of positions) {
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || size <= row + r) continue;
      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || size <= col + c) continue;
        const dark = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        matrix.set(row + r, col + c, dark, true);
      }
    }
  }
}
function setupTiming(matrix) {
  const size = matrix.size;
  for (let r = 8; r < size - 8; r++) {
    const value = r % 2 === 0;
    matrix.set(r, 6, value, true);
    matrix.set(6, r, value, true);
  }
}
function setupAlignment(matrix, version) {
  for (const [row, col] of getAlignmentPositions(version)) {
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const dark = r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0);
        matrix.set(row + r, col + c, dark, true);
      }
    }
  }
}
function setupVersionInfo(matrix, version) {
  const size = matrix.size;
  const bits = getVersionBits(version);
  for (let i = 0; i < 18; i++) {
    const row = Math.floor(i / 3);
    const col = (i % 3) + size - 8 - 3;
    const mod = ((bits >> i) & 1) === 1;
    matrix.set(row, col, mod, true);
    matrix.set(col, row, mod, true);
  }
}
function setupFormatInfo(matrix, eclBit, mask) {
  const size = matrix.size;
  const bits = getFormatBits(eclBit, mask);
  for (let i = 0; i < 15; i++) {
    const mod = ((bits >> i) & 1) === 1;
    if (i < 6) matrix.set(i, 8, mod, true);
    else if (i < 8) matrix.set(i + 1, 8, mod, true);
    else matrix.set(size - 15 + i, 8, mod, true);
    if (i < 8) matrix.set(8, size - i - 1, mod, true);
    else if (i < 9) matrix.set(8, 15 - i - 1 + 1, mod, true);
    else matrix.set(8, 15 - i - 1, mod, true);
  }
  matrix.set(size - 8, 8, 1, true);
}
function setupData(matrix, data) {
  const size = matrix.size;
  let inc = -1, row = size - 1, bitIndex = 7, byteIndex = 0;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    while (true) {
      for (let c = 0; c < 2; c++) {
        if (!matrix.isReserved(row, col - c)) {
          let dark = false;
          if (byteIndex < data.length) dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
          matrix.set(row, col - c, dark);
          bitIndex--;
          if (bitIndex === -1) { byteIndex++; bitIndex = 7; }
        }
      }
      row += inc;
      if (row < 0 || size <= row) { row -= inc; inc = -inc; break; }
    }
  }
}

// ---- Mask patterns + penalty scoring ----
function getMaskAt(pattern, i, j) {
  switch (pattern) {
    case 0: return (i + j) % 2 === 0;
    case 1: return i % 2 === 0;
    case 2: return j % 3 === 0;
    case 3: return (i + j) % 3 === 0;
    case 4: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
    case 5: return (i * j) % 2 + (i * j) % 3 === 0;
    case 6: return ((i * j) % 2 + (i * j) % 3) % 2 === 0;
    case 7: return ((i * j) % 3 + (i + j) % 2) % 2 === 0;
    default: throw new Error("bad mask");
  }
}
function applyMask(pattern, data) {
  const size = data.size;
  for (let col = 0; col < size; col++) for (let row = 0; row < size; row++) {
    if (data.isReserved(row, col)) continue;
    data.xor(row, col, getMaskAt(pattern, row, col));
  }
}
function penaltyN1(data) {
  const size = data.size; let points = 0;
  for (let row = 0; row < size; row++) {
    let sameCol = 0, sameRow = 0, lastCol = null, lastRow = null;
    for (let col = 0; col < size; col++) {
      let m = data.get(row, col);
      if (m === lastCol) sameCol++; else { if (sameCol >= 5) points += 3 + (sameCol - 5); lastCol = m; sameCol = 1; }
      m = data.get(col, row);
      if (m === lastRow) sameRow++; else { if (sameRow >= 5) points += 3 + (sameRow - 5); lastRow = m; sameRow = 1; }
    }
    if (sameCol >= 5) points += 3 + (sameCol - 5);
    if (sameRow >= 5) points += 3 + (sameRow - 5);
  }
  return points;
}
function penaltyN2(data) {
  const size = data.size; let points = 0;
  for (let row = 0; row < size - 1; row++) for (let col = 0; col < size - 1; col++) {
    const s = data.get(row, col) + data.get(row, col + 1) + data.get(row + 1, col) + data.get(row + 1, col + 1);
    if (s === 4 || s === 0) points++;
  }
  return points * 3;
}
function penaltyN3(data) {
  const size = data.size; let points = 0, bitsCol = 0, bitsRow = 0;
  for (let row = 0; row < size; row++) {
    bitsCol = bitsRow = 0;
    for (let col = 0; col < size; col++) {
      bitsCol = ((bitsCol << 1) & 0x7ff) | data.get(row, col);
      if (col >= 10 && (bitsCol === 0x5d0 || bitsCol === 0x05d)) points++;
      bitsRow = ((bitsRow << 1) & 0x7ff) | data.get(col, row);
      if (col >= 10 && (bitsRow === 0x5d0 || bitsRow === 0x05d)) points++;
    }
  }
  return points * 40;
}
function penaltyN4(data) {
  let dark = 0;
  for (let i = 0; i < data.data.length; i++) dark += data.data[i];
  const k = Math.abs(Math.ceil((dark * 100 / data.data.length) / 5) - 10);
  return k * 10;
}
function getBestMask(matrix, setFormat) {
  let best = 0, lowest = Infinity;
  for (let p = 0; p < 8; p++) {
    setFormat(p);
    applyMask(p, matrix);
    const penalty = penaltyN1(matrix) + penaltyN2(matrix) + penaltyN3(matrix) + penaltyN4(matrix);
    applyMask(p, matrix); // undo
    if (penalty < lowest) { lowest = penalty; best = p; }
  }
  return best;
}

// ---- Data codeword creation (bit buffer -> interleaved RS blocks) ----
function createCodewords(bitBuffer, version, eclIndex) {
  const totalCodewords = CODEWORDS_COUNT[version];
  const ecTotal = getECCodewordsCount(version, eclIndex);
  const dataTotal = totalCodewords - ecTotal;
  const numBlocks = getBlocksCount(version, eclIndex);
  const blocksInGroup2 = totalCodewords % numBlocks;
  const blocksInGroup1 = numBlocks - blocksInGroup2;
  const dataCwInGroup1 = Math.floor(dataTotal / numBlocks);
  const dataCwInGroup2 = dataCwInGroup1 + 1;
  const ecCount = Math.floor(totalCodewords / numBlocks) - dataCwInGroup1;

  const buffer = new Uint8Array(bitBuffer.buffer);
  let offset = 0;
  const dcData = new Array(numBlocks), ecData = new Array(numBlocks);
  let maxDataSize = 0;
  for (let b = 0; b < numBlocks; b++) {
    const size = b < blocksInGroup1 ? dataCwInGroup1 : dataCwInGroup2;
    dcData[b] = buffer.slice(offset, offset + size);
    ecData[b] = reedSolomonEncode(dcData[b], ecCount);
    offset += size;
    maxDataSize = Math.max(maxDataSize, size);
  }
  const out = new Uint8Array(totalCodewords);
  let idx = 0;
  for (let i = 0; i < maxDataSize; i++) for (let r = 0; r < numBlocks; r++) if (i < dcData[r].length) out[idx++] = dcData[r][i];
  for (let i = 0; i < ecCount; i++) for (let r = 0; r < numBlocks; r++) out[idx++] = ecData[r][i];
  return out;
}

/**
 * Generate a QR code bit-matrix for `text` (byte mode only).
 * @param {string} text
 * @param {'L'|'M'|'Q'|'H'} eclName error correction level, default 'M'
 * @returns {{size:number, get:(r,c)=>0|1}}
 */
export function encodeQR(text, eclName = "M") {
  const bytes = new TextEncoder().encode(text);
  const eclIndex = EC_LEVEL_INDEX[eclName];
  const eclBit = EC_LEVELS[eclName];

  let version = null;
  for (let v = 1; v <= 40; v++) {
    if (bytes.length <= getByteCapacity(v, eclIndex)) { version = v; break; }
  }
  if (!version) throw new Error("Data too long for a QR code");

  const buffer = makeBitBuffer();
  buffer.put(0b0100, 4); // byte mode indicator
  buffer.put(bytes.length, getCharCountBits(version));
  for (let i = 0; i < bytes.length; i++) buffer.put(bytes[i], 8);

  const totalCodewords = CODEWORDS_COUNT[version];
  const ecTotal = getECCodewordsCount(version, eclIndex);
  const dataTotalBits = (totalCodewords - ecTotal) * 8;

  if (buffer.length + 4 <= dataTotalBits) buffer.put(0, 4);
  while (buffer.length % 8 !== 0) buffer.putBit(false);
  const remainingBytes = (dataTotalBits - buffer.length) / 8;
  for (let i = 0; i < remainingBytes; i++) buffer.put(i % 2 ? 0x11 : 0xec, 8);

  const codewords = createCodewords(buffer, version, eclIndex);

  const size = getSymbolSize(version);
  const matrix = makeBitMatrix(size);
  setupFinder(matrix);
  setupTiming(matrix);
  setupAlignment(matrix, version);
  setupFormatInfo(matrix, eclBit, 0);
  if (version >= 7) setupVersionInfo(matrix, version);
  setupData(matrix, codewords);

  const bestMask = getBestMask(matrix, (p) => setupFormatInfo(matrix, eclBit, p));
  applyMask(bestMask, matrix);
  setupFormatInfo(matrix, eclBit, bestMask);

  return { size, get: (r, c) => matrix.get(r, c) };
}
