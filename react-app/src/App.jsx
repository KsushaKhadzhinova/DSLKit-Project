import { useState } from 'react';
import Footer from './components/layout/Footer';
import Header from './components/layout/Header';
import NotationList from './components/features/NotationList';
import PlanCard from './components/features/PlanCard';
import ProjectList from './components/features/ProjectList';
import { mockNotations } from './data/notations';
import { mockPlans } from './data/plans';
import { mockProjects } from './data/projects';

const LINKS = [
  { href: '#notations', label: 'Нотации' },
  { href: '#projects', label: 'Проекты' },
  { href: '#plans', label: 'Тарифы' },
];

const PROJECT_NOTATIONS = [...new Set(mockProjects.map((project) => project.notation))];

function App() {
  const [notation, setNotation] = useState('all');
  const [message, setMessage] = useState('');
  const [openedProject, setOpenedProject] = useState(null);

  const handleSignup = () => setMessage('Вы записаны в бету. Мы напишем, когда откроем доступ.');
  const handleOpen = (project) => {
    setOpenedProject(project);
    setMessage(`Открыт проект «${project.name}» (${project.notation}).`);
  };
  const handleChoose = (plan) => setMessage(`Выбран тариф «${plan.name}».`);
  const handleCloseProject = () => {
    setOpenedProject(null);
    setMessage('');
  };

  return (
    <>
      <a className="skip-link" href="#main">
        К основному содержимому
      </a>
      <Header title="DSLKit" links={LINKS} onSignup={handleSignup} />
      <main className="page" id="main">
        <div role="status" aria-live="polite" className="notice-area">
          {message && (
            <p className="notice">
              {message}{' '}
              {openedProject && (
                <button type="button" className="notice__close" onClick={handleCloseProject}>
                  Закрыть
                </button>
              )}
            </p>
          )}
        </div>
        <section id="notations" aria-labelledby="notations-title">
          <div className="section__head">
            <h1 id="notations-title">Диаграммы как код</h1>
          </div>
          <NotationList notations={mockNotations} />
        </section>
        <section id="projects" aria-labelledby="projects-title">
          <ProjectList projects={mockProjects} notation={notation} notations={PROJECT_NOTATIONS} onOpen={handleOpen} onFilterChange={setNotation} />
        </section>
        <section id="plans" aria-labelledby="plans-title">
          <h2 id="plans-title">Тарифы</h2>
          <ul className="grid">
            {mockPlans.map((plan) => (
              <li key={plan.id}>
                <PlanCard plan={plan} onChoose={handleChoose} />
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer owner="DSLKit" year={2026} />
    </>
  );
}

export default App;
