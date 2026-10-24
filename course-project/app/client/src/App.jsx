import AuthForm from './components/AuthForm';
import DiagramsScreen from './components/DiagramsScreen';
import Footer from './components/Footer';
import Header from './components/Header';
import { useSession } from './hooks/useSession';

const TEXTS = {
  in: { title: 'Диаграммы проекта', lead: 'Список хранится на сервере: запись появляется сразу, а при отказе сервера возвращается как было.' },
  out: { title: 'Вход в DSLKit', lead: 'Диаграммы хранятся на сервере и доступны после входа.' },
};

export default function App() {
  const { signedIn, expired, logout, loggedIn } = useSession();
  const text = signedIn ? TEXTS.in : TEXTS.out;

  return (
    <div className="page">
      <a className="skip-link" href="#main">
        Перейти к основному содержимому
      </a>
      <Header signedIn={signedIn} onLogout={logout} />
      <main className="main" id="main">
        <div>
          <h1 className="page-title">{text.title}</h1>
          <p className="page-lead">{text.lead}</p>
        </div>
        {signedIn ? <DiagramsScreen /> : <AuthForm notice={expired ? 'Сессия истекла. Войдите снова.' : undefined} onLoggedIn={loggedIn} />}
      </main>
      <Footer />
    </div>
  );
}
