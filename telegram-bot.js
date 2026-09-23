const token=String(process.env.TELEGRAM_BOT_TOKEN||'').trim();
const botUsername=String(process.env.TELEGRAM_BOT_USERNAME||'Parfum_Webshop_Bot').replace(/^@/,'');
const publicBaseUrl=String(process.env.PUBLIC_BASE_URL||'https://webshop-parfum-i91u.onrender.com').replace(/\/$/,'');
const webhookSecret=String(process.env.TELEGRAM_WEBHOOK_SECRET||'').trim();
const adminChatIds=new Set(String(process.env.TELEGRAM_ADMIN_CHAT_IDS||process.env.TELEGRAM_ADMIN_CHAT_ID||'').split(',').map(x=>x.trim()).filter(Boolean));
const supportChatId=String(process.env.TELEGRAM_SUPPORT_CHAT_ID||'').trim();
const supportUsername=String(process.env.SUPPORT_USERNAME||'').replace(/^@/,'');
const wallets={BTC:String(process.env.BTC_WALLET||''),SOL:String(process.env.SOL_WALLET||''),BNB:String(process.env.BNB_WALLET||process.env.BNB_SMART_CHAIN_WALLET_ADDRESS||'')};
const orders=new Map(),sessions=new Map();
let catalog={};
const money=n=>(Number(n||0)/100).toFixed(2).replace('.',',')+' €';
const SIZE='150 ml';
const sess=id=>{const k=String(id);if(!sessions.has(k))sessions.set(k,{lastOrder:null,pendingTx:null,checkoutStep:null,checkout:{},cart:{}});return sessions.get(k)};
const save=o=>(orders.set(o.orderNumber,o),o),get=id=>orders.get(String(id||'').trim())||null;
async function api(method,body={}){if(!token)return {ok:false,description:'TELEGRAM_BOT_TOKEN fehlt'};try{const r=await fetch('https://api.telegram.org/bot'+token+'/'+method,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return await r.json()}catch(e){return {ok:false,description:e.message}}}
async function send(id,text,extra={}){return api('sendMessage',{chat_id:id,text,...extra})}
const cb=(text,data)=>({text,callback_data:data}),url=(text,u)=>({text,url:u});
async function loadCatalog(){try{const r=await fetch(publicBaseUrl+'/api/catalog',{cache:'no-store'});if(r.ok){const data=await r.json();if(data?.products)catalog=data.products}}catch(e){console.error('Catalog load failed:',e.message)}return Object.keys(catalog).length}
function mainKeyboard(){return {inline_keyboard:[[cb('🧴 332 PARFUMS','products:0')],[cb('🛒 WARENKORB','cart'),cb('🧾 BESTELLUNG','orders')],[cb('💳 ZAHLUNG / WALLETS','wallets')],[url('🌐 WEBSHOP ÖFFNEN',publicBaseUrl)]]}}
function productKeyboard(page=0){const ids=Object.keys(catalog).sort((a,b)=>Number(a)-Number(b));const size=10;const pages=Math.max(1,Math.ceil(ids.length/size));page=Math.max(0,Math.min(pages-1,Number(page)||0));const slice=ids.slice(page*size,page*size+size);const rows=[];for(let i=0;i<slice.length;i+=2){const row=[];for(const id of slice.slice(i,i+2)){const p=catalog[id];const label=(String(p.name||'ATG Parfum '+id).slice(0,20))+' · '+SIZE+' · '+money(p.price);row.push(cb(label,'add:'+id))}rows.push(row)}rows.push([cb('🛒 Warenkorb','cart')]);const nav=[];if(page>0)nav.push(cb('‹ Zurück','products:'+(page-1)));nav.push(cb((page+1)+' / '+pages,'products:'+page));if(page<pages-1)nav.push(cb('Weiter ›','products:'+(page+1)));rows.push(nav);return {inline_keyboard:rows}}
function cartKeyboard(id){const s=sess(id),entries=Object.entries(s.cart).filter(([pid,q])=>Number(q)>0);const rows=[];for(const [pid] of entries){const p=catalog[pid];if(p)rows.push([cb('➖','dec:'+pid),cb('➕ '+String(p.name).slice(0,20),'inc:'+pid),cb('🗑️','del:'+pid)])}rows.push([cb('🧹 Warenkorb leeren','clearcart')]);if(entries.length)rows.push([cb('🛒 KASSE','checkout')]);rows.push([cb('🧴 Parfums','products:0'),cb('🏠 Start','home')]);return {inline_keyboard:rows}}
function cartText(id){const s=sess(id);const entries=Object.entries(s.cart).filter(([pid,q])=>Number(q)>0);if(!entries.length)return '🛒 DEIN WARENKORB\n\nDer Warenkorb ist leer.';let total=0;const lines=entries.map(([pid,q])=>{const p=catalog[pid];const qty=Number(q);const sum=Number(p?.price||0)*qty;total+=sum;return '• '+(p?.name||'ATG Parfum '+pid)+' · '+SIZE+' · '+qty+' × '+money(p?.price||0)+' = '+money(sum)});return '🛒 ATG PARFUMS · WARENKORB\n\n'+lines.join('\n')+'\n\n💶 Gesamt: '+money(total)}
function checkoutStart(id){const s=sess(id);s.checkoutStep='name';s.checkout={};return send(id,'🛒 KASSE\n\nBitte gib deinen vollständigen Namen ein:',{reply_markup:{force_reply:true,input_field_placeholder:'Vor- und Nachname'}})}
function checkoutSummary(id){const s=sess(id);const entries=Object.entries(s.cart).filter(([pid,q])=>Number(q)>0);if(!entries.length)return null;let total=0;const items=entries.map(([pid,q])=>{const p=catalog[pid];const qty=Math.max(1,Math.min(20,Number(q)||1));const price=Number(p?.price||0)/100;total+=price*qty;return{name:p?.name||'ATG Parfum '+pid,qty,price}});return {items,total}}
async function createBotOrder(id){const s=sess(id),summary=checkoutSummary(id);if(!summary)return send(id,'🛒 Dein Warenkorb ist leer.',{reply_markup:mainKeyboard()});const now=new Date();const orderNumber='ATG-'+Date.now().toString(36).toUpperCase();const o={orderNumber,invoiceNumber:'ATG-RE-'+orderNumber.slice(4),createdAt:now.toLocaleString('de-DE',{timeZone:'Europe/Berlin'}),customer:{name:s.checkout.name,email:s.checkout.email,address:s.checkout.address},telegramChatId:String(id),items:summary.items,total:summary.total,paymentStatus:'UNBEZAHLT'};save(o);s.lastOrder=o.orderNumber;s.checkoutStep=null;s.checkout={};s.cart={};for(const adminId of adminChatIds)await send(adminId,orderText(o),{reply_markup:{inline_keyboard:[[cb('✅ Zahlung bestätigen','paid:'+o.orderNumber)]]}});if(supportChatId&&!adminChatIds.has(supportChatId))await send(supportChatId,orderText(o),{reply_markup:{inline_keyboard:[[cb('✅ Zahlung bestätigen','paid:'+o.orderNumber)]]}});await send(id,'✅ BESTELLUNG ERSTELLT\n\n'+invoiceText(o),{reply_markup:orderKeyboard(o)});await walletsSend(id,o);return o}
function orderText(o){return '🛒 ATG PARFUMS · NEUE BESTELLUNG\n\n🔢 Bestellnummer: '+o.orderNumber+'\n🧾 Rechnung: '+o.invoiceNumber+'\n📅 '+o.createdAt+'\n\n👤 KUNDE\n'+o.customer.name+'\n'+o.customer.address+'\n'+o.customer.email+'\n\n🧴 BESTELLUNG\n'+o.items.map(x=>'• '+x.name+' · '+SIZE+' · '+x.qty+' × '+money(x.price)).join('\n')+'\n\n💶 Gesamt: '+money(o.total)+'\n📌 Zahlungsstatus: '+o.paymentStatus+(o.transactionId?'\n🔗 TXID: '+o.transactionId:'')+(o.paidAt?'\n🕒 Bestätigt: '+o.paidAt:'')}
function invoiceText(o){return '🧾 ATG PARFUMS · RECHNUNG / BESTELLBESTÄTIGUNG\n\nRechnungsnummer: '+o.invoiceNumber+'\nBestellnummer: '+o.orderNumber+'\nDatum: '+o.createdAt+'\n\nKunde: '+o.customer.name+'\nAdresse: '+o.customer.address+'\nE-Mail: '+o.customer.email+'\n\n'+o.items.map(x=>'• '+x.name+' | Größe: '+SIZE+' | Menge: '+x.qty+' | '+money(x.price)+' / Stück').join('\n')+'\n\nGesamt: '+money(o.total)+'\nZahlungsstatus: '+o.paymentStatus+(o.transactionId?'\nTransaktions-ID / TXID: '+o.transactionId:'')+(o.paidAt?'\nBestätigt: '+o.paidAt:'')}
function orderKeyboard(o){const rows=[[cb('🧾 Rechnung','invoice:'+o.orderNumber)]];if(o.paymentStatus!=='BEZAHLT')rows.push([cb('💳 Wallets / QR-Codes','wallets:'+o.orderNumber)],[cb('🔗 TXID eingeben','txid:'+o.orderNumber)]);return {inline_keyboard:rows}}
async function walletsSend(id,o=null){await send(id,o?'💳 ZAHLUNG FÜR '+o.orderNumber+'\n\nGesamt: '+money(o.total)+'\nStatus: '+o.paymentStatus:'💳 ATG PARFUMS · ZAHLUNGS-WALLETS');for(const [coin,label,address] of [['BTC','₿ Bitcoin (BTC)',wallets.BTC],['SOL','◎ Solana (SOL)',wallets.SOL],['BNB','◆ BNB Smart Chain',wallets.BNB]])if(address){const r=await api('sendPhoto',{chat_id:id,photo:'https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=12&data='+encodeURIComponent(address),caption:label+'\n\n'+address+(o?'\n\nBestellung: '+o.orderNumber:'')});if(!r.ok)await send(id,label+'\n\n'+address)}}
async function sendOrder(o){save(o);for(const id of adminChatIds)await send(id,orderText(o),{reply_markup:{inline_keyboard:[[cb('✅ Zahlung bestätigen','paid:'+o.orderNumber)]]}});if(supportChatId&&!adminChatIds.has(supportChatId))await send(supportChatId,orderText(o),{reply_markup:{inline_keyboard:[[cb('✅ Zahlung bestätigen','paid:'+o.orderNumber)]]}});return {ok:true,telegramUrl:'https://t.me/'+botUsername+'?start='+encodeURIComponent(o.orderNumber),supportUrl:supportUsername?'https://t.me/'+supportUsername:''}}
async function update(update){
  if(update.callback_query){
    const q=update.callback_query,id=String(q.message?.chat?.id||''),d=String(q.data||'');
    await api('answerCallbackQuery',{callback_query_id:q.id});
    if(d.startsWith('products:'))return send(id,'🧴 ATG PARFUMS · 332 DÜFTE\n\nTippe auf einen Duft, um ihn in den Warenkorb zu legen.',{reply_markup:productKeyboard(Number(d.slice(9)))});
    if(d==='home')return send(id,'👋 WILLKOMMEN BEI ATG PARFUMS\n\n🧴 332 Düfte\n🛒 Warenkorb\n🧾 Bestellung & Rechnung\n💳 Wallets / QR-Codes\n🔗 TX-ID zur Zahlungsprüfung',{reply_markup:mainKeyboard()});
    if(d.startsWith('add:')||d.startsWith('inc:')||d.startsWith('dec:')||d.startsWith('del:')){
      const op=d.split(':')[0],pid=d.split(':')[1],s=sess(id),p=catalog[pid];if(!p)return;
      const q0=Number(s.cart[pid]||0);
      if(op==='add'||op==='inc')s.cart[pid]=q0+1;
      if(op==='dec')s.cart[pid]=Math.max(0,q0-1);
      if(op==='del')delete s.cart[pid];
      const qty=Number(s.cart[pid]||0);
      await send(id,(op==='del'?'🗑️ Entfernt: ':'✓ Hinzugefügt: ')+(p.name||'ATG Parfum '+pid)+(qty?' · '+qty+' Stück':'')+'\n\n'+cartText(id),{reply_markup:cartKeyboard(id)});
      return;
    }
    if(d==='checkout')return checkoutStart(id);
    if(d==='cart')return send(id,cartText(id),{reply_markup:cartKeyboard(id)});
    if(d==='clearcart'){sess(id).cart={};return send(id,'🧹 Warenkorb geleert.',{reply_markup:mainKeyboard()})}
    if(d==='wallets')return walletsSend(id);
    if(d.startsWith('invoice:')){const o=get(d.slice(8));return o&&send(id,invoiceText(o),{reply_markup:orderKeyboard(o)})}
    if(d.startsWith('wallets:')){const o=get(d.slice(8));return o&&walletsSend(id,o)}
    if(d.startsWith('txid:')){
      const o=get(d.slice(5));if(!o)return;sess(id).pendingTx=o.orderNumber;
      return send(id,'🔗 TRANSAKTIONS-ID / TXID\n\nBestellung: '+o.orderNumber+'\nBetrag: '+money(o.total)+'\n\nBitte jetzt die vollständige TXID senden.',{reply_markup:{force_reply:true,input_field_placeholder:'TXID'}});
    }
    if(d.startsWith('paid:')){
      const o=get(d.slice(5));if(!o)return;
      if(!adminChatIds.has(id)&&id!==supportChatId)return send(id,'⛔ Nicht autorisiert.');
      if(!o.transactionId)return send(id,'⛔ Erst TXID anfordern und prüfen.');
      o.paymentStatus='BEZAHLT';o.paidAt=new Date().toLocaleString('de-DE',{timeZone:'Europe/Berlin'});
      const invoice=invoiceText(o);
      await send(id,'💰 ZAHLUNG BESTÄTIGT\n\n'+invoice);
      if(o.telegramChatId&&o.telegramChatId!==id)await send(o.telegramChatId,'✅ ZAHLUNG BESTÄTIGT\n\n'+invoice,{reply_markup:{inline_keyboard:[[cb('🧾 Rechnung','invoice:'+o.orderNumber)]]}});
      if(supportChatId&&supportChatId!==id)await send(supportChatId,'🧾 ATG PARFUMS · RECHNUNG\n\n'+invoice);
      for(const adminId of adminChatIds)if(adminId!==id)await send(adminId,'🧾 ATG PARFUMS · RECHNUNG\n\n'+invoice);
      return;
    }
    return;
  }
  if(update.message){
    const m=update.message,id=String(m.chat?.id||''),t=String(m.text||'').trim();if(!id)return;
    if(t.startsWith('/start')){
      const orderNo=t.split(/\s+/)[1],o=orderNo?get(orderNo):null;
      if(o){o.telegramChatId=id;sess(id).lastOrder=o.orderNumber;await send(id,invoiceText(o),{reply_markup:orderKeyboard(o)});if(o.paymentStatus!=='BEZAHLT')await walletsSend(id,o);return}
      return send(id,'👋 WILLKOMMEN BEI ATG PARFUMS\n\n🧴 332 Düfte\n🛒 Warenkorb\n🧾 Bestellung & Rechnung\n💳 Wallets / QR-Codes\n🔗 TX-ID zur Zahlungsprüfung',{reply_markup:mainKeyboard()});
    }
    if(t==='/shop')return send(id,'🛒 ATG PARFUMS',{reply_markup:mainKeyboard()});
    if(t==='/wallets')return walletsSend(id);
    if(t==='/orders'){const o=sess(id).lastOrder?get(sess(id).lastOrder):null;return send(id,o?invoiceText(o):'📋 Keine Bestellung gefunden.',{reply_markup:o?orderKeyboard(o):mainKeyboard()})}
    if(t==='/products')return send(id,'🧴 ATG PARFUMS · 332 DÜFTE\n\nTippe auf einen Duft, um ihn in den Warenkorb zu legen.',{reply_markup:productKeyboard(0)});
    const s=sess(id);
    if(s.checkoutStep){
      if(s.checkoutStep==='name'){s.checkout.name=t;s.checkoutStep='email';return send(id,'📧 Danke. Bitte gib jetzt deine E-Mail-Adresse ein:',{reply_markup:{force_reply:true,input_field_placeholder:'E-Mail'}})}
      if(s.checkoutStep==='email'){if(!/^\\S+@\\S+\\.\\S+$/.test(t))return send(id,'❌ Bitte gib eine gültige E-Mail-Adresse ein.');s.checkout.email=t;s.checkoutStep='address';return send(id,'📍 Bitte gib jetzt deine vollständige Lieferadresse ein:',{reply_markup:{force_reply:true,input_field_placeholder:'Straße, Hausnummer, PLZ, Ort'}})}
      if(s.checkoutStep==='address'){s.checkout.address=t;return createBotOrder(id)}
    }
    if(s.pendingTx){
      const o=get(s.pendingTx);if(o){o.transactionId=t;o.telegramChatId=id;s.pendingTx=null;
        for(const adminId of adminChatIds)await send(adminId,'🔗 TXID EINGEGANGEN\n\n'+orderText(o),{reply_markup:{inline_keyboard:[[cb('✅ Zahlung bestätigen','paid:'+o.orderNumber)]]}});
        if(supportChatId&&!adminChatIds.has(supportChatId))await send(supportChatId,'🔗 TXID EINGEGANGEN\n\n'+orderText(o),{reply_markup:{inline_keyboard:[[cb('✅ Zahlung bestätigen','paid:'+o.orderNumber)]]}});
        return send(id,'✅ TXID gespeichert und zur Prüfung weitergeleitet.',{reply_markup:orderKeyboard(o)});
      }
    }
  }
}
async function configure(base=publicBaseUrl){if(!token)return {enabled:false};const me=await api('getMe');if(!me.ok)return {enabled:true,authenticated:false,error:me.description};await loadCatalog();const hook=await api('setWebhook',{url:base+'/api/telegram-webhook',...(webhookSecret?{secret_token:webhookSecret}:{})});await api('setMyCommands',{commands:[{command:'start',description:'ATG Parfums starten'},{command:'products',description:'332 Parfums anzeigen'},{command:'cart',description:'Warenkorb anzeigen'},{command:'orders',description:'Bestellung/Rechnung'},{command:'wallets',description:'Zahlungs-Wallets'}]});return {enabled:true,authenticated:true,username:me.result?.username,webhook:hook,catalogCount:Object.keys(catalog).length}}
function diagnostics(){return {tokenConfigured:Boolean(token),botUsername,webhookUrl:publicBaseUrl+'/api/telegram-webhook',adminRecipients:adminChatIds.size,supportConfigured:Boolean(supportChatId),wallets:{BTC:Boolean(wallets.BTC),SOL:Boolean(wallets.SOL),BNB:Boolean(wallets.BNB)},catalogCount:Object.keys(catalog).length}}
module.exports={handleUpdate:update,configure,sendOrder,diagnostics,webhookSecret,botUsername};