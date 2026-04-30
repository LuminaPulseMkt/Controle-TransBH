import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const url = process.env.SUPABASE_URL || process.env.PROJECT_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

const file = readFileSync('src/assets/transbh-logo-hd.png');
const path = `transbh-logo-${Date.now()}.png`;

const { data: up, error: upErr } = await supabase.storage
  .from('company-assets')
  .upload(path, file, { contentType: 'image/png', cacheControl: '31536000', upsert: true });

if (upErr) { console.error('upload error:', upErr); process.exit(1); }

const { data: pub } = supabase.storage.from('company-assets').getPublicUrl(path);
console.log('Public URL:', pub.publicUrl);

const { data: existing } = await supabase.from('company_settings').select('id').limit(1).maybeSingle();

if (existing) {
  const { error: updErr } = await supabase.from('company_settings').update({ logo_url: pub.publicUrl }).eq('id', existing.id);
  if (updErr) { console.error('update error:', updErr); process.exit(1); }
  console.log('Updated company_settings id:', existing.id);
} else {
  const { error: insErr } = await supabase.from('company_settings').insert({ name: 'TransBH', logo_url: pub.publicUrl });
  if (insErr) { console.error('insert error:', insErr); process.exit(1); }
  console.log('Inserted new company_settings');
}
