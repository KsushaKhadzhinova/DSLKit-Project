export default function PageHead({ title, lead }) {
  return (
    <div className="page-head">
      <h1 className="page__title">{title}</h1>
      {lead && <p className="page-head__lead">{lead}</p>}
    </div>
  );
}
