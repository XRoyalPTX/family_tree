<script>
  export let isOpen = false;
  export let mode = 'create'; // create | edit
  export let initialPerson = null;
  export let onClose = () => {};
  export let onSubmit = async () => {};

  let activeSection = 'basic'; // basic | dates | social | bio
  let saving = false;
  let errorMsg = '';

  let form = getDefaultForm();

  function getDefaultForm(p = null) {
    return {
      first_name: p?.first_name || '',
      last_name: p?.last_name || '',
      middle_name: p?.middle_name || '',
      maiden_name: p?.maiden_name || '',
      gender: p?.gender || 'unknown',
      birth_date: p?.birth_date || '',
      birth_year: p?.birth_year ?? '',
      is_birth_year_approx: Boolean(p?.is_birth_year_approx),
      death_date: p?.death_date || '',
      death_year: p?.death_year ?? '',
      is_death_year_approx: Boolean(p?.is_death_year_approx),
      is_alive: p ? Boolean(p.is_alive) : true,
      birth_place: p?.birth_place || '',
      death_place: p?.death_place || '',
      burial_place: p?.burial_place || '',
      residence_place: p?.residence_place || '',
      occupation: p?.occupation || '',
      education: p?.education || '',
      social_class: p?.social_class || '',
      confession: p?.confession || '',
      nationality: p?.nationality || '',
      archive_sources: p?.archive_sources || '',
      biography: p?.biography || '',
    };
  }

  let prevOpenState = false;
  $: if (isOpen && !prevOpenState) {
    prevOpenState = true;
    activeSection = 'basic';
    errorMsg = '';
    form = getDefaultForm(initialPerson);
  } else if (!isOpen && prevOpenState) {
    prevOpenState = false;
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.first_name.trim()) {
      errorMsg = 'Пожалуйста, укажите имя человека';
      activeSection = 'basic';
      return;
    }

    saving = true;
    errorMsg = '';
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || null,
        middle_name: form.middle_name.trim() || null,
        maiden_name: form.maiden_name.trim() || null,
        gender: form.gender,
        birth_date: form.birth_date.trim() || null,
        birth_year: form.birth_year !== '' && form.birth_year !== null ? Number(form.birth_year) : null,
        is_birth_year_approx: Boolean(form.is_birth_year_approx),
        death_date: !form.is_alive ? form.death_date.trim() || null : null,
        death_year:
          !form.is_alive && form.death_year !== '' && form.death_year !== null
            ? Number(form.death_year)
            : null,
        is_death_year_approx: !form.is_alive ? Boolean(form.is_death_year_approx) : false,
        is_alive: Boolean(form.is_alive),
        birth_place: form.birth_place.trim() || null,
        death_place: !form.is_alive ? form.death_place.trim() || null : null,
        burial_place: !form.is_alive ? form.burial_place.trim() || null : null,
        residence_place: form.residence_place.trim() || null,
        occupation: form.occupation.trim() || null,
        education: form.education.trim() || null,
        social_class: form.social_class.trim() || null,
        confession: form.confession.trim() || null,
        nationality: form.nationality.trim() || null,
        archive_sources: form.archive_sources.trim() || null,
        biography: form.biography.trim() || null,
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      errorMsg = err.message || 'Ошибка сохранения';
    } finally {
      saving = false;
    }
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-backdrop" on:click={onClose}>
    <div class="modal-card" on:click|stopPropagation>
      <div class="modal-header">
        <div>
          <h2>{mode === 'edit' ? 'Редактирование карточки' : 'Новый человек в древе'}</h2>
          <p class="modal-sub">
            Заполните известные поля — любые подробности можно дополнить позже
          </p>
        </div>
        <button class="btn-icon" on:click={onClose}>✕</button>
      </div>

      <!-- Section Pills -->
      <div class="section-nav">
        <button
          type="button"
          class:active={activeSection === 'basic'}
          on:click={() => (activeSection = 'basic')}
        >
          1. ФИО и основное
        </button>
        <button
          type="button"
          class:active={activeSection === 'dates'}
          on:click={() => (activeSection = 'dates')}
        >
          2. Даты и места
        </button>
        <button
          type="button"
          class:active={activeSection === 'social'}
          on:click={() => (activeSection = 'social')}
        >
          3. Сословие и род занятий
        </button>
        <button
          type="button"
          class:active={activeSection === 'bio'}
          on:click={() => (activeSection = 'bio')}
        >
          4. Биография и архив
        </button>
      </div>

      <form class="modal-body" on:submit={handleSave}>
        {#if activeSection === 'basic'}
          <div class="grid-2">
            <div class="field-group">
              <label class="field-label" for="pm-last">Фамилия</label>
              <input id="pm-last" class="input" type="text" placeholder="Морозов(а)" bind:value={form.last_name} />
            </div>
            <div class="field-group">
              <label class="field-label" for="pm-first">Имя *</label>
              <input id="pm-first" class="input" type="text" placeholder="Николай" bind:value={form.first_name} required />
            </div>
          </div>

          <div class="grid-2">
            <div class="field-group">
              <label class="field-label" for="pm-middle">Отчество / патроним</label>
              <input id="pm-middle" class="input" type="text" placeholder="Петрович" bind:value={form.middle_name} />
            </div>
            <div class="field-group">
              <label class="field-label" for="pm-maiden">Девичья фамилия (до брака)</label>
              <input id="pm-maiden" class="input" type="text" placeholder="Воронцова" bind:value={form.maiden_name} />
            </div>
          </div>

          <div class="grid-2">
            <div class="field-group">
              <label class="field-label" for="pm-gender">Пол</label>
              <select id="pm-gender" class="select" bind:value={form.gender}>
                <option value="male">Мужской</option>
                <option value="female">Женский</option>
                <option value="unknown">Не указан</option>
              </select>
            </div>
            <div class="field-group">
              <span class="field-label">Статус жизни</span>
              <div class="toggle-row">
                <button
                  type="button"
                  class:active={form.is_alive}
                  on:click={() => (form.is_alive = true)}
                >
                  Ныне живет
                </button>
                <button
                  type="button"
                  class:active={!form.is_alive}
                  on:click={() => (form.is_alive = false)}
                >
                  Ушел(ла) из жизни
                </button>
              </div>
            </div>
          </div>

          <div class="grid-2">
            <div class="field-group">
              <label class="field-label" for="pm-byear">Год рождения</label>
              <input id="pm-byear" class="input" type="number" placeholder="1921" bind:value={form.birth_year} />
            </div>
            {#if !form.is_alive}
              <div class="field-group">
                <label class="field-label" for="pm-dyear">Год ухода из жизни</label>
                <input id="pm-dyear" class="input" type="number" placeholder="1998" bind:value={form.death_year} />
              </div>
            {:else}
              <div class="field-group">
                <label class="field-label" for="pm-occ-quick">Род занятий / профессия</label>
                <input id="pm-occ-quick" class="input" type="text" placeholder="Архитектор, врач..." bind:value={form.occupation} />
              </div>
            {/if}
          </div>
        {:else if activeSection === 'dates'}
          <div class="grid-2">
            <div class="field-group">
              <label class="field-label" for="pm-bdate">Точная дата рождения</label>
              <input id="pm-bdate" class="input" type="text" placeholder="14.05.1888" bind:value={form.birth_date} />
            </div>
            <div class="field-group">
              <label class="field-label" for="pm-byear2">Год рождения (числом для сортировки)</label>
              <input id="pm-byear2" class="input" type="number" placeholder="1888" bind:value={form.birth_year} />
            </div>
          </div>

          <label class="checkbox-row">
            <input type="checkbox" bind:checked={form.is_birth_year_approx} />
            <span>Год рождения приблизительный (например, по ревизской сказке «около 1888 г.»)</span>
          </label>

          <div class="grid-2">
            <div class="field-group">
              <label class="field-label" for="pm-bplace">Место рождения</label>
              <input id="pm-bplace" class="input" type="text" placeholder="г. Ярославль / с. Спасское" bind:value={form.birth_place} />
            </div>
            <div class="field-group">
              <label class="field-label" for="pm-resplace">Основное место проживания</label>
              <input id="pm-resplace" class="input" type="text" placeholder="г. Москва" bind:value={form.residence_place} />
            </div>
          </div>

          {#if !form.is_alive}
            <div class="grid-2">
              <div class="field-group">
                <label class="field-label" for="pm-ddate">Точная дата смерти</label>
                <input id="pm-ddate" class="input" type="text" placeholder="22.11.1956" bind:value={form.death_date} />
              </div>
              <div class="field-group">
                <label class="field-label" for="pm-dyear2">Год смерти</label>
                <input id="pm-dyear2" class="input" type="number" placeholder="1956" bind:value={form.death_year} />
              </div>
            </div>

            <label class="checkbox-row">
              <input type="checkbox" bind:checked={form.is_death_year_approx} />
              <span>Год смерти приблизительный</span>
            </label>

            <div class="grid-2">
              <div class="field-group">
                <label class="field-label" for="pm-dplace">Место смерти</label>
                <input id="pm-dplace" class="input" type="text" placeholder="г. Москва" bind:value={form.death_place} />
              </div>
              <div class="field-group">
                <label class="field-label" for="pm-burial">Место захоронения / кладбище</label>
                <input id="pm-burial" class="input" type="text" placeholder="Введенское кладбище, уч. 12" bind:value={form.burial_place} />
              </div>
            </div>
          {/if}
        {:else if activeSection === 'social'}
          <div class="grid-2">
            <div class="field-group">
              <label class="field-label" for="pm-occ">Профессия, должность, звание</label>
              <input id="pm-occ" class="input" type="text" placeholder="Инженер-путеец, коллежский асессор" bind:value={form.occupation} />
            </div>
            <div class="field-group">
              <label class="field-label" for="pm-edu">Образование / учебное заведение</label>
              <input id="pm-edu" class="input" type="text" placeholder="МГУ, гимназия..." bind:value={form.education} />
            </div>
          </div>

          <div class="grid-2">
            <div class="field-group">
              <label class="field-label" for="pm-social">Сословие / статус (для предков)</label>
              <input id="pm-social" class="input" type="text" placeholder="Дворяне, купцы 2-й гильдии, государственные крестьяне" bind:value={form.social_class} />
            </div>
            <div class="field-group">
              <label class="field-label" for="pm-conf">Вероисповедание</label>
              <input id="pm-conf" class="input" type="text" placeholder="Православие, старообрядчество, католицизм..." bind:value={form.confession} />
            </div>
          </div>

          <div class="field-group">
            <label class="field-label" for="pm-nat">Национальность / этническое происхождение</label>
            <input id="pm-nat" class="input" type="text" placeholder="Русский(ая)..." bind:value={form.nationality} />
          </div>
        {:else if activeSection === 'bio'}
          <div class="field-group">
            <label class="field-label" for="pm-bio">Биография, жизненный путь, семейные воспоминания</label>
            <textarea
              id="pm-bio"
              class="textarea"
              rows="5"
              placeholder="Опишите интересные факты, переселения, награды, семейные легенды..."
              bind:value={form.biography}
            ></textarea>
          </div>

          <div class="field-group">
            <label class="field-label" for="pm-arch">Архивные шифры, метрические книги и источники</label>
            <textarea
              id="pm-arch"
              class="textarea"
              rows="3"
              placeholder="Например: ГАЯО, ф. 230, оп. 11, д. 412, л. 18 — запись о рождении и крещении"
              bind:value={form.archive_sources}
            ></textarea>
          </div>
        {/if}

        {#if errorMsg}
          <div class="error-box">{errorMsg}</div>
        {/if}

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" on:click={onClose}>
            Отмена
          </button>
          <button type="submit" class="btn btn-primary" disabled={saving}>
            {saving ? 'Сохранение...' : mode === 'edit' ? 'Сохранить изменения' : 'Добавить в древо'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 60;
  }

  .modal-card {
    width: 100%;
    max-width: 640px;
    max-height: 90vh;
    background: var(--bg-surface-solid);
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: fadeInScale 0.28s var(--ease-spring);
  }

  .modal-header {
    padding: 22px 26px 16px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid var(--border-soft);
  }

  .modal-header h2 {
    font-size: 1.2rem;
  }

  .modal-sub {
    font-size: 0.82rem;
    color: var(--text-secondary);
    margin-top: 3px;
  }

  .section-nav {
    display: flex;
    gap: 6px;
    padding: 10px 22px;
    background: var(--bg-subtle);
    border-bottom: 1px solid var(--border-soft);
    overflow-x: auto;
  }

  .section-nav button {
    padding: 8px 13px;
    border-radius: var(--radius-pill);
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-secondary);
    white-space: nowrap;
    transition: all 0.2s var(--ease-spring);
  }

  .section-nav button.active {
    background: var(--bg-surface-solid);
    color: var(--accent-primary);
    box-shadow: var(--shadow-sm);
  }

  .modal-body {
    padding: 22px 26px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .toggle-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    padding: 4px;
    background: var(--bg-subtle);
    border-radius: var(--radius-md);
  }

  .toggle-row button {
    padding: 8px 10px;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-secondary);
    transition: all 0.2s var(--ease-spring);
  }

  .toggle-row button.active {
    background: var(--bg-surface-solid);
    color: var(--accent-primary);
    box-shadow: var(--shadow-sm);
  }

  .checkbox-row {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.84rem;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px 2px;
  }

  .checkbox-row input {
    width: 17px;
    height: 17px;
    accent-color: var(--accent-primary);
  }

  .error-box {
    padding: 11px 14px;
    border-radius: var(--radius-md);
    background: var(--danger-bg);
    color: var(--danger-accent);
    font-size: 0.84rem;
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    padding-top: 8px;
    border-top: 1px solid var(--border-soft);
  }

  @media (max-width: 560px) {
    .grid-2 {
      grid-template-columns: 1fr;
    }
  }
</style>
