const fs = require('fs');

let code = fs.readFileSync('components/BulkSender.tsx', 'utf8');

code = code.replace(
  /const showQuickButtons = isSuper \|\| !hiddenModules\.includes\('bulk-quick-buttons'\);/,
  `const selectedInst = instances.find(i => i.id === selectedInstance);
  const isBaileys = !selectedInst || selectedInst.provider !== 'meta';
  const showQuickButtons = (isSuper || !hiddenModules.includes('bulk-quick-buttons')) && !isBaileys;`
);

fs.writeFileSync('components/BulkSender.tsx', code);
