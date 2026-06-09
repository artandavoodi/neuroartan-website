// MARK: - Model Interface State

const MODEL_INTERFACE_STATE_STORAGE_KEY = 'neuroartan.model.interface-state.v1';

const DEFAULT_MODEL_INTERFACE_STATE = Object.freeze({
  version: 1,
  updatedAt: null,
  trainingWorkspaceOpen: false,
  trainingBoardExpanded: false,
  modelIdentityEditorOpen: false,
  modelDataManagerOpen: false,
});

// MARK: - Storage Safety

function safeReadModelInterfaceStateStorage() {
  try {
    const rawValue = window.localStorage.getItem(MODEL_INTERFACE_STATE_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue);

    if (!parsedValue || typeof parsedValue !== 'object') {
      return null;
    }

    return parsedValue;
  } catch (error) {
    console.warn('[Neuroartan] Unable to read model interface state.', error);
    return null;
  }
}

function safeWriteModelInterfaceStateStorage(nextState) {
  try {
    window.localStorage.setItem(
      MODEL_INTERFACE_STATE_STORAGE_KEY,
      JSON.stringify(nextState),
    );
  } catch (error) {
    console.warn('[Neuroartan] Unable to persist model interface state.', error);
  }
}

// MARK: - Normalization

function normalizeBoolean(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeModelInterfaceState(value = {}) {
  const source = value && typeof value === 'object' ? value : {};

  return {
    ...DEFAULT_MODEL_INTERFACE_STATE,
    version: 1,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : null,
    trainingWorkspaceOpen: normalizeBoolean(source.trainingWorkspaceOpen),
    trainingBoardExpanded: normalizeBoolean(source.trainingBoardExpanded),
    modelIdentityEditorOpen: normalizeBoolean(source.modelIdentityEditorOpen),
    modelDataManagerOpen: normalizeBoolean(source.modelDataManagerOpen),
  };
}

// MARK: - State Access

export function readModelInterfaceState() {
  return normalizeModelInterfaceState(safeReadModelInterfaceStateStorage());
}

export function writeModelInterfaceState(patch = {}) {
  const currentState = readModelInterfaceState();
  const nextState = normalizeModelInterfaceState({
    ...currentState,
    ...patch,
    updatedAt: new Date().toISOString(),
  });

  safeWriteModelInterfaceStateStorage(nextState);
  return nextState;
}

export function updateModelInterfaceState(key, value) {
  if (!Object.prototype.hasOwnProperty.call(DEFAULT_MODEL_INTERFACE_STATE, key)) {
    return readModelInterfaceState();
  }

  return writeModelInterfaceState({
    [key]: value,
  });
}

export function resetModelInterfaceState() {
  const nextState = normalizeModelInterfaceState({
    updatedAt: new Date().toISOString(),
  });

  safeWriteModelInterfaceStateStorage(nextState);
  return nextState;
}