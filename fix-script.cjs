const fs = require('fs');
let content = fs.readFileSync('./dist/index.html', 'utf8');
content = content.replace(/type="module" crossorigin/g, 'crossorigin');
fs.writeFileSync('./dist/index.html', content);
console.log('Fixed script tag');
