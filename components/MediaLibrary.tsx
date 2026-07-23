import React, { useState, useRef } from 'react';
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

  const filteredAssets = mediaAssets.filter(a => 
    (currentUser.role === 'superadmin' || a.userId === currentUser.id) &&
    (a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.url.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex justify-between items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text"
            placeholder="Search your media library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111b21] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 ring-[#25D366]/50 outline-none transition-all"
          />
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-[#25D366] hover:bg-[#128c7e] text-[#0b141a] px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-green-500/10"
        >
          <Plus size={18} />
          Add Media
        </button>
      </div>

      {isAdding && (
        <div className="bg-[#111b21] rounded-2xl border border-[#25D366]/30 p-8 shadow-2xl animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
            <LinkIcon size={20} className="text-[#25D366]" />
            Register or Upload Media Asset
          </h3>
          
          <div className="mb-8 p-6 bg-[#0b141a] rounded-2xl border border-dashed border-gray-700 flex flex-col items-center justify-center space-y-4">
             <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept="image/*,video/*,application/pdf"
             />
             <div className="w-12 h-12 bg-[#25D366]/10 rounded-full flex items-center justify-center text-[#25D366]">
                {isUploading ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} />}
             </div>
             <div className="text-center">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="text-[#25D366] font-bold hover:underline"
                >
                  {isUploading ? 'Processing large file...' : 'Choose a file to upload'}
                </button>
                <p className="text-[10px] text-gray-500 uppercase mt-1">Images, Videos, or PDFs up to 100MB</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Asset Name</label>
              <input 
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Product Catalog Image"
                className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-1 ring-[#25D366]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Media Type</label>
              <select 
                value={formData.type}
                onChange={(e) => setFormData(p => ({ ...p, type: e.target.value as any }))}
                className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none"
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="document">Document / PDF</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Direct URL (or result of upload)</label>
              <input 
                type="text"
                value={formData.url}
                onChange={(e) => setFormData(p => ({ ...p, url: e.target.value }))}
                placeholder="https://example.com/file.jpg"
                className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-1 ring-[#25D366]/30"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-8">
            <button onClick={() => { setIsAdding(false); setFormData({name:'', url:'', type:'image'}); }} className="px-4 py-2 md:px-6 md:py-2.5 text-gray-400 hover:text-white font-bold transition-all">Cancel</button>
            <button 
              onClick={handleAddAsset} 
              disabled={isUploading}
              className="bg-[#25D366] text-[#0b141a] px-8 py-2.5 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-green-500/10 transition-all active:scale-95 disabled:opacity-50"
            >
              Save to Library
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredAssets.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-[#111b21] rounded-2xl border border-dashed border-gray-800">
            <ImageIcon size={48} className="mx-auto text-gray-700 mb-4" />
            <p className="text-gray-500 font-medium">Your media library is empty.</p>
          </div>
        ) : (
          filteredAssets.map(asset => (
            <div key={asset.id} className="bg-[#111b21] rounded-2xl border border-gray-800 overflow-hidden hover:border-gray-600 transition-all flex flex-col group shadow-xl h-full">
              <div className="aspect-video bg-black/40 relative overflow-hidden flex items-center justify-center border-b border-gray-800">
                {asset.type === 'image' ? (
                  <img src={asset.url} alt={asset.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : asset.type === 'video' ? (
                  <Video size={48} className="text-blue-500/30" />
                ) : (
                  <FileText size={48} className="text-gray-500/30" />
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <a href={asset.url} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all">
                    <ExternalLink size={20} />
                  </a>
                  <button onClick={() => handleDeleteAsset(asset.id)} className="p-3 bg-red-500/20 hover:bg-red-500/40 rounded-full text-red-500 backdrop-blur-md transition-all">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                   {asset.type === 'image' ? <ImageIcon size={14} className="text-[#25D366]" /> : asset.type === 'video' ? <Video size={14} className="text-blue-400" /> : <FileText size={14} className="text-yellow-400" />}
                   <h4 className="font-bold text-white text-sm truncate">{asset.name}</h4>
                </div>
                <div className="flex items-center justify-between text-[10px] uppercase font-black tracking-widest text-gray-500">
                   <span>{asset.type}</span>
                   <span className="font-mono">{asset.createdAt ? (() => {
                     const dateStr = String(asset.createdAt).trim();
                     const isoDate = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
                     const utcDateStr = isoDate.endsWith('Z') ? isoDate : isoDate + 'Z';
                     return new Date(utcDateStr).toLocaleDateString();
                   })() : 'N/A'}</span>
                </div>
                <div className="pt-2">
                  <code className="block text-[10px] text-gray-600 truncate bg-black/20 p-1.5 rounded-lg border border-gray-800/50">
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
