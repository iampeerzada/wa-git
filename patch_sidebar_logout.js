const fs = require('fs');
let code = fs.readFileSync('components/Sidebar.tsx', 'utf8');

const targetProps = `  hiddenModules: string[];
}`;

const replaceProps = `  hiddenModules: string[];
  onLogout: () => void;
}`;

if (code.includes(targetProps)) {
    code = code.replace(targetProps, replaceProps);
}

const targetSig = `const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, currentUser, allUsers, onUserSwitch, hiddenModules }) => {`;
const replaceSig = `const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, currentUser, allUsers, onUserSwitch, hiddenModules, onLogout }) => {`;

if (code.includes(targetSig)) {
    code = code.replace(targetSig, replaceSig);
}

const targetButton = `            onClick={() => {
                localStorage.removeItem('wa_token');
                window.location.reload();
            }}`;
const replaceButton = `            onClick={onLogout}`;

if (code.includes(targetButton)) {
    code = code.replace(targetButton, replaceButton);
}

fs.writeFileSync('components/Sidebar.tsx', code);
