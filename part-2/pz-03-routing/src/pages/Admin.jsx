import { useAuth } from '../auth';
import { usePageTitle } from '../usePageTitle';
import PageHead from './PageHead';

export default function Admin() {
  usePageTitle('Администратор');
  const { userName } = useAuth();
  return (
    <>
      <PageHead title="Раздел администратора" lead={`Вы вошли как ${userName}.`} />
      <p className="prose">
        Страница видна только роли admin. Проверка ведётся в интерфейсе и не защищает данные: настоящая проверка роли возможна только на сервере.
      </p>
    </>
  );
}
