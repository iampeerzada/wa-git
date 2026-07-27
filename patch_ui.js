const fs = require('fs');

try {
    let ui = fs.readFileSync('/app/applet/components/BulkSender.tsx', 'utf8');
    const target = `className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 ring-[#25D366]/50 outline-none transition-all resize-none flex-1"`;
    
    const uiTarget2 = `placeholder="Hello! Use {Hi|Hello} for spintax support."`;
    const uiRep2 = `placeholder="Hello! Use {Hi|Hello} for spintax. For templates with variables, use: [META TEMPLATE] name | var1 | var2"`;
    
    if (ui.includes(uiTarget2)) {
        ui = ui.replace(uiTarget2, uiRep2);
        fs.writeFileSync('/app/applet/components/BulkSender.tsx', ui);
        console.log("Patched BulkSender.tsx successfully.");
    }
} catch (e) {}
