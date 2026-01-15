const fs = require('fs');
const path = require('path');

const SOURCE_FILE = path.join(__dirname, '../activation-keys.json');
const TARGET_FILE = path.join(__dirname, '../codes.txt');

try {
    console.log('Reading file...');
    const data = fs.readFileSync(SOURCE_FILE, 'utf8');
    const keys = JSON.parse(data);

    console.log(`Extracting codes from ${keys.length} entries...`);
    const codes = keys.map(k => k.code).join('\n');

    console.log('Writing to codes.txt...');
    fs.writeFileSync(TARGET_FILE, codes);
    console.log(`Done! Extracted ${keys.length} codes to ${TARGET_FILE}`);
} catch (err) {
    console.error('Error:', err);
}
