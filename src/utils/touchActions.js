(function exposeTouchActions() {
  const SWIPE_OPEN_DISTANCE = 54;
  const SWIPE_CLOSE_DISTANCE = 32;
  const LONG_PRESS_MS = 1000;
  const MOVE_TOLERANCE = 10;
  let state = null;
  let initialized = false;

  function getSwipeRow(target) {
    return target?.closest?.(".swipe-row") || null;
  }

  function getSwipeContent(target) {
    return target?.closest?.(".swipe-content") || null;
  }

  function isInteractiveTarget(target) {
    return Boolean(target?.closest?.("button,a,input,select,textarea,label"));
  }

  function closeSwipeActions(exceptRow = null) {
    document.querySelectorAll(".swipe-row.is-open").forEach((row) => {
      if (row !== exceptRow) row.classList.remove("is-open");
    });
  }

  function openSwipeActions(row) {
    if (!row) return;
    closeSwipeActions(row);
    row.classList.add("is-open");
  }

  function handlePointerDown(event) {
    const content = getSwipeContent(event.target);
    if (!content || isInteractiveTarget(event.target)) return;

    const row = getSwipeRow(content);
    if (!row) return;

    state = {
      row,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      longPressTimer: window.setTimeout(() => {
        openSwipeActions(row);
        state = null;
      }, LONG_PRESS_MS),
    };
  }

  function handlePointerMove(event) {
    if (!state || event.pointerId !== state.pointerId) return;

    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;

    if (Math.abs(deltaX) > MOVE_TOLERANCE || Math.abs(deltaY) > MOVE_TOLERANCE) {
      window.clearTimeout(state.longPressTimer);
    }

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > MOVE_TOLERANCE) {
      event.preventDefault();
    }
  }

  function handlePointerEnd(event) {
    if (!state || event.pointerId !== state.pointerId) return;

    const deltaX = event.clientX - state.startX;
    window.clearTimeout(state.longPressTimer);

    if (deltaX <= -SWIPE_OPEN_DISTANCE) openSwipeActions(state.row);
    if (deltaX >= SWIPE_CLOSE_DISTANCE) state.row.classList.remove("is-open");

    state = null;
  }

  function handleClick(event) {
    const row = getSwipeRow(event.target);
    if (!row) {
      closeSwipeActions();
      return;
    }

    if (event.target.closest(".swipe-action")) {
      closeSwipeActions();
      return;
    }

    if (row.classList.contains("is-open") && getSwipeContent(event.target) && !isInteractiveTarget(event.target)) {
      event.preventDefault();
      event.stopPropagation();
      row.classList.remove("is-open");
    }
  }

  function initTouchActions() {
    if (initialized) return;
    initialized = true;
    document.addEventListener("pointerdown", handlePointerDown, {passive: true});
    document.addEventListener("pointermove", handlePointerMove, {passive: false});
    document.addEventListener("pointerup", handlePointerEnd, {passive: true});
    document.addEventListener("pointercancel", handlePointerEnd, {passive: true});
    document.addEventListener("click", handleClick, true);
  }

  window.FichaTecTouchActions = {
    initTouchActions,
    openSwipeActions,
    closeSwipeActions,
    getSwipeRow,
    getSwipeContent,
    isInteractiveTarget,
  };
})();
