#!/usr/bin/env node

const bcryptjs = require('bcryptjs');

async function hashPassword() {
  try {
    const password = 'Demo@12345';
    const hash = await bcryptjs.hash(password, 10);
    console.log('Password:', password);
    console.log('Hash:', hash);
    
    // Verify it works
    const isValid = await bcryptjs.compare(password, hash);
    console.log('Verification:', isValid);
  } catch (err) {
    console.error('Error:', err);
  }
}

hashPassword();
