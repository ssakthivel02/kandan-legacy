export const normaliseText = value =>
  String(value ?? '').trim().toLocaleLowerCase();

export const matchesStaticRecord = (
  record,
  {query = '', category = 'All'} = {}
) => {
  const term = normaliseText(query);
  const expected = normaliseText(category);
  const actual = normaliseText(record?.category);
  const searchText = normaliseText(record?.searchText);
  return (
    (!term || searchText.includes(term)) &&
    (!expected || expected === 'all' || actual === expected)
  );
};

const filterCards = ({
  cards,
  query,
  category,
  count,
  label
}) => {
  let visible = 0;
  cards.forEach(card => {
    const show = matchesStaticRecord(
      {
        searchText: card.dataset.search || card.textContent,
        category: card.dataset.category || ''
      },
      {
        query: query?.value || '',
        category: category?.value || 'All'
      }
    );
    card.hidden = !show;
    if (show) visible += 1;
  });
  if (count) {
    count.textContent =
      `${visible} of ${cards.length} ${label} shown.`;
  }
  return visible;
};

export const initialiseThiruppugazhFilters = root => {
  const cards = [
    ...root.querySelectorAll('[data-song-card]')
  ];
  if (!cards.length) return false;
  const query = root.getElementById('tgq');
  const category = root.getElementById('tgVenue');
  const count = root.getElementById('tgCount');
  const reset = root.getElementById('tgReset');
  const apply = () => filterCards({
    cards,
    query,
    category,
    count,
    label: 'verified songs'
  });
  query?.addEventListener('input', apply);
  category?.addEventListener('change', apply);
  reset?.addEventListener('click', () => {
    if (query) query.value = '';
    if (category) category.value = 'All';
    apply();
    query?.focus();
  });
  apply();
  return true;
};

export const initialiseRegionalTempleFilters = root => {
  const cards = [
    ...root.querySelectorAll('[data-regional-temple]')
  ];
  if (!cards.length) return false;
  const query = root.getElementById('regionalTempleSearch');
  const category = root.getElementById('regionalTempleSetting');
  const count = root.getElementById('regionalTempleCount');
  const reset = root.getElementById('regionalTempleReset');
  const apply = () => filterCards({
    cards,
    query,
    category,
    count,
    label: 'official-identity temple records'
  });
  query?.addEventListener('input', apply);
  category?.addEventListener('change', apply);
  reset?.addEventListener('click', () => {
    if (query) query.value = '';
    if (category) category.value = 'All';
    apply();
    query?.focus();
  });
  apply();
  return true;
};

export const initialiseContentReliability = (
  root = document
) => {
  root.documentElement?.setAttribute(
    'data-content-reliability-ready',
    'true'
  );
  initialiseThiruppugazhFilters(root);
  initialiseRegionalTempleFilters(root);
};

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => initialiseContentReliability(),
      {once: true}
    );
  } else {
    initialiseContentReliability();
  }
}
