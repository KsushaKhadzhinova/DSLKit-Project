import { NOTATION_STATUSES } from '../../data/notations';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import styles from './features.module.css';

// Composite component: a Card with a Badge and a code example, built from simpler parts.
function NotationCard({ notation }) {
  const isBeta = notation.status === 'beta';
  return (
    <Card title={notation.code} headingLevel="h2">
      <Badge tone={isBeta ? 'success' : 'warning'}>{NOTATION_STATUSES[notation.status]}</Badge>
      <p>{notation.title}</p>
      <code className={styles.code}>{notation.example}</code>
    </Card>
  );
}

export default NotationCard;
