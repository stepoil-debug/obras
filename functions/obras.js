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
  const candidates = ['SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SECRET_KEY','SUPABASE_SERVICE_KEY'];
  for(const name of candidates){
    const value = (process.env[name] || '').trim();
    if(value) return { name, value };
  }
  throw new Error('Variável de ambiente ausente: SUPABASE_SERVICE_ROLE_KEY. Cadastre a chave service_role/secret no ambiente do site.');
}

function supabase(){
  const url = requiredEnv('SUPABASE_URL');
  const { name, value } = getSupabaseKey();
  if(value.includes(' ') || value.includes('\n') || value.includes('\r')){
    throw new Error(`${name} contém espaços/quebras de linha. Cole a chave em uma única linha nas variáveis do site.`);
  }
  if(value.startsWith('sb_publishable_')){
    throw new Error(`${name} recebeu uma publishable key. Para salvar no banco, use a service_role/secret key nas variáveis do site.`);
  }
  if(value.startsWith('COLE_AQUI')){
    throw new Error(`${name} ainda está com texto placeholder. Cole a service_role/secret key real do Supabase.`);
  }
  return createClient(url, value, { auth: { persistSession: false } });
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
    updated_at: new Date().toISOString()
  };
}

function normalizeStatusCompra(status){
  const raw = String(status || 'Não informado').replace('Apravado','Aprovado').trim() || 'Não informado';
  const n = raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(n === 'comprado') return 'Comprado';
  if(n.includes('processo')) return 'Em Processo de Compra';
  if(n.includes('gerar pedido')) return 'Gerar Pedido';
  if(n.includes('em orcamento')) return 'Em Orçamento';
  if(n.includes('nao aprovado')) return 'Orçamento não Aprovado';
  if(n.includes('cancel')) return 'Cancelado';
  return raw;
}

function cleanCost(row = {}, idx = 0){
  const itemId = String(row.item_id || row.itemId || '').trim() || null;
  const setor = row.setor || null;
  const produto = row.produto || row.descricao || null;
  const valor = Number(row.valor ?? row.value ?? 0) || 0;
  const rowKey = String(row.row_key || row.rowKey || `${itemId || 'sem-item'}-${idx}-${setor || ''}-${produto || ''}-${valor}`).slice(0,250);
  return {
    row_key: rowKey,
    item_id: itemId,
    setor,
    cotacao: row.cotacao ? String(row.cotacao) : null,
    data_cotacao: row.data_cotacao || row.dataCotacao || null,
    pedido: row.pedido ? String(row.pedido) : null,
    data_pedido: row.data_pedido || row.dataPedido || null,
    fornecedor: row.fornecedor || null,
    produto,
    quantidade: Number(row.quantidade ?? row.qtd ?? 0) || 0,
    valor,
    origem: row.origem || null,
    status_compra: normalizeStatusCompra(row.status_compra || row.statusCompra || 'Não informado'),
    disciplina: row.disciplina || null,
    observacao: row.observacao || null,
    source: row.source || 'painel',
    metadata: row.metadata || {},
    updated_at: new Date().toISOString()
  };
}

function dataUrlToBuffer(dataUrl){
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if(!match) throw new Error('Imagem inválida. Use data URL base64.');
  return { contentType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

async function tableExistsOrIgnore(promise){
  const { data, error } = await promise;
  if(error){
    const msg = String(error.message || '');
    if(msg.includes('step_obras_costs') || msg.includes('does not exist') || msg.includes('relation')) return [];
    throw error;
  }
  return data || [];
}

async function saveCosts(db, rawCosts){
  const costs = Array.isArray(rawCosts) ? rawCosts.map(cleanCost).filter(r => r.produto || r.setor || Number(r.valor)) : [];
  // Substitui a tabela de custos do painel. Não mexe nas obras, mapa ou fotos.
  try{
    const { error: delError } = await db.from('step_obras_costs').delete().neq('row_key', '__never__');
    if(delError) throw delError;
    for(let i=0;i<costs.length;i+=500){
      const chunk = costs.slice(i,i+500);
      if(!chunk.length) continue;
      const { error } = await db.from('step_obras_costs').upsert(chunk, { onConflict:'row_key' });
      if(error) throw error;
    }
    return { saved: costs.length, warning:null };
  }catch(error){
    const msg = String(error.message || '');
    if(msg.includes('step_obras_costs') || msg.includes('does not exist') || msg.includes('relation')){
      return { saved:0, warning:'Tabela step_obras_costs não encontrada. Rode o patch SQL v17 para habilitar a tabela detalhada de custos.' };
    }
    throw error;
  }
}

exports.handler = async (event) => {
  if(event.httpMethod === 'OPTIONS') return response(204, {});

  try{
    const query = event.queryStringParameters || {};
    if(event.httpMethod === 'GET' && query.health === '1'){
      return response(200, { ok:true, env:describeSupabaseEnv(), note:'Não mostra chaves completas. Use para diagnosticar as variáveis do ambiente.' });
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

      let costs = [];
      let costsWarning = null;
      try{
        costs = await tableExistsOrIgnore(
          db.from('step_obras_costs').select('*').order('item_id', { ascending:true }).order('id', { ascending:true }).limit(5000)
        );
      }catch(costErr){
        costsWarning = costErr.message || 'Não foi possível carregar a tabela de custos.';
        costs = [];
      }

      const bucket = process.env.SUPABASE_BUCKET || 'step-obras-evidencias';
      const photosWithUrls = (photos || []).map((p) => {
        let publicUrl = p.public_url || '';
        if(!publicUrl && p.storage_path){
          const { data } = db.storage.from(bucket).getPublicUrl(p.storage_path);
          publicUrl = data?.publicUrl || '';
        }
        return { ...p, public_url: publicUrl };
      });

      const updatedAt = (items || []).reduce((acc, item) => {
        const t = item.updated_at || item.created_at;
        return !acc || (t && t > acc) ? t : acc;
      }, null);

      return response(200, { ok:true, items: items || [], photos: photosWithUrls, costs, costsWarning, updatedAt });
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
      }catch(e){ }
      try{ await db.from('step_obras_history').insert({ action:'map_save', new_data:{ items:saved, mapZoom:body.mapZoom }, actor_name:'step_panel' }); }catch(e){ }
      return response(200, { ok:true, saved: saved.length });
    }

    if(body.action === 'save_item'){
      const payload = cleanItem(body.item || {});
      if(!payload.id) return response(400, { ok:false, error:'Item sem ID.' });
      const { data, error } = await db.from('step_obras_items').upsert(payload, { onConflict:'id' }).select('*').single();
      if(error) throw error;
      try{ await db.from('step_obras_history').insert({ item_id:payload.id, action:'item_save', new_data:payload, actor_name:'step_panel' }); }catch(e){}
      return response(200, { ok:true, item:data });
    }

    if(body.action === 'save_costs'){
      const result = await saveCosts(db, body.costs || []);
      try{ await db.from('step_obras_history').insert({ action:'costs_save', new_data:{ count: result.saved, warning: result.warning }, actor_name:'step_panel' }); }catch(e){}
      return response(200, { ok:true, ...result });
    }

    if(body.action === 'import_bulk'){
      const items = Array.isArray(body.items) ? body.items.map(cleanItem).filter(i=>i.id) : [];
      let itemSaved = 0;
      for(let i=0;i<items.length;i+=200){
        const chunk = items.slice(i,i+200);
        if(!chunk.length) continue;
        const { error } = await db.from('step_obras_items').upsert(chunk, { onConflict:'id' });
        if(error) throw error;
        itemSaved += chunk.length;
      }
      const costResult = await saveCosts(db, body.costs || []);
      try{ await db.from('step_obras_history').insert({ action:'bulk_import', new_data:{ items:itemSaved, costs:costResult.saved, warning:costResult.warning }, actor_name:'step_panel' }); }catch(e){}
      return response(200, { ok:true, itemsSaved:itemSaved, costsSaved:costResult.saved, warning:costResult.warning });
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

      const { error: uploadError } = await db.storage.from(bucket).upload(storagePath, buffer, { contentType, upsert:false });
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
      try{ await db.from('step_obras_history').insert({ item_id:itemId, action:'photo_upload', new_data:inserted, actor_name:'step_panel' }); }catch(e){}
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
      ? 'Chave Supabase inválida no ambiente do site. Verifique se SUPABASE_SERVICE_ROLE_KEY é a service_role/secret key correta do projeto e não a publishable/anon key. Depois publique novamente.'
      : undefined;
    return response(500, { ok:false, error:message, hint });
  }
};
