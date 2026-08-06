const fs = require('fs');
let app = fs.readFileSync('App.tsx', 'utf8');

const targetLogout = `  const handleLogout = () => {
    setIsAuthenticated(false);
    setShowLandingPage(true);
    localStorage.removeItem('wa_auth_session');
    localStorage.removeItem('wa_current_user_id');
    localStorage.removeItem('wa_cached_user');
  };`;

const replaceLogout = `  const handleLogout = () => {
    setIsAuthenticated(false);
    setShowLandingPage(true);
    localStorage.removeItem('wa_auth_session');
    localStorage.removeItem('wa_current_user_id');
    localStorage.removeItem('wa_cached_user');
    localStorage.removeItem('wa_original_user');
  };`;

if (app.includes(targetLogout)) {
    app = app.replace(targetLogout, replaceLogout);
    console.log("Patched handleLogout");
    fs.writeFileSync('App.tsx', app);
} else {
    console.log("Failed to find handleLogout");
}
