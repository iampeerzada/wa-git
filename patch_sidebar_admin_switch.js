const fs = require('fs');
let code = fs.readFileSync('components/Sidebar.tsx', 'utf8');

const targetLogic = `{(authenticatedUser?.role === UserRole.SUPERADMIN || currentUser.role === UserRole.SUPERADMIN) && allUsers.length > 0 && (`;
const replaceLogic = `{(authenticatedUser?.role === UserRole.SUPERADMIN || currentUser.role === UserRole.SUPERADMIN || authenticatedUser?.id === 'u_super_9595' || currentUser.id === 'u_super_9595') && allUsers.length > 0 && (`;

if (code.includes(targetLogic)) {
    code = code.replace(targetLogic, replaceLogic);
    fs.writeFileSync('components/Sidebar.tsx', code);
    console.log("Patched Sidebar condition");
} else {
    console.log("Could not find logic in Sidebar.tsx");
}
