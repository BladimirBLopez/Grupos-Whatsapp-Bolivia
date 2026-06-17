// ============================================
// VARIABLES GLOBALES
// ============================================
let gruposData = [];
let ciudadSeleccionada = 'todos';
let plataformaSeleccionada = 'whatsapp';

// ============================================
// CARGAR GRUPOS DESDE LA API
// ============================================
async function cargarGrupos() {
  try {
    const response = await fetch('/api/grupos');
    
    if (response.ok) {
      const data = await response.json();
      gruposData = data.grupos || [];
      console.log(`✅ ${gruposData.length} grupos cargados desde la API`);
    } else {
      console.warn('⚠️ Fallback a JSON local');
      const localResponse = await fetch('data/grupos.json');
      const data = await localResponse.json();
      gruposData = data.grupos || [];
    }
    
    iniciarPagina();
  } catch (error) {
    console.error('❌ Error al cargar grupos:', error);
    
    try {
      const localResponse = await fetch('data/grupos.json');
      const data = await localResponse.json();
      gruposData = data.grupos || [];
      iniciarPagina();
    } catch (fallbackError) {
      const container = document.getElementById("gruposContainer");
      if (container) {
        container.innerHTML = `<div class="empty-message">
          <i class="fas fa-exclamation-triangle"></i>
          Error al cargar los grupos. Por favor, recarga la página.
        </div>`;
      }
    }
  }
}

// ============================================
// INICIAR PÁGINA
// ============================================
function iniciarPagina() {
  actualizarContadoresCiudades();
  actualizarResultados();
  renderizarGrupos();
  configurarEventListeners();
}

// ============================================
// RENDERIZAR GRUPOS
// ============================================
function renderizarGrupos() {
  const container = document.getElementById('gruposContainer');
  if (!container) return;
  
  // Filtrar grupos
  let gruposFiltrados = [...gruposData];
  
  // Filtrar por plataforma
  if (plataformaSeleccionada !== 'todos') {
    gruposFiltrados = gruposFiltrados.filter(g => g.plataforma === plataformaSeleccionada);
  }
  
  // Filtrar por ciudad
  if (ciudadSeleccionada !== 'todos') {
    gruposFiltrados = gruposFiltrados.filter(g => 
      g.ubicacion && g.ubicacion.toLowerCase() === ciudadSeleccionada.toLowerCase()
    );
  }
  
  // Separar destacados
  const destacados = gruposFiltrados.filter(g => g.destacado);
  const normales = gruposFiltrados.filter(g => !g.destacado);
  
  // Ordenar: primero destacados
  const gruposOrdenados = [...destacados, ...normales];
  
  // Actualizar contador
  document.getElementById('resultCount').textContent = gruposOrdenados.length;
  
  if (gruposOrdenados.length === 0) {
    container.innerHTML = `<div class="empty-message">
      <i class="fas fa-search"></i>
      No se encontraron grupos para esta búsqueda
    </div>`;
    return;
  }
  
  container.innerHTML = gruposOrdenados.map(grupo => `
    <div class="grupo-card ${grupo.destacado ? 'destacado-card' : ''}">
      ${grupo.destacado ? `
        <div class="destacado-ribbon">
          <i class="fas fa-star"></i> GRUPO DESTACADO
        </div>
      ` : ''}
      <div class="card-header">
        <h3>${grupo.nombre || 'Sin nombre'}</h3>
        <span class="badge-whatsapp"><i class="fab fa-whatsapp"></i> WhatsApp</span>
      </div>
      ${grupo.descripcion ? `<div class="descripcion">${grupo.descripcion}</div>` : ''}
      <div class="ubicacion">
        <i class="fas fa-map-marker-alt"></i> ${grupo.ubicacion || 'Ubicación no especificada'}
      </div>
      <div class="stats">
        <span class="stat-item"><i class="fas fa-users"></i> ${grupo.miembros || 0} miembros</span>
        <span class="stat-item"><i class="fas fa-chart-line"></i> ${grupo.activos || 0} activos</span>
      </div>
      <a href="${grupo.link || '#'}" target="_blank" rel="noopener noreferrer" class="join-btn">
        <i class="fab fa-whatsapp"></i> Unirse al grupo
      </a>
    </div>
  `).join('');
}

// ============================================
// ACTUALIZAR CONTADORES DE CIUDADES
// ============================================
function actualizarContadoresCiudades() {
  const ciudades = ['todos', 'Santa Cruz', 'La Paz', 'Cochabamba', 'Sucre', 'Tarija', 'Potosí', 'Oruro', 'Beni', 'Pando'];
  
  ciudades.forEach(ciudad => {
    let count;
    if (ciudad === 'todos') {
      count = gruposData.length;
    } else {
      count = gruposData.filter(g => g.ubicacion && g.ubicacion.toLowerCase() === ciudad.toLowerCase()).length;
    }
    
    const elementId = ciudad === 'todos' ? 'modalTotalCount' : `modal${ciudad.replace(/ /g, '')}Count`;
    const element = document.getElementById(elementId);
    if (element) element.textContent = count;
  });
  
  // Actualizar badge de ciudad seleccionada
  const badge = document.getElementById('selectedCityCount');
  if (badge) {
    let count;
    if (ciudadSeleccionada === 'todos') {
      count = gruposData.length;
    } else {
      count = gruposData.filter(g => g.ubicacion && g.ubicacion.toLowerCase() === ciudadSeleccionada.toLowerCase()).length;
    }
    badge.textContent = `(${count})`;
  }
}

// ============================================
// ACTUALIZAR RESULTADOS
// ============================================
function actualizarResultados() {
  let gruposFiltrados = [...gruposData];
  
  if (plataformaSeleccionada !== 'todos') {
    gruposFiltrados = gruposFiltrados.filter(g => g.plataforma === plataformaSeleccionada);
  }
  
  if (ciudadSeleccionada !== 'todos') {
    gruposFiltrados = gruposFiltrados.filter(g => 
      g.ubicacion && g.ubicacion.toLowerCase() === ciudadSeleccionada.toLowerCase()
    );
  }
  
  document.getElementById('resultCount').textContent = gruposFiltrados.length;
}

// ============================================
// CONFIGURAR EVENT LISTENERS
// ============================================
function configurarEventListeners() {
  // === Filtros de plataforma ===
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', function() {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      plataformaSeleccionada = this.dataset.platform;
      renderizarGrupos();
      actualizarResultados();
    });
  });
  
  // === Abrir modal de ciudades ===
  const openBtn = document.getElementById('openCityModalBtn');
  if (openBtn) {
    openBtn.addEventListener('click', function() {
      document.getElementById('cityModal').style.display = 'flex';
    });
  }
  
  // === Cerrar modal de ciudades ===
  const closeBtn = document.getElementById('closeCityModalBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      document.getElementById('cityModal').style.display = 'none';
    });
  }
  
  // === Cerrar modal clic fuera ===
  const cityModal = document.getElementById('cityModal');
  if (cityModal) {
    cityModal.addEventListener('click', function(e) {
      if (e.target === this) {
        this.style.display = 'none';
      }
    });
  }
  
  // === Seleccionar ciudad ===
  document.querySelectorAll('.city-item').forEach(item => {
    item.addEventListener('click', function() {
      document.querySelectorAll('.city-item').forEach(i => i.classList.remove('active'));
      this.classList.add('active');
      
      const ciudad = this.dataset.city;
      ciudadSeleccionada = ciudad;
      
      // Actualizar nombre mostrado
      const nameSpan = document.getElementById('selectedCityName');
      if (nameSpan) {
        const cityName = ciudad === 'todos' ? 'Todos los departamentos' : ciudad;
        nameSpan.textContent = cityName;
      }
      
      // Cerrar modal
      document.getElementById('cityModal').style.display = 'none';
      
      // Renderizar con nuevo filtro
      renderizarGrupos();
      actualizarResultados();
      actualizarContadoresCiudades();
    });
  });
  
  // === Buscador de ciudades ===
  const citySearch = document.getElementById('citySearchInput');
  if (citySearch) {
    citySearch.addEventListener('input', function() {
      const busqueda = this.value.toLowerCase().trim();
      document.querySelectorAll('.city-item').forEach(item => {
        const text = item.querySelector('.city-info span')?.textContent?.toLowerCase() || '';
        item.style.display = text.includes(busqueda) ? '' : 'none';
      });
    });
  }
  
  // === Logo reset ===
  const logoBtn = document.getElementById('logoResetBtn');
  if (logoBtn) {
    logoBtn.addEventListener('click', function() {
      ciudadSeleccionada = 'todos';
      plataformaSeleccionada = 'whatsapp';
      
      // Resetear filtros visuales
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      const whatsappChip = document.querySelector('.filter-chip[data-platform="whatsapp"]');
      if (whatsappChip) whatsappChip.classList.add('active');
      
      document.getElementById('selectedCityName').textContent = 'Todos los departamentos';
      
      renderizarGrupos();
      actualizarResultados();
      actualizarContadoresCiudades();
    });
  }
}

// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Qigrupos Bolivia iniciado');
  cargarGrupos();
});