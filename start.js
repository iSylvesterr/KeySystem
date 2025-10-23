const { spawn } = require('child_process');

console.log('🚀 Starting iSylHub Premium Key System...');

const bot = spawn('node', ['index.js'], {
    stdio: 'inherit',
    env: process.env
});

const server = spawn('node', ['server.js'], {
    stdio: 'inherit',
    env: process.env
});

bot.on('error', (error) => {
    console.error('❌ Bot error:', error);
});

server.on('error', (error) => {
    console.error('❌ Server error:', error);
});

bot.on('exit', (code) => {
    console.log(`⚠️ Bot process exited with code ${code}`);
    process.exit(code);
});

server.on('exit', (code) => {
    console.log(`⚠️ Server process exited with code ${code}`);
    process.exit(code);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    bot.kill();
    server.kill();
    process.exit(0);
});
