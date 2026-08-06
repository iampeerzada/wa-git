const fs = require('fs');
let app = fs.readFileSync('App.tsx', 'utf8');

const targetState = `  const [authenticatedUser, setAuthenticatedUser] = useState<User>(() => {
    const savedAuthUser = localStorage.getItem('wa_original_user');
    return savedAuthUser ? JSON.parse(savedAuthUser) : null;
  });`;

const replaceState = `  const [authenticatedUser, setAuthenticatedUser] = useState<User>(() => {
    const savedAuthUser = localStorage.getItem('wa_original_user');
    if (savedAuthUser) return JSON.parse(savedAuthUser);
    
    // Fallback for existing sessions
    const savedUser = localStorage.getItem('wa_cached_user');
    if (savedUser) {
       const user = JSON.parse(savedUser);
       localStorage.setItem('wa_original_user', JSON.stringify(user));
       return user;
    }
    return null;
  });`;

if (app.includes(targetState)) {
    app = app.replace(targetState, replaceState);
    fs.writeFileSync('App.tsx', app);
    console.log("Patched authenticatedUser initialization");
} else {
    // maybe I matched the wrong string, let's just do a string replacement
    const altTarget = `  const [authenticatedUser, setAuthenticatedUser] = useState<User>(() => {
    const saved = localStorage.getItem('wa_original_user');
    return saved ? JSON.parse(saved) : null;
  });`;
    
    if (app.includes(altTarget)) {
        app = app.replace(altTarget, replaceState);
        fs.writeFileSync('App.tsx', app);
        console.log("Patched authenticatedUser alt initialization");
    } else {
        console.log("Failed to patch authenticatedUser");
    }
}
