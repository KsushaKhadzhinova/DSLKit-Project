import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { usePageTitle } from '../usePageTitle';
import PageHead from './PageHead';

export default function Dashboard() {
  usePageTitle('Личный кабинет');
  const { userName, role } = useAuth();
  return (
    <>
      <PageHead title="Личный кабинет" lead={`Здравствуйте, ${userName}.`} />
      <p className="prose">Здесь будут ваши диаграммы. Страница доступна только после входа.</p>
      {role === 'admin' && (
        <p className="actions">
          <Link className="button" to="/admin">
            Раздел администратора
          </Link>
        </p>
      )}
    </>
  );
}
