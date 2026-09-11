const products=[
{id:1,name:'Imperial',price:79.90,notes:'Amber · Leder · Zedernholz',tag:'IMPERIAL'},
{id:2,name:'Noir Essence',price:69.90,notes:'Sandelholz · Iris · Tonkabohne',tag:'NOIR'},
{id:3,name:'Velvet Rose',price:69.90,notes:'Rose · Pfingstrose · Moschus',tag:'VELVET'},
{id:4,name:'Golden Soul',price:89.90,notes:'Safran · Vanille · Amber',tag:'GOLDEN'},
{id:5,name:'Shadow Oud',price:99.90,notes:'Oud · Weihrauch · Patchouli',tag:'SHADOW'}
];
let cart=[];
const euro=n=>n.toLocaleString('de-DE',{style:'currency',currency:'EUR'});
const grid=document.getElementById('productGrid');
const panel=document.getElementById('cartPanel');
const overlay=document.getElementById('overlay');
function renderProducts(){grid.innerHTML=products.map(p=>`<article class="card"><div class="product-visual"><div class="mini-bottle"><div class="mini-label">${p.tag}</div></div></div><div class="card-body"><h3>${p.name}</h3><div class="notes">Eau de Parfum · ${p.notes}</div><div class="price-row"><span class="price">${euro(p.price)}</span><button class="add" data-id="${p.id}">🛒 In den Warenkorb</button></div></div></article>`).join('');document.querySelectorAll('.add').forEach(b=>b.onclick=()=>addToCart(+b.dataset.id));}
function addToCart(id){const item=cart.find(x=>x.id===id);item?item.qty++:cart.push({id,qty:1});renderCart();openCart();}
function removeFromCart(id){cart=cart.filter(x=>x.id!==id);renderCart();}
function renderCart(){const items=document.getElementById('cartItems');const count=cart.reduce((s,x)=>s+x.qty,0);const total=cart.reduce((s,x)=>s+products.find(p=>p.id===x.id).price*x.qty,0);document.getElementById('cartCount').textContent=count;document.getElementById('cartTotal').textContent=euro(total);document.getElementById('headerTotal').textContent=euro(total);items.innerHTML=!cart.length?'<p class="empty">Dein Warenkorb ist leer.</p>':cart.map(x=>{const p=products.find(p=>p.id===x.id);return `<div class="cart-item"><div><strong>${p.name}</strong><small>${x.qty} × ${euro(p.price)}</small></div><button class="remove" data-remove="${p.id}">Entfernen</button></div>`}).join('');items.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>removeFromCart(+b.dataset.remove));}
function openCart(){panel.classList.add('open');overlay.classList.add('show');panel.setAttribute('aria-hidden','false');}
function closeCart(){panel.classList.remove('open');overlay.classList.remove('show');panel.setAttribute('aria-hidden','true');}
document.getElementById('cartBtn').onclick=openCart;document.getElementById('closeCart').onclick=closeCart;overlay.onclick=closeCart;
document.getElementById('checkoutBtn').onclick=()=>{if(!cart.length)return alert('Dein Warenkorb ist leer.');alert('Demo-Kasse: Hier kann Stripe, PayPal oder ein anderer Zahlungsanbieter angeschlossen werden.');};
document.getElementById('newsletterForm').onsubmit=e=>{e.preventDefault();document.getElementById('formMessage').textContent='Danke – deine Anmeldung wurde vorgemerkt.';e.target.reset();};
renderProducts();renderCart();
