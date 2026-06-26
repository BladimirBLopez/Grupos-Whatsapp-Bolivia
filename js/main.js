// ============================================
// VARIABLES GLOBALES
// ============================================
let gruposData = [];
let ciudadSeleccionada     = 'todos';
let plataformaSeleccionada = 'whatsapp';
let categoriaSeleccionada  = 'todas';
let busquedaActual         = '';
let gruposMostrados = 5;
const GRUPOS_POR_PAGINA = 5;

// ============================================
// HELPERS: PLATAFORMA
// ============================================
function iconoPlataforma(p) {
  return { whatsapp:'fab fa-whatsapp', telegram:'fab fa-telegram', facebook:'fab fa-facebook', discord:'fab fa-discord', otro:'fas fa-link' }[(p||'whatsapp').toLowerCase()] || 'fab fa-whatsapp';
}
function colorPlataforma(p) {
  return { whatsapp:'#25D366', telegram:'#229ED9', facebook:'#1877F2', discord:'#5865F2', otro:'#8ba0ae' }[(p||'whatsapp').toLowerCase()] || '#25D366';
}
function labelPlataforma(p) {
  return { whatsapp:'WhatsApp', telegram:'Telegram', facebook:'Facebook', discord:'Discord', otro:'Otro' }[(p||'whatsapp').toLowerCase()] || 'WhatsApp';
}

// ============================================
// HELPERS: CATEGORÍA
// ============================================
function emojiCategoria(c) {
  return { 'compra-venta':'🛒', 
  'empleos':'💼',
  'inmuebles':'🏠',
  'ropa':'🚗',
  'educacion':'📚', 
  'deportes':'⚽', 
  'otro':'📌'
  }
  [c] || '📌';
}
function labelCategoria(c) {
  return { 
  'compra-venta':'Compra/Venta',
  'empleos':'Empleos',
  'inmuebles':'Inmuebles', 
  'ropa':'Ropas', 
  'educacion':'Educación',
  'deportes':'Deportes', 
  'otro':'Otro'
  }
  [c] || 'Otro';
}

// ============================================
// URL DE REDIRECCIÓN
// ============================================
function redirUrl(grupo) {
  return `/redir.html?url=${encodeURIComponent(grupo.link||'#')}&nombre=${encodeURIComponent(grupo.nombre||'Grupo')}&plat=${encodeURIComponent((grupo.plataforma||'whatsapp').toLowerCase())}&id=${encodeURIComponent(grupo.id||'')}`;
}

// ============================================
// REGISTRAR VISITA
// ============================================
async function registrarVisita(id) {
  if (!id) return;
  try {
    await fetch('/api/grupos', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({accion:'visita',id}) });
  } catch(e) {}
}

// ============================================
// REPORTAR LINK CAÍDO
// ============================================
async function reportarLink(id, nombre) {
  if (!id) return;
  if (!confirm(`¿Reportar el enlace de "${nombre}" como caído?`)) return;
  try {
    const res = await fetch('/api/grupos', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({accion:'reporte',id}) });
    if (res.ok) mostrarToast('⚠️ Reporte enviado, gracias por avisar');
  } catch(e) { mostrarToast('❌ Error al enviar reporte'); }
}

// ============================================
// TOAST
// ============================================
function mostrarToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1a2c3e;color:#fff;padding:10px 20px;border-radius:50px;font-size:0.82rem;font-weight:600;z-index:9999;opacity:0;transition:opacity 0.3s;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,0.2);';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  setTimeout(() => { t.style.opacity = '0'; }, 3000);
}

// ============================================
// CARGAR GRUPOS
// ============================================
async function cargarGrupos() {
  try {
    const res = await fetch('/api/grupos');
    if (res.ok) {
      gruposData = (await res.json()).grupos || [];
    } else {
      gruposData = (await (await fetch('data/grupos.json')).json()).grupos || [];
    }
  } catch(e) {
    try {
      gruposData = (await (await fetch('data/grupos.json')).json()).grupos || [];
    } catch(e2) {
      document.getElementById('gruposContainer').innerHTML = `<div class="empty-message"><i class="fas fa-exclamation-triangle"></i> Error al cargar grupos</div>`;
      return;
    }
  }
  iniciarPagina();
}

// ============================================
// INICIAR PÁGINA
// ============================================
function iniciarPagina() {
  actualizarHeroCount();
  mostrarGrupoDestacado();
  actualizarContadoresCiudades();
  renderizarGrupos();
  configurarEventListeners();
}

// ============================================
// HERO COUNTER
// ============================================
function actualizarHeroCount() {
  const el = document.getElementById('heroCount');
  if (el) el.textContent = gruposData.length;
}

// ============================================
// GRUPO DESTACADO
// ============================================
function mostrarGrupoDestacado() {
  const banner = document.getElementById('grupoDestacadoFijo');
  if (!banner) return;
  const d = gruposData.find(g => g.destacado === true);
  if (!d) { banner.innerHTML = ''; return; }

  const plat  = d.plataforma || 'whatsapp';
  const icono = iconoPlataforma(plat);
  const color = colorPlataforma(plat);
  const label = labelPlataforma(plat);
  const redir = redirUrl(d);

  banner.innerHTML = `
    <div style="position:relative;border-radius:18px;overflow:hidden;margin-bottom:1rem;background:#fff;border:2px solid #E8B923;box-shadow:0 0 0 4px rgba(232,185,35,0.1),0 8px 28px rgba(232,185,35,0.18);">
      <div style="background:linear-gradient(90deg,#B8860B,#FFD700,#F5A623,#FFD700,#B8860B);padding:7px 14px;display:flex;align-items:center;justify-content:center;gap:7px;">
        <i class="fas fa-crown" style="color:#fff;font-size:0.75rem;"></i>
        <span style="font-size:0.6rem;font-weight:900;letter-spacing:3px;color:#fff;text-transform:uppercase;">Grupo destacado de la semana</span>
        <i class="fas fa-crown" style="color:#fff;font-size:0.75rem;"></i>
      </div>
      <div style="padding:0.85rem 1rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:0.4rem;flex-wrap:wrap;">
          <h3 style="margin:0;font-size:1rem;font-weight:800;color:#0f1f2e;flex:1;">${d.nombre}</h3>
          <div style="display:flex;gap:5px;align-items:center;flex-shrink:0;">
            <span style="background:linear-gradient(135deg,#B8860B,#FFD700);color:#fff;font-size:0.6rem;font-weight:800;padding:3px 8px;border-radius:20px;display:inline-flex;align-items:center;gap:3px;"><i class="fas fa-star"></i> DESTACADO</span>
            <span style="background:${color}18;color:${color};border:1.5px solid ${color}55;font-size:0.6rem;font-weight:700;padding:3px 8px;border-radius:20px;display:inline-flex;align-items:center;gap:3px;"><i class="${icono}"></i> ${label}</span>
          </div>
        </div>
        ${d.descripcion?`<p style="margin:0 0 0.5rem;font-size:0.78rem;color:#5a7080;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${d.descripcion}</p>`:''}
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px;margin-bottom:0.5rem;">
          <span style="font-size:0.78rem;font-weight:700;color:#e65100;"><i class="fas fa-map-marker-alt"></i> ${d.ubicacion||'Bolivia'}</span>
          <span style="background:linear-gradient(135deg,#ff6b35,#f7931e);color:#fff;font-size:0.68rem;font-weight:700;padding:2px 9px;border-radius:20px;">🔥 +50 miembros/semana</span>
        </div>
        <div style="font-size:0.78rem;color:#555;margin-bottom:0.75rem;">👥 ${d.miembros||0} &nbsp;·&nbsp; 📈 ${d.activos||0}</div>
        <a href="${redir}" onclick="registrarVisita('${d.id}')" style="display:inline-flex;align-items:center;gap:7px;background:linear-gradient(135deg,${color},${color}cc);color:#fff;padding:9px 20px;border-radius:50px;font-weight:800;font-size:0.88rem;text-decoration:none;box-shadow:0 4px 16px ${color}44;">
          <i class="${icono}"></i> Unirme ahora
        </a>
      </div>
    </div>`;
}

// ============================================
// BUSCAR (función central)
// ============================================
function ejecutarBusqueda(hacerScroll = false) {
  const input = document.getElementById('searchInput');
  busquedaActual = input ? input.value : '';
  gruposMostrados = GRUPOS_POR_PAGINA;

  // Si hay búsqueda activa, mostrar todas las plataformas
  if (busquedaActual.trim()) {
    plataformaSeleccionada = 'todos';
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  }

  renderizarGrupos();

  // Solo hacer scroll cuando se solicite
  if (hacerScroll) {
    setTimeout(() => {
      document.getElementById('gruposContainer')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  }
}

// ============================================
// RENDERIZAR GRUPOS
// ============================================
function renderizarGrupos() {
  const container = document.getElementById('gruposContainer');
  if (!container) return;

  let lista = [...gruposData];

  if (plataformaSeleccionada !== 'todos') {
    lista = lista.filter(g => (g.plataforma||'whatsapp').toLowerCase() === plataformaSeleccionada.toLowerCase());
  }
  if (categoriaSeleccionada !== 'todas') {
    lista = lista.filter(g => (g.categoria||'compra-venta') === categoriaSeleccionada);
  }
  if (ciudadSeleccionada !== 'todos') {
    lista = lista.filter(g => g.ubicacion && g.ubicacion.toLowerCase() === ciudadSeleccionada.toLowerCase());
  }
  if (busquedaActual.trim()) {
    const q = busquedaActual.toLowerCase();
    lista = lista.filter(g =>
      (g.nombre||'').toLowerCase().includes(q) ||
      (g.descripcion||'').toLowerCase().includes(q) ||
      (g.ubicacion||'').toLowerCase().includes(q)
    );
  }

  const normales = lista.filter(g => !g.destacado);
  const total    = normales.length;
  const visibles = normales.slice(0, gruposMostrados);

  const el = document.getElementById('resultCount');
  if (el) el.textContent = total;

  if (total === 0) {
    container.innerHTML = `<div class="empty-message"><i class="fas fa-search" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>No se encontraron grupos</div>`;
    return;
  }

  const tarjetas = visibles.map(grupo => {
    const plat     = grupo.plataforma || 'whatsapp';
    const icono    = iconoPlataforma(plat);
    const color    = colorPlataforma(plat);
    const label    = labelPlataforma(plat);
    const redir    = redirUrl(grupo);
    const reportes = grupo.reportes || 0;
    const cat      = grupo.categoria || 'compra-venta';
    const nombreSeguro = (grupo.nombre||'').replace(/'/g,"\\'");

    return `
    <div class="grupo-card" ${reportes>=3?'style="border-color:#ffcccc;"':''}>
      <div class="card-header">
        <h3>${grupo.nombre||'Sin nombre'}</h3>
        <span class="badge-whatsapp" style="background:${color}20;color:${color};border:1px solid ${color}40;">
          <i class="${icono}"></i> ${label}
        </span>
      </div>
      ${reportes>=3?`<div style="margin:0 0.8rem 0.3rem;background:#fff3f3;border-radius:8px;padding:4px 8px;font-size:0.65rem;color:#e74c3c;font-weight:600;">⚠️ Link posiblemente caído (${reportes} reportes)</div>`:''}
      ${grupo.descripcion?`<div class="descripcion">${grupo.descripcion}</div>`:''}
      <div class="ubicacion">
        <i class="fas fa-map-marker-alt"></i> ${grupo.ubicacion||'Bolivia'}
        <span style="margin-left:auto;font-size:0.65rem;color:#8ba0ae;">${emojiCategoria(cat)} ${labelCategoria(cat)}</span>
      </div>
      <div class="stats">
        <span class="stat-item"><i class="fas fa-users"></i> ${grupo.miembros||0}</span>
        <span class="stat-item"><i class="fas fa-chart-line"></i> ${grupo.activos||0}</span>
        <span class="stat-item"><i class="fas fa-eye"></i> ${grupo.visitas||0}</span>
      </div>
      <div style="display:flex;gap:0.5rem;margin:0 0.7rem 0.7rem;">
        <a href="${redir}" onclick="registrarVisita('${grupo.id}')" class="join-btn" style="background:${color};flex:1;margin:0;">
          <i class="${icono}"></i> Unirse al grupo
        </a>
        <button onclick="reportarLink('${grupo.id}','${nombreSeguro}')"
          style="background:#fff;border:1.5px solid #e0e0e0;color:#8ba0ae;border-radius:50px;padding:0 12px;font-size:0.7rem;cursor:pointer;display:flex;align-items:center;gap:4px;transition:all 0.2s;"
          onmouseover="this.style.borderColor='#e74c3c';this.style.color='#e74c3c';"
          onmouseout="this.style.borderColor='#e0e0e0';this.style.color='#8ba0ae';"
          title="Reportar link caído"><i class="fas fa-flag"></i>
        </button>
      </div>
    </div>`;
  }).join('');

  const hayMas = gruposMostrados < total;
  const btnMas = hayMas ? `
    <div style="text-align:center;margin-top:1rem;">
      <button id="btnVerMas" style="background:#fff;border:2px solid #25D366;color:#25D366;font-weight:700;font-size:0.9rem;padding:10px 28px;border-radius:50px;cursor:pointer;display:inline-flex;align-items:center;gap:7px;"
        onmouseover="this.style.background='#25D366';this.style.color='#fff';"
        onmouseout="this.style.background='#fff';this.style.color='#25D366';">
        <i class="fas fa-chevron-down"></i> Ver más (${total - gruposMostrados} restantes)
      </button>
    </div>` : '';

  container.innerHTML = tarjetas + btnMas;

  document.getElementById('btnVerMas')?.addEventListener('click', () => {
    gruposMostrados += GRUPOS_POR_PAGINA;
    renderizarGrupos();
    container.querySelectorAll('.grupo-card')[gruposMostrados - GRUPOS_POR_PAGINA]?.scrollIntoView({behavior:'smooth',block:'start'});
  });
}

// ============================================
// CONTADORES CIUDADES
// ============================================
function actualizarContadoresCiudades() {
  let base = plataformaSeleccionada === 'todos' ? gruposData
    : gruposData.filter(g => (g.plataforma||'whatsapp').toLowerCase() === plataformaSeleccionada.toLowerCase());
  if (categoriaSeleccionada !== 'todas') {
    base = base.filter(g => (g.categoria||'compra-venta') === categoriaSeleccionada);
  }

  ['todos','Santa Cruz','La Paz','Cochabamba','Sucre','Tarija','Potosí','Oruro','Beni','Pando'].forEach(ciudad => {
    const count = ciudad === 'todos' ? base.length
      : base.filter(g => g.ubicacion && g.ubicacion.toLowerCase() === ciudad.toLowerCase()).length;
    const id = ciudad === 'todos' ? 'modalTotalCount' : `modal${ciudad.replace(/ /g,'')}Count`;
    const el = document.getElementById(id);
    if (el) el.textContent = count;
  });

  const badge = document.getElementById('selectedCityCount');
  if (badge) {
    const count = ciudadSeleccionada === 'todos' ? base.length
      : base.filter(g => g.ubicacion && g.ubicacion.toLowerCase() === ciudadSeleccionada.toLowerCase()).length;
    badge.textContent = `(${count})`;
  }
}

// ============================================
// RESET FILTROS
// ============================================
function resetFiltros() {
  ciudadSeleccionada     = 'todos';
  plataformaSeleccionada = 'whatsapp';
  categoriaSeleccionada  = 'todas';
  busquedaActual         = '';
  gruposMostrados        = GRUPOS_POR_PAGINA;

  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  document.querySelector('.filter-chip[data-platform="whatsapp"]')?.classList.add('active');
  document.querySelectorAll('.cat-item').forEach(c => c.classList.remove('active'));
  document.querySelector('.cat-item[data-cat="todas"]')?.classList.add('active');
  document.getElementById('selectedCityName').textContent = 'Todos los departamentos';
  const si = document.getElementById('searchInput');
  if (si) si.value = '';

  renderizarGrupos();
  actualizarContadoresCiudades();
}

// ============================================
// LOGIN ADMIN
// ============================================
const ADMIN_CREDENTIALS = { usuario:'admin', password:'admin123' };

// ============================================
// EVENT LISTENERS
// ============================================
function configurarEventListeners() {

  // Logo reset
  document.getElementById('logoResetBtn')?.addEventListener('click', resetFiltros);

  // Admin login
  document.getElementById('btnAdminLogin')?.addEventListener('click', () => {
    document.getElementById('loginModal').classList.add('show');
    document.getElementById('loginForm').reset();
    document.getElementById('loginError').classList.remove('show');
    document.getElementById('loginUser').focus();
  });
  document.getElementById('closeLoginBtn')?.addEventListener('click', () =>
    document.getElementById('loginModal').classList.remove('show'));
  document.getElementById('loginModal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove('show');
  });
  document.getElementById('loginForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    const btn  = document.getElementById('loginSubmitBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
    setTimeout(() => {
      if (user === ADMIN_CREDENTIALS.usuario && pass === ADMIN_CREDENTIALS.password) {
        window.location.href = 'admin.html';
      } else {
        document.getElementById('loginError').classList.add('show');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Ingresar';
        document.getElementById('loginPass').value = '';
        setTimeout(() => document.getElementById('loginError').classList.remove('show'), 3000);
      }
    }, 800);
  });

  // Buscador — input en tiempo real
  document.getElementById('searchInput')?.addEventListener('input', () => {
  ejecutarBusqueda(false);
});

  // Botón Buscar — clic directo
document.getElementById('btnBuscar')?.addEventListener('click', () => {
  ejecutarBusqueda(true);
});

  // Enter en el buscador
 document.getElementById('searchInput')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    ejecutarBusqueda(true);
  }
});

  // Navbar inferior buscar
  document.getElementById('navBuscar')?.addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('searchInput')?.focus();
    document.querySelectorAll('.bottom-nav-item').forEach(i => i.classList.remove('active'));
    document.getElementById('navBuscar').classList.add('active');
  });

  // Filtros plataforma
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      plataformaSeleccionada = chip.dataset.platform;
      gruposMostrados = GRUPOS_POR_PAGINA;
      renderizarGrupos();
      actualizarContadoresCiudades();
    });
  });

  // Categorías circulares
  document.querySelectorAll('.cat-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.cat-item').forEach(c => c.classList.remove('active'));
      item.classList.add('active');
      categoriaSeleccionada = item.dataset.cat;
      gruposMostrados = GRUPOS_POR_PAGINA;
      renderizarGrupos();
      actualizarContadoresCiudades();
    });
  });

  // Modal ciudades
  document.getElementById('openCityModalBtn')?.addEventListener('click', () =>
    document.getElementById('cityModal').style.display = 'flex');
  document.getElementById('closeCityModalBtn')?.addEventListener('click', () =>
    document.getElementById('cityModal').style.display = 'none');
  document.getElementById('cityModal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
  });

  document.querySelectorAll('.city-item').forEach(item => {
    item.addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('.city-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      ciudadSeleccionada = item.dataset.city;
      document.getElementById('selectedCityName').textContent =
        ciudadSeleccionada === 'todos' ? 'Todos los departamentos' : ciudadSeleccionada;
      document.getElementById('cityModal').style.display = 'none';
      gruposMostrados = GRUPOS_POR_PAGINA;
      renderizarGrupos();
      actualizarContadoresCiudades();
    });
  });

  document.getElementById('citySearchInput')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.city-item').forEach(item => {
      item.style.display = item.querySelector('.city-info span')?.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });

  // Navbar inferior
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.bottom-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', cargarGrupos);
