const STATUS_TEXT = { saving: 'Сохранение…', saved: 'Сохранено' };

export default function StatsBar({ stats, autosave }) {
  return (
    <p className="stats">
      Всего: {stats.total} · Опубликовано: {stats.published} · Черновики: {stats.drafts} · <span role="status">{STATUS_TEXT[autosave]}</span>
    </p>
  );
}
