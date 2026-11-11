<script>
  export let isOpen = false;
  export let mode = 'create'; // create | edit | import
  export let activeTree = null;
  export let onClose = () => {};
  export let onSaveTree = async () => {};
  export let onDeleteTree = async () => {};
  export let onImportTree = async () => {};

  let name = '';
  let description = '';
  let importJsonText = '';
  let saving = false;
  let confirmDelete = false;
  let errorMsg = '';

  let prevOpen = false;
  $: if (isOpen && !prevOpen) {
    prevOpen = true;
    errorMsg = '';
    confirmDelete = false;
    importJsonText = '';
    if (mode === 'edit' && activeTree) {
      name = activeTree.name || '';
      description = activeTree.description || '';
    } else {
      name = '';
      description = '';
    }
  } else if (!isOpen && prevOpen) {
    prevOpen = false;
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      importJsonText = String(reader.result || '');
    };
    reader.readAsText(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    saving = true;
    errorMsg = '';
    try {
      if (mode === 'import') {
        if (!importJsonText.trim()) {
          throw new Error('Загрузите JSON-файл или вставьте его содержимое');
        }
        const parsed = JSON.parse(importJsonText);
        await onImportTree(parsed);
      } else {
        if (!name.trim()) {
          throw new Error('Введите название родословного древа');
        }
        await onSaveTree({
          name: name.trim(),
          description: description.trim() || null,
        });
      }
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
        <h2>
          {#if mode === 'create'}
            Новое родословное древо
          {:else if mode === 'edit'}
            Настройки древа
          {:else}
            Импорт древа из JSON
          {/if}
        </h2>
        <button class="btn-icon" on:click={onClose}>✕</button>
      </div>

      <form class="modal-body" on:submit={handleSubmit}>
        {#if mode === 'import'}
          <div class="field-group">
            <label class="field-label" for="tm-file">Выберите файл резервной копии (.json)</label>
            <input
              id="tm-file"
              class="input"
              type="file"
              accept=".json,application/json"
              on:change={handleFileChange}
            />
          </div>
          <div class="field-group">
            <label class="field-label" for="tm-json">Или вставьте JSON-дамп древа</label>
            <textarea
              id="tm-json"
              class="textarea"
              rows="6"
              placeholder={'{"name": "Моя семья", "persons": [...], "unions": [...]}'}
              bind:value={importJsonText}
            ></textarea>
          </div>
        {:else}
          <div class="field-group">
            <label class="field-label" for="tm-name">Название древа *</label>
            <input
              id="tm-name"
              class="input"
              type="text"
              placeholder="Например: Отцовская линия (Морозовы)"
              bind:value={name}
              required
            />
          </div>

          <div class="field-group">
            <label class="field-label" for="tm-desc">Описание / заметка</label>
            <textarea
              id="tm-desc"
              class="textarea"
              rows="3"
              placeholder="Краткое описание ветки, географии или периода..."
              bind:value={description}
            ></textarea>
          </div>
        {/if}

        {#if errorMsg}
          <div class="error-box">{errorMsg}</div>
        {/if}

        <div class="modal-footer">
          {#if mode === 'edit' && activeTree}
            {#if !confirmDelete}
              <button
                type="button"
                class="btn btn-danger"
                style="margin-right: auto;"
                on:click={() => (confirmDelete = true)}
              >
                Удалить древо
              </button>
            {:else}
              <button
                type="button"
                class="btn btn-danger"
                style="margin-right: auto;"
                on:click={async () => {
                  await onDeleteTree(activeTree.id);
                  onClose();
                }}
              >
                Подтвердить удаление
              </button>
            {/if}
          {/if}

          <button type="button" class="btn btn-secondary" on:click={onClose}>
            Отмена
          </button>
          <button type="submit" class="btn btn-primary" disabled={saving}>
            {saving
              ? 'Выполнение...'
              : mode === 'import'
                ? 'Импортировать'
                : mode === 'edit'
                  ? 'Сохранить'
                  : 'Создать древо'}
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
    z-index: 65;
  }

  .modal-card {
    width: 100%;
    max-width: 500px;
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
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border-soft);
  }

  .modal-header h2 {
    font-size: 1.15rem;
  }

  .modal-body {
    padding: 20px 24px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
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
  }
</style>
