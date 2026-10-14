import { filterByNotation } from '../../utils/helpers';
import ProjectCard from './ProjectCard';

// The filter value arrives through props: there is no state in this lab, so the select only reports changes.
function ProjectList({ projects, notation = 'all', notations = [], onOpen, onFilterChange }) {
  const visible = filterByNotation(projects, notation);
  return (
    <div>
      <div className="section__head">
        <h2>Проекты</h2>
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
        <ul className="grid">
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
