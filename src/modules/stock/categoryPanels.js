(function exposeCategoryPanels() {
  function getTrigger(panel) {
    return document.querySelector(`[aria-controls="${panel.id}"]`);
  }

  function closePanel(panel, restoreFocus = false) {
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    const trigger = getTrigger(panel);
    trigger?.setAttribute("aria-expanded", "false");
    if (restoreFocus) trigger?.focus();
  }

  function closeAll() {
    document.querySelectorAll(".category-filter-panel:not([hidden])").forEach(panel => closePanel(panel));
  }

  function toggle(panelId, render) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    const shouldOpen = panel.hidden;
    closeAll();
    if (!shouldOpen) return;
    render();
    panel.hidden = false;
    getTrigger(panel)?.setAttribute("aria-expanded", "true");
    panel.querySelector("[data-close-category-panel]")?.focus();
  }

  function panelHeader() {
    return `<div class="category-filter-header"><div class="category-filter-title">Filtrar por categoria</div>
      <button type="button" class="category-panel-close" data-close-category-panel aria-label="Fechar filtros" title="Fechar filtros"><span class="material-symbols-rounded" aria-hidden="true">close</span></button></div>`;
  }

  document.addEventListener("pointerdown", event => {
    document.querySelectorAll(".category-filter-panel:not([hidden])").forEach(panel => {
      if (!panel.contains(event.target) && !getTrigger(panel)?.contains(event.target)) closePanel(panel);
    });
  });
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-close-category-panel]");
    if (button) closePanel(button.closest(".category-filter-panel"), true);
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || document.querySelector(".modal-overlay.open")) return;
    const panel = document.querySelector(".category-filter-panel:not([hidden])");
    if (panel) { event.preventDefault(); closePanel(panel, true); }
  });

  window.FichaTecCategoryPanels = {toggle, closePanel, closeAll, panelHeader};
})();
