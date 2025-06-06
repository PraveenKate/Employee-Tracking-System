// hashPassword.js

const bcrypt = require('bcrypt');

async function generateHash(password) {
  try {
    
    const hash = await bcrypt.hash(password, 10);
    console.log(`Plain password: ${password}`);
    console.log(`Hashed password: ${hash}`);
  } catch (error) {
    console.error('Error generating hash:', error);
  }
}

// Change this password to whatever you want to hash
const passwordToHash = 'admin';

generateHash(passwordToHash);
