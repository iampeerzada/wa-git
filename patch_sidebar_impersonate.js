const fs = require('fs');
let code = fs.readFileSync('components/Sidebar.tsx', 'utf8');

const targetProps = `  currentUser: User;`;
const replaceProps = `  currentUser: User;
  authenticatedUser?: User;`;

if (code.includes(targetProps)) {
    code = code.replace(targetProps, replaceProps);
    console.log("Patched Sidebar Props");
}

const targetSig = `const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, currentUser, allUsers, onUserSwitch, hiddenModules, onLogout }) => {`;
const replaceSig = `const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, currentUser, authenticatedUser, allUsers, onUserSwitch, hiddenModules, onLogout }) => {`;

if (code.includes(targetSig)) {
    code = code.replace(targetSig, replaceSig);
    console.log("Patched Sidebar Signature");
}

const targetLogic = `{currentUser.role === UserRole.SUPERADMIN && allUsers.length > 0 && (`;
const replaceLogic = `{(authenticatedUser?.role === UserRole.SUPERADMIN || currentUser.role === UserRole.SUPERADMIN) && allUsers.length > 0 && (`;

if (code.includes(targetLogic)) {
    code = code.replace(targetLogic, replaceLogic);
    console.log("Patched Sidebar Logic");
}

fs.writeFileSync('components/Sidebar.tsx', code);
