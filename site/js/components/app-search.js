// The search box of the top bar works on every page of the application:
// on the project list it filters at once (the list listens to the box itself), elsewhere Enter or the magnifier opens the list with the query.
// Ctrl+K, as the box promises, puts the cursor into it.
export const initAppSearch = ({ root = document, navigate } = {}) => {
  const input = root.querySelector('.app-topbar__search-input');
  if (!input) return null;
  const view = root.defaultView;
  const go = navigate ?? ((url) => view.location.assign(url));
  const button = root.querySelector('.app-topbar__search-button');
  const onList = root.querySelector('#project-list') !== null;

  const submit = () => {
    if (onList) {
      input.focus();
      return false;
    }
    go(`dashboard.html?q=${encodeURIComponent(input.value.trim())}`);
    return true;
  };
  button?.addEventListener('click', submit);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submit();
    }
  });
  root.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      input.focus();
      input.select();
    }
  });
  return { submit };
};
