const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const importAdd = "import WalletManager from './components/WalletManager';\n";
code = code.replace("import CodeSnippets from './components/CodeSnippets';", "import CodeSnippets from './components/CodeSnippets';\n" + importAdd);

const tabAdd = "          {activeTab === 'wallet' && <WalletManager apiBase={API_BASE} currentUser={currentUser} users={users} />}\n          {activeTab === 'users' &&";
code = code.replace("          {activeTab === 'users' &&", tabAdd);

fs.writeFileSync('App.tsx', code);
