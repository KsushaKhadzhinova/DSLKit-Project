import { validateWaitlist } from '../utils/validation.js';

const FIELDS = ['name', 'email', 'notation', 'team', 'comment', 'consent'];

const readValues = (form) => {
  const field = (id) => form.querySelector(`#${id}`);
  return {
    name: field('name').value,
    email: field('email').value,
    notation: field('notation').value,
    team: field('team').value,
    comment: field('comment').value,
    consent: field('consent').checked,
  };
};

const showState = (form, id, invalid) => {
  const field = form.querySelector(`#${id}`);
  const error = form.querySelector(`#${id}-error`);
  if (error) error.hidden = !invalid;
  if (invalid) field.setAttribute('aria-invalid', 'true');
  else field.removeAttribute('aria-invalid');

  const ids = (field.getAttribute('aria-describedby') ?? '').split(/\s+/).filter((value) => value && value !== `${id}-error`);
  if (invalid && error) ids.push(`${id}-error`);
  if (ids.length > 0) field.setAttribute('aria-describedby', ids.join(' '));
  else field.removeAttribute('aria-describedby');
};

export const initWaitlistForm = ({
  root = document,
  storage,
  now = () => new Date(),
  navigate = (url) => root.defaultView.location.assign(url),
  logger = console,
} = {}) => {
  const form = root.querySelector('#waitlist-form');
  if (!form) return null;

  const validateField = (id) => showState(form, id, validateWaitlist(readValues(form)).includes(id));

  let submitting = false;

  const submit = () => {
    if (submitting) return false;
    const values = readValues(form);
    const invalid = validateWaitlist(values);
    FIELDS.forEach((id) => showState(form, id, invalid.includes(id)));
    if (invalid.length > 0) {
      form.querySelector(`#${invalid[0]}`).focus();
      return false;
    }

    const record = {
      name: values.name.trim(),
      email: values.email.trim(),
      notation: values.notation,
      team: Number(values.team),
      comment: values.comment.trim(),
      createdAt: now().toISOString(),
    };
    const saved = storage.get('waitlist', []);
    const records = Array.isArray(saved) ? saved : [];
    records.push(record);
    storage.set('waitlist', records);
    submitting = true;
    logger.info('DSLKit: заявка сохранена в LocalStorage', record.notation);
    navigate('thanks.html');
    return true;
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submit();
  });

  form.noValidate = true;

  // While typing only fields already marked invalid are rechecked, so the first error appears on leaving the field.
  const revalidate = (event) => {
    const { id } = event.target;
    if (!FIELDS.includes(id)) return;
    if (event.type === 'change' || event.target.getAttribute('aria-invalid') === 'true') validateField(id);
  };
  form.addEventListener('input', revalidate);
  form.addEventListener('change', revalidate);

  return { validateField, submit };
};
