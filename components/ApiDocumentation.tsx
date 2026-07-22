
import React, { useState } from 'react';
import { 
  Copy, Check, Shield, Globe, Terminal, Box, 
  Image as ImageIcon, MessageCircle, Settings, 
  Smartphone, Key, Layers, Users, Zap, Search, 
  ChevronRight, ExternalLink, Code2, Lock, Download
} from 'lucide-react';
import { WhatsAppInstance, User } from '../types';

interface ApiDocumentationProps {
  instances: WhatsAppInstance[];
  currentUser: User;
  apiBase: string;
}

const ApiDocumentation: React.FC<ApiDocumentationProps> = ({ instances, currentUser, apiBase }) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>(instances[0]?.id || 'YOUR_INSTANCE_ID');
  const [activeSearch, setActiveSearch] = useState('');

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadFullDoc = () => {
    const docContent = `# iFastX WA Gateway API Documentation v2.0

## Production Base URL
\`${apiBase}\`

## Authentication
All API requests must include your private API Key.

### Header Authentication (Recommended)
\`X-API-Key: ${currentUser.apiKey}\`

### Query Parameter Authentication
\`?access_token=${currentUser.apiKey}\`

## 1. Instance Management

### GET /api/instances
Retrieve a list of all your active and pending WhatsApp instances.

### POST /api/create
Provision a new WhatsApp instance.
**Body:**
\`\`\`json
{ "name": "Marketing_Channel_1" }
\`\`\`

### DELETE /api/instance/{instanceId}
Permanently delete an instance and wipe session data.

## 2. Unified Messaging

### POST /api/send (Standard Text)
**Body:**
\`\`\`json
{
  "instanceId": "${selectedInstanceId}",
  "number": "919876543210",
  "message": "Hello world! This is a secure REST API message."
}
\`\`\`

### POST /api/send (Media Message)
**Body:**
\`\`\`json
{
  "instanceId": "${selectedInstanceId}",
  "number": "919876543210",
  "message": "Look at this presentation!",
  "mediaUrl": "https://example.com/assets/report.pdf",
  "mediaType": "document"
}
\`\`\`

### POST /api/send (Interactive Buttons)
**Body:**
\`\`\`json
{
  "instanceId": "${selectedInstanceId}",
  "number": "919876543210",
  "message": "Choose your next action:",
  "buttons": [
    { "type": "url", "displayText": "Visit Website", "url": "https://ifastx.in" },
    { "type": "call", "displayText": "Support Team", "phoneNumber": "910000000000" },
    { "type": "reply", "displayText": "Schedule Demo", "id": "demo_req_01" }
  ],
  "options": { "header": "Enterprise Solutions", "footer": "Verified Gateway", "simulateTyping": true }
}
\`\`\`

## 3. CRM & Contacts

### GET /api/contacts/groups
List all contact groups associated with your profile.

### POST /api/check-number
Verify if a number exists on WhatsApp before sending.
**Body:**
\`\`\`json
{ "instanceId": "${selectedInstanceId}", "number": "919876543210" }
\`\`\`

## 4. Webhooks

### Inbound Message Payload
\`\`\`json
{
  "event": "message.received",
  "instanceId": "${selectedInstanceId}",
  "data": {
    "from": "919876543210@s.whatsapp.net",
    "pushName": "John Smith",
    "text": "How much for the yearly plan?",
    "timestamp": ${Math.floor(Date.now() / 1000)}
  }
}
\`\`\`

---
© 2025 iFastX Technologies Pvt Ltd. All rights reserved.`;

    const blob = new Blob([docContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'iFastX_API_Documentation_v2.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectedInstance = instances.find(i => i.id === selectedInstanceId);
  const displayInstanceId = selectedInstanceId;

  const sections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <Zap size={20} className="text-[#25D366]" />,
      content: (
        <div className="space-y-6">
          <p className="text-gray-400 text-sm leading-relaxed">
            Welcome to the <span className="text-white font-bold">iFastX WA Gateway</span> API reference. 
            Our REST API allows you to programmatically manage WhatsApp instances, send messages, and monitor delivery status.
          </p>
          <div className="bg-[#202c33] border-l-4 border-[#25D366] p-4 rounded-r-xl">
            <h4 className="text-xs font-black text-[#25D366] uppercase mb-1">Production Base URL</h4>
            <code className="text-sm font-mono text-white select-all">{apiBase}</code>
          </div>
        </div>
      )
    },
    {
      id: 'authentication',
      title: 'Authentication',
      icon: <Lock size={20} className="text-blue-400" />,
      content: (
        <div className="space-y-6">
          <p className="text-gray-400 text-sm">
            All API requests must include your private API Key. You can use either the <span className="text-white font-bold">Headers</span> method (recommended) or <span className="text-white font-bold">Query Parameters</span>.
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="p-5 bg-[#202c33] rounded-2xl border border-gray-700 relative group transition-all hover:border-[#25D366]/30">
              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Header Authentication</h4>
              <div className="flex items-center justify-between gap-3 bg-black/30 p-3 rounded-xl border border-gray-800">
                <code className="text-[#25D366] text-[11px] font-mono truncate">X-API-Key: {currentUser.apiKey}</code>
                <button onClick={() => handleCopy(currentUser.apiKey, 'auth-h')} className="text-gray-500 hover:text-white transition-colors shrink-0">
                  {copied === 'auth-h' ? <Check size={14} className="text-[#25D366]" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <div className="p-5 bg-[#202c33] rounded-2xl border border-gray-700 relative group transition-all hover:border-blue-400/30">
              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Query Param Authentication</h4>
              <div className="flex items-center justify-between gap-3 bg-black/30 p-3 rounded-xl border border-gray-800">
                <code className="text-blue-400 text-[11px] font-mono truncate">?access_token={currentUser.apiKey}</code>
                <button onClick={() => handleCopy(`?access_token=${currentUser.apiKey}`, 'auth-q')} className="text-gray-500 hover:text-white transition-colors shrink-0">
                  {copied === 'auth-q' ? <Check size={14} className="text-blue-400" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'instances',
      title: 'Instance Management',
      icon: <Settings size={20} className="text-purple-400" />,
      content: (
        <div className="space-y-8">
          <EndpointInfo 
            method="GET" 
            path="/api/instances" 
            description="Retrieve a list of all your active and pending WhatsApp instances."
            apiBase={apiBase}
            apiKey={currentUser.apiKey}
          />
          <EndpointInfo 
            method="POST" 
            path="/api/create" 
            description="Provision a new WhatsApp instance. Returns an ID for session initialization."
            body={{ name: "Marketing_Channel_1" }}
            apiBase={apiBase}
            apiKey={currentUser.apiKey}
          />
          <EndpointInfo 
            method="DELETE" 
            path={`/api/instance/${displayInstanceId}`} 
            description="Permanently delete an instance and wipe session data."
            apiBase={apiBase}
            apiKey={currentUser.apiKey}
          />
        </div>
      )
    },
    {
      id: 'messaging',
      title: 'Unified Messaging',
      icon: <MessageCircle size={20} className="text-[#25D366]" />,
      content: (
        <div className="space-y-8">
          <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl mb-6">
             <p className="text-xs text-blue-400 leading-relaxed font-medium">
               The <code className="bg-blue-400/10 px-1.5 py-0.5 rounded">/api/send</code> endpoint is a high-performance entry point that automatically handles queuing, rate-limiting, and binary serialization for interactive components.
             </p>
          </div>

          <EndpointInfo 
            method="POST" 
            path="/api/send" 
            description="Standard Text Message"
            body={{
              instanceId: displayInstanceId,
              number: "919876543210",
              message: "Hello world! This is a secure REST API message."
            }}
            apiBase={apiBase}
            apiKey={currentUser.apiKey}
          />

          <EndpointInfo 
            method="POST" 
            path="/api/send" 
            description="Media Message (Image/Video/Doc)"
            body={{
              instanceId: displayInstanceId,
              number: "919876543210",
              message: "Look at this presentation!",
              mediaUrl: "https://example.com/assets/report.pdf",
              mediaType: "document"
            }}
            apiBase={apiBase}
            apiKey={currentUser.apiKey}
          />

          <EndpointInfo 
            method="POST" 
            path="/api/send" 
            description="Native Flow Interactive Buttons (2025 Meta Standard)"
            body={{
              instanceId: displayInstanceId,
              number: "919876543210",
              message: "Choose your next action:",
              buttons: [
                { type: "url", displayText: "Visit Website", url: "https://ifastx.in" },
                { type: "call", displayText: "Support Team", phoneNumber: "910000000000" },
                { type: "reply", displayText: "Schedule Demo", id: "demo_req_01" }
              ],
              options: { header: "Enterprise Solutions", footer: "Verified Gateway", simulateTyping: true }
            }}
            apiBase={apiBase}
            apiKey={currentUser.apiKey}
          />
        </div>
      )
    },
    {
      id: 'contacts',
      title: 'CRM & Contacts',
      icon: <Users size={20} className="text-orange-400" />,
      content: (
        <div className="space-y-8">
          <EndpointInfo 
            method="GET" 
            path="/api/contacts/groups" 
            description="List all contact groups associated with your profile."
            apiBase={apiBase}
            apiKey={currentUser.apiKey}
          />
          <EndpointInfo 
            method="POST" 
            path="/api/check-number" 
            description="Verify if a number exists on WhatsApp before sending."
            body={{ instanceId: displayInstanceId, number: "919876543210" }}
            apiBase={apiBase}
            apiKey={currentUser.apiKey}
          />
        </div>
      )
    },
    {
      id: 'webhooks',
      title: 'Webhooks',
      icon: <Globe size={20} className="text-teal-400" />,
      content: (
        <div className="space-y-6">
          <p className="text-gray-400 text-sm">
            Configure your callback URL to receive real-time updates for incoming messages, delivery reports, and instance status changes.
          </p>
          <div className="space-y-4">
            <div className="p-5 bg-[#202c33] border border-gray-700 rounded-2xl">
              <h4 className="text-xs font-black text-white uppercase mb-4 flex items-center gap-2">
                <Smartphone size={14} className="text-[#25D366]" />
                Inbound Message Payload
              </h4>
              <CodeBlock 
                id="webhook-sample"
                language="JSON Webhook"
                code={JSON.stringify({
                  event: "message.received",
                  instanceId: displayInstanceId,
                  data: {
                    from: "919876543210@s.whatsapp.net",
                    pushName: "John Smith",
                    text: "How much for the yearly plan?",
                    timestamp: Math.floor(Date.now() / 1000)
                  }
                }, null, 2)}
                onCopy={handleCopy}
                copied={copied}
              />
            </div>
          </div>
        </div>
      )
    }
  ];

  const filteredSections = sections.filter(s => 
    s.title.toLowerCase().includes(activeSearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">
      {/* Dynamic Context Header */}
      <div className="sticky top-0 z-50 bg-[#0b141a]/95 backdrop-blur-xl border-b border-gray-800 pb-6 mb-10 pt-4 -mx-4 px-4 rounded-b-3xl shadow-2xl">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#25D366]/10 rounded-2xl flex items-center justify-center text-[#25D366] border border-[#25D366]/20">
              <Code2 size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">API Reference <span className="text-[#25D366]">v2.0</span></h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 bg-[#25D366] rounded-full animate-pulse" />
                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Gateway Production Environment</span>
              </div>
            </div>
          </div>

{/* Header Right Side Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto shrink-0">
            {/* Search Input */}
            <div className="relative w-full sm:w-56 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="text" 
                placeholder="Search endpoints..."
                value={activeSearch}
                onChange={(e) => setActiveSearch(e.target.value)}
                className="w-full bg-[#111b21] border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:ring-2 ring-[#25D366]/50 outline-none transition-all"
              />
            </div>

            {/* Dropdown & Download Button */}
            <div className="w-full sm:w-auto flex gap-2">
              <select 
                value={selectedInstanceId}
                onChange={(e) => setSelectedInstanceId(e.target.value)}
                className="flex-1 sm:w-48 bg-[#111b21] border border-gray-700 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 ring-[#25D366]/50 outline-none appearance-none truncate cursor-pointer"
              >
                {instances.length === 0 ? (
                  <option value="YOUR_INSTANCE_ID">No instances found</option>
                ) : (
                  instances.map(inst => (
                    <option key={inst.id} value={inst.id}>{inst.name} ({inst.id})</option>
                  ))
                )}
              </select>
              <button 
                onClick={downloadFullDoc}
                className="shrink-0 bg-[#25D366] hover:bg-[#25D366]/90 text-[#0b141a] px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-black transition-all shadow-lg shadow-[#25D366]/20"
                title="Download Full API Documentation"
              >
                <Download size={16} />
                <span className="hidden sm:inline">DOCS</span>
              </button>
            </div>
          </div>
                  </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Navigation Sidebar */}
        <nav className="lg:w-72 shrink-0 space-y-1 sticky top-32 h-fit">
          <p className="px-4 mb-4 text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Documentation Root</p>
          {sections.map(s => (
            <a 
              key={s.id} 
              href={`#${s.id}`}
              className="flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-bold text-gray-400 hover:text-white hover:bg-[#111b21] hover:border hover:border-gray-800 transition-all group"
            >
              <div className="flex items-center gap-4">
                <span className="opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-transform">{s.icon}</span>
                {s.title}
              </div>
              <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-[#25D366]" />
            </a>
          ))}
          <div className="mt-8 pt-8 border-t border-gray-800/50">
             <a href="mailto:api-support@ifastx.in" className="flex items-center gap-3 px-4 text-xs font-bold text-gray-500 hover:text-[#25D366] transition-colors">
               <ExternalLink size={14} />
               Email Developer Support
             </a>
          </div>
        </nav>

        {/* Content Area */}
        <div className="flex-1 space-y-24">
          {filteredSections.map(section => (
            <div key={section.id} id={section.id} className="scroll-mt-40 space-y-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#111b21] rounded-2xl border border-gray-800 text-white shadow-lg">
                  {section.icon}
                </div>
                <h2 className="text-3xl font-black text-white tracking-tight">{section.title}</h2>
              </div>
              
              <div className="bg-[#111b21]/50 backdrop-blur-sm rounded-3xl border border-gray-800 p-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none group-hover:opacity-[0.04] transition-opacity">
                  {section.icon}
                </div>
                {section.content}
              </div>
            </div>
          ))}

          {/* Footer Area */}
          <div className="pt-20 pb-10 border-t border-gray-800 text-center">
            <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.3em]">
              End of API Specification &bull; iFastX Technologies &bull; 2025
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const EndpointInfo: React.FC<{ 
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE', 
  path: string, 
  description: string,
  body?: any,
  apiBase: string,
  apiKey: string
}> = ({ method, path, description, body, apiBase, apiKey }) => {
  const [copied, setCopied] = useState(false);
  const colorMap = {
    GET: 'bg-blue-500/20 text-blue-400 border-blue-500/20',
    POST: 'bg-[#25D366]/20 text-[#25D366] border-[#25D366]/20',
    PATCH: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20',
    DELETE: 'bg-red-500/20 text-red-400 border-red-500/20',
  };

  const curlCommand = `curl -X ${method} "${apiBase}${path}" \\
  -H "X-API-Key: ${apiKey}" \\
  -H "Content-Type: application/json" ${body ? `\\
  -d '${JSON.stringify(body, null, 2)}'` : ''}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border uppercase tracking-widest ${colorMap[method]}`}>
            {method}
          </span>
          <code className="text-white text-sm font-mono font-bold">{path}</code>
        </div>
        <p className="text-xs text-gray-500 font-medium italic">{description}</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-2">
           <div className="flex items-center justify-between px-3">
              <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">cURL Request</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(curlCommand);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="text-[9px] font-black text-[#25D366] hover:underline"
              >
                {copied ? 'COPIED!' : 'COPY COMMAND'}
              </button>
           </div>
           <pre className="p-4 bg-black/40 border border-gray-800 rounded-2xl overflow-x-auto text-[11px] font-mono text-gray-300 leading-relaxed scrollbar-thin scrollbar-thumb-gray-800">
             <code>{curlCommand}</code>
           </pre>
        </div>

        {body && (
          <div className="space-y-2">
             <div className="flex items-center justify-between px-3">
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">JSON Body Schema</span>
             </div>
             <pre className="p-4 bg-black/40 border border-gray-800 rounded-2xl overflow-x-auto text-[11px] font-mono text-gray-200 leading-relaxed scrollbar-thin scrollbar-thumb-gray-800">
               <code>{JSON.stringify(body, null, 2)}</code>
             </pre>
          </div>
        )}
      </div>
    </div>
  );
};

const CodeBlock: React.FC<{ id: string, language: string, code: string, onCopy: (c: string, id: string) => void, copied: string | null }> = ({ id, language, code, onCopy, copied }) => (
  <div className="relative group overflow-hidden rounded-2xl">
    <div className="flex items-center justify-between px-4 py-2 bg-[#202c33] border border-gray-700 rounded-t-2xl">
      <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{language}</span>
      <button 
        onClick={() => onCopy(code, id)}
        className="text-gray-500 hover:text-[#25D366] transition-colors p-1"
      >
        {copied === id ? <Check size={14} className="text-[#25D366]" /> : <Copy size={14} />}
      </button>
    </div>
    <pre className="p-4 bg-black/60 border-x border-b border-gray-800 rounded-b-2xl overflow-x-auto text-[11px] font-mono text-[#25D366]/90 leading-relaxed scrollbar-thin scrollbar-thumb-gray-800">
      <code>{code}</code>
    </pre>
  </div>
);

export default ApiDocumentation;
