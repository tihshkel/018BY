const fs = require('fs');
const path = require('path');

const TARGET_FILE = path.join(__dirname, '../activation-keys.json');
const COUNT = 150000;
const CODE_LENGTH = 6;
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateCode() {
  let result = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    result += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return result;
}

function generateKeys() {
  const keys = [];
  const existingCodes = new Set();
  const createdAt = new Date().toISOString();

  console.log(`Generating ${COUNT} unique keys...`);

  while (keys.length < COUNT) {
    const code = generateCode();
    if (!existingCodes.has(code)) {
      existingCodes.add(code);
      keys.push({
        id: keys.length + 1,
        code: code,
        used: false,
        createdAt: createdAt
      });
    }
  }

  console.log('Writing to file...');
  fs.writeFileSync(TARGET_FILE, JSON.stringify(keys, null, 2));
  console.log(`Successfully generated ${keys.length} keys in ${TARGET_FILE}`);
}

generateKeys();
