// Force vite to transform every file CustomerForm transitively depends on
const files = [
  '/src/pages/CustomerForm.tsx',
  '/src/components/ContactManager.tsx',
  '/src/components/FormField.tsx',
  '/src/services/contactService.ts',
  '/src/services/fieldConfigStore.ts',
  '/src/services/api.ts',
  '/src/services/customerService.ts',
  '/src/services/authService.ts',
  '/src/services/rbacStore.ts',
  '/src/data/mockData.ts',
  '/src/types/fieldConfig.ts',
  '/src/contexts/AuthContext.tsx',
  '/src/layouts/MainLayout.tsx',
  '/src/App.tsx',
  '/src/main.tsx',
  '/src/index.css',
  '/src/pages/Customers.tsx',
];
async function probeOne(f) {
  try {
    const r = await fetch('http://localhost:5173' + f);
    const t = await r.text();
    const err = t.includes('Pre-transform error') || t.includes('Failed to') || t.includes('Internal Server Error') || t.includes('error during build') || t.includes('TransformError');
    console.log(`${r.status} ${f.padEnd(48)} len=${String(t.length).padStart(6)} ${err ? '❌ ERROR' : '✅ ok'}`);
    if (err) {
      // extract the error message
      const m = t.match(/Error[^<]{0,300}/);
      if (m) console.log('   ->', m[0].slice(0, 200));
    }
  } catch (e) {
    console.log(`ERR ${f}: ${e.message}`);
  }
}
(async () => {
  for (const f of files) await probeOne(f);
})();