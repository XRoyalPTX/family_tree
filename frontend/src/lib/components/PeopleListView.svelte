<script>
  import { formatFullName, formatLifespan } from '../layout.js';

  export let persons = [];
  export let searchQuery = '';
  export let selectedPersonId = null;
  export let onSelectPerson = () => {};
  export let onJumpToGraph = () => {};
  export let onAddPerson = () => {};

  let genderFilter = 'all';
  let sortBy = 'birth_year'; // birth_year | name

  $: filteredPersons = persons
    .filter((p) => {
      if (genderFilter !== 'all' && p.gender !== genderFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      const hay = [
        p.first_name,
        p.last_name,
        p.middle_name,
        p.maiden_name,
        p.occupation,
        p.birth_place,
        p.social_class,
        p.birth_year ? String(p.birth_year) : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'birth_year') {
        const ay = a.birth_year ?? 9999;
        const by = b.birth_year ?? 9999;
        if (ay !== by) return ay - by;
      }
      return formatFullName(a).localeCompare(formatFullName(b), 'ru');
    });
</script>

<div class="list-view-container">
  <div class="list-toolbar">
    <div class="list-stats">
      <h2>Реестр персон ({filteredPersons.length} из {persons.length})</h2>
      <p>Полный список членов семьи с фильтрацией по полу, датам, местам и сословиям</p>
    </div>

    <div class="list-filters">
      <div class="pill-group">
        <button class:active={genderFilter === 'all'} on:click={() => (genderFilter = 'all')}>
          Все
        </button>
        <button class:active={genderFilter === 'male'} on:click={() => (genderFilter = 'male')}>
          Мужчины
        </button>
        <button class:active={genderFilter === 'female'} on:click={() => (genderFilter = 'female')}>
          Женщины
        </button>
      </div>

      <select class="select sort-select" bind:value={sortBy}>
        <option value="birth_year">По старшинству (год рождения)</option>
        <option value="name">По алфавиту (ФИО)</option>
      </select>

      <button class="btn btn-primary" on:click={onAddPerson}>+ Добавить человека</button>
    </div>
  </div>

  <div class="cards-grid">
    {#each filteredPersons as p (p.id)}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="registry-card"
        class:active={selectedPersonId === p.id}
        on:click={() => onSelectPerson(p.id)}
      >
        <div class="reg-top">
          <div class="reg-avatar gender-bg-{p.gender}">
            {(p.last_name?.[0] || '') + (p.first_name?.[0] || '?')}
          </div>
          <div class="reg-title">
            <h3>{formatFullName(p)}</h3>
            <span class="reg-years">{formatLifespan(p)}</span>
          </div>
          <button
            class="btn-icon jump-btn"
            title="Показать на графе древа"
            on:click|stopPropagation={() => onJumpToGraph(p.id)}
          >
            ⌖
          </button>
        </div>

        <div class="reg-details">
          {#if p.occupation}
            <div class="reg-chip">💼 {p.occupation}</div>
          {/if}
          {#if p.birth_place}
            <div class="reg-chip">📍 {p.birth_place}</div>
          {/if}
          {#if p.social_class}
            <div class="reg-chip">🏛 {p.social_class}</div>
          {/if}
        </div>

        {#if p.biography}
          <p class="reg-bio">{p.biography}</p>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .list-view-container {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    padding: 96px 32px 40px;
    max-width: 1360px;
    margin: 0 auto;
  }

  .list-toolbar {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 24px;
  }

  .list-stats h2 {
    font-size: 1.35rem;
  }

  .list-stats p {
    font-size: 0.86rem;
    color: var(--text-secondary);
    margin-top: 4px;
  }

  .list-filters {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .pill-group {
    display: flex;
    background: var(--bg-surface-solid);
    padding: 4px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--border-soft);
  }

  .pill-group button {
    padding: 7px 14px;
    border-radius: var(--radius-pill);
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-secondary);
    transition: all 0.2s var(--ease-spring);
  }

  .pill-group button.active {
    background: var(--accent-soft);
    color: var(--accent-primary);
  }

  .sort-select {
    width: auto;
    border-radius: var(--radius-pill);
    background: var(--bg-surface-solid);
    border: 1px solid var(--border-soft);
    padding: 8px 16px;
    font-size: 0.82rem;
    font-weight: 600;
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
    gap: 16px;
  }

  .registry-card {
    padding: 18px 20px;
    border-radius: var(--radius-lg);
    background: var(--bg-surface-solid);
    border: 1.5px solid var(--border-soft);
    box-shadow: var(--shadow-sm);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: all 0.24s var(--ease-spring);
  }

  .registry-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-md);
    border-color: var(--border-strong);
  }

  .registry-card.active {
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px var(--accent-soft), var(--shadow-md);
  }

  .reg-top {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .reg-avatar {
    width: 42px;
    height: 42px;
    border-radius: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.92rem;
    flex-shrink: 0;
  }

  .gender-bg-male {
    background: var(--male-bg);
    color: var(--male-accent);
  }

  .gender-bg-female {
    background: var(--female-bg);
    color: var(--female-accent);
  }

  .gender-bg-unknown {
    background: var(--neutral-bg);
    color: var(--neutral-accent);
  }

  .reg-title {
    flex: 1;
    min-width: 0;
  }

  .reg-title h3 {
    font-size: 0.96rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .reg-years {
    font-size: 0.78rem;
    color: var(--text-secondary);
    font-weight: 600;
  }

  .jump-btn {
    width: 32px;
    height: 32px;
    font-size: 1rem;
  }

  .reg-details {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .reg-chip {
    font-size: 0.75rem;
    padding: 4px 10px;
    border-radius: var(--radius-pill);
    background: var(--bg-subtle);
    color: var(--text-secondary);
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .reg-bio {
    font-size: 0.8rem;
    color: var(--text-muted);
    line-height: 1.45;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
