import { formatDate, pluralizeFiles } from '../../utils/helpers';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card from '../ui/Card';

// Project card with an event handler: the parent decides what "open" does.
function ProjectCard({ project, onOpen }) {
  return (
    <Card title={project.name}>
      <p>
        <Badge>{project.notation}</Badge> {project.shared && <Badge tone="success">Общий доступ</Badge>}
      </p>
      <p>
        Обновлён {formatDate(project.updated)} · {pluralizeFiles(project.files)}
      </p>
      <Button variant="quiet" onClick={() => onOpen(project)}>
        Открыть
      </Button>
    </Card>
  );
}

export default ProjectCard;
