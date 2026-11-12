<script>
  import { onMount } from 'svelte';
  import {
    computeTreeLayout,
    formatLifespan,
    getLineageSet,
  } from '../layout.js';

  export let persons = [];
  export let unions = [];
  export let childRelations = [];
  export let selectedPersonId = null;
  export let searchQuery = '';
  export let highlightLineage = true;
  export let onSelectPerson = () => {};
  export let onQuickAddRelative = () => {};
  export let onEditUnion = () => {};
  export let onAddFirstPerson = () => {};
  export let onCreateDemoTree = () => {};

  let orientation = 'horizontal'; // 'horizontal' (left-to-right, default) | 'vertical'
  let viewportEl;
  let scale = 1;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let movedDuringDrag = false;
  let isAnimatingCamera = false;
  let hoveredUnionId = null;

  $: layout = computeTreeLayout(persons, unions, childRelations, orientation);
  $: lineage = getLineageSet(
    highlightLineage ? selectedPersonId : null,
    persons,
    unions,
    childRelations
  );

  $: normalizedQuery = searchQuery.trim().toLowerCase();
  $: matchedIds = normalizedQuery
    ? new Set(
        persons
          .filter((p) => {
            const hay = [
              p.first_name,
              p.last_name,
              p.middle_name,
              p.maiden_name,
              p.occupation,
              p.birth_place,
              p.birth_year ? String(p.birth_year) : '',
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();
            return hay.includes(normalizedQuery);
          })
          .map((p) => p.id)
      )
    : null;

  export function fitToScreen(animate = true) {
    if (!viewportEl || !layout.nodes.length) return;
    const rect = viewportEl.getBoundingClientRect();
    const { minX, maxX, minY, maxY } = layout.bounds;
    const contentW = Math.max(maxX - minX, 400);
    const contentH = Math.max(maxY - minY, 300);

    const scaleX = (rect.width - 70) / contentW;
    const scaleY = (rect.height - 110) / contentH;
    const nextScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.28), 1.15);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    isAnimatingCamera = animate;
    scale = nextScale;
    panX = rect.width / 2 - centerX * nextScale;
    panY = rect.height / 2 - centerY * nextScale + 18;

    if (animate) {
      setTimeout(() => {
        isAnimatingCamera = false;
      }, 420);
    }
  }

  export function focusOnPerson(personId, animate = true) {
    if (!viewportEl) return;
    const node = layout.nodes.find((n) => n.id === personId);
    if (!node) return;
    const rect = viewportEl.getBoundingClientRect();
    const targetScale = Math.max(scale, 0.9);
    isAnimatingCamera = animate;
    scale = targetScale;
    panX = rect.width / 2 - node.cx * targetScale - 140;
    panY = rect.height / 2 - node.cy * targetScale;
    if (animate) {
      setTimeout(() => {
        isAnimatingCamera = false;
      }, 420);
    }
  }

  function toggleOrientation() {
    orientation = orientation === 'horizontal' ? 'vertical' : 'horizontal';
    setTimeout(() => fitToScreen(true), 40);
  }

  function handleMouseDown(e) {
    if (e.button !== 0) return;
    if (
      e.target.closest('.person-card') ||
      e.target.closest('.union-badge') ||
      e.target.closest('.canvas-controls')
    )
      return;
    isDragging = true;
    movedDuringDrag = false;
    isAnimatingCamera = false;
    dragStartX = e.clientX - panX;
    dragStartY = e.clientY - panY;
  }

  function handleMouseMove(e) {
    if (!isDragging) return;
    const nx = e.clientX - dragStartX;
    const ny = e.clientY - dragStartY;
    if (Math.abs(nx - panX) > 3 || Math.abs(ny - panY) > 3) {
      movedDuringDrag = true;
    }
    panX = nx;
    panY = ny;
  }

  function handleMouseUp() {
    isDragging = false;
  }

  function handleWheel(e) {
    e.preventDefault();
    if (!viewportEl) return;
    isAnimatingCamera = false;
    const rect = viewportEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const nextScale = Math.min(Math.max(scale * zoomFactor, 0.2), 2.2);

    const worldX = (mouseX - panX) / scale;
    const worldY = (mouseY - panY) / scale;

    scale = nextScale;
    panX = mouseX - worldX * nextScale;
    panY = mouseY - worldY * nextScale;
  }

  function zoomBy(factor) {
    if (!viewportEl) return;
    const rect = viewportEl.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const nextScale = Math.min(Math.max(scale * factor, 0.2), 2.2);
    const worldX = (cx - panX) / scale;
    const worldY = (cy - panY) / scale;
    isAnimatingCamera = true;
    scale = nextScale;
    panX = cx - worldX * nextScale;
    panY = cy - worldY * nextScale;
    setTimeout(() => {
      isAnimatingCamera = false;
    }, 300);
  }

  function handleCanvasClick(e) {
    if (
      !movedDuringDrag &&
      !e.target.closest('.person-card') &&
      !e.target.closest('.union-badge') &&
      !e.target.closest('.canvas-controls')
    ) {
      onSelectPerson(null);
    }
  }

  onMount(() => {
    setTimeout(() => fitToScreen(false), 60);
  });

  let prevPersonCount = 0;
  $: if (persons.length > 0 && prevPersonCount === 0) {
    prevPersonCount = persons.length;
    setTimeout(() => fitToScreen(true), 50);
  } else if (persons.length === 0) {
    prevPersonCount = 0;
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="canvas-viewport"
  class:mode-horizontal={orientation === 'horizontal'}
  bind:this={viewportEl}
  on:mousedown={handleMouseDown}
  on:mousemove={handleMouseMove}
  on:mouseup={handleMouseUp}
  on:mouseleave={handleMouseUp}
  on:wheel|nonpassive={handleWheel}
  on:click={handleCanvasClick}
  role="application"
  aria-label="Интерактивное полотно родословного древа"
>
  {#if persons.length === 0}
    <div class="empty-canvas-card">
      <div class="empty-icon">🌿</div>
      <h2>Здесь начнется ваша семейная история</h2>
      <p>
        Добавьте первого человека (например, себя или известного предка), чтобы начать строить
        ветви родословного древа, либо загрузите демонстрационное древо.
      </p>
      <div class="empty-actions">
        <button class="btn btn-primary" on:click={onAddFirstPerson}>
          + Добавить первого человека
        </button>
        <button class="btn btn-secondary" on:click={onCreateDemoTree}>
          ✨ Загрузить демо-древо
        </button>
      </div>
    </div>
  {:else}
    <div
      class="canvas-world"
      class:camera-smooth={isAnimatingCamera}
      style="transform: translate3d({panX}px, {panY}px, 0) scale({scale});"
    >
      <!-- Generation Headers -->
      {#each layout.generationBands as band (band.generation)}
        <div
          class="generation-marker"
          style="left: {band.x}px; top: {band.y}px;"
        >
          <span class="gen-pill">{band.label}</span>
          {#if band.yearRange}
            <span class="gen-years">{band.yearRange}</span>
          {/if}
        </div>
      {/each}

      <!-- SVG Orthogonal Connections Layer -->
      <svg class="connections-svg">
        <!-- Partner brackets / links -->
        {#each layout.partnerEdges as pe (pe.id)}
          {@const isHighlighted =
            lineage.activeUnionIds.has(pe.unionId) || hoveredUnionId === pe.unionId}
          <path
            d={pe.path}
            class="partner-bracket"
            class:line-active={isHighlighted}
            class:line-dimmed={selectedPersonId && highlightLineage && !isHighlighted}
            style={!isHighlighted && pe.color ? `stroke: ${pe.color};` : ''}
          />
        {/each}

        <!-- Parent-union to Child orthogonal bus lines -->
        {#each layout.childEdges as ce (ce.id)}
          {@const isHighlighted =
            (lineage.activeUnionIds.has(ce.unionId) &&
              lineage.allHighlightedIds.has(ce.childId)) ||
            hoveredUnionId === ce.unionId}
          <path
            d={ce.path}
            class="child-bus-line"
            class:curve-adopted={ce.relationType === 'adopted'}
            class:line-active={isHighlighted}
            class:line-dimmed={selectedPersonId && highlightLineage && !isHighlighted}
            style={!isHighlighted && ce.color ? `stroke: ${ce.color};` : ''}
          />
          <circle
            cx={ce.endX}
            cy={ce.endY}
            r="3.5"
            class="junction-dot"
            class:dot-active={isHighlighted}
            class:line-dimmed={selectedPersonId && highlightLineage && !isHighlighted}
            style={!isHighlighted && ce.color ? `fill: ${ce.color};` : ''}
          />
        {/each}
      </svg>

      <!-- Couple Marriage Badges -->
      {#each layout.unionNodes as un (un.id)}
        {#if un.isCouple}
          <button
            type="button"
            class="union-badge"
            class:union-active={lineage.activeUnionIds.has(un.id) || hoveredUnionId === un.id}
            style="left: {un.x}px; top: {un.y}px; {un.color ? `border-color: ${un.color}; color: ${un.color};` : ''}"
            title={un.union.marriage_place
              ? `Брак: ${un.union.marriage_year || ''} (${un.union.marriage_place}) — нажмите для редактирования`
              : 'Нажмите, чтобы редактировать сведения о браке / свадьбе'}
            on:mouseenter={() => (hoveredUnionId = un.id)}
            on:mouseleave={() => (hoveredUnionId = null)}
            on:mousedown|stopPropagation
            on:click|stopPropagation={() => onEditUnion(un.union)}
          >
            <span class="ring-symbol" style={un.color ? `color: ${un.color};` : ''}>∞</span>
            {#if un.union.marriage_year}
              <span class="marriage-year">{un.union.marriage_year}</span>
            {/if}
          </button>
        {:else}
          <!-- Small junction dot for single-parent union -->
          <div
            class="single-parent-dot"
            style="left: {un.x}px; top: {un.y}px; {un.color ? `background: ${un.color};` : ''}"
          ></div>
        {/if}
      {/each}

      <!-- Compact Clean Person Nodes -->
      {#each layout.nodes as node (node.id)}
        {@const p = node.person}
        {@const isSelected = selectedPersonId === p.id}
        {@const isLineage = lineage.allHighlightedIds.has(p.id)}
        {@const isSearchMatch = matchedIds ? matchedIds.has(p.id) : true}
        {@const isDimmed =
          (selectedPersonId && highlightLineage && !isLineage) ||
          (matchedIds && !isSearchMatch)}

        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="person-card gender-{p.gender}"
          class:selected={isSelected}
          class:lineage-member={selectedPersonId && !isSelected && isLineage}
          class:search-highlight={matchedIds && isSearchMatch}
          class:dimmed={isDimmed}
          style="left: {node.x}px; top: {node.y}px; width: {node.width}px; height: {node.height}px;"
          on:click|stopPropagation={() => onSelectPerson(p.id)}
        >
          <div class="card-accent-bar"></div>
          <div class="card-body">
            <div class="name-line">
              <span class="surname">
                {p.last_name || p.first_name}
              </span>
              {#if p.maiden_name}
                <span class="maiden-tag">({p.maiden_name})</span>
              {/if}
              {#if p.last_name}
                <span class="given-name">
                  {p.first_name} {p.middle_name || ''}
                </span>
              {:else if p.middle_name}
                <span class="given-name">{p.middle_name}</span>
              {/if}
            </div>

            <div class="years-line">
              <span class="years-text">{formatLifespan(p)}</span>
              <span class="gender-dot dot-{p.gender}"></span>
            </div>
          </div>

          <button
            class="quick-add-btn"
            title="Быстро добавить родственника (родителя, супруга, ребенка, брата/сестру)"
            on:click|stopPropagation={() => onQuickAddRelative(p.id)}
          >
            +
          </button>
        </div>
      {/each}
    </div>

    <!-- Floating Bottom-Left Controls -->
    <div class="canvas-controls">
      <button class="ctrl-btn" on:click={() => zoomBy(1.2)} title="Приблизить">+</button>
      <span class="zoom-label">{Math.round(scale * 100)}%</span>
      <button class="ctrl-btn" on:click={() => zoomBy(0.84)} title="Отдалить">−</button>
      <div class="ctrl-divider"></div>
      <button class="ctrl-btn ctrl-text" on:click={() => fitToScreen(true)} title="Вписать всё древо в экран">
        Вписать всё
      </button>
      <button
        class="ctrl-btn ctrl-text"
        on:click={toggleOrientation}
        title="Переключить направление роста дерева"
      >
        {orientation === 'horizontal' ? '➔ Слева направо' : '⬇ Сверху вниз'}
      </button>
      <button
        class="ctrl-btn ctrl-text"
        class:ctrl-active={highlightLineage}
        on:click={() => (highlightLineage = !highlightLineage)}
        title="Подсвечивать прямую линию родства при выборе персоны"
      >
        Линия родства
      </button>
    </div>
  {/if}
</div>

<style>
  .canvas-viewport {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    cursor: grab;
    background-color: var(--bg-canvas);
    background-image: radial-gradient(var(--bg-canvas-dots) 1.3px, transparent 1.3px);
    background-size: 26px 26px;
  }

  .canvas-viewport:active {
    cursor: grabbing;
  }

  .canvas-world {
    position: absolute;
    top: 0;
    left: 0;
    transform-origin: 0 0;
    will-change: transform;
  }

  .canvas-world.camera-smooth {
    transition: transform 0.42s var(--ease-spring);
  }

  .connections-svg {
    position: absolute;
    top: 0;
    left: 0;
    width: 1px;
    height: 1px;
    overflow: visible;
    pointer-events: none;
    z-index: 1;
  }

  .partner-bracket {
    fill: none;
    stroke: #475569;
    stroke-width: 2.6px;
    stroke-linecap: round;
    stroke-linejoin: round;
    opacity: 0.88;
    transition: stroke 0.2s ease, opacity 0.2s ease, stroke-width 0.2s ease;
  }

  .child-bus-line {
    fill: none;
    stroke: #475569;
    stroke-width: 2.5px;
    stroke-linecap: round;
    stroke-linejoin: round;
    opacity: 0.88;
    transition: stroke 0.2s ease, opacity 0.2s ease, stroke-width 0.2s ease;
  }

  :global([data-theme='dark']) .partner-bracket,
  :global([data-theme='dark']) .child-bus-line {
    stroke: #94a3b8;
  }

  .child-bus-line.curve-adopted {
    stroke-dasharray: 6 5;
  }

  .line-active {
    stroke: var(--accent-primary) !important;
    stroke-width: 3.6px !important;
    opacity: 1 !important;
    filter: drop-shadow(0 0 5px rgba(79, 70, 229, 0.45));
  }

  .junction-dot {
    fill: #475569;
    transition: fill 0.2s ease, opacity 0.2s ease, r 0.2s ease;
  }

  .junction-dot.dot-active {
    fill: var(--accent-primary) !important;
    r: 5px;
    filter: drop-shadow(0 0 4px var(--accent-primary));
  }

  .line-dimmed {
    opacity: 0.16 !important;
  }

  .generation-marker {
    position: absolute;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    pointer-events: none;
    opacity: 0.85;
  }

  .gen-pill {
    font-size: 0.69rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 4px 10px;
    border-radius: var(--radius-pill);
    background: var(--bg-surface-solid);
    color: var(--text-secondary);
    border: 1px solid var(--border-soft);
    box-shadow: var(--shadow-sm);
  }

  .gen-years {
    font-size: 0.74rem;
    font-weight: 600;
    color: var(--text-muted);
  }

  .union-badge {
    position: absolute;
    transform: translate(-50%, -50%);
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 9px;
    border-radius: var(--radius-pill);
    background: var(--bg-surface-solid);
    border: 1.5px solid #94a3b8;
    box-shadow: var(--shadow-sm);
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--text-secondary);
    z-index: 4;
    cursor: pointer;
    transition: all 0.22s var(--ease-spring);
  }

  .union-badge:hover {
    border-color: var(--accent-primary);
    color: var(--accent-primary);
    transform: translate(-50%, -50%) scale(1.14);
    box-shadow: var(--shadow-md);
  }

  .union-badge.union-active {
    border-color: var(--accent-primary);
    color: var(--accent-primary);
    transform: translate(-50%, -50%) scale(1.08);
  }

  .ring-symbol {
    font-size: 0.85rem;
    line-height: 1;
    color: var(--accent-primary);
  }

  .single-parent-dot {
    position: absolute;
    width: 8px;
    height: 8px;
    border-radius: 99px;
    background: #64748b;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 2;
  }

  /* Compact Horizontal Person Card */
  .person-card {
    position: absolute;
    background: var(--bg-surface-solid);
    border-radius: 14px;
    border: 1.5px solid var(--border-soft);
    box-shadow: var(--shadow-sm);
    display: flex;
    overflow: visible;
    cursor: pointer;
    transition:
      transform 0.22s var(--ease-spring),
      box-shadow 0.22s var(--ease-spring),
      border-color 0.22s var(--ease-spring),
      opacity 0.22s ease;
    z-index: 3;
  }

  .person-card:hover {
    transform: translateX(2px) translateY(-1px);
    box-shadow: var(--shadow-md);
    border-color: #64748b;
    z-index: 5;
  }

  .person-card.gender-male:hover {
    border-color: var(--male-border);
  }

  .person-card.gender-female:hover {
    border-color: var(--female-border);
  }

  .person-card.selected {
    border-color: var(--accent-primary);
    background: var(--bg-surface-solid);
    box-shadow:
      0 0 0 3.5px var(--accent-soft),
      var(--shadow-lg);
    transform: scale(1.02);
    z-index: 6;
  }

  .person-card.lineage-member {
    border-color: var(--border-strong);
  }

  .person-card.search-highlight {
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.35), var(--shadow-md);
  }

  .person-card.dimmed {
    opacity: 0.28;
    filter: grayscale(0.2);
  }

  .card-accent-bar {
    width: 5px;
    border-radius: 14px 0 0 14px;
    flex-shrink: 0;
    background: var(--neutral-accent);
  }

  .gender-male .card-accent-bar {
    background: #2563eb;
  }

  .gender-female .card-accent-bar {
    background: #db2777;
  }

  .card-body {
    flex: 1;
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 3px;
    min-width: 0;
  }

  .name-line {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 0.83rem;
    line-height: 1.25;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .surname {
    font-weight: 700;
  }

  .maiden-tag {
    font-weight: 500;
    font-size: 0.74rem;
    color: var(--text-muted);
    margin-left: 2px;
  }

  .given-name {
    font-weight: 600;
    color: var(--text-secondary);
    margin-left: 3px;
  }

  .years-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  .years-text {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  .gender-dot {
    width: 7px;
    height: 7px;
    border-radius: 99px;
    flex-shrink: 0;
    opacity: 0.75;
  }

  .dot-male {
    background: #3b82f6;
  }

  .dot-female {
    background: #ec4899;
  }

  .dot-unknown {
    background: #10b981;
  }

  .quick-add-btn {
    position: absolute;
    right: -9px;
    top: -9px;
    width: 24px;
    height: 24px;
    border-radius: var(--radius-pill);
    background: var(--accent-primary);
    color: #fff;
    font-weight: 700;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-sm);
    opacity: 0;
    transform: scale(0.8);
    transition: all 0.2s var(--ease-spring);
  }

  .person-card:hover .quick-add-btn,
  .person-card.selected .quick-add-btn {
    opacity: 1;
    transform: scale(1);
  }

  .quick-add-btn:hover {
    transform: scale(1.15) !important;
    background: var(--accent-primary-hover);
  }

  /* Floating Bottom Controls */
  .canvas-controls {
    position: absolute;
    left: 24px;
    bottom: 24px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: var(--radius-pill);
    background: var(--bg-surface);
    backdrop-filter: blur(16px);
    border: 1px solid var(--border-soft);
    box-shadow: var(--shadow-md);
    z-index: 20;
  }

  .ctrl-btn {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-pill);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--text-secondary);
    transition: all 0.2s var(--ease-spring);
  }

  .ctrl-btn.ctrl-text {
    width: auto;
    padding: 0 12px;
    font-size: 0.8rem;
  }

  .ctrl-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .ctrl-btn.ctrl-active {
    background: var(--accent-soft);
    color: var(--accent-primary);
  }

  .zoom-label {
    font-size: 0.78rem;
    font-weight: 600;
    min-width: 44px;
    text-align: center;
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }

  .ctrl-divider {
    width: 1px;
    height: 18px;
    background: var(--border-soft);
    margin: 0 2px;
  }

  /* Empty state */
  .empty-canvas-card {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    max-width: 480px;
    width: calc(100% - 32px);
    padding: 38px 34px;
    border-radius: var(--radius-xl);
    background: var(--bg-surface);
    backdrop-filter: blur(20px);
    border: 1px solid var(--border-soft);
    box-shadow: var(--shadow-lg);
    text-align: center;
    cursor: default;
    animation: fadeInScale 0.35s var(--ease-spring);
  }

  .empty-icon {
    width: 64px;
    height: 64px;
    margin: 0 auto 18px;
    border-radius: 22px;
    background: var(--accent-soft);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.9rem;
  }

  .empty-canvas-card h2 {
    font-size: 1.3rem;
    margin-bottom: 10px;
  }

  .empty-canvas-card p {
    font-size: 0.92rem;
    line-height: 1.6;
    color: var(--text-secondary);
    margin-bottom: 24px;
  }

  .empty-actions {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
  }
</style>
