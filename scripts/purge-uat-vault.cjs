#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const vaultPath = path.join(__dirname, '../.credentials.local.json');

console.log('================================================================================');
console.log('   E3-EOS: PURGE TEMPORARY UAT CREDENTIAL VAULT                                 ');
console.log('================================================================================\n');

if (fs.existsSync(vaultPath)) {
  fs.unlinkSync(vaultPath);
  console.log('✓ Successfully purged temporary UAT credential vault (.credentials.local.json).');
  console.log('  No persistent plaintext user credentials remain on this host.');
} else {
  console.log('ℹ Vault file .credentials.local.json already does not exist.');
}
