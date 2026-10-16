export const MINIMUM_QUERY_LENGTH = 2;
export const NO_ACTIVE_OPTION = -1;

const ARROW_STEPS = { ArrowDown: 1, ArrowUp: -1 };

export function arrowStep(key) {
  return ARROW_STEPS[key] ?? 0;
}

export function nextActiveIndex(activeIndex, step, optionCount) {
  return Math.max(NO_ACTIVE_OPTION, Math.min(optionCount - 1, activeIndex + step));
}

export function isSearchable(query) {
  return query.trim().length >= MINIMUM_QUERY_LENGTH;
}

export function markActiveOption(input, options, activeIndex) {
  options.forEach((option, position) => option.setAttribute("aria-selected", String(position === activeIndex)));
  const active = options[activeIndex];
  if (!active) {
    input.removeAttribute("aria-activedescendant");
    return;
  }
  input.setAttribute("aria-activedescendant", active.id);
  active.scrollIntoView({ block: "nearest" });
}

function setExpanded(input, list, expanded) {
  list.hidden = !expanded;
  input.setAttribute("aria-expanded", String(expanded));
}

function createDelayedCall(callback) {
  let timer = 0;
  const cancel = () => {
    clearTimeout(timer);
    timer = 0;
  };
  const run = () => {
    timer = 0;
    callback();
  };
  const schedule = (delayMs) => {
    cancel();
    timer = setTimeout(run, delayMs);
  };
  return { schedule, cancel, isPending: () => timer !== 0 };
}

function createActiveOption(input, list) {
  let activeIndex = NO_ACTIVE_OPTION;
  const options = () => [...list.querySelectorAll("[role=option]")];
  const activate = (index) => {
    activeIndex = index;
    markActiveOption(input, options(), index);
  };
  return {
    move: (step) => activate(nextActiveIndex(activeIndex, step, options().length)),
    clear: () => activate(NO_ACTIVE_OPTION),
    current: () => options()[activeIndex],
    first: () => options()[0],
  };
}

function createCombobox({ input, list, showSuggestions, onClose = () => {} }) {
  const active = createActiveOption(input, list);
  const suggestions = createDelayedCall(showSuggestions);
  const open = () => setExpanded(input, list, true);
  const close = () => {
    suggestions.cancel();
    onClose();
    setExpanded(input, list, false);
    active.clear();
  };
  const showOptions = (html) => {
    list.innerHTML = html;
    active.clear();
    open();
  };
  const refreshSuggestions = () => {
    suggestions.cancel();
    showSuggestions();
  };
  const suggestionsAreCurrent = () => !list.hidden && !suggestions.isPending();
  const moveActiveOption = (step) => {
    if (step > 0 && !suggestionsAreCurrent()) refreshSuggestions();
    if (!list.hidden) active.move(step);
  };
  const followOption = (option) => {
    location.hash = option.getAttribute("href");
    close();
  };
  return {
    open, close, showOptions, moveActiveOption, followOption,
    clearActiveOption: active.clear, activeOption: active.current, firstOption: active.first,
    scheduleSuggestions: suggestions.schedule, cancelScheduledSuggestions: suggestions.cancel,
  };
}

function targetsLink(event) {
  return Boolean(event.target.closest("a"));
}

function handleKeys(input, combobox) {
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") combobox.close();
    const step = arrowStep(event.key);
    if (!step) return;
    event.preventDefault();
    combobox.moveActiveOption(step);
  });
}

function handlePointer(list, combobox) {
  list.addEventListener("mousedown", (event) => { if (targetsLink(event)) event.preventDefault(); });
  list.addEventListener("click", (event) => { if (targetsLink(event)) combobox.close(); });
}

function closeWhenFocusLeaves(form, combobox) {
  form.addEventListener("focusout", (event) => { if (!form.contains(event.relatedTarget)) combobox.close(); });
}

export function bindCombobox({ form, input, list, showSuggestions, onClose }) {
  const combobox = createCombobox({ input, list, showSuggestions, onClose });
  handleKeys(input, combobox);
  handlePointer(list, combobox);
  closeWhenFocusLeaves(form, combobox);
  return combobox;
}
