import { ERRORS } from '../errorCatalog';
import { usePageTitle } from '../utils/usePageTitle';
import ErrorHelp from './ErrorHelp';

// A full page for an error: the code, the title and the three parts (what it is, why, how to fix), then the actions of the page.
export default function ErrorPage({ kind, children }) {
  const { code, title } = ERRORS[kind];
  usePageTitle(title);
  return (
    <div className="error-page">
      <div role="alert" className="error-page__head">
        <p className="error-page__code" aria-hidden="true">
          {code}
        </p>
        <h1 className="page-title">{title}</h1>
      </div>
      <ErrorHelp kind={kind} level={2} />
      <div className="form__actions">{children}</div>
    </div>
  );
}
