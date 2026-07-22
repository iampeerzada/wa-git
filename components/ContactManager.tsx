
import React, { useState } from 'react';
import { ContactGroup, Contact, User } from '../types';
import { Users, Plus, Trash2, Search, Upload, FileText, CheckCircle2, XCircle, AlertCircle, Save, Loader2 } from 'lucide-react';

interface ContactManagerProps {
  contactGroups: ContactGroup[];
  setContactGroups: React.Dispatch<React.SetStateAction<ContactGroup[]>>;
  currentUser: User;
  apiBase: string;
}

const ContactManager: React.FC<ContactManagerProps> = ({ contactGroups, setContactGroups, currentUser, apiBase }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [rawContacts, setRawContacts] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleImport = async () => {
    if (!newGroupName.trim()) {
      alert("Please enter a group name.");
      return;
    }

    if (!rawContacts.trim()) {
      alert("Please paste contact numbers.");
      return;
    }

    setIsSaving(true);
    
    // Split and clean numbers - ensure we only process strings with actual content
    const lines = rawContacts.split(/[\n,]+/)
      .map(n => n.trim())
      .filter(n => n.length >= 7); // Minimum length for a valid phone number with CC
    
    const uniqueLines = Array.from(new Set(lines));

    if (uniqueLines.length === 0) {
      alert("No valid phone numbers found. Ensure numbers include country codes and are longer than 6 digits.");
      setIsSaving(false);
      return;
    }

    // Prepare local object
    const importedContacts: Contact[] = uniqueLines.map(num => ({
      id: `c_${Math.random().toString(36).substring(7)}_${Date.now()}`,
      number: num.replace(/\D/g, ''),
      original: num,
      isVerified: true,
      exists: true // Default to true for imported verified lists
    }));

    const newGroup: ContactGroup = {
      id: `cg_${Date.now()}`,
      name: newGroupName.trim(),
      contacts: importedContacts,
      createdAt: new Date().toISOString()
    };

    try {
      // POST to backend for permanent persistence
      const res = await fetch(`${apiBase}/api/contacts/groups`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-ID': currentUser.id,
          'X-API-Key': currentUser.apiKey,
          'X-Role': currentUser.role // Added for complete authentication context
        },
        body: JSON.stringify(newGroup)
      });

      const result = await res.json();

      if (res.ok && result.success) {
        // CRITICAL: Synchronize with the server's version of the group.
        // This ensures that when App.tsx polls the backend 5 seconds later,
        // the data in local state matches exactly what is in the DB.
        const persistedGroup = result.group || newGroup;
        
        setContactGroups(prev => [persistedGroup, ...prev]);
        
        // Reset state
        setIsAdding(false);
        setNewGroupName('');
        setRawContacts('');
        console.log(`[Contacts] Successfully saved group "${newGroup.name}" with ${importedContacts.length} contacts.`);
      } else {
        const errorMsg = result.error || "Server failed to save the contacts group.";
        alert(`Failed to save: ${errorMsg}`);
        console.error("[Contacts] Backend Error:", result);
      }
    } catch (err) {
      console.error("[Contacts] Network Error:", err);
      alert("Network Error: Could not reach the API. Please check your internet connection and server status.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (confirm("Permanently delete this contact group from the database? This cannot be undone.")) {
      try {
        const res = await fetch(`${apiBase}/api/contacts/groups/${id}`, {
          method: 'DELETE',
          headers: { 
            'X-User-ID': currentUser.id,
            'X-API-Key': currentUser.apiKey,
            'X-Role': currentUser.role
          }
        });
        if (res.ok) {
          setContactGroups(prev => prev.filter(g => g.id !== id));
        } else {
          alert("Could not delete from database. The group might already be deleted or permission was denied.");
        }
      } catch (err) {
        alert("Network error during deletion. Check server status.");
      }
    }
  };

  const filteredGroups = (contactGroups || []).filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex justify-between items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text"
            placeholder="Search saved contact groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111b21] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 ring-[#25D366]/50 outline-none transition-all"
          />
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-[#25D366] hover:bg-[#128c7e] text-[#0b141a] px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-green-500/10 active:scale-95"
        >
          <Plus size={18} />
          Import New List
        </button>
      </div>

      {isAdding && (
        <div className="bg-[#111b21] rounded-2xl border border-[#25D366]/30 p-8 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
            <Upload size={20} className="text-[#25D366]" />
            Import & Persist Contact Group
          </h3>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Group Name</label>
              <input 
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Bulk Clients - Jan 2024"
                className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 ring-[#25D366]/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Contacts (Numbers only, one per line or comma separated)</label>
              <textarea 
                value={rawContacts}
                onChange={(e) => setRawContacts(e.target.value)}
                rows={8}
                placeholder="919876543210&#10;918877665544"
                className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-4 py-3 text-white font-mono text-sm outline-none resize-none focus:ring-1 ring-[#25D366]/30 transition-all"
              />
              <p className="mt-2 text-[10px] text-gray-500 uppercase font-black flex items-center gap-2">
                <AlertCircle size={12} className="text-yellow-500" /> These will be saved permanently to your secure account database for reuse in campaigns.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button 
                onClick={() => setIsAdding(false)} 
                disabled={isSaving}
                className="px-6 py-2.5 text-gray-400 hover:text-white font-bold transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleImport}
                disabled={isSaving}
                className="bg-[#25D366] text-[#0b141a] px-8 py-2.5 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-green-500/10 flex items-center gap-2 disabled:opacity-50 hover:bg-[#128c7e] transition-all"
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {isSaving ? 'Persisting to DB...' : 'Save Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGroups.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-[#111b21] rounded-2xl border border-dashed border-gray-800">
            <Users size={48} className="mx-auto text-gray-700 mb-4" />
            <p className="text-gray-500 font-medium">No contact groups found in the system database.</p>
          </div>
        ) : (
          filteredGroups.map(group => (
            <div key={group.id} className="bg-[#111b21] border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-all flex flex-col group shadow-xl hover:shadow-2xl">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#25D366]/10 rounded-xl flex items-center justify-center text-[#25D366]">
                    <Users size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white group-hover:text-[#25D366] transition-colors">{group.name}</h4>
                    <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
                        {group.createdAt ? (() => {
                          const dateStr = String(group.createdAt).trim();
                          const isoDate = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
                          const utcDateStr = isoDate.endsWith('Z') ? isoDate : isoDate + 'Z';
                          return new Date(utcDateStr).toLocaleDateString();
                        })() : 'N/A'}
                    </span>
                  </div>
                </div>
                <button onClick={() => handleDeleteGroup(group.id)} className="p-2 text-gray-600 hover:text-red-500 transition-colors bg-[#0b141a] rounded-lg border border-gray-800">
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-black/20 p-3 rounded-xl border border-gray-800">
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-tighter">Total Entries</p>
                    <p className="text-lg font-bold text-white">{(group.contacts || []).length}</p>
                  </div>
                  <div className="bg-green-500/5 p-3 rounded-xl border border-green-500/10">
                    <p className="text-[10px] text-green-500/60 font-black uppercase tracking-tighter">Verified Reach</p>
                    <p className="text-lg font-bold text-[#25D366]">{(group.contacts || []).filter(c => c.exists).length}</p>
                  </div>
                </div>

                <div className="bg-black/40 rounded-xl p-3 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800">
                  <div className="space-y-2">
                    {(group.contacts && group.contacts.length > 0) ? (
                      group.contacts.slice(0, 8).map(c => (
                        <div key={c.id} className="flex items-center justify-between text-xs font-mono">
                          <span className="text-gray-400">+{c.number}</span>
                          {c.exists ? <CheckCircle2 size={12} className="text-[#25D366]" /> : <XCircle size={12} className="text-red-500" />}
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-gray-600 italic text-center py-2">No contacts saved in this group.</p>
                    )}
                    {(group.contacts || []).length > 8 && (
                      <p className="text-[10px] text-center text-gray-600 font-bold uppercase pt-2 border-t border-gray-800/50">+{(group.contacts || []).length - 8} additional contacts</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-800 flex gap-2">
                <button className="flex-1 bg-[#2a3942] hover:bg-[#32444f] text-white py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-widest">
                  View All
                </button>
                <button className="flex-1 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-widest">
                  Export CSV
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ContactManager;
