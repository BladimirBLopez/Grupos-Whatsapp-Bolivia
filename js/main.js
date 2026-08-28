// ============================================
// VARIABLES GLOBALES
// ============================================
let gruposData = [];
let ciudadSeleccionada     = 'todos';
let plataformaSeleccionada = 'todos';
let categoriaSeleccionada  = 'todas';
let busquedaActual         = '';
let gruposMostrados = 5;
let categoriasGlobal = [];
const GRUPOS_POR_PAGINA = 5;

// ============================================
// HELPERS: PLATAFORMA
// ============================================
function iconoPlataforma(p) {
  return { whatsapp:'fab fa-whatsapp', telegram:'fab fa-telegram', facebook:'fab fa-facebook', instagram:'fab fa-instagram', otro:'fas fa-link' }[(p||'whatsapp').toLowerCase()] || 'fab fa-whatsapp';
}
function colorPlataforma(p) {
  return { whatsapp:'#25D366', telegram:'#229ED9', facebook:'#1877F2', instagram:'#E1306C', otro:'#8ba0ae' }[(p||'whatsapp').toLowerCase()] || '#25D366';
}
function labelPlataforma(p) {
  return { whatsapp:'WhatsApp', telegram:'Telegram', facebook:'Facebook', instagram:'Instagram', otro:'Otro' }[(p||'whatsapp').toLowerCase()] || 'WhatsApp';
}
// ============================================
// HELPERS: CATEGORÍA
// ============================================
function emojiCategoria(slug) {
  const cat = categoriasGlobal.find(c => c.slug === slug);
  if (cat) return cat.emoji;

  const fb = {
    'compra-venta': '🛒',
    'empleos': '💼',
    'inmuebles': '🏠',
    'ropa': '👕',
    'citas': '💬',
    'futbol': '⚽',
    'otro': '🗂️'
  };

  return fb[slug] || '🗂️';
}

function labelCategoria(slug) {
  const cat = categoriasGlobal.find(c => c.slug === slug);
  if (cat) return cat.label;

  const fb = {
    'compra-venta': 'Compra/Venta',
    'empleos': 'Empleos',
    'inmuebles': 'Inmuebles',
    'ropa': 'Ropas',
    'citas': 'Citas/Amigos',
    'futbol': 'Fútbol',
    'otro': 'Otros'
  };

  return fb[slug] || 'Otros';
}

// ============================================
// URL DE REDIRECCIÓN
// ============================================
function slugify(str) {
  return String(str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function slugGrupo(grupo) {
  return `${slugify(grupo.nombre) || 'grupo'}-${grupo.id}`;
}

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
let reporteIdPendiente = null;

function reportarLink(id, nombre) {
  if (!id) return;
  reporteIdPendiente = id;
  document.getElementById('confirmReporteTexto').textContent = `¿Reportar el enlace de "${nombre}" como caído?`;
  document.getElementById('confirmReporteModal').style.display = 'flex';
}

function cerrarConfirmReporte() {
  document.getElementById('confirmReporteModal').style.display = 'none';
  reporteIdPendiente = null;
}

async function confirmarReporte() {
  const id = reporteIdPendiente;
  cerrarConfirmReporte();
  if (!id) return;
  try {
    const res = await fetch('/api/grupos', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({accion:'reporte',id}) });
    if (res.ok) mostrarToast('⚠️ Reporte enviado, gracias por avisar');
  } catch(e) { mostrarToast('❌ Error al enviar reporte'); }
}

document.getElementById('cancelReporteBtn')?.addEventListener('click', cerrarConfirmReporte);
document.getElementById('aceptarReporteBtn')?.addEventListener('click', confirmarReporte);
document.getElementById('confirmReporteModal')?.addEventListener('click', function(e) {
  if (e.target === this) cerrarConfirmReporte();
});

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
function mostrarSkeleton() {
  const container = document.getElementById('gruposContainer');
  if (!container) return;
  container.innerHTML = Array(4).fill(`
    <div class="grupo-card" style="pointer-events:none;">
      <div class="card-header">
        <div style="width:46px;height:46px;border-radius:50%;background:linear-gradient(90deg,#f0f4f8 25%,#e2edf2 50%,#f0f4f8 75%);background-size:200% 100%;animation:shimmer 1.2s infinite;flex-shrink:0;"></div>
        <div style="flex:1;">
          <div style="height:14px;border-radius:6px;background:linear-gradient(90deg,#f0f4f8 25%,#e2edf2 50%,#f0f4f8 75%);background-size:200% 100%;animation:shimmer 1.2s infinite;margin-bottom:6px;width:70%;"></div>
          <div style="height:10px;border-radius:6px;background:linear-gradient(90deg,#f0f4f8 25%,#e2edf2 50%,#f0f4f8 75%);background-size:200% 100%;animation:shimmer 1.2s infinite;width:40%;"></div>
        </div>
      </div>
      <div style="padding:0 0.8rem 0.8rem;">
        <div style="height:10px;border-radius:6px;background:linear-gradient(90deg,#f0f4f8 25%,#e2edf2 50%,#f0f4f8 75%);background-size:200% 100%;animation:shimmer 1.2s infinite;margin-bottom:8px;width:90%;"></div>
        <div style="height:36px;border-radius:50px;background:linear-gradient(90deg,#f0f4f8 25%,#e2edf2 50%,#f0f4f8 75%);background-size:200% 100%;animation:shimmer 1.2s infinite;"></div>
      </div>
    </div>`).join('');
}

async function cargarGrupos() {
  // Mostrar skeleton inmediatamente
  mostrarSkeleton();

  try {
    // Cargar grupos y categorías EN PARALELO
    const [resGrupos, resCats] = await Promise.all([
      fetch('/api/grupos'),
      fetch('/api/categorias')
    ]);

    if (resGrupos.ok) {
      gruposData = (await resGrupos.json()).grupos || [];
    }
    if (resCats.ok) {
      categoriasGlobal = (await resCats.json()).categorias || [];
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
  renderizarCategoriasCirculares();
  renderizarGrupos();
  configurarEventListeners();
  aplicarBusquedaDesdeURL();
}

// Si se llega con ?q=algo (ej. desde Google usando el buscador del sitio),
// abre el buscador ya con ese término aplicado
function aplicarBusquedaDesdeURL() {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (!q) return;
  abrirBuscador();
  const input = document.getElementById('searchInputNav');
  if (input) {
    input.value = q;
    busquedaActual = q;
    plataformaSeleccionada = 'todos';
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    renderizarGrupos();
  }
}

function renderizarCategoriasCirculares() {
  const contenedores = ['categoriasScroll', 'categoriasScrollPanel']
    .map(id => document.getElementById(id))
    .filter(Boolean);
  if (contenedores.length === 0 || categoriasGlobal.length === 0) return;

  contenedores.forEach(scroll => {
    scroll.querySelectorAll('.cat-item:not([data-cat="todas"])').forEach(el => el.remove());
    categoriasGlobal.forEach(cat => {
      const div = document.createElement('div');
      div.className = 'cat-item';
      div.dataset.cat = cat.slug;
      div.innerHTML = `<div class="cat-icon">${cat.emoji}</div><span class="cat-label">${cat.label}</span>`;
      scroll.appendChild(div);
    });
  });

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
  const tieneImg = d.imagen && d.imagen.trim() && !d.imagen.includes('undefined');

  banner.innerHTML = `
    <div style="border-radius:20px;overflow:hidden;margin-bottom:1rem;background:#fff;border:2px solid #E8B923;box-shadow:0 4px 20px rgba(232,185,35,0.25);">

      <!-- Ribbon -->
      <div style="background:linear-gradient(90deg,#B8860B,#FFD700,#F5A623,#FFD700,#B8860B);padding:6px;display:flex;align-items:center;justify-content:center;gap:6px;">
        <i class="fas fa-crown" style="color:#fff;font-size:0.7rem;"></i>
        <span style="font-size:0.6rem;font-weight:900;letter-spacing:2px;color:#fff;text-transform:uppercase;">Grupo destacado de la semana</span>
        <i class="fas fa-crown" style="color:#fff;font-size:0.7rem;"></i>
      </div>

      <!-- Contenido -->
      <div style="padding:0.9rem 1rem;">

        <!-- Header con foto -->
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:0.7rem;">
          ${tieneImg ? `
          <img src="${d.imagen}" alt="${d.nombre||''}"
            style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid #FFD700;flex-shrink:0;"
            onerror="this.style.display='none'">
          ` : `
          <div style="width:52px;height:52px;border-radius:50%;background:${color}22;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:2px solid #FFD700;">
            <i class="${icono}" style="color:${color};font-size:1.3rem;"></i>
          </div>
          `}
          <div style="flex:1;min-width:0;">
            <h3 style="margin:0 0 4px;font-size:0.95rem;font-weight:800;color:#0f1f2e;line-height:1.2;">${d.nombre||''}</h3>
            <div style="display:flex;gap:5px;flex-wrap:wrap;">
              <span style="background:linear-gradient(135deg,#B8860B,#FFD700);color:#fff;font-size:0.6rem;font-weight:800;padding:2px 8px;border-radius:20px;display:inline-flex;align-items:center;gap:3px;">
                <i class="fas fa-star"></i> DESTACADO
              </span>
              <span style="background:${color}18;color:${color};border:1px solid ${color}44;font-size:0.6rem;font-weight:700;padding:2px 8px;border-radius:20px;display:inline-flex;align-items:center;gap:3px;">
                <i class="${icono}"></i> ${label}
              </span>
            </div>
          </div>
        </div>

        ${d.descripcion ? `<p style="margin:0 0 0.6rem;font-size:0.78rem;color:#5a7080;line-height:1.4;">${d.descripcion}</p>` : ''}

        <!-- Info -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.7rem;flex-wrap:wrap;gap:4px;">
          <span style="font-size:0.78rem;font-weight:600;color:#e65100;display:flex;align-items:center;gap:4px;">
            <i class="fas fa-map-marker-alt"></i> ${d.ubicacion||'Bolivia'}
          </span>
          <span style="background:linear-gradient(135deg,#ff6b35,#f7931e);color:#fff;font-size:0.68rem;font-weight:700;padding:3px 10px;border-radius:20px;">
            🔥 +50 miembros/semana
          </span>
        </div>

        <!-- Stats -->
        <div style="display:flex;gap:1rem;margin-bottom:0.8rem;font-size:0.72rem;color:#6b7f8e;">
          <span><i class="fas fa-users" style="color:#25D366;"></i> ${d.miembros||0} miembros</span>
          <span><i class="fas fa-eye" style="color:#3B82F6;"></i> ${d.visitas||0} visitas</span>
        </div>

        <!-- Botón -->
        <a href="${redir}" onclick="registrarVisita('${d.id}')"
          style="display:flex;align-items:center;justify-content:center;gap:7px;background:linear-gradient(135deg,${color},${color}cc);color:#fff;padding:11px;border-radius:50px;font-weight:800;font-size:0.9rem;text-decoration:none;box-shadow:0 4px 14px ${color}44;">
          <i class="${icono}"></i> Unirme ahora
        </a>
      </div>
    </div>`;
}


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
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

  actualizarBadgeFiltros();

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
    const nombreSeguro = escapeHtml(grupo.nombre||'');

    const tieneImagen = grupo.imagen && grupo.imagen.trim() && !grupo.imagen.includes('undefined');

    return `
    <div class="grupo-card" ${reportes>=3?'style="border-color:#ffcccc;"':''}>
      <div class="card-header">
        ${tieneImagen ? `
        <img src="${escapeHtml(grupo.imagen)}" alt="${nombreSeguro}"
          class="grupo-foto" loading="lazy" onerror="this.style.display='none'">
        ` : `
        <div class="grupo-foto-placeholder" style="background:${color}22;">
          <i class="${icono}" style="color:${color};font-size:1.1rem;"></i>
        </div>
        `}
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <h3 style="margin:0;flex:1;min-width:0;"><a href="/grupo/${slugGrupo(grupo)}" style="color:inherit;text-decoration:none;">${escapeHtml(grupo.nombre)||'Sin nombre'}</a></h3>
            <span class="badge-whatsapp" style="background:${color}20;color:${color};border:1px solid ${color}40;flex-shrink:0;">
              <i class="${icono}"></i> ${label}
            </span>
          </div>
        </div>
      </div>
      ${reportes>=3?`<div style="margin:0 0.8rem 0.3rem;background:#fff3f3;border-radius:8px;padding:4px 8px;font-size:0.65rem;color:#e74c3c;font-weight:600;">⚠️ Link posiblemente caído (${reportes} reportes)</div>`:''}
      ${grupo.descripcion?`<div class="descripcion">${escapeHtml(grupo.descripcion)}</div>`:''}
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
  plataformaSeleccionada = 'todos';
  categoriaSeleccionada  = 'todas';
  busquedaActual         = '';
  gruposMostrados        = GRUPOS_POR_PAGINA;

  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  document.querySelector('.filter-chip[data-platform="whatsapp"]')?.classList.add('active');
  document.querySelectorAll('.cat-item').forEach(c => c.classList.remove('active'));
  document.querySelector('.cat-item[data-cat="todas"]')?.classList.add('active');
  document.getElementById('selectedCityName').textContent = 'Todos los departamentos';
  const scpTodos = document.getElementById('selectedCityNamePanel');
  if (scpTodos) scpTodos.textContent = 'Todos los departamentos';
  const si = document.getElementById('searchInput');
  if (si) si.value = '';

  renderizarGrupos();
  actualizarContadoresCiudades();
}

function actualizarBadgeFiltros() {
  const badge = document.getElementById('filtrosBadge');
  if (!badge) return;
  let activos = 0;
  if (categoriaSeleccionada !== 'todas') activos++;
  if (plataformaSeleccionada !== 'todos' && plataformaSeleccionada !== 'whatsapp') activos++;
  if (ciudadSeleccionada !== 'todos') activos++;
  if (activos > 0) {
    badge.textContent = activos;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

// ============================================
// LOGIN ADMIN
// ============================================
// Credenciales en servidor


// ============================================
// BUSCADOR FLOTANTE
// ============================================
function abrirBuscador() {
  const overlay = document.getElementById('searchOverlay');
  const input   = document.getElementById('searchInputNav');
  if (!overlay) return;
  // Cerrar modal ciudad si está abierto
  document.getElementById('cityModal').style.display = 'none';
  overlay.style.display = 'block';
  setTimeout(() => input?.focus(), 100);
  document.querySelectorAll('.bottom-nav-item').forEach(i => i.classList.remove('active'));
  document.getElementById('navBuscar')?.classList.add('active');
}

function cerrarBuscador() {
  const overlay = document.getElementById('searchOverlay');
  if (overlay) overlay.style.display = 'none';
  // Limpiar búsqueda
  const input = document.getElementById('searchInputNav');
  if (input) input.value = '';
  busquedaActual = '';
  gruposMostrados = GRUPOS_POR_PAGINA;
  renderizarGrupos();
  // Volver a Inicio activo
  document.querySelectorAll('.bottom-nav-item').forEach(i => i.classList.remove('active'));
  document.getElementById('navInicio')?.classList.add('active');
}

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
    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: user, password: pass })
    }).then(r => r.json()).then(data => {
      if (data.success && data.token) {
        sessionStorage.setItem('qigrupos_token', data.token);
        window.location.href = 'admin.html';
      } else {
        document.getElementById('loginError').classList.add('show');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Ingresar';
        document.getElementById('loginPass').value = '';
        setTimeout(() => document.getElementById('loginError').classList.remove('show'), 3000);
      }
    }).catch(() => {
      document.getElementById('loginError').classList.add('show');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Ingresar';
    });
  });


  // Buscador flotante — tiempo real
  document.getElementById('searchInputNav')?.addEventListener('input', () => {
    busquedaActual = document.getElementById('searchInputNav')?.value || '';
    gruposMostrados = GRUPOS_POR_PAGINA;
    if (busquedaActual.trim()) {
      plataformaSeleccionada = 'todos';
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    } else {
      plataformaSeleccionada = 'todos';
      document.querySelector('.filter-chip[data-platform="whatsapp"]')?.classList.add('active');
    }
    renderizarGrupos();
  });

  // Cerrar buscador con Escape
  document.getElementById('searchInputNav')?.addEventListener('keydown', e => {
    if (e.key === 'Escape') cerrarBuscador();
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
  document.getElementById('openCityModalBtn')?.addEventListener('click', () => {
    cerrarBuscador();
    document.getElementById('cityModal').style.display = 'flex';
  });

  document.getElementById('closeCityModalBtn')?.addEventListener('click', () =>
    document.getElementById('cityModal').style.display = 'none');
  document.getElementById('cityModal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) {
      e.stopPropagation();
      e.currentTarget.style.display = 'none';
    }
  });

  document.getElementById('abrirFiltrosBtn')?.addEventListener('click', () => {
    cerrarBuscador();
    document.getElementById('filtrosModal').style.display = 'flex';
  });
  document.getElementById('closeFiltrosModalBtn')?.addEventListener('click', () =>
    document.getElementById('filtrosModal').style.display = 'none');
  document.getElementById('filtrosModal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) {
      e.stopPropagation();
      e.currentTarget.style.display = 'none';
    }
  });

  document.getElementById('abrirCiudadDesdeFiltrosBtn')?.addEventListener('click', () => {
    document.getElementById('filtrosModal').style.display = 'none';
    document.getElementById('cityModal').style.display = 'flex';
  });

  document.getElementById('limpiarFiltrosBtn')?.addEventListener('click', () => {
    resetFiltros();
    document.getElementById('filtrosModal').style.display = 'none';
  });
  document.getElementById('aplicarFiltrosBtn')?.addEventListener('click', () => {
    document.getElementById('filtrosModal').style.display = 'none';
  });

  document.getElementById('openCityModalBtn')?.addEventListener('click', e => {
    e.stopPropagation();
  });

  document.querySelectorAll('.city-item').forEach(item => {
    item.addEventListener('click', e => {
      e.stopPropagation();
      const ciudad = item.dataset.city;

      // "Todos" se queda filtrando en la misma pagina
      if (ciudad === 'todos') {
        document.querySelectorAll('.city-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        ciudadSeleccionada = 'todos';
        document.getElementById('selectedCityName').textContent = 'Todos los departamentos';
  const scpTodos = document.getElementById('selectedCityNamePanel');
  if (scpTodos) scpTodos.textContent = 'Todos los departamentos';
        document.getElementById('cityModal').style.display = 'none';
        gruposMostrados = GRUPOS_POR_PAGINA;
        renderizarGrupos();
        actualizarContadoresCiudades();
        return;
      }

      // Una ciudad especifica navega a su pagina dedicada (mejor para SEO),
      // llevando consigo la categoria y plataforma si el usuario ya las eligio
      const params = new URLSearchParams();
      if (categoriaSeleccionada !== 'todas') params.set('categoria', categoriaSeleccionada);
      if (plataformaSeleccionada !== 'todos') params.set('plataforma', plataformaSeleccionada);
      const query = params.toString();
      window.location.href = `/ciudad/${slugify(ciudad)}${query ? '?' + query : ''}`;
    });
  });

  document.getElementById('citySearchInput')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.city-item').forEach(item => {
      item.style.display = item.querySelector('.city-info span')?.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });

  // Navbar inferior - Ciudad no se marca como activo
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (item.id === 'navCiudad') return; // Ciudad abre modal, no se marca activo
      document.querySelectorAll('.bottom-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  cargarGrupos();
  if (window.location.search.includes('showLogin=1')) {
    setTimeout(() => {
      document.getElementById('loginModal').classList.add('show');
      document.getElementById('loginUser').focus();
    }, 800);
  }
});
