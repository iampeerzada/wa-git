import React, { useState, useRef, useMemo } from 'react';
import { MediaAsset, User } from '../types';
import { ImageIcon, Video, FileText, Plus, Trash2, Search, Link as LinkIcon, ExternalLink, Upload, Loader2 } from 'lucide-react';

interface MediaLibraryProps {
  currentUser: User;
  mediaAssets: MediaAsset[];
  setMediaAssets: React.Dispatch<React.SetStateAction<MediaAsset[]>>;
  apiBase: string;
}

const MediaLibrary: React.FC<MediaLibraryProps> = ({ currentUser, mediaAssets, setMediaAssets, apiBase }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fix: Explicitly type the formData state to allow 'image', 'video', or 'document' 
  // to avoid "Type '"image" | "video" | "document"' is not assignable to type '"image"'" errors.
  const [formData, setFormData] = useState<{ name: string; url: string; type: 'image' | 'video' | 'document' }>({ 
    name: '', 
    url: '', 
    type: 'image' 
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Increased limit to 100MB for enterprise video support
    const MAX_SIZE_MB = 100;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`File is too large. Max size allowed is ${MAX_SIZE_MB}MB.`);
      return;
    }

    setIsUploading(true);
    
    // We use a slight delay before processing to ensure UI 'isUploading' state 
    // triggers and shows the loader before the heavy base64 conversion blocks the thread.
    setTimeout(() => {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1];
          try {
            const res = await fetch(`${apiBase}/api/upload`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'X-User-ID': currentUser.id,
                'X-API-Key': currentUser.apiKey
              },
              body: JSON.stringify({
                fileName: file.name,
                fileType: file.type,
                base64: base64
              })
            });

            const data = await res.json();
            if (res.ok && data.url) {
              // Auto-detect type
              let detectedType: 'image' | 'video' | 'document' = 'document';
              if (file.type.startsWith('image/')) detectedType = 'image';
              else if (file.type.startsWith('video/')) detectedType = 'video';

              setFormData({
                name: file.name,
                url: data.url,
                type: detectedType
              });
              console.log("[Media] File processed and URL generated.");
            } else {
              alert("Upload failed: " + (data.error || "Server error"));
            }
          } catch (err) {
            alert("Upload failed. Check connection to backend.");
          } finally {
            setIsUploading(false);
          }
        };
        reader.readAsDataURL(file);
    }, 50);
  };

  const handleAddAsset = async () => {
    if (!formData.name || !formData.url) {
      alert("Please fill in all fields or upload a file");
      return;
    }

    const newAsset: MediaAsset = {
      id: `media_${Date.now()}`,
      name: formData.name,
      url: formData.url,
      type: formData.type,
      userId: currentUser.id,
      createdAt: new Date().toISOString()
    };

    try {
      const res = await fetch(`${apiBase}/api/media`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-ID': currentUser.id,
          'X-API-Key': currentUser.apiKey
        },
        body: JSON.stringify(newAsset)
      });

      if (res.ok) {
        setMediaAssets(prev => [newAsset, ...prev]);
        setIsAdding(false);
        setFormData({ name: '', url: '', type: 'image' });
        console.log("[Media] Asset persisted to database successfully.");
      } else {
        const err = await res.json();
        alert("Could not save to database: " + err.error);
      }
    } catch (err) {
      console.warn("Backend sync failed", err);
      alert("Database error. Media could not be saved.");
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (confirm("Permanently remove this asset from your library and database?")) {
      try {
        const res = await fetch(`${apiBase}/api/media/${id}`, {
          method: 'DELETE',
          headers: { 
            'X-User-ID': currentUser.id,
            'X-API-Key': currentUser.apiKey
          }
        });
        if (res.ok) {
          setMediaAssets(prev => prev.filter(a => a.id !== id));
        } else {
          alert("Failed to delete from database.");
        }
      } catch (err) {
        alert("Network error during deletion.");
      }
    }
  };

  const filteredAssets = useMemo(() => {
    return (mediaAssets || []).filter(a => 
      (currentUser.role === 'superadmin' || a.userId === currentUser.id) &&
      (a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.url.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [mediaAssets, currentUser.role, currentUser.id, searchQuery]);

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 pb-12 p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input 
            type="text"
            placeholder="Search media library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111b21] border border-gray-800 rounded-xl pl-9 pr-3.5 py-2 text-xs sm:text-sm focus:ring-1 ring-[#25D366]/50 outline-none transition-all text-white placeholder-gray-500"
          />
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-[#25D366] hover:bg-[#128c7e] text-[#0b141a] px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-green-500/10 cursor-pointer shrink-0"
        >
          <Plus size={16} />
          <span>Add Media</span>
        </button>
      </div>

      {isAdding && (
        <div className="bg-[#111b21] rounded-2xl border border-[#25D366]/30 p-4 sm:p-6 shadow-2xl animate-in fade-in slide-in-from-top-4 space-y-4">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <LinkIcon size={18} className="text-[#25D366]" />
            Register or Upload Media Asset
          </h3>
          
          <div className="p-4 sm:p-6 bg-[#0b141a] rounded-xl border border-dashed border-gray-700 flex flex-col items-center justify-center space-y-3">
             <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept="image/*,video/*,application/pdf"
             />
             <div className="w-10 h-10 bg-[#25D366]/10 rounded-full flex items-center justify-center text-[#25D366]">
                {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
             </div>
             <div className="text-center">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="text-[#25D366] text-xs sm:text-sm font-bold hover:underline cursor-pointer"
                >
                  {isUploading ? 'Processing file...' : 'Choose a file to upload'}
                </button>
                <p className="text-[10px] text-gray-500 uppercase mt-0.5">Images, Videos, or PDFs up to 100MB</p>
             </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[11px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Asset Name</label>
              <input 
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Product Catalog"
                className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white outline-none focus:ring-1 ring-[#25D366]/30"
              />
            </div>
            <div>
              <label className="block text-[11px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Media Type</label>
              <select 
                value={formData.type}
                onChange={(e) => setFormData(p => ({ ...p, type: e.target.value as any }))}
                className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white outline-none"
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="document">Document / PDF</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Direct URL</label>
              <input 
                type="text"
                value={formData.url}
                onChange={(e) => setFormData(p => ({ ...p, url: e.target.value }))}
                placeholder="https://example.com/file.jpg"
                className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white outline-none focus:ring-1 ring-[#25D366]/30"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2.5 pt-2">
            <button onClick={() => { setIsAdding(false); setFormData({name:'', url:'', type:'image'}); }} className="px-4 py-2 text-gray-400 hover:text-white font-bold text-xs sm:text-sm transition-all cursor-pointer">Cancel</button>
            <button 
              onClick={handleAddAsset} 
              disabled={isUploading}
              className="bg-[#25D366] text-[#0b141a] px-5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-green-500/10 transition-all cursor-pointer disabled:opacity-50"
            >
              Save to Library
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {filteredAssets.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-[#111b21] rounded-2xl border border-dashed border-gray-800">
            <ImageIcon size={36} className="mx-auto text-gray-600 mb-2" />
            <p className="text-xs sm:text-sm text-gray-400 font-medium">Your media library is empty.</p>
          </div>
        ) : (
          filteredAssets.map(asset => (
            <div key={asset.id} className="bg-[#111b21] rounded-xl sm:rounded-2xl border border-gray-800/80 overflow-hidden hover:border-gray-600 transition-all flex flex-col group shadow-md h-full">
              <div className="aspect-video bg-black/40 relative overflow-hidden flex items-center justify-center border-b border-gray-800/80">
                {asset.type === 'image' ? (
                  <img src={asset.url} alt={asset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : asset.type === 'video' ? (
                  <Video size={32} className="text-blue-500/50" />
                ) : (
                  <FileText size={32} className="text-gray-400/50" />
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <a href={asset.url} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all" title="View Full">
                    <ExternalLink size={14} />
                  </a>
                  <button onClick={() => handleDeleteAsset(asset.id)} className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full text-red-500 backdrop-blur-md transition-all cursor-pointer" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="p-2.5 sm:p-3 space-y-1.5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                     {asset.type === 'image' ? <ImageIcon size={12} className="text-[#25D366] shrink-0" /> : asset.type === 'video' ? <Video size={12} className="text-blue-400 shrink-0" /> : <FileText size={12} className="text-yellow-400 shrink-0" />}
                     <h4 className="font-bold text-white text-xs truncate" title={asset.name}>{asset.name}</h4>
                  </div>
                  <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-gray-500">
                     <span>{asset.type}</span>
                     <span className="font-mono text-[9px]">{asset.createdAt ? (() => {
                       const dateStr = String(asset.createdAt).trim();
                       const isoDate = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
                       const utcDateStr = isoDate.endsWith('Z') ? isoDate : isoDate + 'Z';
                       return new Date(utcDateStr).toLocaleDateString();
                     })() : 'N/A'}</span>
                  </div>
                </div>
                <div className="pt-1">
                  <code className="block text-[9px] sm:text-[10px] text-gray-400 truncate bg-black/30 p-1 sm:p-1.5 rounded-md border border-gray-800/60 font-mono" title={asset.url}>
                    {asset.url}
                  </code>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MediaLibrary;
