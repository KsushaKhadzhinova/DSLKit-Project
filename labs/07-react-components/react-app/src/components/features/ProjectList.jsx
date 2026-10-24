import { filterByNotation } from '../../utils/helpers';
import ProjectCard from './ProjectCard';

// The list is filtered by the `notation` prop. There is no state in this lab, so the select only sets its first value and reports changes; the next lab connects it to the list.
function ProjectList({ projects, notation = 'all', notations = [], onOpen, onFilterChange }) {
  const visible = filterByNotation(projects, notation);
  return (
    <div className="project-list">
      <div className="section__head">
        <h2 id="projects-title">Проекты</h2>
        <div className="toolbar">
          <label htmlFor="project-filter">Нотация</label>
          <select id="project-filter" defaultValue={notation} onChange={(event) => onFilterChange(event.target.value)}>
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
