const fs = require('fs');
let code = fs.readFileSync('/app/applet/components/MetaAutomations.tsx', 'utf8');

code = code.replace(
    `import { Bot, Plus, Trash2, ChevronRight, ChevronDown, Edit, ArrowLeft, Home, MessageSquare, Webhook, X, Save, AlertCircle } from 'lucide-react';`,
    `import { Bot, Plus, Trash2, ChevronRight, Edit, ArrowLeft, Home, MessageSquare, Webhook, X, Save, AlertCircle } from 'lucide-react';`
);

fs.writeFileSync('/app/applet/components/MetaAutomations.tsx', code);
console.log("Patched imports again");
