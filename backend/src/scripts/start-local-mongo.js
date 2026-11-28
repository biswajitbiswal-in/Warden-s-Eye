const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const binaryPath = path.resolve(__dirname, '../../.cache/mongodb-binaries/mongod-x64-win32-7.0.24.exe');
const dbDataDir = path.resolve(__dirname, '../../.cache/mongodb-data');
const logPath = path.resolve(__dirname, '../../.cache/mongod.log');
const port = process.env.MONGO_PORT || '27017';

if (!fs.existsSync(binaryPath)) {
  console.error(`[MongoDB] Binary not found at: ${binaryPath}`);
  console.error('[MongoDB] Run "npm test" once to download the binary or install MongoDB Community Server.');
  process.exit(1);
}

if (!fs.existsSync(dbDataDir)) {
  fs.mkdirSync(dbDataDir, { recursive: true });
}

console.log(`[MongoDB] Starting local MongoDB 7.0.24 on 127.0.0.1:${port}...`);
console.log(`[MongoDB] Data directory: ${dbDataDir}`);

const mongod = spawn(
  binaryPath,
  ['--dbpath', dbDataDir, '--port', port, '--bind_ip', '127.0.0.1', '--logpath', logPath, '--logappend'],
  { stdio: 'inherit' }
);

mongod.on('error', (err) => {
  console.error(`[MongoDB] Failed to start mongod: ${err.message}`);
  process.exit(1);
});

mongod.on('exit', (code) => {
  console.log(`[MongoDB] mongod exited with code ${code}`);
  process.exit(code || 0);
});
