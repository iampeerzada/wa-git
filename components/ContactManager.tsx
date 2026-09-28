
import React, { useState, useMemo } from 'react';
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

  const filteredGroups = useMemo(() => {
    return (contactGroups || []).filter(g => 
      g.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [contactGroups, searchQuery]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-6">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input 
            type="text"
            placeholder="Search saved contact groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111b21] border border-gray-800 rounded-xl pl-9 pr-3 py-2 sm:py-2.5 text-xs sm:text-sm focus:ring-1 ring-[#25D366]/50 outline-none transition-all"
          />
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-[#25D366] hover:bg-[#128c7e] text-[#0b141a] px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold sm:font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-green-500/10 active:scale-95 whitespace-nowrap cursor-pointer"
        >
          <Plus size={16} />
          <span>Import New List</span>
        </button>
      </div>

      {isAdding && (
        <div className="bg-[#111b21] rounded-2xl border border-[#25D366]/30 p-4 sm:p-6 md:p-8 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-sm sm:text-base md:text-lg font-bold text-white mb-4 sm:mb-6 flex items-center gap-2.5">
            <Upload size={18} className="text-[#25D366]" />
            Import & Persist Contact Group
          </h3>
          <div className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Group Name</label>
              <input 
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Bulk Clients - Jan 2024"
                className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none focus:ring-1 ring-[#25D366]/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Contacts (Numbers only, one per line or comma separated)</label>
              <textarea 
                value={rawContacts}
                onChange={(e) => setRawContacts(e.target.value)}
                rows={6}
                placeholder="919876543210&#10;918877665544"
                className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono outline-none resize-none focus:ring-1 ring-[#25D366]/30 transition-all"
              />
              <p className="mt-2 text-[10px] text-gray-500 font-medium flex items-center gap-1.5">
                <AlertCircle size={12} className="text-yellow-500 shrink-0" /> Saved permanently to your secure account database for reuse in campaigns.
              </p>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button 
                onClick={() => setIsAdding(false)} 
                disabled={isSaving}
                className="px-3.5 py-2 text-xs sm:text-sm text-gray-400 hover:text-white font-semibold transition-all disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleImport}
                disabled={isSaving}
                className="bg-[#25D366] text-[#0b141a] px-5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-green-500/10 flex items-center gap-1.5 disabled:opacity-50 hover:bg-[#128c7e] transition-all cursor-pointer"
              >
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {isSaving ? 'Saving...' : 'Save Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredGroups.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-[#111b21] rounded-2xl border border-dashed border-gray-800">
            <Users size={40} className="mx-auto text-gray-700 mb-3" />
            <p className="text-xs sm:text-sm text-gray-500 font-medium">No contact groups found in the system database.</p>
          </div>
        ) : (
          filteredGroups.map(group => (
            <div key={group.id} className="bg-[#111b21] border border-gray-800 rounded-2xl p-4 sm:p-6 hover:border-gray-700 transition-all flex flex-col group shadow-xl hover:shadow-2xl">
              <div className="flex justify-between items-start mb-3 sm:mb-4">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#25D366]/10 rounded-xl flex items-center justify-center text-[#25D366] shrink-0">
                    <Users size={18} className="sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-sm sm:text-base group-hover:text-[#25D366] transition-colors truncate">{group.name}</h4>
                    <span className="text-[10px] text-gray-500 font-mono tracking-wider">
                        {group.createdAt ? (() => {
                          const dateStr = String(group.createdAt).trim();
                          const isoDate = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
                          const utcDateStr = isoDate.endsWith('Z') ? isoDate : isoDate + 'Z';
                          return new Date(utcDateStr).toLocaleDateString();
                        })() : 'N/A'}
                    </span>
                  </div>
                </div>
                <button onClick={() => handleDeleteGroup(group.id)} className="p-1.5 sm:p-2 text-gray-600 hover:text-red-500 transition-colors bg-[#0b141a] rounded-lg border border-gray-800 cursor-pointer shrink-0">
                  <Trash2 size={14} className="sm:w-4 sm:h-4" />
                </button>
              </div>
              
              <div className="flex-1 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-black/20 p-2.5 sm:p-3 rounded-xl border border-gray-800">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Total Entries</p>
                    <p className="text-base sm:text-lg font-bold text-white">{group.contacts?.length || 0}</p>
                  </div>
                  <div className="bg-green-500/5 p-2.5 sm:p-3 rounded-xl border border-green-500/10">
                    <p className="text-[10px] text-green-500/70 font-bold uppercase tracking-tight">Verified Reach</p>
                    <p className="text-base sm:text-lg font-bold text-[#25D366]">{group.contacts?.filter(c => c.exists)?.length || 0}</p>
                  </div>
                </div>

                <div className="bg-black/40 rounded-xl p-2.5 sm:p-3 max-h-36 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800">
                  <div className="space-y-1.5">
                    {(group.contacts && group.contacts.length > 0) ? (
                      group.contacts.slice(0, 8).map(c => (
                        <div key={c.id} className="flex items-center justify-between text-[11px] sm:text-xs font-mono">
                          <span className="text-gray-400">+{c.number}</span>
                          {c.exists ? <CheckCircle2 size={12} className="text-[#25D366]" /> : <XCircle size={12} className="text-red-500" />}
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-gray-600 italic text-center py-1">No contacts saved in this group.</p>
                    )}
                    {(group.contacts || []).length > 8 && (
                      <p className="text-[10px] text-center text-gray-600 font-semibold pt-1.5 border-t border-gray-800/50">+{(group.contacts || []).length - 8} additional contacts</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-800 flex gap-2">
                <button className="flex-1 bg-[#2a3942] hover:bg-[#32444f] text-white py-2 rounded-xl text-xs font-semibold sm:font-bold transition-all tracking-wide cursor-pointer">
                  View All
                </button>
                <button className="flex-1 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] py-2 rounded-xl text-xs font-semibold sm:font-bold transition-all tracking-wide cursor-pointer">
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
