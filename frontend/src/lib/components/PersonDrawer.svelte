<script>
  import { formatFullName, formatLifespan, getPersonRelatives } from '../layout.js';

  export let person = null;
  export let persons = [];
  export let unions = [];
  export let childRelations = [];
  export let initialTab = 'profile';
  export let onClose = () => {};
  export let onSelectPerson = () => {};
  export let onEditPerson = () => {};
  export let onDeletePerson = () => {};
  export let onAddRelativeSubmit = async () => {};
  export let onEditUnion = () => {};
  export let onDeleteUnion = async () => {};
  export let onRemoveChildFromUnion = async () => {};

  let activeTab = initialTab;
  let confirmDelete = false;
  let submittingRelative = false;
  let relError = '';

  // Contextual relative form state
  let relation = 'parent'; // parent, spouse, child, sibling
  let mode = 'new'; // new | existing
  let existingPersonId = '';
  let firstName = '';
  let lastName = '';
  let middleName = '';
  let maidenName = '';
  let gender = 'unknown';
  let birthYear = '';
  let deathYear = '';
  let isAlive = true;
  let birthPlace = '';
  let occupation = '';
  let marriageYear = '';
  let marriagePlace = '';
  let selectedUnionId = '';

  let prevPersonId = null;
  $: if (person && person.id !== prevPersonId) {
    prevPersonId = person.id;
    confirmDelete = false;
    relError = '';
    resetRelativeForm();
  }

  $: if (initialTab) {
    activeTab = initialTab;
  }

  $: relatives = person
    ? getPersonRelatives(person.id, persons, unions, childRelations)
    : { parents: [], siblings: [], unionsWithPartners: [], children: [] };

  $: otherPersons = person
    ? persons.filter((p) => p.id !== person.id)
    : [];

  export function openAddRelativeTab(defaultRelation = 'child') {
    activeTab = 'add_relative';
    relation = defaultRelation;
    resetRelativeForm(defaultRelation);
  }

  function resetRelativeForm(rel = relation) {
    relation = rel;
    mode = 'new';
    existingPersonId = '';
    firstName = '';
    lastName = person?.last_name || '';
    middleName =
      rel === 'child' && person?.gender === 'male' && person?.first_name
        ? ''
        : '';
    maidenName = '';
    gender =
      rel === 'spouse'
        ? person?.gender === 'male'
          ? 'female'
          : person?.gender === 'female'
            ? 'male'
            : 'unknown'
        : 'unknown';
    birthYear = '';
    deathYear = '';
    isAlive = true;
    birthPlace = '';
    occupation = '';
    marriageYear = '';
    marriagePlace = '';
    selectedUnionId =
      relatives?.unionsWithPartners?.length === 1
        ? String(relatives.unionsWithPartners[0].union.id)
        : '';
  }

  async function handleRelativeFormSubmit(e) {
    e.preventDefault();
    relError = '';
    submittingRelative = true;
    try {
      const payload = {
        relation,
        union_type: 'married',
        relation_type: 'biological',
        merge_single_union: true,
      };

      if (relation === 'spouse' && marriageYear) {
        payload.marriage_year = Number(marriageYear);
      }
      if (relation === 'spouse' && marriagePlace.trim()) {
        payload.marriage_place = marriagePlace.trim();
      }
      if (relation === 'child' && selectedUnionId) {
        payload.union_id = Number(selectedUnionId);
      }

      if (mode === 'existing') {
        if (!existingPersonId) {
          throw new Error('Выберите человека из списка');
        }
        payload.existing_person_id = Number(existingPersonId);
      } else {
        if (!firstName.trim()) {
          throw new Error('Введите имя родственника');
        }
        payload.new_person = {
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
          middle_name: middleName.trim() || null,
          maiden_name: maidenName.trim() || null,
          gender,
          birth_year: birthYear !== '' ? Number(birthYear) : null,
          death_year: deathYear !== '' ? Number(deathYear) : null,
          is_alive: deathYear !== '' ? false : isAlive,
          birth_place: birthPlace.trim() || null,
          occupation: occupation.trim() || null,
        };
      }

      await onAddRelativeSubmit(person.id, payload);
      activeTab = 'relatives';
      resetRelativeForm();
    } catch (err) {
      relError = err.message || 'Не удалось добавить родственника';
    } finally {
      submittingRelative = false;
    }
  }

  const genderLabels = {
    male: 'Мужской',
    female: 'Женский',
    unknown: 'Не указан',
  };
</script>

{#if person}
  <aside class="drawer-panel">
    <!-- Header -->
    <div class="drawer-header">
      <div class="person-hero">
        <div class="hero-avatar gender-bg-{person.gender}">
          {(person.last_name?.[0] || '') + (person.first_name?.[0] || '?')}
        </div>
        <div class="hero-titles">
          <div class="badges-row">
            <span class="badge gender-pill-{person.gender}">
              {genderLabels[person.gender] || 'Не указан'}
            </span>
            <span class="badge lifespan-badge">{formatLifespan(person)}</span>
          </div>
          <h2>{formatFullName(person)}</h2>
          {#if person.occupation}
            <p class="hero-subtitle">{person.occupation}</p>
          {/if}
        </div>
      </div>

      <button class="btn-icon" on:click={onClose} title="Закрыть панель">✕</button>
    </div>

    <!-- Segmented Tabs -->
    <div class="drawer-tabs">
      <button
        class="tab-btn"
        class:active={activeTab === 'profile'}
        on:click={() => (activeTab = 'profile')}
      >
        Анкета
      </button>
      <button
        class="tab-btn"
        class:active={activeTab === 'relatives'}
        on:click={() => (activeTab = 'relatives')}
      >
        Семья ({relatives.parents.length +
          relatives.unionsWithPartners.length +
          relatives.siblings.length +
          relatives.children.length})
      </button>
      <button
        class="tab-btn tab-accent"
        class:active={activeTab === 'add_relative'}
        on:click={() => (activeTab = 'add_relative')}
      >
        + Родственник
      </button>
    </div>

    <!-- Scrollable Content -->
    <div class="drawer-content">
      {#if activeTab === 'profile'}
        <!-- Action toolbar -->
        <div class="profile-actions">
          <button class="btn btn-secondary" style="flex: 1;" on:click={() => onEditPerson(person)}>
            ✎ Редактировать анкету
          </button>
          {#if !confirmDelete}
            <button
              class="btn btn-danger"
              on:click={() => (confirmDelete = true)}
              title="Удалить из древа"
            >
              Удалить
            </button>
          {/if}
        </div>

        {#if confirmDelete}
          <div class="delete-confirm-box">
            <p>
              Удалить <strong>{formatFullName(person)}</strong> из древа? Все остальные родственники
              останутся в базе.
            </p>
            <div class="confirm-buttons">
              <button class="btn btn-danger" on:click={() => onDeletePerson(person.id)}>
                Да, удалить
              </button>
              <button class="btn btn-secondary" on:click={() => (confirmDelete = false)}>
                Отмена
              </button>
            </div>
          </div>
        {/if}

        <!-- Key Life Events -->
        <div class="info-section">
          <h3>Даты и география</h3>
          <div class="info-grid">
            <div class="info-card">
              <span class="info-label">Рождение</span>
              <span class="info-val">
                {person.birth_date ||
                  (person.birth_year
                    ? `${person.is_birth_year_approx ? 'ок. ' : ''}${person.birth_year} г.`
                    : 'Не указано')}
              </span>
              {#if person.birth_place}
                <span class="info-sub">📍 {person.birth_place}</span>
              {/if}
            </div>

            {#if !person.is_alive || person.death_year || person.death_date || person.death_place}
              <div class="info-card">
                <span class="info-label">Уход из жизни</span>
                <span class="info-val">
                  {person.death_date ||
                    (person.death_year
                      ? `${person.is_death_year_approx ? 'ок. ' : ''}${person.death_year} г.`
                      : 'Дата неизвестна')}
                </span>
                {#if person.death_place}
                  <span class="info-sub">📍 {person.death_place}</span>
                {/if}
              </div>
            {/if}

            {#if person.residence_place}
              <div class="info-card">
                <span class="info-label">Место проживания</span>
                <span class="info-val">📍 {person.residence_place}</span>
              </div>
            {/if}

            {#if person.burial_place}
              <div class="info-card">
                <span class="info-label">Место захоронения</span>
                <span class="info-val">🕊 {person.burial_place}</span>
              </div>
            {/if}
          </div>
        </div>

        <!-- Marriages & Spouses Summary right in Profile -->
        {#if relatives.unionsWithPartners.length > 0}
          <div class="info-section">
            <h3>Супружеские союзы и свадьбы</h3>
            <div class="rel-list">
              {#each relatives.unionsWithPartners as uItem (uItem.union.id)}
                <div class="marriage-summary-card">
                  <div class="marriage-top">
                    <div class="marriage-info">
                      <div class="rel-name">
                        {uItem.partner
                          ? `Супруг(а): ${formatFullName(uItem.partner)}`
                          : 'Родительский союз'}
                      </div>
                      <div class="rel-sub">
                        {#if uItem.union.union_type === 'civil'}
                          Гражданский союз
                        {:else if uItem.union.union_type === 'divorced'}
                          В разводе
                        {:else if uItem.union.union_type === 'parents'}
                          Общие дети
                        {:else}
                          Официальный брак
                        {/if}
                        {#if uItem.union.marriage_year}
                          • с {uItem.union.marriage_year} г.
                        {/if}
                        {#if uItem.union.divorce_year}
                          по {uItem.union.divorce_year} г.
                        {/if}
                        {#if uItem.union.marriage_place}
                          • 📍 {uItem.union.marriage_place}
                        {/if}
                      </div>
                    </div>
                    <button
                      class="btn btn-secondary btn-sm"
                      on:click={() => onEditUnion(uItem.union)}
                    >
                      ✎ О свадьбе
                    </button>
                  </div>
                  {#if uItem.union.notes}
                    <div class="marriage-notes">{uItem.union.notes}</div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Social & Historical Attributes -->
        {#if person.occupation || person.education || person.social_class || person.confession || person.nationality || person.maiden_name}
          <div class="info-section">
            <h3>Социальные и родовые сведения</h3>
            <div class="attributes-list">
              {#if person.maiden_name}
                <div class="attr-row">
                  <span class="attr-key">Девичья фамилия</span>
                  <span class="attr-val">{person.maiden_name}</span>
                </div>
              {/if}
              {#if person.occupation}
                <div class="attr-row">
                  <span class="attr-key">Род занятий / чин</span>
                  <span class="attr-val">{person.occupation}</span>
                </div>
              {/if}
              {#if person.education}
                <div class="attr-row">
                  <span class="attr-key">Образование</span>
                  <span class="attr-val">{person.education}</span>
                </div>
              {/if}
              {#if person.social_class}
                <div class="attr-row">
                  <span class="attr-key">Сословие / статус</span>
                  <span class="attr-val">{person.social_class}</span>
                </div>
              {/if}
              {#if person.confession}
                <div class="attr-row">
                  <span class="attr-key">Вероисповедание</span>
                  <span class="attr-val">{person.confession}</span>
                </div>
              {/if}
              {#if person.nationality}
                <div class="attr-row">
                  <span class="attr-key">Происхождение</span>
                  <span class="attr-val">{person.nationality}</span>
                </div>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Biography -->
        <div class="info-section">
          <h3>Биография и семейные предания</h3>
          {#if person.biography}
            <div class="prose-card">{person.biography}</div>
          {:else}
            <p class="empty-hint">
              Биографические заметки пока не добавлены. Нажмите «Редактировать анкету», чтобы
              записать воспоминания или факты.
            </p>
          {/if}
        </div>

        <!-- Archive Sources -->
        {#if person.archive_sources}
          <div class="info-section">
            <h3>Архивные источники и документы</h3>
            <div class="archive-box">
              📜 {person.archive_sources}
            </div>
          </div>
        {/if}
      {:else if activeTab === 'relatives'}
        <div class="quick-rel-pills">
          <button class="btn btn-secondary btn-sm" on:click={() => openAddRelativeTab('parent')}>
            + Родитель
          </button>
          <button class="btn btn-secondary btn-sm" on:click={() => openAddRelativeTab('spouse')}>
            + Супруг(а)
          </button>
          <button class="btn btn-secondary btn-sm" on:click={() => openAddRelativeTab('child')}>
            + Ребенок
          </button>
          <button class="btn btn-secondary btn-sm" on:click={() => openAddRelativeTab('sibling')}>
            + Брат/Сестра
          </button>
        </div>

        <!-- Parents -->
        <div class="info-section">
          <h3>Родители ({relatives.parents.length})</h3>
          {#if relatives.parents.length > 0}
            <div class="rel-list">
              {#each relatives.parents as item (item.person.id)}
                <div class="rel-item" on:click={() => onSelectPerson(item.person.id)} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && onSelectPerson(item.person.id)}>
                  <div class="rel-avatar gender-bg-{item.person.gender}">
                    {item.person.first_name[0]}
                  </div>
                  <div class="rel-info">
                    <div class="rel-name">{formatFullName(item.person)}</div>
                    <div class="rel-sub">
                      {item.person.gender === 'male'
                        ? 'Отец'
                        : item.person.gender === 'female'
                          ? 'Мать'
                          : 'Родитель'} • {formatLifespan(item.person)}
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <p class="empty-hint">Родители еще не указаны.</p>
          {/if}
        </div>

        <!-- Spouses / Unions -->
        <div class="info-section">
          <h3>Браки и союзы ({relatives.unionsWithPartners.length})</h3>
          {#if relatives.unionsWithPartners.length > 0}
            <div class="rel-list">
              {#each relatives.unionsWithPartners as uItem (uItem.union.id)}
                <div class="union-card">
                  {#if uItem.partner}
                    <div
                      class="rel-item"
                      on:click={() => onSelectPerson(uItem.partner.id)}
                      role="button"
                      tabindex="0"
                      on:keydown={(e) => e.key === 'Enter' && onSelectPerson(uItem.partner.id)}
                    >
                      <div class="rel-avatar gender-bg-{uItem.partner.gender}">
                        {uItem.partner.first_name[0]}
                      </div>
                      <div class="rel-info">
                        <div class="rel-name">{formatFullName(uItem.partner)}</div>
                        <div class="rel-sub">
                          {#if uItem.union.union_type === 'divorced'}
                            Бывший супруг(а)
                          {:else}
                            Супруг(а)
                          {/if}
                          {#if uItem.union.marriage_year}
                            • брак с {uItem.union.marriage_year} г.
                          {/if}
                          {#if uItem.union.divorce_year}
                            (развод {uItem.union.divorce_year} г.)
                          {/if}
                          {#if uItem.union.marriage_place}
                            • {uItem.union.marriage_place}
                          {/if}
                        </div>
                        {#if uItem.union.notes}
                          <div class="union-note-inline">{uItem.union.notes}</div>
                        {/if}
                      </div>
                      <button
                        class="edit-rel-btn"
                        title="Редактировать сведения о свадьбе и браке"
                        on:click|stopPropagation={() => onEditUnion(uItem.union)}
                      >
                        ✎
                      </button>
                      <button
                        class="unlink-btn"
                        title="Удалить союз (персоны останутся)"
                        on:click|stopPropagation={() => onDeleteUnion(uItem.union.id)}
                      >
                        ✕
                      </button>
                    </div>
                  {:else}
                    <div class="single-union-bar">
                      <span>Родительская ветка (второй родитель не указан)</span>
                      <button
                        class="unlink-btn"
                        title="Удалить ветку союза"
                        on:click={() => onDeleteUnion(uItem.union.id)}
                      >
                        ✕
                      </button>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <p class="empty-hint">Супруги не указаны.</p>
          {/if}
        </div>

        <!-- Children -->
        <div class="info-section">
          <h3>Дети ({relatives.children.length})</h3>
          {#if relatives.children.length > 0}
            <div class="rel-list">
              {#each relatives.children as cItem (cItem.person.id)}
                <div
                  class="rel-item"
                  on:click={() => onSelectPerson(cItem.person.id)}
                  role="button"
                  tabindex="0"
                  on:keydown={(e) => e.key === 'Enter' && onSelectPerson(cItem.person.id)}
                >
                  <div class="rel-avatar gender-bg-{cItem.person.gender}">
                    {cItem.person.first_name[0]}
                  </div>
                  <div class="rel-info">
                    <div class="rel-name">{formatFullName(cItem.person)}</div>
                    <div class="rel-sub">
                      {cItem.person.gender === 'male'
                        ? 'Сын'
                        : cItem.person.gender === 'female'
                          ? 'Дочь'
                          : 'Ребенок'} • {formatLifespan(cItem.person)}
                    </div>
                  </div>
                  <button
                    class="unlink-btn"
                    title="Отвязать ребенка от этого союза"
                    on:click|stopPropagation={() =>
                      onRemoveChildFromUnion(cItem.unionId, cItem.person.id)}
                  >
                    ✕
                  </button>
                </div>
              {/each}
            </div>
          {:else}
            <p class="empty-hint">Дети не указаны.</p>
          {/if}
        </div>

        <!-- Siblings -->
        <div class="info-section">
          <h3>Братья и сёстры ({relatives.siblings.length})</h3>
          {#if relatives.siblings.length > 0}
            <div class="rel-list">
              {#each relatives.siblings as sib (sib.id)}
                <div
                  class="rel-item"
                  on:click={() => onSelectPerson(sib.id)}
                  role="button"
                  tabindex="0"
                  on:keydown={(e) => e.key === 'Enter' && onSelectPerson(sib.id)}
                >
                  <div class="rel-avatar gender-bg-{sib.gender}">
                    {sib.first_name[0]}
                  </div>
                  <div class="rel-info">
                    <div class="rel-name">{formatFullName(sib)}</div>
                    <div class="rel-sub">{formatLifespan(sib)}</div>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <p class="empty-hint">Братья и сёстры не найдены.</p>
          {/if}
        </div>
      {:else if activeTab === 'add_relative'}
        <form class="rel-form" on:submit={handleRelativeFormSubmit}>
          <div class="field-group">
            <span class="field-label">Кем приходится для «{person.first_name} {person.last_name || ''}»?</span>
            <div class="segmented-pills">
              <button
                type="button"
                class:active={relation === 'parent'}
                on:click={() => resetRelativeForm('parent')}
              >
                Родитель
              </button>
              <button
                type="button"
                class:active={relation === 'spouse'}
                on:click={() => resetRelativeForm('spouse')}
              >
                Супруг(а)
              </button>
              <button
                type="button"
                class:active={relation === 'child'}
                on:click={() => resetRelativeForm('child')}
              >
                Ребенок
              </button>
              <button
                type="button"
                class:active={relation === 'sibling'}
                on:click={() => resetRelativeForm('sibling')}
              >
                Брат/Сестра
              </button>
            </div>
          </div>

          <div class="field-group">
            <span class="field-label">Способ добавления</span>
            <div class="segmented-pills">
              <button
                type="button"
                class:active={mode === 'new'}
                on:click={() => (mode = 'new')}
              >
                Создать новую анкету
              </button>
              <button
                type="button"
                class:active={mode === 'existing'}
                on:click={() => (mode = 'existing')}
                disabled={otherPersons.length === 0}
              >
                Выбрать из древа ({otherPersons.length})
              </button>
            </div>
          </div>

          {#if relation === 'child' && relatives.unionsWithPartners.length > 1}
            <div class="field-group">
              <label class="field-label" for="rel-union-select">В каком браке / союзе родился ребенок?</label>
              <select id="rel-union-select" class="select" bind:value={selectedUnionId}>
                {#each relatives.unionsWithPartners as uItem (uItem.union.id)}
                  <option value={String(uItem.union.id)}>
                    {uItem.partner ? `Союз с: ${formatFullName(uItem.partner)}` : 'Союз без второго родителя'}
                  </option>
                {/each}
              </select>
            </div>
          {/if}

          {#if mode === 'existing'}
            <div class="field-group">
              <label class="field-label" for="existing-person-select">Выберите человека из древа</label>
              <select id="existing-person-select" class="select" bind:value={existingPersonId} required>
                <option value="">— Выберите человека —</option>
                {#each otherPersons as op (op.id)}
                  <option value={String(op.id)}>
                    {formatFullName(op)} ({formatLifespan(op)})
                  </option>
                {/each}
              </select>
            </div>
          {:else}
            <div class="form-row-2">
              <div class="field-group">
                <label class="field-label" for="rel-last-name">Фамилия</label>
                <input id="rel-last-name" class="input" type="text" placeholder="Морозов(а)" bind:value={lastName} />
              </div>
              <div class="field-group">
                <label class="field-label" for="rel-first-name">Имя *</label>
                <input id="rel-first-name" class="input" type="text" placeholder="Иван" bind:value={firstName} required />
              </div>
            </div>

            <div class="form-row-2">
              <div class="field-group">
                <label class="field-label" for="rel-middle-name">Отчество</label>
                <input id="rel-middle-name" class="input" type="text" placeholder="Николаевич" bind:value={middleName} />
              </div>
              <div class="field-group">
                <label class="field-label" for="rel-gender">Пол</label>
                <select id="rel-gender" class="select" bind:value={gender}>
                  <option value="male">Мужской</option>
                  <option value="female">Женский</option>
                  <option value="unknown">Не указан</option>
                </select>
              </div>
            </div>

            {#if gender === 'female'}
              <div class="field-group">
                <label class="field-label" for="rel-maiden-name">Девичья фамилия (если менялась)</label>
                <input id="rel-maiden-name" class="input" type="text" placeholder="Воронцова" bind:value={maidenName} />
              </div>
            {/if}

            <div class="form-row-2">
              <div class="field-group">
                <label class="field-label" for="rel-birth-year">Год рождения</label>
                <input id="rel-birth-year" class="input" type="number" placeholder="1950" bind:value={birthYear} />
              </div>
              <div class="field-group">
                <label class="field-label" for="rel-death-year">Год смерти (если умер)</label>
                <input id="rel-death-year" class="input" type="number" placeholder="Оставьте пустым, если жив" bind:value={deathYear} />
              </div>
            </div>

            <div class="form-row-2">
              <div class="field-group">
                <label class="field-label" for="rel-birth-place">Место рождения</label>
                <input id="rel-birth-place" class="input" type="text" placeholder="г. Москва" bind:value={birthPlace} />
              </div>
              <div class="field-group">
                <label class="field-label" for="rel-occupation">Профессия / род занятий</label>
                <input id="rel-occupation" class="input" type="text" placeholder="Инженер, врач..." bind:value={occupation} />
              </div>
            </div>
          {/if}

          {#if relation === 'spouse'}
            <div class="form-row-2">
              <div class="field-group">
                <label class="field-label" for="rel-marriage-year">Год свадьбы / брака</label>
                <input id="rel-marriage-year" class="input" type="number" placeholder="1978" bind:value={marriageYear} />
              </div>
              <div class="field-group">
                <label class="field-label" for="rel-marriage-place">Место бракосочетания</label>
                <input id="rel-marriage-place" class="input" type="text" placeholder="г. Ярославль" bind:value={marriagePlace} />
              </div>
            </div>
          {/if}

          {#if relError}
            <div class="error-banner">{relError}</div>
          {/if}

          <button type="submit" class="btn btn-primary" disabled={submittingRelative}>
            {submittingRelative ? 'Сохранение...' : 'Сохранить и привязать к древу'}
          </button>
        </form>
      {/if}
    </div>
  </aside>
{/if}

<style>
  .drawer-panel {
    position: absolute;
    top: 84px;
    right: 20px;
    bottom: 20px;
    width: 430px;
    max-width: calc(100vw - 40px);
    background: var(--bg-surface);
    backdrop-filter: blur(22px);
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    z-index: 30;
    overflow: hidden;
    animation: slideInRight 0.32s var(--ease-spring);
  }

  .drawer-header {
    padding: 20px 22px 16px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid var(--border-soft);
  }

  .person-hero {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    min-width: 0;
  }

  .hero-avatar {
    width: 52px;
    height: 52px;
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 1.1rem;
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

  .hero-titles {
    min-width: 0;
  }

  .badges-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 6px;
  }

  .badge {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 3px 9px;
    border-radius: var(--radius-pill);
  }

  .gender-pill-male {
    background: var(--male-bg);
    color: var(--male-accent);
  }

  .gender-pill-female {
    background: var(--female-bg);
    color: var(--female-accent);
  }

  .gender-pill-unknown {
    background: var(--neutral-bg);
    color: var(--neutral-accent);
  }

  .lifespan-badge {
    background: var(--bg-subtle);
    color: var(--text-secondary);
  }

  .hero-titles h2 {
    font-size: 1.12rem;
    line-height: 1.3;
    word-break: break-word;
  }

  .hero-subtitle {
    font-size: 0.82rem;
    color: var(--text-secondary);
    margin-top: 3px;
  }

  /* Tabs */
  .drawer-tabs {
    display: flex;
    gap: 6px;
    padding: 10px 18px;
    background: var(--bg-subtle);
    border-bottom: 1px solid var(--border-soft);
  }

  .tab-btn {
    flex: 1;
    padding: 8px 10px;
    border-radius: var(--radius-pill);
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-secondary);
    transition: all 0.2s var(--ease-spring);
  }

  .tab-btn:hover {
    color: var(--text-primary);
  }

  .tab-btn.active {
    background: var(--bg-surface-solid);
    color: var(--text-primary);
    box-shadow: var(--shadow-sm);
  }

  .tab-btn.tab-accent.active {
    background: var(--accent-primary);
    color: #fff;
  }

  .drawer-content {
    flex: 1;
    overflow-y: auto;
    padding: 18px 22px 26px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .profile-actions {
    display: flex;
    gap: 8px;
  }

  .delete-confirm-box {
    padding: 14px;
    border-radius: var(--radius-md);
    background: var(--danger-bg);
    border: 1px solid rgba(239, 68, 68, 0.3);
    font-size: 0.84rem;
    line-height: 1.45;
  }

  .confirm-buttons {
    display: flex;
    gap: 8px;
    margin-top: 10px;
  }

  .info-section h3 {
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    margin-bottom: 10px;
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .info-card {
    padding: 12px 14px;
    border-radius: var(--radius-md);
    background: var(--bg-subtle);
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .info-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-muted);
  }

  .info-val {
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .info-sub {
    font-size: 0.76rem;
    color: var(--text-secondary);
    margin-top: 2px;
  }

  .attributes-list {
    display: flex;
    flex-direction: column;
    border-radius: var(--radius-md);
    background: var(--bg-subtle);
    overflow: hidden;
  }

  .attr-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
    font-size: 0.84rem;
    border-bottom: 1px solid var(--border-soft);
  }

  .attr-row:last-child {
    border-bottom: none;
  }

  .attr-key {
    color: var(--text-secondary);
    font-weight: 500;
  }

  .attr-val {
    color: var(--text-primary);
    font-weight: 600;
    text-align: right;
  }

  .prose-card {
    padding: 14px 16px;
    border-radius: var(--radius-md);
    background: var(--bg-subtle);
    font-size: 0.88rem;
    line-height: 1.65;
    color: var(--text-primary);
    white-space: pre-wrap;
  }

  .archive-box {
    padding: 12px 15px;
    border-radius: var(--radius-md);
    background: var(--accent-soft);
    color: var(--text-primary);
    font-size: 0.83rem;
    line-height: 1.5;
    border: 1px solid var(--border-strong);
    white-space: pre-wrap;
  }

  .empty-hint {
    font-size: 0.83rem;
    color: var(--text-muted);
    line-height: 1.5;
  }

  /* Relatives list */
  .quick-rel-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .btn-sm {
    padding: 7px 12px;
    font-size: 0.76rem;
  }

  .rel-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .rel-item {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 10px 12px;
    border-radius: var(--radius-md);
    background: var(--bg-subtle);
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.2s var(--ease-spring);
  }

  .rel-item:hover {
    background: var(--bg-hover);
    border-color: var(--border-soft);
    transform: translateX(3px);
  }

  .rel-avatar {
    width: 34px;
    height: 34px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.85rem;
    flex-shrink: 0;
  }

  .rel-info {
    flex: 1;
    min-width: 0;
  }

  .rel-name {
    font-size: 0.86rem;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rel-sub {
    font-size: 0.74rem;
    color: var(--text-secondary);
    margin-top: 2px;
  }

  .unlink-btn {
    width: 26px;
    height: 26px;
    border-radius: var(--radius-pill);
    color: var(--text-muted);
    font-size: 0.78rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.18s ease;
  }

  .unlink-btn:hover {
    background: var(--danger-bg);
    color: var(--danger-accent);
  }

  .edit-rel-btn {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-pill);
    color: var(--accent-primary);
    background: var(--accent-soft);
    font-size: 0.82rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.18s ease;
  }

  .edit-rel-btn:hover {
    background: var(--accent-primary);
    color: #fff;
  }

  .marriage-summary-card {
    padding: 12px 14px;
    border-radius: var(--radius-md);
    background: var(--bg-subtle);
    border: 1px solid var(--border-soft);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .marriage-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .marriage-info {
    min-width: 0;
    flex: 1;
  }

  .marriage-notes,
  .union-note-inline {
    font-size: 0.78rem;
    color: var(--text-secondary);
    line-height: 1.45;
    padding-top: 6px;
    border-top: 1px dashed var(--border-soft);
    white-space: pre-wrap;
  }

  .single-union-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 12px;
    border-radius: var(--radius-md);
    background: var(--bg-subtle);
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  /* Add Relative Form */
  .rel-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .segmented-pills {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(82px, 1fr));
    gap: 6px;
    background: var(--bg-subtle);
    padding: 5px;
    border-radius: var(--radius-md);
  }

  .segmented-pills button {
    padding: 8px 10px;
    border-radius: 12px;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-secondary);
    transition: all 0.2s var(--ease-spring);
  }

  .segmented-pills button.active {
    background: var(--bg-surface-solid);
    color: var(--accent-primary);
    box-shadow: var(--shadow-sm);
  }

  .segmented-pills button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .form-row-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .error-banner {
    padding: 10px 14px;
    border-radius: var(--radius-md);
    background: var(--danger-bg);
    color: var(--danger-accent);
    font-size: 0.82rem;
    font-weight: 500;
  }
</style>
