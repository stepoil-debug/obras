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
  const value = process.env[name];
  if(!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

function supabase(){
  return createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false }
  });
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

function dataUrlToBuffer(dataUrl){
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if(!match) throw new Error('Imagem inválida. Use data URL base64.');
  return { contentType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

exports.handler = async (event) => {
  if(event.httpMethod === 'OPTIONS') return response(204, {});

  try{
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

      const updatedAt = (items || []).reduce((acc, item) => {
        const t = item.updated_at || item.created_at;
        return !acc || (t && t > acc) ? t : acc;
      }, null);

      return response(200, { ok:true, items: items || [], photos: photosWithUrls, updatedAt });
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
      if(!payload.id) return response(400, { ok:false, error:'Item sem ID.' });
      const { data, error } = await db.from('step_obras_items').upsert(payload, { onConflict:'id' }).select('*').single();
      if(error) throw error;
      try{ await db.from('step_obras_history').insert({ item_id:payload.id, action:'item_save', new_data:payload, actor_name:'netlify_panel' }); }catch(e){}
      return response(200, { ok:true, item:data });
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
    return response(500, { ok:false, error:error.message || 'Erro interno.' });
  }
};
