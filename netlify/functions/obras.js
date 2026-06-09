const { createClient } = require('@supabase/supabase-js');

const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

function response(statusCode, body){
  return { statusCode, headers: jsonHeaders, body: JSON.stringify(body) };
}

function requiredEnv(name){
  const value = (process.env[name] || '').trim();
  if(!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

function getSupabaseKey(){
  // Para gravação pelo Netlify, use a chave secreta/service_role.
  // Aceita estes nomes para evitar erro de configuração no Netlify.
  const candidates = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SECRET_KEY',
    'SUPABASE_SERVICE_KEY'
  ];
  for(const name of candidates){
    const value = (process.env[name] || '').trim();
    if(value) return { name, value };
  }
  throw new Error('Variável de ambiente ausente: SUPABASE_SERVICE_ROLE_KEY. Cadastre a chave service_role/secret no Netlify.');
}

function supabase(){
  const url = requiredEnv('SUPABASE_URL');
  const { name, value } = getSupabaseKey();

  // Erros comuns: colar publishable/anon no lugar da service_role, colar a chave quebrada, ou inserir aspas/espaços.
  if(value.includes(' ') || value.includes('\n') || value.includes('\r')){
    throw new Error(`${name} contém espaços/quebras de linha. Cole a chave em uma única linha no Netlify.`);
  }
  if(value.startsWith('sb_publishable_')){
    throw new Error(`${name} recebeu uma publishable key. Para salvar no banco, use a service_role/secret key no Netlify.`);
  }

  return createClient(url, value, {
    auth: { persistSession: false }
  });
}

function describeSupabaseEnv(){
  const url = (process.env.SUPABASE_URL || '').trim();
  const keyNames = ['SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SECRET_KEY','SUPABASE_SERVICE_KEY','SUPABASE_BUCKET'];
  return {
    supabaseUrlSet: Boolean(url),
    supabaseUrlHost: url ? url.replace(/^https?:\/\//,'').split('/')[0] : null,
    keys: Object.fromEntries(keyNames.map((name) => {
      const v = (process.env[name] || '').trim();
      return [name, { set:Boolean(v), length:v.length, prefix:v ? v.slice(0, 14) + '...' : null }];
    }))
  };
}


function cleanItem(item = {}){
  return {
    id: String(item.id || '').trim(),
    area: item.area || null,
    title: item.title || 'Obra sem título',
    status: item.status || 'AG. PROJETO',
    progress: Math.max(0, Math.min(100, Number(item.progress) || 0)),
    owner: item.owner || null,
    priority: item.priority || 'Média',
    cost: Number(item.cost) || 0,
    due: item.due || null,
    x: Math.max(0, Math.min(100, Number(item.x) || 50)),
    y: Math.max(0, Math.min(100, Number(item.y) || 50)),
    next_action: item.next || item.next_action || null,
    notes: item.notes || null,
    ativo: true,
    updated_at: new Date().toISOString()
  };
}

function cleanBudget(item = {}){
  const value = Number(item.value ?? item.valor ?? item.cost ?? 0) || 0;
  return {
    id: String(item.id || `ORC-${Date.now()}`).trim(),
    itemId: String(item.itemId || item.item_id || '').trim(),
    description: item.description || item.descricao || 'Novo orçamento',
    supplier: item.supplier || item.fornecedor || null,
    status: item.status || 'Em Orçamento',
    value: Math.max(0, value),
    date: item.date || item.data || new Date().toISOString().slice(0, 10),
    notes: item.notes || item.observacoes || null,
    updated_at: new Date().toISOString()
  };
}

async function readConfigValue(db, key, fallback){
  const { data, error } = await db
    .from('step_obras_config')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if(error) throw error;
  return data?.value ?? fallback;
}

async function writeConfigValue(db, key, value){
  const { error } = await db.from('step_obras_config').upsert({
    key,
    value,
    updated_at:new Date().toISOString()
  }, { onConflict:'key' });
  if(error) throw error;
}


function dataUrlToBuffer(dataUrl){
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if(!match) throw new Error('Imagem inválida. Use data URL base64.');
  return { contentType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

exports.handler = async (event) => {
  if(event.httpMethod === 'OPTIONS') return response(204, {});

  try{
    const query = event.queryStringParameters || {};
    if(event.httpMethod === 'GET' && query.health === '1'){
      return response(200, { ok:true, env:describeSupabaseEnv(), note:'Não mostra chaves completas. Use para diagnosticar variáveis do Netlify.' });
    }

    const db = supabase();

    if(event.httpMethod === 'GET'){
      const { data: items, error: itemError } = await db
        .from('step_obras_items')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true })
        .order('id', { ascending: true });

      if(itemError) throw itemError;

      const { data: photos, error: photoError } = await db
        .from('step_obras_photos')
        .select('*')
        .order('ordem', { ascending: true })
        .order('created_at', { ascending: true });

      if(photoError) throw photoError;

      const bucket = process.env.SUPABASE_BUCKET || 'step-obras-evidencias';
      const photosWithUrls = (photos || []).map((p) => {
        let publicUrl = p.public_url || '';
        if(!publicUrl && p.storage_path){
          const { data } = db.storage.from(bucket).getPublicUrl(p.storage_path);
          publicUrl = data?.publicUrl || '';
        }
        return { ...p, public_url: publicUrl };
      });

      let budgets = [];
      try{
        const value = await readConfigValue(db, 'budgets', []);
        budgets = Array.isArray(value) ? value : [];
      }catch(e){
        // Config table is optional in older bancos. The panel still works without budget records.
        budgets = [];
      }

      const updatedAt = (items || []).reduce((acc, item) => {
        const t = item.updated_at || item.created_at;
        return !acc || (t && t > acc) ? t : acc;
      }, null);

      return response(200, { ok:true, items: items || [], photos: photosWithUrls, budgets, updatedAt });
    }

    if(event.httpMethod !== 'POST') return response(405, { ok:false, error:'Método não permitido.' });

    const body = event.body ? JSON.parse(event.body) : {};

    if(body.action === 'check_pin'){
      return response(200, { ok:true, message:'Edição direta habilitada. Sem PIN.' });
    }

    if(body.action === 'save_map'){
      const items = Array.isArray(body.items) ? body.items : [];
      const saved = [];
      for(const item of items){
        const id = String(item.id || '').trim();
        if(!id) continue;
        const payload = {
          x: Math.max(0, Math.min(100, Number(item.x) || 50)),
          y: Math.max(0, Math.min(100, Number(item.y) || 50)),
          updated_at: new Date().toISOString()
        };
        const { error } = await db.from('step_obras_items').update(payload).eq('id', id);
        if(error) throw error;
        saved.push({ id, ...payload });
      }
      try{
        await db.from('step_obras_config').upsert({
          key:'map_state',
          value:{ mapZoom: Number(body.mapZoom) || 1, savedAt: new Date().toISOString() },
          updated_at:new Date().toISOString()
        }, { onConflict:'key' });
      }catch(e){ /* config table is optional */ }
      try{
        await db.from('step_obras_history').insert({ action:'map_save', new_data:{ items:saved, mapZoom:body.mapZoom }, actor_name:'netlify_panel' });
      }catch(e){ /* history is optional */ }
      return response(200, { ok:true, saved: saved.length });
    }

    if(body.action === 'save_item'){
      const payload = cleanItem(body.item || {});
      const oldId = String(body.oldId || '').trim();
      if(!payload.id) return response(400, { ok:false, error:'Item sem ID.' });
      const { data, error } = await db.from('step_obras_items').upsert(payload, { onConflict:'id' }).select('*').single();
      if(error) throw error;
      if(oldId && oldId !== payload.id){
        try{ await db.from('step_obras_photos').update({ item_id:payload.id }).eq('item_id', oldId); }catch(e){}
        try{ await db.from('step_obras_items').update({ ativo:false, updated_at:new Date().toISOString() }).eq('id', oldId); }catch(e){}
      }
      try{ await db.from('step_obras_history').insert({ item_id:payload.id, action:'item_save', old_data:oldId && oldId !== payload.id ? { oldId } : null, new_data:payload, actor_name:'netlify_panel' }); }catch(e){}
      return response(200, { ok:true, item:data });
    }

    if(body.action === 'delete_item'){
      const itemId = String(body.itemId || body.id || '').trim();
      if(!itemId) return response(400, { ok:false, error:'Item sem ID para excluir.' });
      const { data: oldRows } = await db.from('step_obras_items').select('*').eq('id', itemId).limit(1);
      const oldData = Array.isArray(oldRows) && oldRows.length ? oldRows[0] : null;
      const { error } = await db.from('step_obras_items').update({ ativo:false, updated_at:new Date().toISOString() }).eq('id', itemId);
      if(error) throw error;
      try{ await db.from('step_obras_history').insert({ item_id:itemId, action:'item_delete', old_data:oldData, actor_name:'netlify_panel' }); }catch(e){}
      return response(200, { ok:true, itemId });
    }

    if(body.action === 'save_budget'){
      const budget = cleanBudget(body.budget || {});
      if(!budget.id) return response(400, { ok:false, error:'Orçamento sem ID.' });
      const current = await readConfigValue(db, 'budgets', []);
      const list = Array.isArray(current) ? current : [];
      const idx = list.findIndex((b) => String(b.id) === budget.id);
      if(idx >= 0) list[idx] = { ...list[idx], ...budget };
      else list.unshift({ ...budget, created_at:new Date().toISOString() });
      await writeConfigValue(db, 'budgets', list);
      try{ await db.from('step_obras_history').insert({ item_id:budget.itemId || null, action:'budget_save', new_data:budget, actor_name:'netlify_panel' }); }catch(e){}
      return response(200, { ok:true, budget, budgets:list });
    }

    if(body.action === 'delete_budget'){
      const budgetId = String(body.budgetId || body.id || '').trim();
      if(!budgetId) return response(400, { ok:false, error:'Orçamento sem ID para excluir.' });
      const current = await readConfigValue(db, 'budgets', []);
      const list = Array.isArray(current) ? current : [];
      const oldData = list.find((b) => String(b.id) === budgetId) || null;
      const next = list.filter((b) => String(b.id) !== budgetId);
      await writeConfigValue(db, 'budgets', next);
      try{ await db.from('step_obras_history').insert({ item_id:oldData?.itemId || null, action:'budget_delete', old_data:oldData, actor_name:'netlify_panel' }); }catch(e){}
      return response(200, { ok:true, budgetId, budgets:next });
    }

    if(body.action === 'upload_photo'){
      const itemId = String(body.itemId || '').trim();
      if(!itemId) return response(400, { ok:false, error:'Imagem sem item vinculado.' });
      const photo = body.photo || {};
      const { contentType, buffer } = dataUrlToBuffer(photo.dataUrl);
      const bucket = process.env.SUPABASE_BUCKET || 'step-obras-evidencias';
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      const safeName = String(photo.name || 'imagem').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(0,80);
      const storagePath = `${itemId}/${Date.now()}-${safeName || `foto.${ext}`}`;

      const { error: uploadError } = await db.storage.from(bucket).upload(storagePath, buffer, {
        contentType,
        upsert:false
      });
      if(uploadError) throw uploadError;

      const { data: urlData } = db.storage.from(bucket).getPublicUrl(storagePath);
      const publicUrl = urlData?.publicUrl || null;
      const { data: inserted, error: insertError } = await db.from('step_obras_photos').insert({
        item_id:itemId,
        name:photo.name || safeName || `foto.${ext}`,
        storage_path:storagePath,
        public_url:publicUrl,
        content_type:contentType,
        size_bytes:buffer.length,
        tipo:'Evidência'
      }).select('*').single();
      if(insertError) throw insertError;
      try{ await db.from('step_obras_history').insert({ item_id:itemId, action:'photo_upload', new_data:inserted, actor_name:'netlify_panel' }); }catch(e){}
      return response(200, { ok:true, photo:inserted });
    }

    if(body.action === 'delete_photo'){
      const photoId = body.photoId;
      const storagePath = body.storagePath;
      const bucket = process.env.SUPABASE_BUCKET || 'step-obras-evidencias';
      if(storagePath) await db.storage.from(bucket).remove([storagePath]);
      if(photoId){
        const { error } = await db.from('step_obras_photos').delete().eq('id', photoId);
        if(error) throw error;
      }
      return response(200, { ok:true });
    }

    return response(400, { ok:false, error:'Ação inválida.' });
  }catch(error){
    console.error(error);
    const message = error.message || 'Erro interno.';
    const hint = /Invalid API key/i.test(message)
      ? 'Chave Supabase inválida no Netlify. Verifique se SUPABASE_SERVICE_ROLE_KEY é a service_role/secret key correta do projeto e não a publishable/anon key. Depois faça redeploy.'
      : undefined;
    return response(500, { ok:false, error:message, hint });
  }
};
