const fs = require('fs');
let app = fs.readFileSync('App.tsx', 'utf8');

const targetSidebar = `<Sidebar 
          activeTab={activeTab} 
          onTabChange={(tab) => { setActiveTab(tab); setIsSidebarOpen(false); }} 
          currentUser={currentUser} 
          allUsers={users}
          onUserSwitch={setCurrentUser}
          hiddenModules={hiddenModules}
        />`;

const replaceSidebar = `<Sidebar 
          activeTab={activeTab} 
          onTabChange={(tab) => { setActiveTab(tab); setIsSidebarOpen(false); }} 
          currentUser={currentUser} 
          allUsers={users}
          onUserSwitch={setCurrentUser}
          hiddenModules={hiddenModules}
          onLogout={handleLogout}
        />`;

if (app.includes(targetSidebar)) {
    app = app.replace(targetSidebar, replaceSidebar);
}
fs.writeFileSync('App.tsx', app);
