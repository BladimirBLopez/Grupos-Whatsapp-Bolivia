// ============================================================
// BASE DE DATOS DE GRUPOS - CON LOCALSTORAGE
// ============================================================

// Cargar grupos desde localStorage o usar datos por defecto
let gruposData = [];

function cargarGruposDesdeStorage() {
  const guardados = localStorage.getItem("qigrupos_grupos");
  if (guardados) {
    gruposData = JSON.parse(guardados);
  } else {
    // Datos iniciales por defecto
    gruposData = [
      {
        id: 1,
        nombre: "🇳🇬🅒🅞🅜🅟🅡Á 🅨 🅥🅔🅝🅣🅐.🅢🅒🅩🇳🇬",
        descripcion: "Grupo de compra y venta en Santa Cruz, Bolivia. Comparte productos, servicios y ofertas.",
        ubicacion: "Santa Cruz",
        miembros: 27,
        activos: 24,
        link: "https://chat.whatsapp.com/KVTyedioIByCZBt6ZHfCVr",
        plataforma: "whatsapp"
      }
    ];
    guardarGruposEnStorage();
  }
  // Sincronizar con window para admin.js
  window.gruposData = gruposData;
}

function guardarGruposEnStorage() {
  localStorage.setItem("qigrupos_grupos", JSON.stringify(gruposData));
  window.gruposData = gruposData;
}

let currentPlatform = "whatsapp";
let currentCity = "todos";

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function normalizarCiudad(ciudad) {
  if (!ciudad) return "otro";
  const c = ciudad.toLowerCase().trim();
  if (c === "santa cruz" || c === "santacruz" || c === "santa cruz de la sierra") return "Santa Cruz";
  if (c === "la paz" || c === "lapaz" || c === "el alto") return "La Paz";
  if (c === "cochabamba") return "Cochabamba";
  if (c === "sucre") return "Sucre";
  if (c === "tarija") return "Tarija";
  if (c === "potosí" || c === "potosi") return "Potosí";
  if (c === "oruro") return "Oruro";
  if (c === "beni" || c === "trinidad") return "Beni";
  if (c === "pando" || c === "cobija") return "Pando";
  return ciudad;
}

function unirseAlGrupo(link) {
  if (link && (link.includes("chat.whatsapp.com") || link.includes("wa.me"))) {
    window.open(link, "_blank");
  } else {
    alert("Enlace de invitación: " + link);
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// ============================================================
// CONTAR GRUPOS POR CIUDAD
// ============================================================

function actualizarContadores() {
  const gruposWhatsApp = gruposData.filter(g => g.plataforma === "whatsapp");
  
  const contar = (ciudad) => {
    if (ciudad === "todos") return gruposWhatsApp.length;
    return gruposWhatsApp.filter(g => normalizarCiudad(g.ubicacion) === ciudad).length;
  };
  
  // Actualizar contadores en el modal
  const modalContadores = {
    modalTotalCount: contar("todos"),
    modalSantaCruzCount: contar("Santa Cruz"),
    modalLaPazCount: contar("La Paz"),
    modalCochabambaCount: contar("Cochabamba"),
    modalSucreCount: contar("Sucre"),
    modalTarijaCount: contar("Tarija"),
    modalPotosiCount: contar("Potosí"),
    modalOruroCount: contar("Oruro"),
    modalBeniCount: contar("Beni"),
    modalPandoCount: contar("Pando")
  };
  
  for (const [id, value] of Object.entries(modalContadores)) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
  }
  
  // Actualizar badge del botón selector
  const selectedCityCount = document.getElementById("selectedCityCount");
  if (selectedCityCount) {
    if (currentCity === "todos") {
      selectedCityCount.innerText = `(${contar("todos")})`;
    } else {
      selectedCityCount.innerText = `(${contar(currentCity)})`;
    }
  }
  
  // Actualizar nombre de ciudad seleccionada
  const selectedCityName = document.getElementById("selectedCityName");
  if (selectedCityName) {
    if (currentCity === "todos") {
      selectedCityName.innerText = "Todos los departamentos";
    } else {
      selectedCityName.innerText = currentCity;
    }
  }
  
  // Actualizar contador de resultados
  const resultCount = document.getElementById("resultCount");
  if (resultCount) {
    const filtrados = getGruposFiltrados();
    resultCount.innerText = filtrados.length;
  }
}

// ============================================================
// FILTRAR GRUPOS
// ============================================================

function getGruposFiltrados() {
  let filtrados = gruposData.filter(grupo => grupo.plataforma === currentPlatform);
  
  if (currentCity !== "todos") {
    filtrados = filtrados.filter(grupo => normalizarCiudad(grupo.ubicacion) === currentCity);
  }
  
  return filtrados;
}

// ============================================================
// RENDERIZAR GRUPOS
// ============================================================

function renderGrupos() {
  const filtrados = getGruposFiltrados();
  const gruposContainer = document.getElementById("gruposContainer");
  
  if (!gruposContainer) return;
  
  if (filtrados.length === 0) {
    gruposContainer.innerHTML = `<div class="empty-message">
      <i class="fab fa-whatsapp"></i> 
      No hay grupos de ${currentPlatform} en ${currentCity === "todos" ? "Bolivia" : currentCity} aún.<br>
      ${window.adminFunctions?.isLogged() ? 'Usa el botón "Agregar" para añadir uno.' : '¡Vuelve pronto para nuevos grupos!'}
    </div>`;
    return;
  }
  
  let html = "";
  filtrados.forEach(grupo => {
    html += `
      <div class="grupo-card" data-id="${grupo.id}">
        <div class="card-header">
          <h3>${escapeHtml(grupo.nombre)}</h3>
          <div class="badge-whatsapp"><i class="fab fa-whatsapp"></i> WA</div>
        </div>
        <div class="descripcion">
          ${escapeHtml(grupo.descripcion)}
        </div>
        <div class="ubicacion">
          <i class="fas fa-map-pin"></i> ${escapeHtml(grupo.ubicacion)}
          <span style="margin-left: auto; font-size:0.65rem; background:#eaf7f0; padding:2px 8px; border-radius:20px;">🇧🇴</span>
        </div>
        <div class="stats">
          <div class="stat-item"><i class="fas fa-user-friends"></i> ${grupo.miembros}</div>
          <div class="stat-item"><i class="fas fa-chart-line"></i> ${grupo.activos}</div>
        </div>
        <button class="join-btn" data-link="${grupo.link}"><i class="fab fa-whatsapp"></i> Unirme</button>
      </div>
    `;
  });
  
  gruposContainer.innerHTML = html;
  
  document.querySelectorAll(".join-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      unirseAlGrupo(btn.getAttribute("data-link"));
    });
  });
}

// ============================================================
// CAMBIAR FILTROS
// ============================================================

function setActivePlatform(platform) {
  currentPlatform = platform;
  document.querySelectorAll(".filter-chip").forEach(chip => {
    const chipPlatform = chip.getAttribute("data-platform");
    if (chipPlatform === platform) {
      chip.classList.add("active");
    } else {
      chip.classList.remove("active");
    }
  });
  actualizarContadores();
  renderGrupos();
}

function setActiveCity(city) {
  currentCity = city;
  actualizarContadores();
  renderGrupos();
  
  // Cerrar modal si está abierto
  const cityModal = document.getElementById("cityModal");
  if (cityModal) cityModal.style.display = "none";
}

// ============================================================
// MODAL DE CIUDADES
// ============================================================

function initCityModal() {
  const openBtn = document.getElementById("openCityModalBtn");
  const closeBtn = document.getElementById("closeCityModalBtn");
  const cityModal = document.getElementById("cityModal");
  const searchInput = document.getElementById("citySearchInput");
  
  // Abrir modal
  if (openBtn) {
    openBtn.addEventListener("click", () => {
      cityModal.style.display = "flex";
      document.body.style.overflow = "hidden";
      if (searchInput) searchInput.value = "";
      filterCityList("");
    });
  }
  
  // Cerrar modal
  const closeModal = () => {
    cityModal.style.display = "none";
    document.body.style.overflow = "";
  };
  
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  
  // Cerrar al hacer clic fuera
  cityModal.addEventListener("click", (e) => {
    if (e.target === cityModal) closeModal();
  });
  
  // Seleccionar ciudad
  document.querySelectorAll(".city-item").forEach(item => {
    item.addEventListener("click", () => {
      const city = item.getAttribute("data-city");
      if (city) setActiveCity(city);
      closeModal();
    });
  });
  
  // Búsqueda en tiempo real
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      filterCityList(e.target.value.toLowerCase());
    });
  }
}

function filterCityList(searchTerm) {
  document.querySelectorAll(".city-item").forEach(item => {
    const cityName = item.querySelector(".city-info span")?.innerText.toLowerCase() || "";
    if (searchTerm === "" || cityName.includes(searchTerm)) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}

// ============================================================
// AGREGAR GRUPO (CON LOCALSTORAGE)
// ============================================================

function setupAgregarGrupo() {
  const modalConfirm = document.getElementById("modalConfirmBtn");
  if (!modalConfirm) return;
  
  const newBtn = modalConfirm.cloneNode(true);
  modalConfirm.parentNode.replaceChild(newBtn, modalConfirm);
  
  newBtn.addEventListener("click", () => {
    const nombre = document.getElementById("modalGroupName")?.value.trim();
    const descripcion = document.getElementById("modalGroupDesc")?.value.trim();
    const link = document.getElementById("modalGroupLink")?.value.trim();
    const ciudad = document.getElementById("modalCity")?.value;
    const miembros = parseInt(document.getElementById("modalMembers")?.value) || 1;
    
    if (!nombre || !link || !ciudad) {
      alert("Completa todos los campos");
      return;
    }
    
    if (!link.includes("chat.whatsapp.com") && !link.includes("wa.me")) {
      alert("Enlace válido de WhatsApp");
      return;
    }
    
    const newId = gruposData.length + 1;
    const newGroup = {
      id: newId,
      nombre: nombre,
      descripcion: descripcion || "Grupo de compra y venta en Bolivia",
      ubicacion: ciudad,
      miembros: miembros,
      activos: Math.floor(miembros * 0.85),
      link: link,
      plataforma: "whatsapp"
    };
    
    gruposData.push(newGroup);
    guardarGruposEnStorage();
    
    actualizarContadores();
    
    if (currentPlatform === "whatsapp") {
      renderGrupos();
    } else {
      setActivePlatform("whatsapp");
    }
    
    document.getElementById("modalGroupName").value = "";
    document.getElementById("modalGroupDesc").value = "";
    document.getElementById("modalGroupLink").value = "";
    document.getElementById("modalCity").value = "";
    document.getElementById("modalMembers").value = "1";
    
    const modal = document.getElementById("subirModal");
    if (modal) modal.style.display = "none";
    
    if (window.mostrarToast) {
      window.mostrarToast(`✅ Grupo "${nombre}" agregado`, "#25D366");
    } else {
      alert("Grupo agregado correctamente");
    }
  });
}

// ============================================================
// INICIALIZAR
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  // Cargar grupos guardados
  cargarGruposDesdeStorage();
  
  // Filtros de plataforma
  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const platform = chip.getAttribute("data-platform");
      if (platform) setActivePlatform(platform);
    });
  });
  
  // Botón Home
  document.getElementById("homeBtn")?.addEventListener("click", () => {
    setActivePlatform("whatsapp");
    setActiveCity("todos");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  
  // Inicializar modal de ciudades
  initCityModal();
  
  // Configurar agregar grupo
  setupAgregarGrupo();
  
  // Inicializar
  actualizarContadores();
  setActivePlatform("whatsapp");
  setActiveCity("todos");
});

// Sincronizar con window para admin.js
window.gruposData = gruposData;
window.actualizarContadores = actualizarContadores;
window.renderGrupos = renderGrupos;