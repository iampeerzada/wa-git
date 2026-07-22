import React, { useState, useEffect } from 'react';
import { User, UserRole, Permission } from '../types';
import { Users, UserPlus, Shield, Key, Trash2, Edit2, Check, X, Lock } from 'lucide-react';

interface TeamManagerProps {
  currentUser: User;
  apiBase: string;
}

const TeamManager: React.FC<TeamManagerProps> = ({ currentUser, apiBase }) => {
  const [team, setTeam] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.TEAM_MEMBER);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  const availablePermissions = [
    { key: Permission.MANAGE_INSTANCES, label: 'Manage Instances' },
    { key: Permission.VIEW_CHATS, label: 'View & Reply Chats' },
    { key: Permission.SEND_BULK, label: 'Send Bulk Campaigns' },
    { key: Permission.MANAGE_AUTO_RESPONDER, label: 'Manage Auto-Responders' },
    { key: Permission.MANAGE_CONTACTS, label: 'Manage Contacts' },
    { key: Permission.MANAGE_TEMPLATES, label: 'Manage Templates' },
  ];

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/team`, {
        headers: { 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey }
      });
      if (res.ok) {
        setTeam(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setRole(UserRole.TEAM_MEMBER);
    setPermissions([]);
    setEditingUser(null);
    setShowModal(false);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setUsername(user.username);
    setEmail(user.email || '');
    setRole(user.role);
    setPermissions(user.permissions || []);
    setPassword(''); // Don't fill password
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!username || (!editingUser && !password)) {
        alert('Please fill required fields');
        return;
    }

    const payload: any = { username, email, role, permissions };
    if (password) payload.password = password;

    try {
      const url = editingUser ? `${apiBase}/api/team/${editingUser.id}` : `${apiBase}/api/team`;
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
            'Content-Type': 'application/json',
            'X-User-ID': currentUser.id, 
            'X-API-Key': currentUser.apiKey 
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        fetchTeam();
        resetForm();
      } else {
        const err = await res.json();
        alert(err.error || 'Operation failed');
      }
    } catch (e) {
      console.error(e);
      alert('Network error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;
    try {
      await fetch(`${apiBase}/api/team/${id}`, {
        method: 'DELETE',
        headers: { 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey }
      });
      setTeam(prev => prev.filter(u => u.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const togglePermission = (perm: Permission) => {
    setPermissions(prev => 
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="text-[#25D366]" />
            Team Management
          </h2>
          <p className="text-gray-400 text-sm mt-1">Manage access roles and permissions for your team members.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-[#25D366] hover:bg-[#128c7e] text-[#0b141a] px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
        >
          <UserPlus size={18} />
          Add Member
        </button>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-500 py-12">Loading team...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {team.map(user => (
            <div key={user.id} className="bg-[#111b21] border border-gray-800 rounded-xl p-6 relative group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-gray-300 font-bold text-lg">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-white font-bold">{user.username}</h3>
                    <p className="text-xs text-gray-500">{user.email || 'No Email'}</p>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(user)} className="p-2 bg-[#202c33] hover:bg-[#2a3942] rounded text-blue-400">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(user.id)} className="p-2 bg-[#202c33] hover:bg-[#2a3942] rounded text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${
                    user.role === UserRole.ADMIN ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}>
                    {user.role}
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] text-gray-500 uppercase font-bold">Permissions</p>
                <div className="flex flex-wrap gap-1">
                  {user.permissions && user.permissions.length > 0 ? (
                    user.permissions.map(p => (
                      <span key={p} className="text-[9px] bg-[#202c33] text-gray-300 px-2 py-0.5 rounded border border-gray-700">
                        {p.replace(/_/g, ' ')}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-gray-600 italic">No specific permissions</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {team.length === 0 && (
            <div className="col-span-full text-center py-12 bg-[#111b21] rounded-xl border border-gray-800 border-dashed">
                <Users size={48} className="mx-auto text-gray-700 mb-4" />
                <p className="text-gray-500">No team members found. Invite someone to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111b21] border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                {editingUser ? 'Edit Team Member' : 'Add New Member'}
              </h3>
              <button onClick={resetForm} className="text-gray-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username</label>
                    <input 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-[#202c33] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#25D366]"
                        placeholder="johndoe"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                    <input 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#202c33] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#25D366]"
                        placeholder="john@example.com"
                    />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    {editingUser ? 'New Password (Optional)' : 'Password'}
                </label>
                <div className="relative">
                    <Lock size={14} className="absolute left-3 top-3 text-gray-500" />
                    <input 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#202c33] border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-white text-sm outline-none focus:border-[#25D366]"
                        placeholder={editingUser ? "Leave blank to keep current" : "Secure password"}
                    />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Role</label>
                <div className="flex gap-4">
                    <label className={`flex-1 p-3 rounded-lg border cursor-pointer transition-all ${role === UserRole.TEAM_MEMBER ? 'bg-[#25D366]/10 border-[#25D366] text-white' : 'bg-[#202c33] border-gray-700 text-gray-400'}`}>
                        <input type="radio" className="hidden" checked={role === UserRole.TEAM_MEMBER} onChange={() => setRole(UserRole.TEAM_MEMBER)} />
                        <div className="font-bold text-sm mb-1">Team Member</div>
                        <div className="text-[10px] opacity-70">Restricted access based on permissions</div>
                    </label>
                    <label className={`flex-1 p-3 rounded-lg border cursor-pointer transition-all ${role === UserRole.ADMIN ? 'bg-purple-500/10 border-purple-500 text-white' : 'bg-[#202c33] border-gray-700 text-gray-400'}`}>
                        <input type="radio" className="hidden" checked={role === UserRole.ADMIN} onChange={() => setRole(UserRole.ADMIN)} />
                        <div className="font-bold text-sm mb-1">Admin</div>
                        <div className="text-[10px] opacity-70">Full access to all features</div>
                    </label>
                </div>
              </div>

              {role === UserRole.TEAM_MEMBER && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Access Control</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {availablePermissions.map(perm => (
                            <label key={perm.key} className={`flex items-center gap-3 p-2 rounded border cursor-pointer transition-all ${permissions.includes(perm.key) ? 'bg-blue-500/10 border-blue-500/50 text-white' : 'bg-[#202c33] border-gray-700 text-gray-400'}`}>
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${permissions.includes(perm.key) ? 'bg-blue-500 border-blue-500' : 'border-gray-600'}`}>
                                    {permissions.includes(perm.key) && <Check size={10} className="text-white" />}
                                </div>
                                <input type="checkbox" className="hidden" checked={permissions.includes(perm.key)} onChange={() => togglePermission(perm.key)} />
                                <span className="text-xs font-medium">{perm.label}</span>
                            </label>
                        ))}
                    </div>
                  </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-800 flex justify-end gap-3">
              <button onClick={resetForm} className="px-4 py-2 text-gray-400 hover:text-white text-sm font-bold">Cancel</button>
              <button onClick={handleSave} className="px-6 py-2 bg-[#25D366] hover:bg-[#128c7e] text-[#0b141a] rounded-lg text-sm font-bold">
                {editingUser ? 'Save Changes' : 'Create Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManager;
