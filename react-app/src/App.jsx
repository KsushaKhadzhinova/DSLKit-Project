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

// Handlers are stubs for this lab: they only write to the console because the state arrives in the next lab.
const handleSignup = () => console.log('Запись в бету');
const handleOpen = (project) => {
  console.group(`Открыт проект: ${project.name}`);
  console.table(project);
  console.groupEnd();
};
const handleFilter = (notation) => console.log('Выбрана нотация:', notation);
const handleChoose = (plan) => console.log('Выбран тариф:', plan.name);

function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        К основному содержимому
      </a>
      <Header title="DSLKit" links={LINKS} onSignup={handleSignup} />
      <main className="page" id="main">
        <section id="notations" aria-labelledby="notations-title">
          <div className="section__head">
            <h1 id="notations-title">Диаграммы как код</h1>
          </div>
          <NotationList notations={mockNotations} />
        </section>
        <section id="projects" aria-labelledby="projects-title">
          <ProjectList projects={mockProjects} notations={PROJECT_NOTATIONS} onOpen={handleOpen} onFilterChange={handleFilter} />
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
