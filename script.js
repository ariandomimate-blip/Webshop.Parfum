const products=[
 {id:1,name:'NO. 01 — SIGNATURE',price:89,notes:'Amber · Vetiver · Zedernholz',tag:'SIGNATURE'},
 {id:2,name:'NO. 02 — NOIR',price:95,notes:'Sandelholz · Iris · Tonkabohne',tag:'NOIR'},
 {id:3,name:'NO. 03 — ÉCLAT',price:92,notes:'Bergamotte · Safran · Moschus',tag:'ÉCLAT'}
];
let cart=[];
const grid=document.getElementById('productGrid');
const cartPanel=document.getElementById('cartPanel');
const overlay=document.getElementById('overlay');
function renderProducts(){grid.innerHTML=products.map(p=>`<article class="card"><div class="product-visual"><div class="mini-bottle"><div class="mini-label">${p.tag}</div></div></div><div class="card-body"><h3>${p.name}</h3><div class="notes">${p.notes}</div><div class="price-row"><span class="price">${p.price.toFixed(2).replace('.',',')} €</span><button class="add" data-id="${p.id}">In den Warenkorb</button></div></div></article>`).join('');
 document.querySelectorAll('.add').forEach(b=>b.addEventListener('click',()=>addToCart(Number(b.dataset.id))));}
function addToCart(id){const found=cart.find(x=>x.id===id);if(found)found.qty++;else cart.push({id,qty:1});renderCart();openCart();}
function removeFromCart(id){cart=cart.filter(x=>x.id!==id);renderCart();}
function renderCart(){const items=document.getElementById('cartItems');const count=cart.reduce((s,x)=>s+x.qty,0);document.getElementById('cartCount').textContent=count;const total=cart.reduce((s,x)=>s+products.find(p=>p.id===x.id).price*x.qty,0);document.getElementById('cartTotal').textContent=total.toFixed(2).replace('.',',')+' €';if(!cart.length){items.innerHTML='<p class="empty">Dein Warenkorb ist leer.</p>';return;}items.innerHTML=cart.map(x=>{const p=products.find(p=>p.id===x.id);return `<div class="cart-item"><div><strong>${p.name}</strong><small>${x.qty} × ${p.price.toFixed(2).replace('.',',')} €</small></div><button class="remove" data-remove="${p.id}">Entfernen</button></div>`}).join('');items.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>removeFromCart(Number(b.dataset.remove))));}
function openCart(){cartPanel.classList.add('open');overlay.classList.add('show');cartPanel.setAttribute('aria-hidden','false');}
function closeCart(){cartPanel.classList.remove('open');overlay.classList.remove('show');cartPanel.setAttribute('aria-hidden','true');}
document.getElementById('cartBtn').addEventListener('click',openCart);document.getElementById('closeCart').addEventListener('click',closeCart);overlay.addEventListener('click',closeCart);
document.getElementById('checkoutBtn').addEventListener('click',()=>{if(!cart.length){alert('Dein Warenkorb ist leer.');return;}alert('Demo-Kasse: Für echte Zahlungen kann anschließend Stripe, PayPal oder ein anderer Zahlungsanbieter angebunden werden.');});
document.getElementById('newsletterForm').addEventListener('submit',e=>{e.preventDefault();document.getElementById('formMessage').textContent='Danke – deine Anmeldung wurde vorgemerkt.';e.target.reset();});
renderProducts();renderCart();
