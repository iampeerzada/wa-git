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

    const payload: any = { username, email, role: UserRole.TEAM_MEMBER, permissions };
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
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#25D366] shrink-0" />
            <span>Team Management</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">Manage access roles and permissions for your team members.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-[#25D366] hover:bg-[#128c7e] text-[#0b141a] px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-green-500/10 cursor-pointer shrink-0 w-full sm:w-auto"
        >
          <UserPlus size={16} />
          <span>Add Member</span>
        </button>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-400 py-12 text-xs sm:text-sm">Loading team...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {team.map(user => (
            <div key={user.id} className="bg-[#111b21] border border-gray-800 rounded-2xl p-4 sm:p-6 relative group shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#202c33] rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base shrink-0 border border-gray-700/50">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-white font-bold text-sm sm:text-base truncate">{user.username}</h3>
                    <p className="text-xs text-gray-400 truncate">{user.email || 'No Email'}</p>
                  </div>
                </div>
                <div className="flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                  <button onClick={() => handleEdit(user)} className="p-1.5 bg-[#202c33] hover:bg-[#2a3942] rounded-lg text-blue-400 cursor-pointer" title="Edit">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(user.id)} className="p-1.5 bg-[#202c33] hover:bg-[#2a3942] rounded-lg text-red-400 cursor-pointer" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="mb-3">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                    user.role === UserRole.ADMIN ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}>
                    {user.role}
                </span>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Permissions</p>
                <div className="flex flex-wrap gap-1">
                  {user.permissions && user.permissions.length > 0 ? (
                    user.permissions.map(p => (
                      <span key={p} className="text-[9px] sm:text-[10px] bg-[#202c33] text-gray-300 px-2 py-0.5 rounded-md border border-gray-700/60">
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
            <div className="col-span-full text-center py-8 sm:py-12 px-4 bg-[#111b21] rounded-2xl border border-gray-800 border-dashed my-2">
                <Users size={36} className="mx-auto text-gray-600 mb-3 sm:w-12 sm:h-12" />
                <p className="text-xs sm:text-sm text-gray-400">No team members found. Invite someone to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111b21] border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-gray-800 flex justify-between items-center z-10 bg-[#111b21]">
              <h3 className="font-bold text-base sm:text-lg text-white">
                {editingUser ? 'Edit Team Member' : 'Add New Member'}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-gray-400 uppercase mb-1">Username</label>
                    <input 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-white text-xs sm:text-sm outline-none focus:border-[#25D366]"
                        placeholder="johndoe"
                    />
                </div>
                <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-gray-400 uppercase mb-1">Email</label>
                    <input 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-white text-xs sm:text-sm outline-none focus:border-[#25D366]"
                        placeholder="john@example.com"
                    />
                </div>
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-gray-400 uppercase mb-1">
                    {editingUser ? 'New Password (Optional)' : 'Password'}
                </label>
                <div className="relative">
                    <Lock size={14} className="absolute left-3 top-3 text-gray-500" />
                    <input 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#202c33] border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-white text-xs sm:text-sm outline-none focus:border-[#25D366]"
                        placeholder={editingUser ? "Leave blank to keep current" : "Secure password"}
                    />
                </div>
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-gray-400 uppercase mb-2">Access Control</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availablePermissions.map(perm => (
                        <label key={perm.key} className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${permissions.includes(perm.key) ? 'bg-blue-500/10 border-blue-500/50 text-white' : 'bg-[#202c33] border-gray-700 text-gray-400'}`}>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${permissions.includes(perm.key) ? 'bg-blue-500 border-blue-500' : 'border-gray-600'}`}>
                                {permissions.includes(perm.key) && <Check size={10} className="text-white" />}
                            </div>
                            <input type="checkbox" className="hidden" checked={permissions.includes(perm.key)} onChange={() => togglePermission(perm.key)} />
                            <span className="text-xs font-medium">{perm.label}</span>
                        </label>
                    ))}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-gray-800 flex justify-end gap-3 bg-[#111b21]">
              <button onClick={resetForm} className="px-4 py-2 text-gray-400 hover:text-white text-xs sm:text-sm font-bold cursor-pointer">Cancel</button>
              <button onClick={handleSave} className="px-5 py-2 bg-[#25D366] hover:bg-[#128c7e] text-black rounded-xl text-xs sm:text-sm font-bold cursor-pointer shadow-md shadow-green-500/10">
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
