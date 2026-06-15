// ============================================================
// DATOS DE GRUPOS - CON CARACTERES ORIGINALES
// ============================================================

const gruposData = [
  {
    id: 1,
    nombre: "🇳🇬🅒🅞🅜🅟🅡Á 🅨 🅥🅔🅝🅣🅐.🅢🅒🅩🇳🇬",
    descripcion: "Grupo de compra y venta en Santa Cruz, Bolivia.",
    ubicacion: "Santa Cruz",
    miembros: 27,
    activos: 24,
    link: "https://chat.whatsapp.com/KVTyedioIByCZBt6ZHfCVr",
    plataforma: "whatsapp",
    destacado: false
  },
  {
    id: 2,
    nombre: "🇧🇴VENTAS COCHABAMBA🇧🇴",
    descripcion: "Aquí puedes comprar y vender de manera libre.",
    ubicacion: "Cochabamba",
    miembros: 370,
    activos: 85,
    link: "https://chat.whatsapp.com/Kd7GowNVQcy0ldYZVfeOrT?mode=gi_t",
    plataforma: "whatsapp",
    destacado: true
  },
  {
    id: 3,
    nombre: "🇧🇴🅒🅞🅜🅟🅡Á 🅨 🅥🅔🅝🅣🅐.🅑🅞🇧🇴",
    descripcion: "🚫NO ENVIAR CONTENIDO INAPROPIADO 🚫 PROHIBIDO INSULTAR A LOS MIEMBROS DEL GRUPO",
    ubicacion: "La Paz",
    miembros: 30,
    activos: 12,
    link: "https://chat.whatsapp.com/ILQqKaRRchtDhQCs6g3WzF",
    plataforma: "whatsapp",
    destacado: false
  },
  {
    id: 4,
    nombre: "Mercado Virtual TRINIDAD",
    descripcion: "oferta de todo tipos de productos y servicios en la ciudad de Trinidad",
    ubicacion: "Beni",
    miembros: 267,
    activos: 85,
    link: "https://chat.whatsapp.com/FMesPmRNXf9JOpWIloKfdH",
    plataforma: "whatsapp",
    destacado: false
  },
  {
    id: 5,
    nombre: "Bol 🪵🇳🇬 🛍️COMPRA Y VENTA 🛒 Bol 🇧🇴",
    descripcion: "COMPRA Y VENTA BOLIVIA, grupo libre",
    ubicacion: "Santa cruz",
    miembros: 66,
    activos: 12,
    link: "https://chat.whatsapp.com/KpNSEALEieWHOHEXkbGg6n",
    plataforma: "whatsapp",
    destacado: false
  },
  {
    id: 6,
    nombre: "MARKETPLACE 1 COMPRA Y VENTA Bolivia",
    descripcion: "hola mucho gusto bienvenido ah este grupo",
    ubicacion: "Santa cruz",
    miembros: 798,
    activos: 222,
    link: "https://chat.whatsapp.com/Bj6VMUc2kWOBLc55NqZuxL",
    plataforma: "whatsapp",
    destacado: false
  }
];

// ============================================================
// LÓGICA PRINCIPAL
// ============================================================

let currentPlatform = "whatsapp";
let currentCity = "todos";

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

function actualizarContadores() {
  const gruposWhatsApp = gruposData.filter(g => g.plataforma === "whatsapp");
  const contar = (ciudad) => {
    if (ciudad === "todos") return gruposWhatsApp.length;
    return gruposWhatsApp.filter(g => normalizarCiudad(g.ubicacion) === ciudad).length;
  };

  const ids = {
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

  for (const [id, value] of Object.entries(ids)) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
  }

  const selectedCityCount = document.getElementById("selectedCityCount");
  if (selectedCityCount) selectedCityCount.innerText = `(${contar(currentCity)})`;

  const selectedCityName = document.getElementById("selectedCityName");
  if (selectedCityName) selectedCityName.innerText = currentCity === "todos" ? "Todos los departamentos" : currentCity;

  const resultCount = document.getElementById("resultCount");
  if (resultCount) resultCount.innerText = getGruposFiltrados().length;
}

function getGruposFiltrados() {
  let filtrados = gruposData.filter(g => g.plataforma === currentPlatform);
  if (currentCity !== "todos") {
    filtrados = filtrados.filter(g => normalizarCiudad(g.ubicacion) === currentCity);
  }
  return filtrados;
}

function renderGrupos() {
  const filtrados = getGruposFiltrados();
  const gruposContainer = document.getElementById("gruposContainer");
  if (!gruposContainer) return;

  if (filtrados.length === 0) {
    gruposContainer.innerHTML = `<div class="empty-message">
      <i class="fab fa-whatsapp"></i>
      No hay grupos de ${currentPlatform} en ${currentCity === "todos" ? "Bolivia" : currentCity} aún.<br>
      ¡Vuelve pronto para nuevos grupos!
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
        <div class="descripcion">${escapeHtml(grupo.descripcion)}</div>
        <div class="ubicacion">
          <i class="fas fa-map-pin"></i> ${escapeHtml(grupo.ubicacion)}
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

function renderGrupoDestacadoFijo() {
  const container = document.getElementById("grupoDestacadoFijo");
  if (!container) return;

  const destacado = gruposData.find(g => g.destacado === true);
  
  if (!destacado) {
    container.innerHTML = "";
    return;
  }

  const html = `
    <div class="destacado-fijo">
      <div class="grupo-card destacado-card">
        <div class="destacado-ribbon">
          <i class="fas fa-crown"></i> GRUPO DESTACADO DE LA SEMANA
        </div>
        <div class="card-header">
          <h3>${escapeHtml(destacado.nombre)} <span class="badge-destacado">⭐ DESTACADO</span></h3>
          <div class="badge-whatsapp"><i class="fab fa-whatsapp"></i> WA</div>
        </div>
        <div class="descripcion">${escapeHtml(destacado.descripcion)}</div>
        <div class="ubicacion">
          <i class="fas fa-map-pin"></i> ${escapeHtml(destacado.ubicacion)}
          <span style="margin-left: auto; background:#FFD70020; padding:2px 8px; border-radius:20px; font-size:0.65rem;">🔥 +50 miembros/semana</span>
        </div>
        <div class="stats">
          <div class="stat-item"><i class="fas fa-user-friends"></i> ${destacado.miembros}</div>
          <div class="stat-item"><i class="fas fa-chart-line"></i> ${destacado.activos}</div>
        </div>
        <button class="join-btn" data-link="${destacado.link}"><i class="fab fa-whatsapp"></i> Unirme ahora</button>
      </div>
    </div>
  `;

  container.innerHTML = html;
  
  const btn = container.querySelector(".join-btn");
  if (btn) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      unirseAlGrupo(btn.getAttribute("data-link"));
    });
  }
}

function setActivePlatform(platform) {
  currentPlatform = platform;
  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.classList.toggle("active", chip.getAttribute("data-platform") === platform);
  });
  actualizarContadores();
  renderGrupos();
}

function setActiveCity(city) {
  currentCity = city;
  actualizarContadores();
  renderGrupos();
  const cityModal = document.getElementById("cityModal");
  if (cityModal) cityModal.style.display = "none";
}

function initCityModal() {
  const openBtn = document.getElementById("openCityModalBtn");
  const closeBtn = document.getElementById("closeCityModalBtn");
  const cityModal = document.getElementById("cityModal");
  const searchInput = document.getElementById("citySearchInput");

  if (openBtn) {
    openBtn.addEventListener("click", () => {
      cityModal.style.display = "flex";
      document.body.style.overflow = "hidden";
      if (searchInput) searchInput.value = "";
      filterCityList("");
    });
  }

  const closeModal = () => {
    cityModal.style.display = "none";
    document.body.style.overflow = "";
  };

  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  cityModal.addEventListener("click", (e) => { if (e.target === cityModal) closeModal(); });

  document.querySelectorAll(".city-item").forEach(item => {
    item.addEventListener("click", () => {
      const city = item.getAttribute("data-city");
      if (city) setActiveCity(city);
      closeModal();
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", (e) => filterCityList(e.target.value.toLowerCase()));
  }
}

function filterCityList(searchTerm) {
  document.querySelectorAll(".city-item").forEach(item => {
    const cityName = item.querySelector(".city-info span")?.innerText.toLowerCase() || "";
    item.style.display = (searchTerm === "" || cityName.includes(searchTerm)) ? "flex" : "none";
  });
}

// ============================================================
// FUNCIONES GLOBALES PARA EL BANNER (DECLARADAS ANTES)
// ============================================================

window.cerrarBanner = function() {
  var banner = document.getElementById("bannerPublicar");
  if (banner) {
    banner.style.display = "none";
  }
  return false;
};

window.contactarWhatsApp = function() {
  var mensaje = encodeURIComponent("Hola! Quiero publicar mi grupo en Qigrupos Bolivia 🇧🇴");
  window.open("https://wa.me/59169356292?text=" + mensaje, "_blank");
  return false;
};

// ============================================================
// INICIALIZACIÓN
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const platform = chip.getAttribute("data-platform");
      if (platform) setActivePlatform(platform);
    });
  });

  document.getElementById("homeBtn")?.addEventListener("click", () => {
    setActivePlatform("whatsapp");
    setActiveCity("todos");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  initCityModal();
  renderGrupoDestacadoFijo();
  actualizarContadores();
  setActivePlatform("whatsapp");
  setActiveCity("todos");
  
  // Mostrar el banner después de 2 segundos
  setTimeout(function() {
    var banner = document.getElementById("bannerPublicar");
    if (banner) {
      banner.style.bottom = "24px";
      banner.style.opacity = "1";
    }
  }, 2000);
});