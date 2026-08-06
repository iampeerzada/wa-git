const fs = require('fs');
let app = fs.readFileSync('App.tsx', 'utf8');

// 1. Add authenticatedUser state
const targetState = `const [users, setUsers] = useState<User[]>([]);`;
const replaceState = `const [users, setUsers] = useState<User[]>([]);
  const [authenticatedUser, setAuthenticatedUser] = useState<User>(() => {
    const saved = localStorage.getItem('wa_original_user');
    return saved ? JSON.parse(saved) : null;
  });`;

if (app.includes(targetState)) {
    app = app.replace(targetState, replaceState);
    console.log("Patched authenticatedUser state");
}

// 2. Update handleLogin
const targetLogin = `        setCurrentUser(user);
        setIsAuthenticated(true);
        setShowLandingPage(false);
        localStorage.setItem('wa_auth_session', 'true');
        localStorage.setItem('wa_current_user_id', user.id);
        localStorage.setItem('wa_cached_user', JSON.stringify(user));`;

const replaceLogin = `        setCurrentUser(user);
        setAuthenticatedUser(user);
        setIsAuthenticated(true);
        setShowLandingPage(false);
        localStorage.setItem('wa_auth_session', 'true');
        localStorage.setItem('wa_current_user_id', user.id);
        localStorage.setItem('wa_cached_user', JSON.stringify(user));
        localStorage.setItem('wa_original_user', JSON.stringify(user));`;

if (app.includes(targetLogin)) {
    app = app.replace(targetLogin, replaceLogin);
    console.log("Patched login");
}

// 3. Update fetchUsers to use authenticatedUser headers if available
const targetFetchUsers = `        const res = await fetch(\`\${API_BASE}/api/users?_t=\${Date.now()}\`, {
          headers: {
            'X-User-ID': currentUser.id,
            'X-Role': currentUser.role,
            'X-API-Key': currentUser.apiKey
          }
        });`;

const replaceFetchUsers = `        const authU = authenticatedUser || currentUser;
        const res = await fetch(\`\${API_BASE}/api/users?_t=\${Date.now()}\`, {
          headers: {
            'X-User-ID': authU.id,
            'X-Role': authU.role,
            'X-API-Key': authU.apiKey
          }
        });`;

if (app.includes(targetFetchUsers)) {
    app = app.replace(targetFetchUsers, replaceFetchUsers);
    console.log("Patched fetchUsers");
}

// 4. Update fetchAllData (instances, etc.)? No, instances should be fetched for currentUser, so that we see the impersonated user's instances!
// Wait, if we use currentUser for instances, we see their instances. That is correct.

// 5. Update Sidebar prop currentUser -> authenticatedUser for the switch role logic?
// Wait, Sidebar takes `currentUser`. If we pass `authenticatedUser` as another prop to Sidebar, it can use it to determine if it should show the dropdown.
const targetSidebarProp = `currentUser={currentUser}`;
const replaceSidebarProp = `currentUser={currentUser} authenticatedUser={authenticatedUser || currentUser}`;

if (app.includes(targetSidebarProp)) {
    app = app.replace(targetSidebarProp, replaceSidebarProp);
    console.log("Patched Sidebar prop");
}

fs.writeFileSync('App.tsx', app);
