export function PageStub({ title, description, children }) {
  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Раздел админки</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="status-badge">В разработке</span>
      </div>
      {children ?? (
        <div className="empty-state">
          <strong>Страница заложена в каркас.</strong>
          <p>Подключение к backend и базе данных добавим отдельным этапом.</p>
        </div>
      )}
    </section>
  );
}
