/* ==========================================================
   PRISMA — Motor del frontend conectado a la API real
   (Express + SQLite). Reemplaza los datos en memoria de la
   demo por llamadas fetch() al backend.
   ========================================================== */

const API = '/api';
const money = (n) => '$' + Number(n).toFixed(2);
const todayISO = () => new Date().toISOString().slice(0,10);

let token = localStorage.getItem('prisma_token') || null;

async function apiFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(API + path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de conexión con el servidor.');
  return data;
}

/* ---------------- ESTADO GLOBAL (cache local para renderizar) ---------------- */
const state = {
  config: {},
  categories: [],
  products: [],       // productos públicos activos (para sitio) o todos (dentro de admin)
  promotions: [],
  purchases: [],
  orders: [],
  inventoryLog: [],
  cart: JSON.parse(localStorage.getItem('prisma_cart') || '[]'),
};

let currentCategoryFilter = 'Todas';
let currentSort = 'relevance';
let modalProduct = null;
let modalQty = 1;
let promoIndex = 0;

function saveCart(){ localStorage.setItem('prisma_cart', JSON.stringify(state.cart)); }

/* ---------------- NAVEGACIÓN ---------------- */
function showView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('show'));
  if(name==='home'||name==='catalog'){
    document.getElementById('view-site').classList.add('show');
    document.getElementById('page-home').style.display = name==='home' ? '' : 'none';
    document.getElementById('page-catalog').style.display = name==='catalog' ? '' : 'none';
    window.scrollTo({top:0,behavior:'instant'});
  } else if(name==='adminlogin'){
    document.getElementById('view-adminlogin').classList.add('show');
  } else if(name==='admin'){
    document.getElementById('view-admin').classList.add('show');
  }
}

document.querySelectorAll('[data-nav]').forEach(el=>{
  el.addEventListener('click', async (e)=>{
    e.preventDefault();
    const target = el.getAttribute('data-nav');
    if(target==='adminlogin' && token){ showView('admin'); await enterAdmin(); return; }
    if(target==='home' || target==='catalog'){
      await loadPublicProducts();
      renderHomeRails(); renderCatalogGrid(); renderCategoryChips();
    }
    showView(target);
  });
});

/* ---------------- TOAST ---------------- */
function toast(msg, isError){
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  t.querySelector('.dot').style.background = isError ? 'var(--red)' : 'var(--green)';
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>t.classList.remove('show'), 2800);
}

/* ---------------- DARK MODE ---------------- */
document.getElementById('darkToggle').addEventListener('click', ()=>{
  document.body.classList.toggle('dark');
  document.getElementById('darkToggle').textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
});

/* ============================================================
   CARGA DE DATOS PÚBLICOS
   ============================================================ */
async function loadConfig(){
  state.config = await apiFetch('/config');
  renderContactInfo();
}
async function loadCategories(){
  state.categories = await apiFetch('/categories');
}
async function loadPublicProducts(){
  state.products = await apiFetch('/products');
}
async function loadPublicPromotions(){
  state.promotions = await apiFetch('/promotions');
}

/* ============================================================
   RENDER: HOME
   ============================================================ */
function getActivePromoForProduct(productId){
  return state.promotions.find(pr => pr.activa && String(pr.productId) === String(productId));
}

function productCard(p){
  const off = p.oldPrice && p.oldPrice > p.price;
  const outOfStock = p.stock <= 0;
  const promo = getActivePromoForProduct(p.id);
  let ribbon = '';
  if(outOfStock) ribbon = '<span class="tag-float out">Agotado</span>';
  else if(promo) ribbon = `<span class="tag-float promo" title="${promo.texto}">🔥 ${promo.titulo}</span>`;
  else if(off) ribbon = '<span class="tag-float">Oferta</span>';
  else if(p.isNew) ribbon = '<span class="tag-float">Nuevo</span>';
  return `
  <div class="card" data-id="${p.id}">
    <div class="imgwrap">
      <img src="${p.images[0]}" alt="${p.name}" loading="lazy">
      ${ribbon}
    </div>
    <div class="card-body">
      <div class="cat">${p.category}</div>
      <h4>${p.name}</h4>
      ${promo ? `<div class="promo-note">🔥 ${promo.texto || promo.titulo}</div>` : ''}
      <div class="price-row">
        <div>
          ${off ? `<span class="price strike">${money(p.oldPrice)}</span>` : ''}
          <span class="price">${money(p.price)}</span>
        </div>
        <button class="add-btn" data-quickadd="${p.id}" ${outOfStock?'disabled':''}>+</button>
      </div>
    </div>
  </div>`;
}

function renderHomeRails(){
  const destacados = state.products.filter(p=>p.featured && p.active);
  const nuevos = state.products.filter(p=>p.isNew && p.active);
  document.getElementById('railDestacados').innerHTML = destacados.map(productCard).join('') || '<p style="color:var(--ink-soft);">Aún no hay productos destacados.</p>';
  document.getElementById('railNuevos').innerHTML = nuevos.map(productCard).join('') || '<p style="color:var(--ink-soft);">Aún no hay novedades.</p>';
}

function renderPromoCarousel(){
  const activePromos = state.promotions.filter(p=>p.activa);
  const el = document.getElementById('promoCarousel');
  if(activePromos.length===0){
    el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--ink-soft);">Sin promociones activas</div>';
    return;
  }
  el.innerHTML = activePromos.map((p,i)=>`
    <div class="promo-slide ${i===0?'active':''}" style="background-image:url('${p.imagen}');background-size:cover;background-position:center;" data-i="${i}">
      <div class="content">
        <span class="tag">${p.tipo}</span>
        <h3>${p.titulo}</h3>
        <p>${p.texto}</p>
      </div>
    </div>`).join('') + `<div class="promo-dots">${activePromos.map((_,i)=>`<span class="${i===0?'active':''}" data-dot="${i}"></span>`).join('')}</div>`;
  promoIndex = 0;
  clearInterval(window._promoTimer);
  window._promoTimer = setInterval(()=>rotatePromo(activePromos.length), 4500);
  el.querySelectorAll('[data-dot]').forEach(d=>{
    d.addEventListener('click', ()=>{ promoIndex = parseInt(d.dataset.dot); setPromoSlide(activePromos.length); });
  });
}
function rotatePromo(total){ promoIndex = (promoIndex+1)%total; setPromoSlide(total); }
function setPromoSlide(total){
  const el = document.getElementById('promoCarousel');
  el.querySelectorAll('.promo-slide').forEach((s,i)=>s.classList.toggle('active', i===promoIndex));
  el.querySelectorAll('.promo-dots span').forEach((d,i)=>d.classList.toggle('active', i===promoIndex));
}

function renderContactInfo(){
  const c = state.config;
  document.querySelector('.brand-name').textContent = c.businessName || 'Prisma';
  document.getElementById('contactInfo').innerHTML = `
    <div><b>📍 Dirección</b><br>${c.address||''}</div>
    <div><b>🕒 Horario</b><br>${c.hours||''}</div>
    <div><b>📱 WhatsApp</b><br>+${c.whatsapp||''}</div>
    <div><b>📷 Instagram</b><br>${c.instagram||''}</div>
  `;
}

/* ============================================================
   RENDER: CATALOG
   ============================================================ */
function renderCategoryChips(){
  const cats = ['Todas', ...state.categories];
  document.getElementById('categoryChips').innerHTML = cats.map(c=>
    `<button class="chip ${c===currentCategoryFilter?'active':''}" data-cat="${c}">${c}</button>`
  ).join('');
}

function getFilteredProducts(){
  const q = (document.getElementById('searchInput').value || '').toLowerCase().trim();
  let list = state.products.filter(p=>p.active);
  if(currentCategoryFilter !== 'Todas') list = list.filter(p=>p.category===currentCategoryFilter);
  if(q) list = list.filter(p=>p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  if(currentSort==='price_asc') list = [...list].sort((a,b)=>a.price-b.price);
  else if(currentSort==='price_desc') list = [...list].sort((a,b)=>b.price-a.price);
  else if(currentSort==='newest') list = [...list].sort((a,b)=>(b.isNew?1:0)-(a.isNew?1:0));
  return list;
}

function renderCatalogGrid(){
  const list = getFilteredProducts();
  document.getElementById('catalogGrid').innerHTML = list.map(productCard).join('') ||
    '<p style="color:var(--ink-soft);grid-column:1/-1;text-align:center;padding:40px 0;">No encontramos productos con esos filtros.</p>';
}

document.getElementById('searchInput').addEventListener('input', renderCatalogGrid);
document.getElementById('sortSelect').addEventListener('change', (e)=>{ currentSort = e.target.value; renderCatalogGrid(); });
document.getElementById('categoryChips').addEventListener('click', (e)=>{
  const btn = e.target.closest('[data-cat]');
  if(!btn) return;
  currentCategoryFilter = btn.dataset.cat;
  renderCategoryChips();
  renderCatalogGrid();
});

document.addEventListener('click', (e)=>{
  const quick = e.target.closest('[data-quickadd]');
  if(quick){
    e.stopPropagation();
    const p = state.products.find(x=>String(x.id)===String(quick.dataset.quickadd));
    if(p) addToCart(p, 1);
    return;
  }
  const card = e.target.closest('.card[data-id]');
  if(card){
    const p = state.products.find(x=>String(x.id)===String(card.dataset.id));
    if(p) openProductModal(p);
  }
});

/* ============================================================
   MODAL DE PRODUCTO
   ============================================================ */
function openProductModal(p){
  modalProduct = p; modalQty = 1;
  document.getElementById('modalImg').src = p.images[0];
  document.getElementById('modalCat').textContent = p.category;
  document.getElementById('modalName').textContent = p.name;
  document.getElementById('modalDesc').textContent = p.description;
  document.getElementById('modalPrice').textContent = money(p.price);
  document.getElementById('modalQtyVal').textContent = '1';
  const promo = getActivePromoForProduct(p.id);
  document.getElementById('modalAvail').innerHTML = (p.stock>0
    ? `<span class="pill on">Disponible · ${p.stock} en stock</span>`
    : `<span class="pill off">Agotado</span>`) + (promo ? `<div class="promo-note" style="margin-top:8px;">🔥 ${promo.titulo}${promo.texto ? ' — '+promo.texto : ''}</div>` : '');
  document.getElementById('modalAddBtn').disabled = p.stock<=0;
  document.getElementById('modalAddBtn').style.opacity = p.stock<=0 ? 0.5 : 1;
  document.getElementById('productOverlay').classList.add('show');
}
document.getElementById('closeModalBtn').addEventListener('click', ()=>document.getElementById('productOverlay').classList.remove('show'));
document.getElementById('productOverlay').addEventListener('click', (e)=>{ if(e.target.id==='productOverlay') e.target.classList.remove('show'); });
document.getElementById('modalImg').addEventListener('click', ()=>{
  document.getElementById('zoomImg').src = modalProduct.images[0];
  document.getElementById('zoomOverlay').classList.add('show');
});
document.getElementById('zoomOverlay').addEventListener('click', ()=>document.getElementById('zoomOverlay').classList.remove('show'));
document.getElementById('modalQtyMinus').addEventListener('click', ()=>{ modalQty = Math.max(1, modalQty-1); document.getElementById('modalQtyVal').textContent = modalQty; });
document.getElementById('modalQtyPlus').addEventListener('click', ()=>{ modalQty = Math.min(modalProduct.stock, modalQty+1); document.getElementById('modalQtyVal').textContent = modalQty; });
document.getElementById('modalAddBtn').addEventListener('click', ()=>{
  if(!modalProduct || modalProduct.stock<=0) return;
  addToCart(modalProduct, modalQty);
  document.getElementById('productOverlay').classList.remove('show');
});

/* ============================================================
   CARRITO (local, persistido en localStorage; se confirma en el servidor al enviar)
   ============================================================ */
function addToCart(product, qty){
  const existing = state.cart.find(c=>String(c.id)===String(product.id));
  const maxQty = product.stock;
  if(existing){
    existing.qty = Math.min(maxQty, existing.qty + qty);
  } else {
    state.cart.push({id:product.id, name:product.name, price:product.price, image:product.images[0], qty: Math.min(maxQty,qty)});
  }
  saveCart();
  renderCart();
  toast(`Agregado: ${product.name}`);
  openCartDrawer();
}

function renderCart(){
  const items = state.cart;
  const badge = document.getElementById('cartBadge');
  const totalCount = items.reduce((s,i)=>s+i.qty,0);
  badge.style.display = totalCount>0 ? 'flex' : 'none';
  badge.textContent = totalCount;

  const wrap = document.getElementById('drawerItems');
  if(items.length===0){
    wrap.innerHTML = `<div class="empty-state">🛍️<br><br>Tu carrito está vacío.<br>Agregá productos desde el catálogo.</div>`;
  } else {
    wrap.innerHTML = items.map(i=>`
      <div class="cart-line" data-id="${i.id}">
        <img src="${i.image}">
        <div class="info">
          <h5>${i.name}</h5>
          <div class="unit">${money(i.price)} c/u</div>
          <div class="row2">
            <div class="mini-qty">
              <button data-dec="${i.id}">−</button>
              <span>${i.qty}</span>
              <button data-inc="${i.id}">+</button>
            </div>
            <b>${money(i.price*i.qty)}</b>
          </div>
        </div>
        <button class="remove-x" data-remove="${i.id}">✕</button>
      </div>
    `).join('');
  }
  const total = items.reduce((s,i)=>s+i.price*i.qty,0);
  document.getElementById('cartTotal').textContent = money(total);
}

document.getElementById('drawerItems').addEventListener('click', (e)=>{
  const dec = e.target.closest('[data-dec]');
  const inc = e.target.closest('[data-inc]');
  const rem = e.target.closest('[data-remove]');
  if(dec){
    const item = state.cart.find(c=>String(c.id)===dec.dataset.dec);
    item.qty--; if(item.qty<=0) state.cart = state.cart.filter(c=>c.id!==item.id);
    saveCart(); renderCart();
  }
  if(inc){
    const item = state.cart.find(c=>String(c.id)===inc.dataset.inc);
    const prod = state.products.find(p=>String(p.id)===String(item.id));
    if(!prod || item.qty < prod.stock) item.qty++;
    saveCart(); renderCart();
  }
  if(rem){
    state.cart = state.cart.filter(c=>String(c.id)!==rem.dataset.remove);
    saveCart(); renderCart();
  }
});

function openCartDrawer(){
  document.getElementById('cartDrawer').classList.add('show');
  document.getElementById('drawerOverlay').classList.add('show');
}
function closeCartDrawer(){
  document.getElementById('cartDrawer').classList.remove('show');
  document.getElementById('drawerOverlay').classList.remove('show');
}
document.getElementById('cartOpenBtn').addEventListener('click', openCartDrawer);
document.getElementById('closeDrawerBtn').addEventListener('click', closeCartDrawer);
document.getElementById('drawerOverlay').addEventListener('click', closeCartDrawer);

function buildWhatsAppMessage(){
  const note = document.getElementById('orderNote').value.trim();
  let msg = `¡Hola *${state.config.businessName||'Prisma'}*! 👋 Quiero hacer un pedido:\n\n`;
  state.cart.forEach(i=>{
    msg += `• ${i.qty}x ${i.name} — ${money(i.price*i.qty)}\n`;
  });
  const total = state.cart.reduce((s,i)=>s+i.price*i.qty,0);
  msg += `\n*Total: ${money(total)}*`;
  if(note) msg += `\n\n📝 Observación: ${note}`;
  return msg;
}

async function sendOrderToWhatsApp(){
  if(state.cart.length===0){ toast('Tu carrito está vacío', true); return; }
  const nota = document.getElementById('orderNote').value.trim();
  try{
    // registra el pedido en el servidor: descuenta stock real y queda en Ventas
    await apiFetch('/orders', { method:'POST', body: JSON.stringify({ items: state.cart, nota }) });
  }catch(err){
    toast('No se pudo registrar el pedido: ' + err.message, true);
    return;
  }
  const msg = buildWhatsAppMessage();
  const url = `https://wa.me/${state.config.whatsapp}?text=${encodeURIComponent(msg)}`;
  state.cart = [];
  saveCart();
  renderCart();
  document.getElementById('orderNote').value = '';
  closeCartDrawer();
  toast('Pedido enviado por WhatsApp ✓');
  await loadPublicProducts(); // refleja el nuevo stock
  renderHomeRails(); renderCatalogGrid();
  window.open(url, '_blank');
}
document.getElementById('sendWaBtn').addEventListener('click', sendOrderToWhatsApp);
document.getElementById('fabWaBtn').addEventListener('click', ()=>{
  const url = `https://wa.me/${state.config.whatsapp}?text=${encodeURIComponent('¡Hola! Tengo una consulta sobre sus productos.')}`;
  window.open(url,'_blank');
});
document.getElementById('heroWaBtn').addEventListener('click', ()=>{
  const url = `https://wa.me/${state.config.whatsapp}?text=${encodeURIComponent('¡Hola! Quisiera más información.')}`;
  window.open(url,'_blank');
});

/* ============================================================
   LOGIN ADMIN
   ============================================================ */
document.getElementById('loginBtn').addEventListener('click', doLogin);
document.getElementById('loginPass').addEventListener('keydown', (e)=>{ if(e.key==='Enter') doLogin(); });
async function doLogin(){
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  try{
    const data = await apiFetch('/auth/login', { method:'POST', body: JSON.stringify({ username, password }) });
    token = data.token;
    localStorage.setItem('prisma_token', token);
    document.getElementById('loginError').style.display='none';
    showView('admin');
    await enterAdmin();
  }catch(err){
    document.getElementById('loginError').textContent = err.message;
    document.getElementById('loginError').style.display='block';
  }
}
document.getElementById('logoutBtn').addEventListener('click', ()=>{
  token = null;
  localStorage.removeItem('prisma_token');
  showView('home');
});
document.querySelectorAll('.admin-nav-item[data-panel]').forEach(el=>{
  el.addEventListener('click', ()=>{
    document.querySelectorAll('.admin-nav-item[data-panel]').forEach(x=>x.classList.remove('active'));
    el.classList.add('active');
    renderAdminPanel(el.dataset.panel);
  });
});

async function enterAdmin(){
  try{
    await Promise.all([
      loadAdminProducts(),
      loadAdminPromotions(),
      loadPurchases(),
      loadOrders(),
      loadInventoryLog(),
      loadCategories(),
    ]);
    renderAdminPanel('dashboard');
  }catch(err){
    toast('Sesión expirada, ingresá de nuevo', true);
    token = null; localStorage.removeItem('prisma_token');
    showView('adminlogin');
  }
}

async function loadAdminProducts(){ state.products = await apiFetch('/products?all=1'); }
async function loadAdminPromotions(){ state.promotions = await apiFetch('/promotions?all=1'); }
async function loadPurchases(){ state.purchases = await apiFetch('/purchases'); }
async function loadOrders(){ state.orders = await apiFetch('/orders'); }
async function loadInventoryLog(){ state.inventoryLog = await apiFetch('/inventory/log'); }

/* ============================================================
   ADMIN — RENDER PRINCIPAL
   ============================================================ */
function renderAdminPanel(panel){
  const main = document.getElementById('adminMain');
  main.innerHTML = '<p style="color:var(--ink-soft);">Cargando...</p>';
  const renderers = {
    dashboard: renderPanelDashboard,
    productos: renderPanelProductos,
    promociones: renderPanelPromociones,
    inventario: renderPanelInventario,
    compras: renderPanelCompras,
    ventas: renderPanelVentas,
    finanzas: renderPanelFinanzas,
    clientes: renderPanelClientes,
    estadisticas: renderPanelEstadisticas,
    configuracion: renderPanelConfiguracion
  };
  Promise.resolve(renderers[panel] ? renderers[panel]() : '<p>Panel no encontrado.</p>').then(html=>{
    main.innerHTML = html;
    attachPanelEvents(panel);
  });
}
function pillEstado(estado){
  if(estado==='entregado') return '<span class="pill on">Entregado</span>';
  if(estado==='cancelado') return '<span class="pill off">Cancelado</span>';
  return '<span class="pill low">Recibido</span>';
}

/* ---- Dashboard ---- */
async function renderPanelDashboard(){
  const d = await apiFetch('/stats/dashboard');
  return `
    <div class="admin-topbar"><h1>Resumen del negocio</h1><span class="eyebrow">Hoy · ${todayISO()}</span></div>
    <div class="kpi-row">
      <div class="kpi-card g1"><div class="label">Total invertido</div><div class="value">${money(d.totalInvertido)}</div></div>
      <div class="kpi-card g2"><div class="label">Total vendido</div><div class="value">${money(d.totalVendido)}</div></div>
      <div class="kpi-card g3"><div class="label">Ganancia neta</div><div class="value">${money(d.gananciaNeta)}</div></div>
      <div class="kpi-card g4"><div class="label">Stock bajo</div><div class="value">${d.stockBajoCount}</div></div>
    </div>
    <div class="two-col">
      <div class="panel-card">
        <h3>Últimos pedidos</h3>
        <table>
          <tr><th>Fecha</th><th>Total</th><th>Estado</th></tr>
          ${d.ultimosPedidos.map(o=>`<tr><td>${o.fecha}</td><td>${money(o.total)}</td><td>${pillEstado(o.estado)}</td></tr>`).join('') || '<tr><td colspan="3" style="color:var(--ink-soft);">Sin pedidos aún</td></tr>'}
        </table>
      </div>
      <div class="panel-card">
        <h3>Productos con poco stock</h3>
        <table>
          <tr><th>Producto</th><th>Stock</th></tr>
          ${d.productosPocoStock.map(p=>`<tr><td>${p.name}</td><td>${p.stock===0?'<span class="pill off">Agotado</span>':`<span class="pill low">${p.stock} u.</span>`}</td></tr>`).join('') || '<tr><td colspan="2" style="color:var(--ink-soft);">Todo el stock está saludable</td></tr>'}
        </table>
      </div>
    </div>
  `;
}

/* ---- Productos ---- */
function renderPanelProductos(){
  return `
    <div class="admin-topbar"><h1>Productos</h1><button class="btn btn-primary" id="newProductBtn">+ Nuevo producto</button></div>
    <div class="panel-card">
      <table>
        <tr><th>Imagen</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Estado</th><th>Etiquetas</th><th>Acciones</th></tr>
        ${state.products.map(p=>`
          <tr>
            <td><img class="mini-thumb" src="${p.images[0]}"></td>
            <td>${p.name}</td>
            <td>${p.category}</td>
            <td>${money(p.price)}</td>
            <td>${p.stock}</td>
            <td>${p.active?'<span class="pill on">Activo</span>':'<span class="pill off">Inactivo</span>'}</td>
            <td>${p.featured?'⭐ ':''}${p.isNew?'🆕':''}</td>
            <td class="tbl-actions">
              <button data-editp="${p.id}">Editar</button>
              <button data-togglep="${p.id}">${p.active?'Desactivar':'Activar'}</button>
              <button class="danger" data-delp="${p.id}">Eliminar</button>
            </td>
          </tr>
        `).join('')}
      </table>
    </div>
    <div class="panel-card" id="productFormCard" style="display:none;"></div>
  `;
}

function productFormHTML(p){
  const isEdit = !!p;
  p = p || {id:null, name:'', category:state.categories[0]||'', price:'', oldPrice:'', stock:0, active:true, featured:false, isNew:false, description:'', images:['']};
  const hasImage = p.images[0] && p.images[0].length > 0;
  return `
    <h3>${isEdit?'Editar producto':'Nuevo producto'}</h3>
    <div class="form-grid">
      <div class="field"><label>Nombre</label><input id="f_name" value="${p.name}"></div>
      <div class="field"><label>Categoría</label>
        <select id="f_category">${state.categories.map(c=>`<option ${c===p.category?'selected':''}>${c}</option>`).join('')}</select>
      </div>
      <div class="field"><label>Precio</label><input id="f_price" type="number" step="0.01" value="${p.price}"></div>
      <div class="field"><label>Precio anterior (para oferta, opcional)</label><input id="f_oldprice" type="number" step="0.01" value="${p.oldPrice||''}"></div>
      <div class="field"><label>Stock</label><input id="f_stock" type="number" value="${p.stock}"></div>
    </div>
    <div class="field">
      <label>Foto del producto</label>
      <input type="file" id="f_imagefile" accept="image/*">
      <div class="small-note" id="f_uploadstatus">Subí una foto desde tu computadora o celular. El sistema la recorta, ajusta nitidez/color y la comprime automáticamente.</div>
      <input type="hidden" id="f_image" value="${hasImage ? p.images[0] : ''}">
    </div>
    <div class="imgpick-row">
      ${hasImage ? `<img src="${p.images[0]}" id="f_imgpreview">` : `<div id="f_imgpreview_empty" style="width:120px;height:120px;border:2px dashed var(--line);border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--ink-soft);font-size:12px;text-align:center;padding:8px;">Sin foto aún</div>`}
    </div>
    <div class="field"><label>Descripción</label><textarea id="f_desc">${p.description}</textarea></div>
    <div class="form-grid" style="margin-top:14px;">
      <label style="display:flex;align-items:center;gap:8px;font-size:13.5px;"><input type="checkbox" id="f_active" ${p.active?'checked':''}> Producto activo</label>
      <label style="display:flex;align-items:center;gap:8px;font-size:13.5px;"><input type="checkbox" id="f_featured" ${p.featured?'checked':''}> Destacado en inicio</label>
      <label style="display:flex;align-items:center;gap:8px;font-size:13.5px;"><input type="checkbox" id="f_isnew" ${p.isNew?'checked':''}> Marcar como novedad</label>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" id="saveProductBtn" data-id="${p.id||''}">Guardar producto</button>
      <button class="btn btn-outline" id="cancelProductBtn">Cancelar</button>
    </div>
  `;
}

/* ---- Promociones ---- */
function renderPanelPromociones(){
  return `
    <div class="admin-topbar"><h1>Promociones</h1><button class="btn btn-primary" id="newPromoBtn">+ Nueva promoción</button></div>
    <div class="panel-card">
      <table>
        <tr><th>Imagen</th><th>Título</th><th>Tipo</th><th>Estado</th><th>Acciones</th></tr>
        ${state.promotions.map(pr=>`
          <tr>
            <td><img class="mini-thumb" src="${pr.imagen}"></td>
            <td>${pr.titulo}</td>
            <td>${pr.tipo}</td>
            <td>${pr.activa?'<span class="pill on">Activa</span>':'<span class="pill neutral">Inactiva</span>'}</td>
            <td class="tbl-actions">
              <button data-editpromo="${pr.id}">Editar</button>
              <button data-togglepromo="${pr.id}">${pr.activa?'Desactivar':'Activar'}</button>
              <button class="danger" data-delpromo="${pr.id}">Eliminar</button>
            </td>
          </tr>
        `).join('')}
      </table>
    </div>
    <div class="panel-card" id="promoFormCard" style="display:none;"></div>
    <div class="small-note">Las promociones activas aparecen automáticamente en el carrusel de la página de inicio.</div>
  `;
}
function promoFormHTML(pr){
  const isEdit = !!pr;
  pr = pr || {id:null, tipo:'descuento', titulo:'', texto:'', imagen:`https://picsum.photos/seed/${Date.now()}/900/700`, productId:null};
  return `
    <h3>${isEdit?'Editar promoción':'Nueva promoción'}</h3>
    <div class="form-grid">
      <div class="field"><label>Tipo</label>
        <select id="p_tipo">
          <option value="descuento" ${pr.tipo==='descuento'?'selected':''}>Descuento</option>
          <option value="combo" ${pr.tipo==='combo'?'selected':''}>Combo</option>
          <option value="oferta_cantidad" ${pr.tipo==='oferta_cantidad'?'selected':''}>Oferta por cantidad</option>
          <option value="tiempo_limitado" ${pr.tipo==='tiempo_limitado'?'selected':''}>Tiempo limitado</option>
          <option value="destacado" ${pr.tipo==='destacado'?'selected':''}>Producto destacado</option>
        </select>
      </div>
      <div class="field"><label>Título</label><input id="p_titulo" placeholder="Ej: 2x1 en accesorios" value="${pr.titulo}"></div>
    </div>
    <div class="field"><label>Descripción corta</label><input id="p_texto" placeholder="Aparece debajo del título en el banner" value="${pr.texto||''}"></div>
    <div class="field"><label>URL de imagen del banner</label><input id="p_imagen" value="${pr.imagen}"></div>
    <div class="field">
      <label>Producto vinculado (opcional)</label>
      <select id="p_producto">
        <option value="">— Ninguno, solo aparece como banner general —</option>
        ${state.products.map(p=>`<option value="${p.id}" ${String(pr.productId)===String(p.id)?'selected':''}>${p.name}</option>`).join('')}
      </select>
      <div class="small-note">Si elegís un producto, la promoción aparece como etiqueta sobre esa tarjeta en el catálogo.</div>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" id="savePromoBtn" data-id="${pr.id||''}">Guardar promoción</button>
      <button class="btn btn-outline" id="cancelPromoBtn">Cancelar</button>
    </div>
  `;
}

/* ---- Inventario ---- */
function renderPanelInventario(){
  return `
    <div class="admin-topbar"><h1>Inventario</h1></div>
    <div class="panel-card">
      <table>
        <tr><th>Producto</th><th>Stock actual</th><th>Estado</th><th>Ajustar</th></tr>
        ${state.products.map(p=>`
          <tr>
            <td>${p.name}</td>
            <td>${p.stock}</td>
            <td>${p.stock===0?'<span class="pill off">Agotado</span>':p.stock<=5?'<span class="pill low">Stock bajo</span>':'<span class="pill on">Saludable</span>'}</td>
            <td class="tbl-actions">
              <button data-stockdec="${p.id}">−1</button>
              <button data-stockinc="${p.id}">+1</button>
            </td>
          </tr>
        `).join('')}
      </table>
    </div>
    <div class="panel-card">
      <h3>Historial de movimientos</h3>
      <table>
        <tr><th>Fecha</th><th>Producto</th><th>Movimiento</th></tr>
        ${state.inventoryLog.slice(0,15).map(l=>`<tr><td>${l.fecha}</td><td>${l.producto}</td><td>${l.mov}</td></tr>`).join('') || '<tr><td colspan="3" style="color:var(--ink-soft);">Sin movimientos registrados</td></tr>'}
      </table>
    </div>
  `;
}

let comprasMonthFilter = 'todos';

/* ---- Compras ---- */
function renderPanelCompras(){
  const meses = [...new Set(state.purchases.map(c=>c.fecha.slice(0,7)))].sort().reverse();
  const filtered = comprasMonthFilter==='todos' ? state.purchases : state.purchases.filter(c=>c.fecha.slice(0,7)===comprasMonthFilter);
  const invertidoFiltrado = filtered.reduce((s,c)=>s+c.cantidad*c.costoUnit,0);
  const invertidoTotal = state.purchases.reduce((s,c)=>s+c.cantidad*c.costoUnit,0);

  // resumen por mes
  const porMes = {};
  state.purchases.forEach(c=>{
    const m = c.fecha.slice(0,7);
    porMes[m] = (porMes[m]||0) + c.cantidad*c.costoUnit;
  });
  const mesesOrdenados = Object.keys(porMes).sort().reverse();

  return `
    <div class="admin-topbar"><h1>Compras</h1><span class="eyebrow">Total invertido histórico: ${money(invertidoTotal)}</span></div>
    <div class="panel-card">
      <h3>Registrar nueva compra</h3>
      <div class="form-grid">
        <div class="field"><label>Fecha</label><input type="date" id="c_fecha" value="${todayISO()}"></div>
        <div class="field"><label>Proveedor</label><input id="c_proveedor" placeholder="Nombre del proveedor"></div>
        <div class="field"><label>Producto</label>
          <select id="c_producto">${state.products.map(p=>`<option>${p.name}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Cantidad</label><input type="number" id="c_cantidad" value="1"></div>
        <div class="field"><label>Costo unitario</label><input type="number" step="0.01" id="c_costo" value="0"></div>
      </div>
      <button class="btn btn-primary" id="addPurchaseBtn">Registrar compra</button>
    </div>
    <div class="panel-card">
      <h3>Resumen por mes</h3>
      <table>
        <tr><th>Mes</th><th>Total invertido</th></tr>
        ${mesesOrdenados.map(m=>`<tr><td>${m}</td><td>${money(porMes[m])}</td></tr>`).join('') || '<tr><td colspan="2" style="color:var(--ink-soft);">Sin compras registradas</td></tr>'}
      </table>
    </div>
    <div class="panel-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h3 style="margin:0;">Historial de compras</h3>
        <select id="comprasMonthSelect">
          <option value="todos" ${comprasMonthFilter==='todos'?'selected':''}>Todos los meses</option>
          ${meses.map(m=>`<option value="${m}" ${comprasMonthFilter===m?'selected':''}>${m}</option>`).join('')}
        </select>
      </div>
      <p class="small-note" style="margin-top:0;">Mostrando ${filtered.length} compra(s) · Subtotal: ${money(invertidoFiltrado)}</p>
      <table>
        <tr><th>Fecha</th><th>Proveedor</th><th>Producto</th><th>Cantidad</th><th>Costo unit.</th><th>Total</th><th>Acciones</th></tr>
        ${filtered.map(c=>`
          <tr>
            <td>${c.fecha}</td><td>${c.proveedor}</td><td>${c.producto}</td><td>${c.cantidad}</td><td>${money(c.costoUnit)}</td><td>${money(c.cantidad*c.costoUnit)}</td>
            <td class="tbl-actions">
              <button data-editpurchase="${c.id}">Editar</button>
              <button class="danger" data-delpurchase="${c.id}">Eliminar</button>
            </td>
          </tr>`).join('') || '<tr><td colspan="7" style="color:var(--ink-soft);">Sin compras en este mes</td></tr>'}
      </table>
    </div>
    <div class="panel-card" id="purchaseFormCard" style="display:none;"></div>
  `;
}

function purchaseFormHTML(c){
  return `
    <h3>Editar compra</h3>
    <div class="form-grid">
      <div class="field"><label>Fecha</label><input type="date" id="ep_fecha" value="${c.fecha}"></div>
      <div class="field"><label>Proveedor</label><input id="ep_proveedor" value="${c.proveedor}"></div>
      <div class="field"><label>Producto</label>
        <select id="ep_producto">${state.products.map(p=>`<option ${p.name===c.producto?'selected':''}>${p.name}</option>`).join('')}</select>
      </div>
      <div class="field"><label>Cantidad</label><input type="number" id="ep_cantidad" value="${c.cantidad}"></div>
      <div class="field"><label>Costo unitario</label><input type="number" step="0.01" id="ep_costo" value="${c.costoUnit}"></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" id="savePurchaseEditBtn" data-id="${c.id}">Guardar cambios</button>
      <button class="btn btn-outline" id="cancelPurchaseEditBtn">Cancelar</button>
    </div>
  `;
}

/* ---- Ventas ---- */
function renderPanelVentas(){
  const recibidos = state.orders.filter(o=>o.estado==='recibido').length;
  const entregados = state.orders.filter(o=>o.estado==='entregado').length;
  const cancelados = state.orders.filter(o=>o.estado==='cancelado').length;
  const totalVendido = state.orders.filter(o=>o.estado!=='cancelado').reduce((s,o)=>s+o.total,0);
  return `
    <div class="admin-topbar"><h1>Ventas</h1><span class="eyebrow">Total vendido: ${money(totalVendido)}</span></div>
    <div class="kpi-row">
      <div class="kpi-card g2"><div class="label">Recibidos</div><div class="value">${recibidos}</div></div>
      <div class="kpi-card g3"><div class="label">Entregados</div><div class="value">${entregados}</div></div>
      <div class="kpi-card g1"><div class="label">Cancelados</div><div class="value">${cancelados}</div></div>
      <div class="kpi-card g4"><div class="label">Total pedidos</div><div class="value">${state.orders.length}</div></div>
    </div>
    <div class="panel-card">
      <h3>Pedidos</h3>
      <table>
        <tr><th>Fecha</th><th>Detalle</th><th>Total</th><th>Estado</th><th>Acciones</th></tr>
        ${state.orders.map(o=>`
          <tr>
            <td>${o.fecha}</td>
            <td>${o.items.map(i=>`${i.qty}x ${i.name}`).join(', ')}</td>
            <td>${money(o.total)}</td>
            <td>${pillEstado(o.estado)}</td>
            <td class="tbl-actions">
              <button data-orderstatus="${o.id}" data-status="entregado">Entregado</button>
              <button class="danger" data-orderstatus="${o.id}" data-status="cancelado">Cancelar</button>
            </td>
          </tr>
        `).join('') || '<tr><td colspan="5" style="color:var(--ink-soft);">Aún no se han recibido pedidos.</td></tr>'}
      </table>
    </div>
  `;
}

/* ---- Finanzas ---- */
async function renderPanelFinanzas(){
  const f = await apiFetch('/stats/finanzas');
  const margen = f.totalVendido>0 ? ((f.gananciaNeta/f.totalVendido)*100).toFixed(0) : 0;
  return `
    <div class="admin-topbar"><h1>Finanzas</h1></div>
    <div class="kpi-row">
      <div class="kpi-card g1"><div class="label">Total invertido</div><div class="value">${money(f.totalInvertido)}</div></div>
      <div class="kpi-card g2"><div class="label">Total vendido</div><div class="value">${money(f.totalVendido)}</div></div>
      <div class="kpi-card g3"><div class="label">Ganancia total</div><div class="value">${money(f.gananciaNeta)}</div></div>
      <div class="kpi-card g4"><div class="label">Margen</div><div class="value">${margen}%</div></div>
    </div>
    <div class="panel-card">
      <h3>Ganancia por producto</h3>
      <table>
        <tr><th>Producto</th><th>Ganancia</th></tr>
        ${Object.entries(f.gananciaPorProducto).map(([n,g])=>`<tr><td>${n}</td><td>${money(g)}</td></tr>`).join('') || '<tr><td colspan="2" style="color:var(--ink-soft);">Sin ventas registradas aún</td></tr>'}
      </table>
    </div>
  `;
}

/* ---- Clientes ---- */
function renderPanelClientes(){
  return `
    <div class="admin-topbar"><h1>Clientes</h1></div>
    <div class="panel-card">
      <p class="small-note" style="margin-top:0;">Se guardan automáticamente con cada pedido. Si querés capturar nombre y dirección en el checkout, se puede activar un formulario previo a enviar por WhatsApp.</p>
      <table>
        <tr><th>Pedido</th><th>Fecha</th><th>Total</th><th>Observación</th></tr>
        ${state.orders.map(o=>`<tr><td>#${o.id}</td><td>${o.fecha}</td><td>${money(o.total)}</td><td>${o.nota||'—'}</td></tr>`).join('') || '<tr><td colspan="4" style="color:var(--ink-soft);">Sin pedidos registrados</td></tr>'}
      </table>
    </div>
  `;
}

/* ---- Estadísticas ---- */
async function renderPanelEstadisticas(){
  const s = await apiFetch('/stats/estadisticas');
  const sorted = s.ventasPorProducto;
  const masVendido = sorted[0];
  const menosVendido = sorted[sorted.length-1];
  return `
    <div class="admin-topbar"><h1>Estadísticas</h1></div>
    <div class="kpi-row">
      <div class="kpi-card g3"><div class="label">Producto más vendido</div><div class="value" style="font-size:16px;">${masVendido?masVendido.name:'—'}</div></div>
      <div class="kpi-card g1"><div class="label">Producto menos vendido</div><div class="value" style="font-size:16px;">${menosVendido&&sorted.length>1?menosVendido.name:'—'}</div></div>
      <div class="kpi-card g4"><div class="label">Productos con poco stock</div><div class="value">${s.stockBajo.length}</div></div>
    </div>
    <div class="panel-card">
      <h3>Unidades vendidas por producto</h3>
      <table>
        <tr><th>Producto</th><th>Unidades vendidas</th></tr>
        ${sorted.map(r=>`<tr><td>${r.name}</td><td>${r.unidades}</td></tr>`).join('') || '<tr><td colspan="2" style="color:var(--ink-soft);">Sin ventas aún</td></tr>'}
      </table>
    </div>
  `;
}

/* ---- Configuración ---- */
function renderPanelConfiguracion(){
  const c = state.config;
  return `
    <div class="admin-topbar"><h1>Configuración</h1></div>
    <div class="panel-card">
      <h3>Datos del negocio</h3>
      <div class="form-grid">
        <div class="field"><label>Nombre del negocio</label><input id="cfg_name" value="${c.businessName||''}"></div>
        <div class="field"><label>Número de WhatsApp (con código de país, sin +)</label><input id="cfg_wa" value="${c.whatsapp||''}"></div>
        <div class="field"><label>Dirección</label><input id="cfg_addr" value="${c.address||''}"></div>
        <div class="field"><label>Horario de atención</label><input id="cfg_hours" value="${c.hours||''}"></div>
        <div class="field"><label>Instagram</label><input id="cfg_ig" value="${c.instagram||''}"></div>
        <div class="field"><label>Facebook</label><input id="cfg_fb" value="${c.facebook||''}"></div>
      </div>
      <button class="btn btn-primary" id="saveConfigBtn">Guardar cambios</button>
    </div>
    <div class="panel-card">
      <h3>Categorías</h3>
      <div class="chips" style="margin-bottom:12px;">${state.categories.map(cat=>`<span class="chip">${cat} <button data-editcat="${cat}" style="border:none;background:none;margin-left:4px;color:var(--ink-soft);cursor:pointer;" title="Editar">✎</button><button data-delcat="${cat}" style="border:none;background:none;color:var(--red);cursor:pointer;" title="Eliminar">✕</button></span>`).join('')}</div>
      <div class="field" style="display:flex;gap:10px;align-items:flex-end;">
        <div style="flex:1;"><label>Nueva categoría</label><input id="newCatInput" placeholder="Ej: Calzado"></div>
        <button class="btn btn-outline" id="addCatBtn">Agregar</button>
      </div>
    </div>
  `;
}

/* ============================================================
   EVENTOS DE PANELES ADMIN
   ============================================================ */
function attachPanelEvents(panel){
  if(panel==='productos'){
    document.getElementById('newProductBtn').addEventListener('click', ()=>{
      const card = document.getElementById('productFormCard');
      card.style.display = 'block';
      card.innerHTML = productFormHTML(null);
      bindProductForm();
      card.scrollIntoView({behavior:'smooth'});
    });
    document.querySelectorAll('[data-editp]').forEach(b=>b.addEventListener('click', ()=>{
      const p = state.products.find(x=>String(x.id)===b.dataset.editp);
      const card = document.getElementById('productFormCard');
      card.style.display='block';
      card.innerHTML = productFormHTML(p);
      bindProductForm();
      card.scrollIntoView({behavior:'smooth'});
    }));
    document.querySelectorAll('[data-togglep]').forEach(b=>b.addEventListener('click', async ()=>{
      const p = state.products.find(x=>String(x.id)===b.dataset.togglep);
      await apiFetch(`/products/${p.id}`, { method:'PUT', body: JSON.stringify({ active: !p.active }) });
      await loadAdminProducts();
      renderAdminPanel('productos');
      toast(!p.active ? 'Producto activado' : 'Producto desactivado');
    }));
    document.querySelectorAll('[data-delp]').forEach(b=>b.addEventListener('click', async ()=>{
      if(!confirm('¿Eliminar este producto?')) return;
      await apiFetch(`/products/${b.dataset.delp}`, { method:'DELETE' });
      await loadAdminProducts();
      renderAdminPanel('productos');
      toast('Producto eliminado');
    }));
  }

  if(panel==='promociones'){
    function bindPromoForm(){
      document.getElementById('savePromoBtn').addEventListener('click', async (e)=>{
        const id = e.target.dataset.id;
        const payload = {
          tipo:document.getElementById('p_tipo').value,
          titulo:document.getElementById('p_titulo').value || 'Nueva promoción',
          texto:document.getElementById('p_texto').value,
          imagen:document.getElementById('p_imagen').value,
          productId: document.getElementById('p_producto').value || null,
          activa:true
        };
        if(id){
          await apiFetch(`/promotions/${id}`, { method:'PUT', body: JSON.stringify(payload) });
          toast('Promoción actualizada');
        } else {
          await apiFetch('/promotions', { method:'POST', body: JSON.stringify(payload) });
          toast('Promoción creada');
        }
        await loadAdminPromotions();
        renderAdminPanel('promociones');
      });
      document.getElementById('cancelPromoBtn').addEventListener('click', ()=>{
        document.getElementById('promoFormCard').style.display='none';
      });
    }
    document.getElementById('newPromoBtn').addEventListener('click', ()=>{
      const card = document.getElementById('promoFormCard');
      card.style.display='block'; card.innerHTML = promoFormHTML(null);
      bindPromoForm();
      card.scrollIntoView({behavior:'smooth'});
    });
    document.querySelectorAll('[data-editpromo]').forEach(b=>b.addEventListener('click', ()=>{
      const pr = state.promotions.find(x=>String(x.id)===b.dataset.editpromo);
      const card = document.getElementById('promoFormCard');
      card.style.display='block'; card.innerHTML = promoFormHTML(pr);
      bindPromoForm();
      card.scrollIntoView({behavior:'smooth'});
    }));
    document.querySelectorAll('[data-togglepromo]').forEach(b=>b.addEventListener('click', async ()=>{
      await apiFetch(`/promotions/${b.dataset.togglepromo}/toggle`, { method:'PATCH' });
      await loadAdminPromotions();
      renderAdminPanel('promociones');
    }));
    document.querySelectorAll('[data-delpromo]').forEach(b=>b.addEventListener('click', async ()=>{
      await apiFetch(`/promotions/${b.dataset.delpromo}`, { method:'DELETE' });
      await loadAdminPromotions();
      renderAdminPanel('promociones');
      toast('Promoción eliminada');
    }));
  }

  if(panel==='inventario'){
    document.querySelectorAll('[data-stockinc]').forEach(b=>b.addEventListener('click', async ()=>{
      await apiFetch(`/products/${b.dataset.stockinc}/stock`, { method:'PATCH', body: JSON.stringify({ delta: 1 }) });
      await Promise.all([loadAdminProducts(), loadInventoryLog()]);
      renderAdminPanel('inventario');
    }));
    document.querySelectorAll('[data-stockdec]').forEach(b=>b.addEventListener('click', async ()=>{
      await apiFetch(`/products/${b.dataset.stockdec}/stock`, { method:'PATCH', body: JSON.stringify({ delta: -1 }) });
      await Promise.all([loadAdminProducts(), loadInventoryLog()]);
      renderAdminPanel('inventario');
    }));
  }

  if(panel==='compras'){
    document.getElementById('addPurchaseBtn').addEventListener('click', async ()=>{
      const fecha = document.getElementById('c_fecha').value || todayISO();
      const proveedor = document.getElementById('c_proveedor').value || 'Sin especificar';
      const producto = document.getElementById('c_producto').value;
      const cantidad = parseInt(document.getElementById('c_cantidad').value)||1;
      const costoUnit = parseFloat(document.getElementById('c_costo').value)||0;
      await apiFetch('/purchases', { method:'POST', body: JSON.stringify({ fecha, proveedor, producto, cantidad, costoUnit }) });
      await Promise.all([loadPurchases(), loadAdminProducts(), loadInventoryLog()]);
      renderAdminPanel('compras');
      toast('Compra registrada');
    });
    const monthSelect = document.getElementById('comprasMonthSelect');
    if(monthSelect) monthSelect.addEventListener('change', (e)=>{
      comprasMonthFilter = e.target.value;
      renderAdminPanel('compras');
    });
    document.querySelectorAll('[data-editpurchase]').forEach(b=>b.addEventListener('click', ()=>{
      const c = state.purchases.find(x=>String(x.id)===b.dataset.editpurchase);
      const card = document.getElementById('purchaseFormCard');
      card.style.display='block';
      card.innerHTML = purchaseFormHTML(c);
      card.scrollIntoView({behavior:'smooth'});
      document.getElementById('savePurchaseEditBtn').addEventListener('click', async (e)=>{
        const id = e.target.dataset.id;
        const payload = {
          fecha: document.getElementById('ep_fecha').value,
          proveedor: document.getElementById('ep_proveedor').value,
          producto: document.getElementById('ep_producto').value,
          cantidad: parseInt(document.getElementById('ep_cantidad').value)||0,
          costoUnit: parseFloat(document.getElementById('ep_costo').value)||0,
        };
        await apiFetch(`/purchases/${id}`, { method:'PUT', body: JSON.stringify(payload) });
        await Promise.all([loadPurchases(), loadAdminProducts(), loadInventoryLog()]);
        renderAdminPanel('compras');
        toast('Compra actualizada y stock ajustado');
      });
      document.getElementById('cancelPurchaseEditBtn').addEventListener('click', ()=>{ card.style.display='none'; });
    }));
    document.querySelectorAll('[data-delpurchase]').forEach(b=>b.addEventListener('click', async ()=>{
      if(!confirm('¿Eliminar esta compra del historial? Se descontará del stock lo que había sumado.')) return;
      await apiFetch(`/purchases/${b.dataset.delpurchase}`, { method:'DELETE' });
      await Promise.all([loadPurchases(), loadAdminProducts(), loadInventoryLog()]);
      renderAdminPanel('compras');
      toast('Compra eliminada del historial');
    }));
  }

  if(panel==='ventas'){
    document.querySelectorAll('[data-orderstatus]').forEach(b=>b.addEventListener('click', async ()=>{
      await apiFetch(`/orders/${b.dataset.orderstatus}/estado`, { method:'PATCH', body: JSON.stringify({ estado: b.dataset.status }) });
      await loadOrders();
      renderAdminPanel('ventas');
      toast('Estado del pedido actualizado');
    }));
  }

  if(panel==='configuracion'){
    document.getElementById('saveConfigBtn').addEventListener('click', async ()=>{
      const payload = {
        businessName: document.getElementById('cfg_name').value,
        whatsapp: document.getElementById('cfg_wa').value.replace(/\D/g,''),
        address: document.getElementById('cfg_addr').value,
        hours: document.getElementById('cfg_hours').value,
        instagram: document.getElementById('cfg_ig').value,
        facebook: document.getElementById('cfg_fb').value,
      };
      state.config = await apiFetch('/config', { method:'PUT', body: JSON.stringify(payload) });
      renderContactInfo();
      toast('Configuración guardada');
    });
    const addCatBtn = document.getElementById('addCatBtn');
    if(addCatBtn) addCatBtn.addEventListener('click', async ()=>{
      const name = document.getElementById('newCatInput').value.trim();
      if(!name) return;
      try{
        await apiFetch('/categories', { method:'POST', body: JSON.stringify({ name }) });
        await loadCategories();
        renderAdminPanel('configuracion');
        toast('Categoría agregada');
      }catch(err){ toast(err.message, true); }
    });
    document.querySelectorAll('[data-delcat]').forEach(b=>b.addEventListener('click', async ()=>{
      await apiFetch(`/categories/${encodeURIComponent(b.dataset.delcat)}`, { method:'DELETE' });
      await loadCategories();
      renderAdminPanel('configuracion');
    }));
    document.querySelectorAll('[data-editcat]').forEach(b=>b.addEventListener('click', async ()=>{
      const oldName = b.dataset.editcat;
      const newName = prompt('Nuevo nombre para la categoría:', oldName);
      if(!newName || newName===oldName) return;
      try{
        await apiFetch(`/categories/${encodeURIComponent(oldName)}`, { method:'PUT', body: JSON.stringify({ newName }) });
        await Promise.all([loadCategories(), loadAdminProducts()]);
        renderAdminPanel('configuracion');
        toast('Categoría actualizada');
      }catch(err){ toast(err.message, true); }
    }));
  }
}

function bindProductForm(){
  document.getElementById('f_imagefile').addEventListener('change', async (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const statusEl = document.getElementById('f_uploadstatus');
    statusEl.textContent = 'Optimizando imagen (recorte, nitidez, compresión)...';
    const formData = new FormData();
    formData.append('image', file);
    try{
      const res = await fetch(API + '/upload', {
        method:'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: formData
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Error al subir la imagen');
      document.getElementById('f_image').value = data.url;
      const emptyBox = document.getElementById('f_imgpreview_empty');
      if(emptyBox){
        const img = document.createElement('img');
        img.id = 'f_imgpreview';
        img.src = data.url;
        emptyBox.replaceWith(img);
      } else {
        document.getElementById('f_imgpreview').src = data.url;
      }
      statusEl.textContent = '✓ Imagen optimizada y lista';
    }catch(err){
      statusEl.textContent = 'Error: ' + err.message;
    }
  });
  document.getElementById('saveProductBtn').addEventListener('click', async (e)=>{
    const id = e.target.dataset.id;
    const imageUrl = document.getElementById('f_image').value;
    if(!imageUrl){
      document.getElementById('f_uploadstatus').textContent = '⚠️ Subí una foto antes de guardar el producto.';
      document.getElementById('f_uploadstatus').style.color = 'var(--red)';
      return;
    }
    const data = {
      name: document.getElementById('f_name').value || 'Producto sin nombre',
      category: document.getElementById('f_category').value,
      price: parseFloat(document.getElementById('f_price').value)||0,
      oldPrice: parseFloat(document.getElementById('f_oldprice').value)||0,
      stock: parseInt(document.getElementById('f_stock').value)||0,
      description: document.getElementById('f_desc').value,
      images: [imageUrl],
      active: document.getElementById('f_active').checked,
      featured: document.getElementById('f_featured').checked,
      isNew: document.getElementById('f_isnew').checked,
    };
    if(id){
      await apiFetch(`/products/${id}`, { method:'PUT', body: JSON.stringify(data) });
      toast('Producto actualizado');
    } else {
      await apiFetch('/products', { method:'POST', body: JSON.stringify(data) });
      toast('Producto creado');
    }
    document.getElementById('productFormCard').style.display='none';
    await loadAdminProducts();
    renderAdminPanel('productos');
  });
  document.getElementById('cancelProductBtn').addEventListener('click', ()=>{
    document.getElementById('productFormCard').style.display='none';
  });
}

/* ============================================================
   INICIALIZACIÓN
   ============================================================ */
async function init(){
  try{
    await Promise.all([loadConfig(), loadCategories(), loadPublicProducts(), loadPublicPromotions()]);
  }catch(err){
    toast('No se pudo conectar con el servidor. ¿Está corriendo "npm start"?', true);
  }
  renderHomeRails();
  renderPromoCarousel();
  renderCategoryChips();
  renderCatalogGrid();
  renderCart();
  showView('home');

  if(token){
    // sesión de admin recordada: validamos entrando directo si el usuario navega a /admin
  }
}
init();
