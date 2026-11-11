<script>
  import { onMount } from 'svelte';
  import { api } from './lib/api.js';
  import { formatFullName, formatLifespan } from './lib/layout.js';
  import TreeCanvas from './lib/components/TreeCanvas.svelte';
  import PersonDrawer from './lib/components/PersonDrawer.svelte';
  import PersonModal from './lib/components/PersonModal.svelte';
  import TreeModal from './lib/components/TreeModal.svelte';
  import UnionModal from './lib/components/UnionModal.svelte';
  import PeopleListView from './lib/components/PeopleListView.svelte';

  let trees = [];
  let activeTreeId = null;
  let activeTree = null;
  let loading = true;

  let selectedPersonId = null;
  let drawerInitialTab = 'profile';
  let viewMode = 'graph'; // graph | list
  let searchQuery = '';
  let searchDropdownOpen = false;
  let theme = 'light';

  let canvasRef;
  let drawerRef;

  // Modals
  let personModalOpen = false;
  let personModalMode = 'create';
  let editingPerson = null;

  let treeModalOpen = false;
  let treeModalMode = 'create'; // create | edit | import

  let unionModalOpen = false;
  let editingUnion = null;

  let toastMessage = '';
  let toastTimer = null;

  function showToast(msg) {
    toastMessage = msg;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastMessage = '';
    }, 3400);
  }

  function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ft_theme', theme);
  }

  $: persons = activeTree?.persons || [];
  $: unions = activeTree?.unions || [];
  $: childRelations = activeTree?.child_relations || [];
  $: selectedPerson = persons.find((p) => p.id === selectedPersonId) || null;

  $: quickSearchResults =
    searchQuery.trim().length > 0
      ? persons
          .filter((p) => {
            const q = searchQuery.trim().toLowerCase();
            return [p.first_name, p.last_name, p.middle_name, p.maiden_name, p.occupation, p.birth_place]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
              .includes(q);
          })
          .slice(0, 6)
      : [];

  async function loadTreesAndSelect(preferredId = null) {
    loading = true;
    try {
      trees = await api.listTrees();
      if (trees.length === 0) {
        // Automatically create a first empty tree or let user create one
        const created = await api.createTree({
          name: 'Моё родословное древо',
          description: 'Основное семейное древо',
        });
        trees = [created];
      }
      const targetId =
        preferredId && trees.some((t) => t.id === preferredId)
          ? preferredId
          : trees[0].id;
      await selectTree(targetId);
    } catch (err) {
      showToast(err.message || 'Ошибка загрузки деревьев');
    } finally {
      loading = false;
    }
  }

  async function selectTree(treeId) {
    activeTreeId = Number(treeId);
    selectedPersonId = null;
    activeTree = await api.getTree(activeTreeId);
    trees = await api.listTrees();
    setTimeout(() => {
      canvasRef?.fitToScreen(true);
    }, 60);
  }

  async function refreshActiveTree(keepSelectedId = selectedPersonId) {
    if (!activeTreeId) return;
    activeTree = await api.getTree(activeTreeId);
    trees = await api.listTrees();
    selectedPersonId =
      keepSelectedId && activeTree.persons.some((p) => p.id === keepSelectedId)
        ? keepSelectedId
        : null;
  }

  function handleSelectPerson(personId, tab = 'profile') {
    drawerInitialTab = tab;
    selectedPersonId = personId;
    if (personId && viewMode === 'graph') {
      canvasRef?.focusOnPerson(personId, true);
    }
  }

  function handleQuickAddRelativeFromCard(personId) {
    drawerInitialTab = 'add_relative';
    selectedPersonId = personId;
    setTimeout(() => {
      drawerRef?.openAddRelativeTab('child');
    }, 30);
  }

  function openCreatePersonModal() {
    personModalMode = 'create';
    editingPerson = null;
    personModalOpen = true;
  }

  function openEditPersonModal(person) {
    personModalMode = 'edit';
    editingPerson = person;
    personModalOpen = true;
  }

  async function handleSavePersonModal(payload) {
    if (personModalMode === 'edit' && editingPerson) {
      await api.updatePerson(editingPerson.id, payload);
      await refreshActiveTree(editingPerson.id);
      showToast('Анкета обновлена');
    } else {
      const created = await api.createPerson(activeTreeId, payload);
      await refreshActiveTree(created.id);
      showToast('Человек добавлен в древо');
      setTimeout(() => canvasRef?.focusOnPerson(created.id, true), 80);
    }
  }

  async function handleDeletePerson(personId) {
    await api.deletePerson(personId);
    await refreshActiveTree(null);
    showToast('Запись удалена из древа');
  }

  async function handleAddRelative(personId, payload) {
    const rel = await api.addRelative(personId, payload);
    await refreshActiveTree(personId);
    showToast(`Добавлена родственная связь: ${formatFullName(rel)}`);
  }

  function openEditUnionModal(union) {
    editingUnion = union;
    unionModalOpen = true;
  }

  async function handleSaveUnionModal(unionId, payload) {
    await api.updateUnion(unionId, payload);
    await refreshActiveTree(selectedPersonId);
    showToast('Сведения о браке сохранены');
  }

  async function handleDeleteUnion(unionId) {
    await api.deleteUnion(unionId);
    await refreshActiveTree(selectedPersonId);
    showToast('Союз удален');
  }

  async function handleRemoveChildFromUnion(unionId, childId) {
    await api.removeChildFromUnion(unionId, childId);
    await refreshActiveTree(selectedPersonId);
    showToast('Связь ребенка отвязана');
  }

  async function handleSaveTreeModal(payload) {
    if (treeModalMode === 'edit' && activeTree) {
      await api.updateTree(activeTree.id, payload);
      await refreshActiveTree(selectedPersonId);
      showToast('Настройки древа сохранены');
    } else {
      const created = await api.createTree(payload);
      await loadTreesAndSelect(created.id);
      showToast(`Создано древо «${created.name}»`);
    }
  }

  async function handleDeleteTree(treeId) {
    await api.deleteTree(treeId);
    await loadTreesAndSelect(null);
    showToast('Древо удалено');
  }

  async function handleImportTree(payload) {
    const imported = await api.importTree(payload);
    await loadTreesAndSelect(imported.id);
    showToast(`Импортировано древо «${imported.name}»`);
  }

  async function handleExportActiveTree() {
    if (!activeTreeId) return;
    const data = await api.exportTree(activeTreeId);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (activeTree?.name || 'family_tree').replace(/[^a-zа-яё0-9_-]/gi, '_');
    a.href = url;
    a.download = `${safeName}_backup.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON-копия древа сохранена');
  }

  async function handleCreateDemoTree() {
    const demo = await api.createDemoTree();
    await loadTreesAndSelect(demo.id);
    showToast('Загружено демонстрационное родословное древо');
  }

  onMount(() => {
    const savedTheme = localStorage.getItem('ft_theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      theme = savedTheme;
      document.documentElement.setAttribute('data-theme', theme);
    }
    loadTreesAndSelect();
  });
</script>

<div class="app-shell">
  <!-- Floating Modern Header -->
  <header class="floating-topbar">
    <div class="topbar-left">
      <div class="brand-badge" title="Персональная система родословного древа">
        <span class="brand-logo">🌳</span>
        <span class="brand-title">Родословная</span>
      </div>

      <div class="tree-switcher">
        <select
          class="select tree-select"
          value={activeTreeId}
          on:change={(e) => selectTree(Number(e.target.value))}
          aria-label="Выбор родословного древа"
        >
          {#each trees as t (t.id)}
            <option value={t.id}>
              {t.name} ({t.person_count})
            </option>
          {/each}
        </select>

        <button
          class="btn-icon"
          title="Создать новое древо"
          on:click={() => {
            treeModalMode = 'create';
            treeModalOpen = true;
          }}
        >
          +
        </button>
        <button
          class="btn-icon"
          title="Настройки или удаление текущего древа"
          on:click={() => {
            treeModalMode = 'edit';
            treeModalOpen = true;
          }}
        >
          ⚙
        </button>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="topbar-center">
      <div class="search-wrapper">
        <span class="search-icon">🔍</span>
        <input
          type="text"
          class="search-input"
          placeholder="Поиск по ФИО, девичьей фамилии, году, городу..."
          bind:value={searchQuery}
          on:focus={() => (searchDropdownOpen = true)}
          on:blur={() => setTimeout(() => (searchDropdownOpen = false), 180)}
        />
        {#if searchQuery}
          <button class="clear-search" on:click={() => (searchQuery = '')}>✕</button>
        {/if}

        {#if searchDropdownOpen && quickSearchResults.length > 0}
          <div class="search-dropdown">
            {#each quickSearchResults as item (item.id)}
              <button
                type="button"
                class="search-result-item"
                on:mousedown={() => {
                  handleSelectPerson(item.id);
                  searchDropdownOpen = false;
                }}
              >
                <span class="sr-name">{formatFullName(item)}</span>
                <span class="sr-years">{formatLifespan(item)}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Right Actions -->
    <div class="topbar-right">
      <div class="view-switcher">
        <button
          class:active={viewMode === 'graph'}
          on:click={() => (viewMode = 'graph')}
        >
          Древо
        </button>
        <button
          class:active={viewMode === 'list'}
          on:click={() => (viewMode = 'list')}
        >
          Реестр ({persons.length})
        </button>
      </div>

      <button
        class="btn btn-secondary btn-compact"
        title="Загрузить демонстрационное древо в 4 поколениях"
        on:click={handleCreateDemoTree}
      >
        ✨ Демо
      </button>

      <button
        class="btn btn-secondary btn-compact"
        title="Скачать резервную копию текущего древа в JSON"
        on:click={handleExportActiveTree}
      >
        ⇩ Экспорт
      </button>

      <button
        class="btn btn-secondary btn-compact"
        title="Импортировать древо из JSON"
        on:click={() => {
          treeModalMode = 'import';
          treeModalOpen = true;
        }}
      >
        ⇧ Импорт
      </button>

      <button class="btn btn-primary btn-compact" on:click={openCreatePersonModal}>
        + Персона
      </button>

      <button
        class="btn-icon"
        on:click={toggleTheme}
        title={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'}
      >
        {theme === 'light' ? '☾' : '☀'}
      </button>
    </div>
  </header>

  <!-- Main Workspace -->
  <main class="workspace-area">
    {#if loading}
      <div class="loading-state">Загрузка родословного древа...</div>
    {:else if viewMode === 'graph'}
      <TreeCanvas
        bind:this={canvasRef}
        {persons}
        {unions}
        {childRelations}
        {selectedPersonId}
        {searchQuery}
        onSelectPerson={(id) => handleSelectPerson(id, 'profile')}
        onQuickAddRelative={handleQuickAddRelativeFromCard}
        onEditUnion={openEditUnionModal}
        onAddFirstPerson={openCreatePersonModal}
        onCreateDemoTree={handleCreateDemoTree}
      />
    {:else}
      <PeopleListView
        {persons}
        {searchQuery}
        {selectedPersonId}
        onSelectPerson={(id) => handleSelectPerson(id, 'profile')}
        onJumpToGraph={(id) => {
          viewMode = 'graph';
          setTimeout(() => handleSelectPerson(id, 'profile'), 60);
        }}
        onAddPerson={openCreatePersonModal}
      />
    {/if}

    <!-- Slide-over Profile & Kinship Drawer -->
    <PersonDrawer
      bind:this={drawerRef}
      person={selectedPerson}
      {persons}
      {unions}
      {childRelations}
      initialTab={drawerInitialTab}
      onClose={() => (selectedPersonId = null)}
      onSelectPerson={(id) => handleSelectPerson(id, 'profile')}
      onEditPerson={openEditPersonModal}
      onDeletePerson={handleDeletePerson}
      onAddRelativeSubmit={handleAddRelative}
      onEditUnion={openEditUnionModal}
      onDeleteUnion={handleDeleteUnion}
      onRemoveChildFromUnion={handleRemoveChildFromUnion}
    />
  </main>

  <!-- Modals -->
  <PersonModal
    isOpen={personModalOpen}
    mode={personModalMode}
    initialPerson={editingPerson}
    onClose={() => (personModalOpen = false)}
    onSubmit={handleSavePersonModal}
  />

  <UnionModal
    isOpen={unionModalOpen}
    union={editingUnion}
    {persons}
    onClose={() => (unionModalOpen = false)}
    onSaveUnion={handleSaveUnionModal}
    onDeleteUnion={handleDeleteUnion}
  />

  <TreeModal
    isOpen={treeModalOpen}
    mode={treeModalMode}
    {activeTree}
    onClose={() => (treeModalOpen = false)}
    onSaveTree={handleSaveTreeModal}
    onDeleteTree={handleDeleteTree}
    onImportTree={handleImportTree}
  />

  {#if toastMessage}
    <div class="toast-pill">{toastMessage}</div>
  {/if}
</div>

<style>
  .app-shell {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .floating-topbar {
    position: absolute;
    top: 16px;
    left: 20px;
    right: 20px;
    min-height: 56px;
    padding: 8px 14px;
    border-radius: var(--radius-xl);
    background: var(--bg-surface);
    backdrop-filter: blur(20px);
    border: 1px solid var(--border-soft);
    box-shadow: var(--shadow-md);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    z-index: 40;
    flex-wrap: wrap;
  }

  .topbar-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .brand-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 10px 4px 6px;
  }

  .brand-logo {
    font-size: 1.25rem;
  }

  .brand-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 800;
    font-size: 1rem;
    letter-spacing: -0.02em;
  }

  .tree-switcher {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .tree-select {
    width: auto;
    min-width: 210px;
    max-width: 290px;
    padding: 8px 14px;
    border-radius: var(--radius-pill);
    font-weight: 600;
    font-size: 0.84rem;
    background: var(--bg-subtle);
  }

  .topbar-center {
    flex: 1;
    max-width: 420px;
    min-width: 200px;
  }

  .search-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    background: var(--bg-subtle);
    border-radius: var(--radius-pill);
    padding: 0 12px;
    border: 1.5px solid transparent;
    transition: all 0.2s var(--ease-spring);
  }

  .search-wrapper:focus-within {
    background: var(--bg-surface-solid);
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 4px var(--accent-soft);
  }

  .search-icon {
    font-size: 0.85rem;
    opacity: 0.65;
    margin-right: 8px;
  }

  .search-input {
    width: 100%;
    padding: 8px 0;
    font-size: 0.84rem;
  }

  .clear-search {
    font-size: 0.78rem;
    color: var(--text-muted);
    padding: 4px;
  }

  .search-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    background: var(--bg-surface-solid);
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    padding: 6px;
    z-index: 50;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .search-result-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 12px;
    border-radius: var(--radius-sm);
    font-size: 0.83rem;
    text-align: left;
    transition: background 0.15s ease;
  }

  .search-result-item:hover {
    background: var(--bg-hover);
  }

  .sr-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .sr-years {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .topbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .view-switcher {
    display: flex;
    background: var(--bg-subtle);
    padding: 3px;
    border-radius: var(--radius-pill);
  }

  .view-switcher button {
    padding: 6px 13px;
    border-radius: var(--radius-pill);
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-secondary);
    transition: all 0.2s var(--ease-spring);
  }

  .view-switcher button.active {
    background: var(--bg-surface-solid);
    color: var(--accent-primary);
    box-shadow: var(--shadow-sm);
  }

  .btn-compact {
    padding: 8px 14px;
    font-size: 0.8rem;
  }

  .workspace-area {
    flex: 1;
    width: 100%;
    height: 100%;
    position: relative;
  }

  .loading-state {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .toast-pill {
    position: fixed;
    bottom: 26px;
    left: 50%;
    transform: translateX(-50%);
    padding: 11px 22px;
    border-radius: var(--radius-pill);
    background: var(--text-primary);
    color: var(--bg-surface-solid);
    font-size: 0.84rem;
    font-weight: 600;
    box-shadow: var(--shadow-lg);
    z-index: 80;
    animation: fadeInScale 0.25s var(--ease-spring);
  }
</style>
