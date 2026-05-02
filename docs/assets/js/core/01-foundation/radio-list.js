/* =============================================================================
   NEUROARTAN — RADIO LIST PRIMITIVE
   Layer: Core / Foundation
   Purpose: Reusable vertical single-select radio list behavior.
============================================================================= */

/* =============================================================================
   00. FILE INDEX
   01. RADIO LIST CONSTANTS
   02. RADIO LIST HELPERS
   03. RADIO LIST STATE
   04. RADIO LIST EVENTS
   05. RADIO LIST INITIALIZATION
============================================================================= */

/* =============================================================================
   01. RADIO LIST CONSTANTS
============================================================================= */
const RADIO_LIST_ROOT_SELECTOR = '[data-ui-radio-list]';
const RADIO_LIST_ITEM_SELECTOR = '[data-ui-radio-list-item]';
const RADIO_LIST_CONTROL_SELECTOR = '[data-ui-radio-list-control]';
const RADIO_LIST_EVENT_NAME = 'neuroartan:radio-list-change';

/* =============================================================================
   02. RADIO LIST HELPERS
============================================================================= */
function getRadioListRootFromItem(item){
  return item?.closest?.(RADIO_LIST_ROOT_SELECTOR) || null;
}

function getRadioListItems(root){
  return Array.from(root?.querySelectorAll?.(RADIO_LIST_ITEM_SELECTOR) || []);
}

function getRadioListItemValue(item){
  return item?.dataset?.uiRadioListValue || item?.dataset?.homeInteractionSettingValue || '';
}

function getRadioListItemControl(item){
  return item?.querySelector?.(RADIO_LIST_CONTROL_SELECTOR) || null;
}

function getRadioListName(root){
  return root?.dataset?.uiRadioList || '';
}

/* =============================================================================
   03. RADIO LIST STATE
============================================================================= */
function setRadioListItemState(item, isActive){
  const control = getRadioListItemControl(item);

  item.setAttribute('aria-checked', String(isActive));
  item.setAttribute('aria-pressed', String(isActive));
  item.removeAttribute('tabindex');

  if (control){
    control.tabIndex = isActive ? 0 : -1;
    control.setAttribute('aria-checked', String(isActive));
  }
}

function setRadioListValue(root, value){
  const items = getRadioListItems(root);

  items.forEach((item) => {
    setRadioListItemState(item, getRadioListItemValue(item) === value);
  });

  root.dataset.uiRadioListValue = value;

  root.dispatchEvent(new CustomEvent(RADIO_LIST_EVENT_NAME, {
    bubbles: true,
    detail: {
      name: getRadioListName(root),
      value,
      root,
    },
  }));
}

function initializeRadioListState(root){
  const items = getRadioListItems(root);
  const activeItem = items.find((item) => item.getAttribute('aria-checked') === 'true' || item.getAttribute('aria-pressed') === 'true') || items[0];
  const activeValue = getRadioListItemValue(activeItem);

  if (!activeValue) return;
  setRadioListValue(root, activeValue);
}

/* =============================================================================
   04. RADIO LIST EVENTS
============================================================================= */
function handleRadioListItemClick(event){
  const control = event.target.closest(RADIO_LIST_CONTROL_SELECTOR);
  if (!control) return;

  const item = control.closest(RADIO_LIST_ITEM_SELECTOR);
  if (!item) return;

  const root = getRadioListRootFromItem(item);
  if (!root) return;

  event.preventDefault();
  setRadioListValue(root, getRadioListItemValue(item));
}

function handleRadioListItemKeydown(event){
  const control = event.target.closest(RADIO_LIST_CONTROL_SELECTOR);
  if (!control) return;

  const item = control.closest(RADIO_LIST_ITEM_SELECTOR);
  if (!item) return;

  const root = getRadioListRootFromItem(item);
  if (!root) return;

  const items = getRadioListItems(root);
  const currentIndex = items.indexOf(item);
  if (currentIndex < 0) return;

  const keyMap = {
    ArrowDown: 1,
    ArrowRight: 1,
    ArrowUp: -1,
    ArrowLeft: -1,
  };

  if (event.key === 'Enter' || event.key === ' '){
    event.preventDefault();
    setRadioListValue(root, getRadioListItemValue(item));
    return;
  }

  if (!(event.key in keyMap)) return;

  event.preventDefault();
  const nextIndex = (currentIndex + keyMap[event.key] + items.length) % items.length;
  const nextItem = items[nextIndex];
  const nextControl = getRadioListItemControl(nextItem);
  nextControl?.focus?.();
  setRadioListValue(root, getRadioListItemValue(nextItem));
}

/* =============================================================================
   05. RADIO LIST INITIALIZATION
============================================================================= */
function initializeRadioLists(scope = document){
  Array.from(scope.querySelectorAll?.(RADIO_LIST_ROOT_SELECTOR) || []).forEach((root) => {
    if (root.dataset.uiRadioListInitialized === 'true') return;

    root.dataset.uiRadioListInitialized = 'true';
    root.setAttribute('role', 'radiogroup');

    getRadioListItems(root).forEach((item) => {
      const control = getRadioListItemControl(item);

      item.setAttribute('role', 'presentation');

      if (control){
        control.setAttribute('role', 'radio');
        control.addEventListener('click', handleRadioListItemClick);
        control.addEventListener('keydown', handleRadioListItemKeydown);
      }
    });

    initializeRadioListState(root);
  });
}

if (document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', () => initializeRadioLists(), { once: true });
}else{
  initializeRadioLists();
}

const radioListObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (!(node instanceof Element)) return;
      if (node.matches?.(RADIO_LIST_ROOT_SELECTOR)) initializeRadioLists(node.parentElement || document);
      initializeRadioLists(node);
    });
  });
});

radioListObserver.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

export { initializeRadioLists, setRadioListValue };