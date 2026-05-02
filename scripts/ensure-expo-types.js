const fs = require('node:fs');
const path = require('node:path');

const expoTypesDir = path.join(__dirname, '..', '.expo', 'types');

fs.mkdirSync(expoTypesDir, { recursive: true });
