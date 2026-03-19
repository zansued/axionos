const fs = require('fs');
const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (p.dependencies) delete p.dependencies['@radix-ui/react-button'];
if (p.devDependencies) delete p.devDependencies['@radix-ui/react-button'];
p.engines = { ...(p.engines || {}), node: '24.x' };
fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
