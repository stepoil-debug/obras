(function(){
  'use strict';

  const DIALOG_ID = 'stepCostDetailDialogV1';
  const STYLE_ID = 'stepCostDetailStylesV1';
  const ENHANCED = 'stepCostDetailEnhanced';
  const money = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
  const number = new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2});
  const statusProgress = {
    'Em orçamento':20,
    'Em Orçamento':20,
    'Gerar Pedido':40,
    'Em processo de compra':60,
    'Em Processo de Compra':60,
    'Comprado':100,
    'Orçamento não aprovado':100,
    'Orçamento não Aprovado':100,
    'Cancelado':100
  };

  let sourceRows = [];
  let currentItemId = '';
  let observerTimer = null;

  function esc(v){
    const el=document.createElement('div'); el.textContent=String(v ?? ''); return el.innerHTML;
  }
  function fmtMoney(v){ return money.format(Number(v)||0); }
  function fmtDate(v){
    if(!v) return 'Sem data';
    const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : esc(v);
  }
  function canonicalStatus(v){
    const s=String(v||'').trim();
    if(!s) return 'Sem status';
    if(/apr[a-z]*vado/i.test(s) && /não/i.test(s)) return 'Orçamento não aprovado';
    if(/^em orçamento$/i.test(s)) return 'Em orçamento';
    if(/^em processo de compra$/i.test(s)) return 'Em processo de compra';
    return s;
  }
  function progressForStatus(s){ return statusProgress[canonicalStatus(s)] ?? 35; }
  function toneClass(s){
    const v=canonicalStatus(s).toLowerCase();
    if(v==='comprado') return 'ok';
    if(v.includes('cancel')) return 'bad';
    if(v.includes('não aprovado')) return 'bad';
    if(v.includes('processo')) return 'info';
    if(v.includes('orçamento')) return 'warn';
    return 'neutral';
  }

  async function decodeSource(){
    const encoded = window.STEP_COST_SOURCE_GZIP_B64;
    if(!encoded) return [];
    try{
      if(!('DecompressionStream' in window)) throw new Error('Navegador sem suporte a DecompressionStream');
      const binary=atob(encoded);
      const bytes=new Uint8Array(binary.length);
      for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
      const ds=new DecompressionStream('gzip');
      const text=await new Response(new Blob([bytes]).stream().pipeThrough(ds)).text();
      const raw=JSON.parse(text);
      return raw.map(r=>({
        row:r[0], itemIds:Array.isArray(r[1])?r[1]:[], setor:r[2]||'', cotacao:r[3]??null,
        dtCotacao:r[4]||'', pedido:r[5]??null, dtPedido:r[6]||'', fornecedor:r[7]||'',
        produto:r[8]||'', quantidade:Number(r[9])||0, valor:Number(r[10])||0,
        origem:r[11]||'', status:canonicalStatus(r[12]), disciplina:r[13]||''
      }));
    }catch(err){
      console.warn('[Obras] Não foi possível carregar a base detalhada de custos:',err);
      return [];
    }
  }

  function getStateBudgets(){
    try{
      if(typeof ensureBudgets==='function') return ensureBudgets();
      if(typeof state!=='undefined' && Array.isArray(state.budgets)) return state.budgets;
    }catch(_e){}
    return [];
  }
  function getItemSafe(id){
    try{ if(typeof getItem==='function') return getItem(id); }catch(_e){}
    try{ return (typeof state!=='undefined' && Array.isArray(state.items)) ? state.items.find(i=>String(i.id)===String(id)) : null; }catch(_e){}
    return null;
  }

  function itemRows(itemId){ return sourceRows.filter(r=>r.itemIds.map(String).includes(String(itemId))); }
  function groupKey(r){
    if(r.cotacao!==null && r.cotacao!=='') return `C:${String(r.cotacao).trim()}`;
    if(r.pedido!==null && r.pedido!=='') return `P:${String(r.pedido).trim()}`;
    return `R:${r.row}`;
  }
  function economicKey(r){
    return [r.cotacao??'',r.pedido??'',r.produto.trim().toUpperCase(),r.quantidade,Number(r.valor).toFixed(4)].join('|');
  }
  function uniqueValues(arr){ return [...new Set(arr.filter(v=>v!==null && v!==undefined && String(v).trim()!=='').map(v=>String(v).trim()))]; }
  function uniqueEconomic(rows){
    const map=new Map();
    rows.forEach(r=>{ const k=economicKey(r); if(!map.has(k)) map.set(k,r); });
    return [...map.values()];
  }
  function groupSourceRows(itemId){
    const map=new Map();
    itemRows(itemId).forEach(r=>{
      const key=groupKey(r);
      if(!map.has(key)) map.set(key,[]);
      map.get(key).push(r);
    });
    return [...map.entries()].map(([key,rows])=>{
      const unique=uniqueEconomic(rows);
      const statuses=uniqueValues(rows.map(r=>canonicalStatus(r.status)));
      const status=statuses.length===1?statuses[0]:(statuses.length?'Status misto':'Sem status');
      const dates=uniqueValues(rows.map(r=>r.dtPedido||r.dtCotacao)).sort();
      const cot=uniqueValues(rows.map(r=>r.cotacao));
      const pedidos=uniqueValues(rows.map(r=>r.pedido));
      const shared=new Set();
      if(cot.length){
        sourceRows.filter(x=>String(x.cotacao??'')===cot[0]).forEach(x=>x.itemIds.forEach(id=>shared.add(String(id))));
      }
      return {
        key, rows, unique, status,
        cotacao:cot[0]||'', pedidos,
        total:unique.reduce((a,r)=>a+(Number(r.valor)||0),0),
        bruto:rows.reduce((a,r)=>a+(Number(r.valor)||0),0),
        suppliers:uniqueValues(rows.map(r=>r.fornecedor)),
        origins:uniqueValues(rows.map(r=>r.origem)),
        disciplines:uniqueValues(rows.map(r=>r.disciplina)),
        fronts:uniqueValues(rows.map(r=>r.setor)),
        date:dates.at(-1)||'',
        duplicateCount:rows.length-unique.length,
        shared:[...shared].filter(id=>id!==String(itemId)).sort()
      };
    }).sort((a,b)=>String(b.date).localeCompare(String(a.date)) || b.total-a.total);
  }

  function manualGroups(itemId){
    return getStateBudgets().filter(b=>String(b.itemId||b.item_id||'')===String(itemId)).map(b=>({
      id:String(b.id||''), description:b.description||b.descricao||'Cotação manual', supplier:b.supplier||b.fornecedor||'',
      status:canonicalStatus(b.status||'Em orçamento'), value:Number(b.value??b.valor??0)||0,
      date:b.date||b.data||'', notes:b.notes||b.observacoes||''
    }));
  }

  function ensureStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const st=document.createElement('style'); st.id=STYLE_ID;
    st.textContent=`
      .step-cost-value-actions{display:flex;flex-direction:column;align-items:flex-end;gap:6px;min-width:0}
      .step-cost-detail-btn{border:1px solid rgba(59,163,255,.38);background:rgba(59,163,255,.12);color:#dff3ff;border-radius:9px;padding:6px 9px;font-size:11px;font-weight:800;line-height:1;white-space:nowrap;cursor:pointer}
      .step-cost-detail-btn:hover{background:rgba(59,163,255,.22)}
      .step-cost-detail-btn:focus-visible{outline:2px solid #7ed7ff;outline-offset:2px}
      #${DIALOG_ID}{width:min(1180px,96vw);max-height:92vh;border:1px solid rgba(255,255,255,.14);border-radius:20px;padding:0;background:#0d1f34;color:#edf5ff;box-shadow:0 30px 90px rgba(0,0,0,.55)}
      #${DIALOG_ID}::backdrop{background:rgba(2,8,18,.76);backdrop-filter:blur(4px)}
      .scd-head{position:sticky;top:0;z-index:4;display:flex;justify-content:space-between;gap:14px;align-items:flex-start;padding:18px 20px;background:#102842;border-bottom:1px solid rgba(255,255,255,.1)}
      .scd-head h3{margin:0;font-size:19px}.scd-head p{margin:4px 0 0;color:#a8bbd0;font-size:12px}.scd-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
      .scd-btn{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.07);color:#edf5ff;border-radius:10px;padding:8px 11px;font-size:12px;font-weight:750;cursor:pointer}.scd-btn.primary{background:linear-gradient(135deg,#3ba3ff,#28d7d2);color:#06101c;border:0}.scd-btn.danger{color:#ffd1d5;border-color:rgba(255,89,100,.3);background:rgba(255,89,100,.09)}
      .scd-body{padding:18px 20px 24px;overflow:auto;max-height:calc(92vh - 82px)}
      .scd-kpis{display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));gap:10px;margin-bottom:14px}.scd-kpi{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.035);border-radius:13px;padding:12px}.scd-kpi span{display:block;color:#9fb3c8;font-size:10px;text-transform:uppercase;letter-spacing:.06em}.scd-kpi b{display:block;font-size:17px;margin-top:5px;overflow-wrap:anywhere}
      .scd-tools{display:grid;grid-template-columns:minmax(180px,1fr) 210px auto;gap:9px;margin:12px 0 16px}.scd-field{width:100%;min-height:40px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:#132a45;color:#edf5ff;padding:9px 10px;font-size:13px}.scd-field option{background:#fff;color:#07111f}
      .scd-section-title{display:flex;justify-content:space-between;gap:10px;align-items:end;margin:18px 0 9px}.scd-section-title h4{margin:0;font-size:14px}.scd-section-title small{color:#91a8c0}
      .scd-list{display:grid;gap:10px}.scd-card{border:1px solid rgba(255,255,255,.1);background:linear-gradient(180deg,rgba(19,42,69,.88),rgba(10,27,46,.88));border-radius:14px;padding:13px}.scd-card-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.scd-card-title{min-width:0}.scd-card-title b{font-size:14px}.scd-sub{display:block;color:#9fb3c8;font-size:11px;margin-top:3px;line-height:1.35}.scd-value{text-align:right;white-space:nowrap;font-size:14px;font-weight:900}
      .scd-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.scd-tag{font-size:10px;border-radius:999px;padding:5px 8px;background:rgba(255,255,255,.065);border:1px solid rgba(255,255,255,.08);color:#cfe0f2}.scd-tag.ok{background:rgba(39,209,127,.14);color:#bff6d9;border-color:rgba(39,209,127,.25)}.scd-tag.warn{background:rgba(247,201,72,.13);color:#ffecaa;border-color:rgba(247,201,72,.23)}.scd-tag.bad{background:rgba(255,89,100,.12);color:#ffd0d4;border-color:rgba(255,89,100,.23)}.scd-tag.info{background:rgba(59,163,255,.13);color:#cce9ff;border-color:rgba(59,163,255,.23)}
      .scd-progress{height:7px;border-radius:999px;background:rgba(255,255,255,.07);overflow:hidden;margin-top:10px}.scd-progress i{display:block;height:100%;background:linear-gradient(90deg,#3ba3ff,#28d7d2);border-radius:999px}
      .scd-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:10px}.scd-meta{background:rgba(255,255,255,.035);border-radius:9px;padding:8px}.scd-meta span{display:block;color:#8fa7bf;font-size:9px;text-transform:uppercase;letter-spacing:.05em}.scd-meta b{display:block;margin-top:3px;font-size:11px;overflow-wrap:anywhere}
      .scd-details{margin-top:10px;border-top:1px solid rgba(255,255,255,.08);padding-top:9px}.scd-details summary{cursor:pointer;color:#cfe7ff;font-size:12px;font-weight:750}.scd-table-wrap{overflow:auto;margin-top:9px;border:1px solid rgba(255,255,255,.08);border-radius:10px}.scd-table{width:100%;border-collapse:collapse;min-width:760px}.scd-table th,.scd-table td{padding:8px 9px;border-bottom:1px solid rgba(255,255,255,.06);text-align:left;font-size:10px;vertical-align:top}.scd-table th{color:#a9bed3;background:rgba(255,255,255,.04);text-transform:uppercase;letter-spacing:.04em}.scd-table td b{font-size:11px}.scd-note{margin-top:9px;border:1px dashed rgba(247,201,72,.32);background:rgba(247,201,72,.07);border-radius:10px;padding:8px 10px;color:#ffe9a3;font-size:10px;line-height:1.4}
      .scd-manual-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.scd-empty{padding:18px;border:1px dashed rgba(255,255,255,.15);border-radius:12px;color:#9fb3c8;text-align:center;font-size:12px}
      @media(max-width:760px){#${DIALOG_ID}{width:96vw}.scd-head{flex-direction:column}.scd-actions{width:100%;justify-content:flex-start}.scd-body{padding:14px}.scd-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.scd-tools{grid-template-columns:1fr}.scd-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.scd-card-head{flex-direction:column}.scd-value{text-align:left}.step-cost-detail-btn{font-size:10px;padding:6px 7px}}
    `;
    document.head.appendChild(st);
  }

  function ensureDialog(){
    let d=document.getElementById(DIALOG_ID); if(d) return d;
    d=document.createElement('dialog'); d.id=DIALOG_ID;
    d.innerHTML=`<div class="scd-head"><div><h3 id="scdTitle">Detalhamento de custo</h3><p id="scdSub">Cotações, pedidos, fornecedores e itens da base de melhorias.</p></div><div class="scd-actions"><button type="button" class="scd-btn primary" id="scdNew">＋ Nova cotação</button><button type="button" class="scd-btn" id="scdRefresh">↻ Atualizar</button><button type="button" class="scd-btn" id="scdClose">✕ Fechar</button></div></div><div class="scd-body"><div class="scd-kpis" id="scdKpis"></div><div class="scd-tools"><input class="scd-field" id="scdSearch" placeholder="Buscar cotação, pedido, fornecedor ou produto..."><select class="scd-field" id="scdStatus"><option value="">Todos os status</option></select><div class="scd-tag info" id="scdSource">Base detalhada</div></div><div id="scdContent"></div></div>`;
    document.body.appendChild(d);
    d.querySelector('#scdClose').addEventListener('click',()=>d.close());
    d.addEventListener('click',e=>{ if(e.target===d) d.close(); });
    d.querySelector('#scdRefresh').addEventListener('click',()=>renderDialog(currentItemId));
    d.querySelector('#scdNew').addEventListener('click',()=>{
      try{ if(typeof selectedId!=='undefined') selectedId=currentItemId; }catch(_e){}
      d.close();
      if(typeof addNewBudget==='function') addNewBudget();
      else alert('O cadastro de orçamento não está disponível nesta versão.');
    });
    d.querySelector('#scdSearch').addEventListener('input',()=>renderLists(currentItemId));
    d.querySelector('#scdStatus').addEventListener('change',()=>renderLists(currentItemId));
    d.addEventListener('click',async e=>{
      const edit=e.target.closest('[data-manual-edit]');
      if(edit && typeof openBudget==='function'){ d.close(); openBudget(edit.dataset.manualEdit); return; }
      const del=e.target.closest('[data-manual-delete]');
      if(del && typeof deleteBudget==='function'){
        const id=del.dataset.manualDelete;
        await deleteBudget(id);
        setTimeout(()=>renderDialog(currentItemId),150);
      }
    });
    return d;
  }

  function setStatusOptions(groups,manual){
    const select=document.getElementById('scdStatus');
    const current=select.value;
    const statuses=uniqueValues([...groups.map(g=>canonicalStatus(g.status)),...manual.map(b=>canonicalStatus(b.status))]).sort();
    select.innerHTML='<option value="">Todos os status</option>'+statuses.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');
    if(statuses.includes(current)) select.value=current;
  }

  function sourceCard(g){
    const label=g.cotacao?`Cotação ${esc(g.cotacao)}`:(g.pedidos[0]?`Pedido ${esc(g.pedidos[0])}`:`Registro da linha ${g.rows[0]?.row||''}`);
    const sub=g.fronts.join(' · ');
    const suppliers=g.suppliers.join(' · ')||'Fornecedor não informado';
    const itemRowsHtml=g.unique.map(r=>`<tr><td><b>${esc(r.produto||'Item')}</b><br><span class="scd-sub">Linha ${r.row} · ${esc(r.setor)}</span></td><td>${number.format(r.quantidade)}</td><td><b>${fmtMoney(r.valor)}</b></td><td>${esc(r.fornecedor||'—')}</td><td>${esc(r.pedido||'—')}</td><td>${esc(canonicalStatus(r.status))}</td></tr>`).join('');
    return `<article class="scd-card" data-search="${esc([label,sub,suppliers,g.pedidos.join(' '),g.unique.map(r=>r.produto).join(' ')].join(' ').toLowerCase())}" data-status="${esc(canonicalStatus(g.status))}">
      <div class="scd-card-head"><div class="scd-card-title"><b>${label}</b><span class="scd-sub">${esc(sub||'Origem sem nome de setor')}</span></div><div class="scd-value">${fmtMoney(g.total)}</div></div>
      <div class="scd-tags"><span class="scd-tag ${toneClass(g.status)}">${esc(canonicalStatus(g.status))}</span><span class="scd-tag">${g.unique.length} item(ns)</span>${g.pedidos.length?`<span class="scd-tag">Pedido: ${esc(g.pedidos.join(', '))}</span>`:''}${g.shared.length?`<span class="scd-tag info">Compartilhada: ${esc(g.shared.join(', '))}</span>`:''}${g.duplicateCount?`<span class="scd-tag warn">${g.duplicateCount} linha(s) duplicada(s) consolidada(s)</span>`:''}</div>
      <div class="scd-progress"><i style="width:${progressForStatus(g.status)}%"></i></div>
      <div class="scd-grid"><div class="scd-meta"><span>Fornecedor(es)</span><b>${esc(suppliers)}</b></div><div class="scd-meta"><span>Data mais recente</span><b>${fmtDate(g.date)}</b></div><div class="scd-meta"><span>Origem</span><b>${esc(g.origins.join(', ')||'—')}</b></div><div class="scd-meta"><span>Disciplina</span><b>${esc(g.disciplines.join(', ')||'—')}</b></div></div>
      ${g.duplicateCount?`<div class="scd-note"><b>Consolidação anti-duplicidade:</b> valor bruto das linhas ${fmtMoney(g.bruto)}; valor considerado ${fmtMoney(g.total)}. Os registros originais continuam visíveis abaixo para auditoria.</div>`:''}
      <details class="scd-details"><summary>Ver detalhe completo dos itens (${g.rows.length} linha(s) de origem)</summary><div class="scd-table-wrap"><table class="scd-table"><thead><tr><th>Produto / origem</th><th>Qtd.</th><th>Valor</th><th>Fornecedor</th><th>Pedido</th><th>Status</th></tr></thead><tbody>${itemRowsHtml}</tbody></table></div></details>
    </article>`;
  }

  function manualCard(b){
    return `<article class="scd-card" data-search="${esc([b.id,b.description,b.supplier,b.notes].join(' ').toLowerCase())}" data-status="${esc(canonicalStatus(b.status))}"><div class="scd-card-head"><div class="scd-card-title"><b>${esc(b.description)}</b><span class="scd-sub">Registro manual · ${esc(b.id)}</span></div><div class="scd-value">${fmtMoney(b.value)}</div></div><div class="scd-tags"><span class="scd-tag ${toneClass(b.status)}">${esc(canonicalStatus(b.status))}</span>${b.supplier?`<span class="scd-tag">${esc(b.supplier)}</span>`:''}<span class="scd-tag">${fmtDate(b.date)}</span></div><div class="scd-progress"><i style="width:${progressForStatus(b.status)}%"></i></div>${b.notes?`<div class="scd-note">${esc(b.notes)}</div>`:''}<div class="scd-manual-actions"><button type="button" class="scd-btn" data-manual-edit="${esc(b.id)}">Editar</button><button type="button" class="scd-btn danger" data-manual-delete="${esc(b.id)}">Excluir</button></div></article>`;
  }

  function renderKpis(itemId,groups,manual){
    const uniqueAll=uniqueEconomic(itemRows(itemId));
    const total=groups.reduce((a,g)=>a+g.total,0)+manual.reduce((a,b)=>a+b.value,0);
    const bought=groups.filter(g=>canonicalStatus(g.status)==='Comprado').reduce((a,g)=>a+g.total,0)+manual.filter(b=>canonicalStatus(b.status)==='Comprado').reduce((a,b)=>a+b.value,0);
    const quote=groups.filter(g=>canonicalStatus(g.status)==='Em orçamento').reduce((a,g)=>a+g.total,0)+manual.filter(b=>canonicalStatus(b.status)==='Em orçamento').reduce((a,b)=>a+b.value,0);
    document.getElementById('scdKpis').innerHTML=[
      ['Processos / cotações',groups.length+manual.length],['Itens únicos',uniqueAll.length],['Valor consolidado',fmtMoney(total)],['Comprado',fmtMoney(bought)],['Em orçamento',fmtMoney(quote)]
    ].map(x=>`<div class="scd-kpi"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');
  }

  function renderLists(itemId){
    const groups=groupSourceRows(itemId), manual=manualGroups(itemId);
    const q=(document.getElementById('scdSearch')?.value||'').trim().toLowerCase();
    const st=document.getElementById('scdStatus')?.value||'';
    const src=groups.filter(g=>{
      const hay=[g.cotacao,g.pedidos.join(' '),g.fronts.join(' '),g.suppliers.join(' '),g.unique.map(r=>r.produto).join(' ')].join(' ').toLowerCase();
      return (!q||hay.includes(q)) && (!st||canonicalStatus(g.status)===st);
    });
    const man=manual.filter(b=>{
      const hay=[b.id,b.description,b.supplier,b.notes].join(' ').toLowerCase();
      return (!q||hay.includes(q)) && (!st||canonicalStatus(b.status)===st);
    });
    const content=document.getElementById('scdContent');
    content.innerHTML=`<div class="scd-section-title"><div><h4>Base detalhada de custos</h4><small>${src.length} processo(s) após filtros · dados preservados por item</small></div></div><div class="scd-list">${src.length?src.map(sourceCard).join(''):'<div class="scd-empty">Nenhum registro da base detalhada encontrado para este filtro.</div>'}</div><div class="scd-section-title"><div><h4>Cotações adicionadas no painel</h4><small>${man.length} registro(s) editável(is)</small></div></div><div class="scd-list">${man.length?man.map(manualCard).join(''):'<div class="scd-empty">Ainda não há cotação manual vinculada a esta obra. Use “Nova cotação”.</div>'}</div>`;
  }

  function renderDialog(itemId){
    currentItemId=String(itemId||'');
    const item=getItemSafe(currentItemId);
    const groups=groupSourceRows(currentItemId), manual=manualGroups(currentItemId);
    document.getElementById('scdTitle').textContent=`Detalhamento de custo · ${currentItemId}`;
    document.getElementById('scdSub').textContent=item?`${item.title||'Obra'} · ${item.area||''}`:'Cotações, pedidos, fornecedores e itens da base de melhorias.';
    const srcMeta=window.STEP_COST_SOURCE_META||{};
    document.getElementById('scdSource').textContent=`${srcMeta.rows||sourceRows.length} linhas na base · ${itemRows(currentItemId).length} vinculada(s)`;
    setStatusOptions(groups,manual); renderKpis(currentItemId,groups,manual); renderLists(currentItemId);
  }

  function openDetail(itemId){
    ensureStyles(); const d=ensureDialog();
    document.getElementById('scdSearch').value=''; document.getElementById('scdStatus').value='';
    renderDialog(itemId); if(!d.open) d.showModal();
  }
  window.openStepCostDetail=openDetail;

  function findItemId(list){
    let n=list;
    for(let i=0;i<8 && n && n!==document.body;i++,n=n.parentElement){
      const badge=n.querySelector?.('.item-badge');
      if(badge){ const id=(badge.textContent||'').trim(); if(id && id.length<=8) return id; }
    }
    try{ if(typeof selectedId!=='undefined' && selectedId) return String(selectedId); }catch(_e){}
    return '';
  }

  function enhanceCostRows(){
    document.querySelectorAll('.detail-list').forEach(list=>{
      [...list.children].forEach(row=>{
        const label=row.querySelector(':scope > span');
        if(!label || label.textContent.trim().toLowerCase()!=='custo' || row.dataset[ENHANCED]) return;
        const value=row.querySelector(':scope > b'); if(!value) return;
        const itemId=findItemId(list); if(!itemId) return;
        row.dataset[ENHANCED]='1';
        const wrap=document.createElement('div'); wrap.className='step-cost-value-actions';
        value.replaceWith(wrap); wrap.appendChild(value);
        const btn=document.createElement('button'); btn.type='button'; btn.className='step-cost-detail-btn'; btn.textContent='Ver detalhamento ›'; btn.setAttribute('aria-label',`Ver detalhamento de custo da obra ${itemId}`);
        btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openDetail(itemId);});
        wrap.appendChild(btn);
      });
    });
  }

  async function init(){
    ensureStyles(); ensureDialog(); enhanceCostRows();
    sourceRows=await decodeSource();
    enhanceCostRows();
    const mo=new MutationObserver(()=>{
      clearTimeout(observerTimer); observerTimer=setTimeout(enhanceCostRows,25);
    });
    mo.observe(document.body,{childList:true,subtree:true});
    console.info(`[Obras] Detalhamento de custos ativo: ${sourceRows.length} linhas carregadas.`);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
