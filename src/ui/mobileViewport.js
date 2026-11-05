(function exposeMobileViewport() {
  let initialized = false;

  function initialize() {
    if (initialized) return;
    initialized = true;
    const viewport = window.visualViewport;
    const mobile = window.matchMedia('(max-width: 767px)');
    const touch = window.matchMedia('(pointer: coarse)');
    let restingHeight = window.innerHeight;
    let width = window.innerWidth;
    let keyboardOpen = false;
    let opening = false;
    let openingTimer;
    let frame = 0;

    function isTextEntry(element) {
      if (!element || element.disabled || element.readOnly) return false;
      if (element.matches('textarea, [contenteditable="true"], [contenteditable=""]')) return true;
      return element.matches('input') && ['text', 'search', 'email', 'url', 'tel', 'number', 'password'].includes(element.type);
    }

    function keepFocusedFieldVisible() {
      const input = document.activeElement;
      if (!keyboardOpen || !isTextEntry(input) || (viewport?.scale ?? 1) !== 1) return;
      const dialog = input.closest?.('dialog[open], .modal-overlay.open');
      if (!dialog) return; // The browser manages page fields; only scroll inside dialogs here.
      for (let container = input.parentElement; container; container = container.parentElement) {
        const overflow = window.getComputedStyle(container).overflowY;
        if (/(auto|scroll)/.test(overflow) && container.scrollHeight > container.clientHeight && container.clientHeight > 0) {
          const bounds = container.getBoundingClientRect();
          const field = input.getBoundingClientRect();
          const label = input.closest('label')?.getBoundingClientRect();
          const top = Math.max(bounds.top, viewport?.offsetTop ?? 0) + 12;
          const bottom = Math.min(bounds.bottom, (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight)) - 12;
          const fieldTop = label && field.bottom - label.top < bottom - top ? label.top : field.top;
          if (field.bottom > bottom) container.scrollTop += field.bottom - bottom;
          else if (fieldTop < top) container.scrollTop -= top - fieldTop;
        }
        if (container === dialog) break;
      }
    }

    function syncViewport() {
      frame = 0;
      const height = viewport?.height ?? window.innerHeight;
      const scale = viewport?.scale ?? 1;
      const editing = isTextEntry(document.activeElement);
      if (Math.abs(width - window.innerWidth) > 2) {
        width = window.innerWidth;
        restingHeight = window.innerHeight;
      }
      // Keep the pre-keyboard height through blur and closing animations. Some
      // Android browsers resize both viewports; iOS normally resizes only one.
      const occluded = scale === 1 && Math.max(restingHeight, window.innerHeight) - height > 120;
      keyboardOpen = mobile.matches && ((opening && editing) || (occluded && (editing || keyboardOpen)));
      document.body.classList.toggle('mobile-keyboard-open', keyboardOpen);
      if (!keyboardOpen && !editing && scale === 1) restingHeight = window.innerHeight;
      document.documentElement.style.setProperty('--app-visual-height', height + 'px');
      document.documentElement.style.setProperty('--app-visual-top', (viewport?.offsetTop ?? 0) + 'px');
      if (keyboardOpen && editing) window.requestAnimationFrame(keepFocusedFieldVisible);
    }

    function scheduleSync() {
      if (!frame) frame = window.requestAnimationFrame(syncViewport);
    }

    function onFocusIn() {
      window.clearTimeout(openingTimer);
      // Hide before the keyboard animation so the footer never rides above it.
      opening = mobile.matches && (touch.matches || navigator.maxTouchPoints > 0) && isTextEntry(document.activeElement);
      syncViewport();
      openingTimer = window.setTimeout(() => { opening = false; scheduleSync(); }, 700);
    }

    function onFocusOut() {
      window.clearTimeout(openingTimer);
      opening = false;
      scheduleSync();
    }

    viewport?.addEventListener('resize', scheduleSync, {passive:true});
    viewport?.addEventListener('scroll', scheduleSync, {passive:true});
    window.addEventListener('resize', scheduleSync, {passive:true});
    window.addEventListener('pageshow', scheduleSync);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);

    const save = document.getElementById('recipe-save-button');
    if (save && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(([entry]) => {
        document.body.classList.toggle('recipe-save-visible', entry.isIntersecting);
      });
      observer.observe(save);
    }
    syncViewport();
  }

  window.FichaTecMobileViewport = {initialize};
})();
