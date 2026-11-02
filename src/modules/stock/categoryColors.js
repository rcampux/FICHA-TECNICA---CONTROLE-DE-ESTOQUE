(function exposeCategoryColors() {
  const presets = [
    ["Vermelho", "#B4232F"], ["Laranja", "#D97706"], ["Amarelo", "#CAAA20"],
    ["Verde", "#378449"], ["Turquesa", "#00857D"], ["Azul", "#3273C8"],
    ["Índigo", "#6357BA"], ["Violeta", "#9A4CB5"], ["Rosa", "#C34F86"], ["Marrom", "#92674C"],
  ];
  const defaults = {
    proteinas:"#B4232F", carboidratos:"#D97706", laticinios:"#3273C8", carnes:"#C34F86",
    cereais:"#CAAA20", farinhas:"#92674C", acucares:"#9A4CB5", "oleos e gorduras":"#00857D",
    temperos:"#6357BA", hortifruti:"#378449", leguminosas:"#6B8B29", outros:"#687C92",
  };

  function normalizeHex(value) {
    let hex = String(value || "").trim().replace(/^#/, "");
    if (/^[0-9a-f]{3}$/i.test(hex)) hex = [...hex].map(c => c + c).join("");
    return /^[0-9a-f]{6}$/i.test(hex) ? `#${hex.toUpperCase()}` : null;
  }

  function defaultCategoryColor(name) {
    const key = String(name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    if (defaults[key]) return defaults[key];
    let hash = 0;
    for (const char of key) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
    return hsvToHex(hash % 360, 0.55 + (hash % 20) / 100, 0.7);
  }

  function categoryColorStyle(color) {
    const hex = normalizeHex(color) || presets[0][1];
    return `--category-color:${categoryChipColor(hex)};--category-tint:${hex}20;--category-ink:#FFFFFF`;
  }

  function categoryLuminance(color) {
    const rgb = (normalizeHex(color) || presets[0][1]).slice(1).match(/../g).map(c => {
      const value = parseInt(c, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
  }

  function categoryChipColor(color) {
    const hex = normalizeHex(color) || presets[0][1];
    if (1.05 / (categoryLuminance(hex) + .05) >= 5) return hex;
    const rgb = hex.slice(1).match(/../g).map(c => parseInt(c, 16));
    let low = 0, high = 1, result = "#000000";
    // Darken only the displayed chip; the chosen/saved HEX remains intact.
    for (let i = 0; i < 16; i++) {
      const factor = (low + high) / 2;
      const candidate = `#${rgb.map(channel => Math.floor(channel * factor).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
      if (1.05 / (categoryLuminance(candidate) + .05) >= 5) {
        low = factor;
        result = candidate;
      } else high = factor;
    }
    return result;
  }

  function hsvToHex(h, s, v) {
    const f = n => {
      const k = (n + h / 60) % 6;
      return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1)))).toString(16).padStart(2, "0");
    };
    return `#${f(5)}${f(3)}${f(1)}`.toUpperCase();
  }

  function hexToHsv(hex) {
    const [r,g,b] = normalizeHex(hex).slice(1).match(/../g).map(c => parseInt(c, 16) / 255);
    const max = Math.max(r,g,b), min = Math.min(r,g,b), delta = max - min;
    let hue = delta === 0 ? 0 : max === r ? ((g-b)/delta)%6 : max === g ? (b-r)/delta+2 : (r-g)/delta+4;
    return {h:(hue*60+360)%360, s:max === 0 ? 0 : delta/max, v:max};
  }

  function createCategoryColorPicker() {
    let state = {h:0,s:1,v:1};
    const el = id => document.getElementById(id);

    function refreshPreview() {
      const hex = hsvToHex(state.h, state.s, state.v);
      el("category-color-preview").style.cssText = categoryColorStyle(hex);
      el("category-color-preview").textContent = el("category-name").value.trim() || "Sua categoria";
    }

    function renderColor() {
      const hex = hsvToHex(state.h, state.s, state.v);
      el("category-color-hex").value = hex;
      el("category-color-hex").setAttribute("aria-invalid", "false");
      el("category-color-error").hidden = true;
      el("category-color-value").value = Math.round(state.v * 100);
      el("category-color-value-label").textContent = `${Math.round(state.v * 100)}%`;
      const wheel = el("category-color-wheel");
      wheel.style.setProperty("--wheel-brightness", state.v);
      wheel.setAttribute("aria-valuenow", Math.round(state.h));
      wheel.setAttribute("aria-valuetext", `${hex}, saturação ${Math.round(state.s * 100)}%`);
      const angle = state.h * Math.PI / 180;
      el("category-color-cursor").style.left = `${50 + Math.sin(angle) * state.s * 50}%`;
      el("category-color-cursor").style.top = `${50 - Math.cos(angle) * state.s * 50}%`;
      el("category-color-presets").querySelectorAll("button").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.color === hex));
      });
      refreshPreview();
    }

    function setColor(value) {
      const hex = normalizeHex(value);
      if (!hex) {
        el("category-color-hex").setAttribute("aria-invalid", "true");
        el("category-color-error").hidden = false;
        return false;
      }
      state = hexToHsv(hex);
      renderColor();
      return true;
    }

    function moveWheel(event) {
      const wheel = el("category-color-wheel");
      if (event.type === "pointermove" && !wheel.hasPointerCapture(event.pointerId)) return;
      if (event.type === "pointerdown") { wheel.setPointerCapture(event.pointerId); wheel.focus(); }
      const rect = wheel.getBoundingClientRect();
      const x = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const y = (event.clientY - rect.top - rect.height / 2) / (rect.height / 2);
      state.h = (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360;
      state.s = Math.min(1, Math.hypot(x, y));
      renderColor();
    }

    function handleWheelKey(event) {
      if (!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].includes(event.key)) return;
      event.preventDefault();
      if (event.key === "ArrowLeft") state.h = (state.h + 355) % 360;
      if (event.key === "ArrowRight") state.h = (state.h + 5) % 360;
      if (event.key === "ArrowUp") state.s = Math.min(1, state.s + .05);
      if (event.key === "ArrowDown") state.s = Math.max(0, state.s - .05);
      if (event.key === "Home") state.s = 0;
      if (event.key === "End") state.s = 1;
      renderColor();
    }

    function open(color) {
      el("category-color-presets").innerHTML = presets.map(([name, hex]) =>
        `<button type="button" class="category-color-swatch" style="--swatch:${hex}" data-color="${hex}" aria-label="${name} ${hex}" aria-pressed="false" title="${name}"><span aria-hidden="true">✓</span></button>`).join("");
      el("category-color-presets").onclick = event => {
        const button = event.target.closest("[data-color]");
        if (button) setColor(button.dataset.color);
      };
      el("category-color-hex").oninput = event => {
        // Keep the caret stable while typing; normalize on blur/save.
        const hex = normalizeHex(event.target.value);
        el("category-color-error").hidden = Boolean(hex);
        event.target.setAttribute("aria-invalid", String(!hex));
        if (hex && event.target.value.replace(/^#/, "").length === 6) setColor(hex);
      };
      el("category-color-hex").onchange = event => setColor(event.target.value);
      el("category-color-value").oninput = event => { state.v = Number(event.target.value) / 100; renderColor(); };
      const wheel = el("category-color-wheel");
      wheel.onpointerdown = moveWheel;
      wheel.onpointermove = moveWheel;
      wheel.onkeydown = handleWheelKey;
      el("category-name").oninput = refreshPreview;
      setColor(color);
    }

    return {open, setColor, refreshPreview};
  }

  window.FichaTecCategoryColors = {presets, normalizeHex, defaultCategoryColor, categoryColorStyle, categoryLuminance, categoryChipColor, hsvToHex, hexToHsv, createCategoryColorPicker};
})();
