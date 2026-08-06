const fs = require('fs');
let code = fs.readFileSync('components/Sidebar.tsx', 'utf8');

const targetSwitcher = `      {/* Role Switcher for Demo Purposes */}
      <div className="p-3 lg:p-4 border-t border-gray-800 bg-[#0b141a]/50">
        <div className="space-y-2 lg:space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Simulate Role</span>
            <ShieldCheck size={12} className="text-gray-600" />
          </div>
          <select 
            value={currentUser.id}
            onChange={(e) => {
              const user = allUsers.find(u => u.id === e.target.value);
              if (user) onUserSwitch(user);
            }}
            className="w-full bg-[#202c33] border border-gray-700 rounded-lg px-2 py-1.5 lg:px-3 lg:py-2 text-[10px] lg:text-xs text-white focus:ring-1 ring-[#25D366] outline-none"
          >
            {allUsers.map(u => (
              <option key={u.id} value={u.id}>{u.role.toUpperCase()}: {u.username}</option>
            ))}
          </select>
        </div>
      </div>`;

const replaceSwitcher = `      {/* Role Switcher for Demo Purposes */}
      {(authenticatedUser?.role === UserRole.SUPERADMIN || currentUser.role === UserRole.SUPERADMIN) && allUsers.length > 0 && (
      <div className="p-3 lg:p-4 border-t border-gray-800 bg-[#0b141a]/50">
        <div className="space-y-2 lg:space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Switch User Role</span>
            <ShieldCheck size={12} className="text-gray-600" />
          </div>
          <select 
            value={currentUser.id}
            onChange={(e) => {
              const user = allUsers.find(u => u.id === e.target.value);
              if (user) onUserSwitch(user);
            }}
            className="w-full bg-[#202c33] border border-gray-700 rounded-lg px-2 py-1.5 lg:px-3 lg:py-2 text-[10px] lg:text-xs text-white focus:ring-1 ring-[#25D366] outline-none"
          >
            {allUsers.map(u => (
              <option key={u.id} value={u.id}>{u.role.toUpperCase()}: {u.username}</option>
            ))}
          </select>
        </div>
      </div>
      )}`;

if (code.includes(targetSwitcher)) {
    code = code.replace(targetSwitcher, replaceSwitcher);
    console.log("Patched Switcher Condition");
} else {
    console.log("Failed to find targetSwitcher");
}

fs.writeFileSync('components/Sidebar.tsx', code);
