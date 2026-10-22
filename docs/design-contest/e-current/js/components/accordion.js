const STORAGE_KEY = 'faq-open';

export const initAccordion = ({ root = document, storage } = {}) => {
  const container = root.querySelector('#faq');
  if (!container) {
    return null;
  }

  const items = Array.from(container.querySelectorAll('.faq__item'));
  if (items.length === 0) {
    return null;
  }

  const savedIndex = () => storage.get(STORAGE_KEY, null);

  const restored = savedIndex();
  if (Number.isInteger(restored) && restored >= 0 && restored < items.length) {
    items[restored].open = true;
  }

  container.addEventListener(
    'toggle',
    (event) => {
      const item = event.target;
      const index = items.indexOf(item);
      if (index === -1) {
        return;
      }

      if (item.open) {
        items.forEach((other) => {
          if (other !== item) {
            other.open = false;
          }
        });
        storage.set(STORAGE_KEY, index);
        return;
      }

      if (savedIndex() === index) {
        storage.set(STORAGE_KEY, null);
      }
    },
    true,
  );

  return {
    openIndex: () => {
      const index = items.findIndex((item) => item.open);
      return index === -1 ? null : index;
    },
  };
};
