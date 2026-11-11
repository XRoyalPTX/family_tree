<script>
  import { formatFullName } from '../layout.js';

  export let isOpen = false;
  export let union = null;
  export let persons = [];
  export let onClose = () => {};
  export let onSaveUnion = async () => {};
  export let onDeleteUnion = async () => {};

  let unionType = 'married';
  let marriageYear = '';
  let marriagePlace = '';
  let divorceYear = '';
  let notes = '';
  let saving = false;
  let confirmDelete = false;
  let errorMsg = '';

  let prevOpen = false;
  $: if (isOpen && union && !prevOpen) {
    prevOpen = true;
    confirmDelete = false;
    errorMsg = '';
    unionType = union.union_type || 'married';
    marriageYear = union.marriage_year ?? '';
    marriagePlace = union.marriage_place || '';
    divorceYear = union.divorce_year ?? '';
    notes = union.notes || '';
  } else if (!isOpen && prevOpen) {
    prevOpen = false;
  }

  $: partner1 = union?.partner1_id
    ? persons.find((p) => p.id === union.partner1_id)
    : null;
  $: partner2 = union?.partner2_id
    ? persons.find((p) => p.id === union.partner2_id)
    : null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!union) return;
    saving = true;
    errorMsg = '';
    try {
      const payload = {
        partner1_id: union.partner1_id,
        partner2_id: union.partner2_id,
        union_type: unionType,
        marriage_year:
          marriageYear !== '' && marriageYear !== null ? Number(marriageYear) : null,
        marriage_place: marriagePlace.trim() || null,
        divorce_year:
          divorceYear !== '' && divorceYear !== null ? Number(divorceYear) : null,
        notes: notes.trim() || null,
      };
      await onSaveUnion(union.id, payload);
      onClose();
    } catch (err) {
      errorMsg = err.message || 'Не удалось сохранить данные о союзе';
    } finally {
      saving = false;
    }
  }
</script>

{#if isOpen && union}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-backdrop" on:click={onClose}>
    <div class="modal-card" on:click|stopPropagation>
      <div class="modal-header">
        <div>
          <h2>Сведения о браке / союзе</h2>
          <p class="couple-subtitle">
            {partner1 ? formatFullName(partner1) : 'Не указан'}
            {#if partner2}
              <span class="amp">∞</span> {formatFullName(partner2)}
            {/if}
          </p>
        </div>
        <button class="btn-icon" on:click={onClose}>✕</button>
      </div>

      <form class="modal-body" on:submit={handleSubmit}>
        <div class="field-group">
          <span class="field-label">Тип союза</span>
          <div class="type-pills">
            <button
              type="button"
              class:active={unionType === 'married'}
              on:click={() => (unionType = 'married')}
            >
              Официальный брак / Венчание
            </button>
            <button
              type="button"
              class:active={unionType === 'civil'}
              on:click={() => (unionType = 'civil')}
            >
              Гражданский союз
            </button>
            <button
              type="button"
              class:active={unionType === 'divorced'}
              on:click={() => (unionType = 'divorced')}
            >
              В разводе
            </button>
            <button
              type="button"
              class:active={unionType === 'parents'}
              on:click={() => (unionType = 'parents')}
            >
              Общие дети
            </button>
          </div>
        </div>

        <div class="grid-2">
          <div class="field-group">
            <label class="field-label" for="um-year">Год свадьбы / венчания</label>
            <input
              id="um-year"
              class="input"
              type="number"
              placeholder="Например: 1949"
              bind:value={marriageYear}
            />
          </div>
          <div class="field-group">
            <label class="field-label" for="um-divorce">Год развода (если применимо)</label>
            <input
              id="um-divorce"
              class="input"
              type="number"
              placeholder="Оставьте пустым"
              bind:value={divorceYear}
            />
          </div>
        </div>

        <div class="field-group">
          <label class="field-label" for="um-place">Место бракосочетания / храм / ЗАГС</label>
          <input
            id="um-place"
            class="input"
            type="text"
            placeholder="Например: г. Ярославль, Ильинская церковь / ЗАГС"
            bind:value={marriagePlace}
          />
        </div>

        <div class="field-group">
          <label class="field-label" for="um-notes">
            Заметки о свадьбе, история знакомства, архивные источники о браке
          </label>
          <textarea
            id="um-notes"
            class="textarea"
            rows="4"
            placeholder="Поручители при венчании, история знакомства, архивный шифр метрической книги о браке..."
            bind:value={notes}
          ></textarea>
        </div>

        {#if errorMsg}
          <div class="error-box">{errorMsg}</div>
        {/if}

        <div class="modal-footer">
          {#if !confirmDelete}
            <button
              type="button"
              class="btn btn-danger"
              style="margin-right: auto;"
              on:click={() => (confirmDelete = true)}
            >
              Удалить союз
            </button>
          {:else}
            <button
              type="button"
              class="btn btn-danger"
              style="margin-right: auto;"
              on:click={async () => {
                await onDeleteUnion(union.id);
                onClose();
              }}
            >
              Подтвердить удаление
            </button>
          {/if}

          <button type="button" class="btn btn-secondary" on:click={onClose}>
            Отмена
          </button>
          <button type="submit" class="btn btn-primary" disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
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
    z-index: 70;
  }

  .modal-card {
    width: 100%;
    max-width: 560px;
    background: var(--bg-surface-solid);
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
    animation: fadeInScale 0.26s var(--ease-spring);
  }

  .modal-header {
    padding: 20px 24px 16px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid var(--border-soft);
  }

  .modal-header h2 {
    font-size: 1.15rem;
  }

  .couple-subtitle {
    font-size: 0.84rem;
    color: var(--text-secondary);
    margin-top: 4px;
    font-weight: 500;
  }

  .amp {
    color: var(--accent-primary);
    font-weight: 700;
    margin: 0 4px;
  }

  .modal-body {
    padding: 20px 24px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .type-pills {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    background: var(--bg-subtle);
    padding: 5px;
    border-radius: var(--radius-md);
  }

  .type-pills button {
    padding: 9px 10px;
    border-radius: 12px;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-secondary);
    transition: all 0.2s var(--ease-spring);
  }

  .type-pills button.active {
    background: var(--bg-surface-solid);
    color: var(--accent-primary);
    box-shadow: var(--shadow-sm);
  }

  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .error-box {
    padding: 10px 14px;
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
</style>
