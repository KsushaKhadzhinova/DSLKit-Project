import { filterByNotation } from '../../utils/helpers';
import ProjectCard from './ProjectCard';

// The list is filtered by the `notation` prop; the select is controlled by the parent, which keeps the state and receives changes through onFilterChange.
function ProjectList({ projects, notation = 'all', notations = [], onOpen, onFilterChange }) {
  const visible = filterByNotation(projects, notation);
  return (
    <div className="project-list">
      <div className="section__head">
        <h2 id="projects-title">Проекты</h2>
        <div className="toolbar">
          <label htmlFor="project-filter">Нотация</label>
          <select id="project-filter" value={notation} onChange={(event) => onFilterChange(event.target.value)}>
            <option value="all">Все</option>
            {notations.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>
      {visible.length === 0 ? (
        <p>Проектов не найдено.</p>
      ) : (
        <ul className="grid" data-testid="project-list">
          {visible.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ProjectList;
