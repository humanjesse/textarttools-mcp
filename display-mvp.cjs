const fs = require('fs');
const data = JSON.parse(fs.readFileSync('mvp_result.json'));

console.log('\n🚀 ASCII Art for "MVP":');
console.log('='.repeat(40));
console.log(data.result.ascii_art.replace(/@/g, ''));
console.log('='.repeat(40));
console.log(`Characters: ${data.result.character_count}, Lines: ${data.result.line_count}`);
console.log(`Processing time: ${data.result.processing_time_ms}ms\n`);