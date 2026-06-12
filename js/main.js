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
}

function guardarGruposEnStorage() {
  localStorage.setItem("qigrupos_grupos", JSON.stringify(gruposData));
}

// Sincronizar window.gruposData para admin.js
window.gruposData = gruposData;

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
  
  const elementos = {
    totalCount: contar("todos"),
    santaCruzCount: contar("Santa Cruz"),
    laPazCount: contar("La Paz"),
    cochabambaCount: contar("Cochabamba"),
    sucreCount: contar("Sucre"),
    tarijaCount: contar("Tarija"),
    potosiCount: contar("Potosí"),
    oruroCount: contar("Oruro"),
    beniCount: contar("Beni"),
    pandoCount: contar("Pando")
  };
  
  for (const [id, value] of Object.entries(elementos)) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
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
      <div class="grupo-card">
        <div class="card-header">
          <h3>${escapeHtml(grupo.nombre)}</h3>
          <div class="badge-whatsapp"><i class="fab fa-whatsapp"></i> WA</div>
        </div>
        <div class="descripcion">${escapeHtml(grupo.descripcion)}</div>
        <div class="ubicacion">
          <i class="fas fa-map-pin"></i> ${escapeHtml(grupo.ubicacion)} 🇧🇴
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
  document.querySelectorAll(".city-chip").forEach(chip => {
    const chipCity = chip.getAttribute("data-city");
    if (chipCity === city) {
      chip.classList.add("active");
    } else {
      chip.classList.remove("active");
    }
  });
  renderGrupos();
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
    guardarGruposEnStorage();  // 🔐 GUARDAR EN LOCALSTORAGE
    
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
// EXPORTAR (para admin.js)
// ============================================================

window.gruposData = gruposData;
window.actualizarContadores = actualizarContadores;
window.renderGrupos = renderGrupos;

// ============================================================
// INICIALIZAR
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  // Cargar grupos guardados
  cargarGruposDesdeStorage();
  window.gruposData = gruposData;  // Actualizar referencia global
  
  // Filtros de plataforma
  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const platform = chip.getAttribute("data-platform");
      if (platform) setActivePlatform(platform);
    });
  });
  
  // Filtros de ciudad
  document.querySelectorAll(".city-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const city = chip.getAttribute("data-city");
      if (city) setActiveCity(city);
    });
  });
  
  // Botón Home
  document.getElementById("homeBtn")?.addEventListener("click", () => {
    setActivePlatform("whatsapp");
    setActiveCity("todos");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  
  // Configurar agregar grupo
  setupAgregarGrupo();
  
  // Inicializar
  actualizarContadores();
  setActivePlatform("whatsapp");
  setActiveCity("todos");
});