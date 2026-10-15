const STATUS_TEXT = { saving: 'Сохранение…', saved: 'Сохранено' };

export default function StatsBar({ stats, autosave }) {
  return (
    <p className="stats" role="status">
      Всего: {stats.total} · Опубликовано: {stats.published} · Черновики: {stats.drafts} · {STATUS_TEXT[autosave]}
    </p>
  );
}
