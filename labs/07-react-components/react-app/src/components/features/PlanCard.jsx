import { formatPrice } from '../../utils/helpers';
import Button from '../ui/Button';
import Card from '../ui/Card';

// Pricing plan: the feature list is rendered with map, the choice button reports the plan to the parent.
function PlanCard({ plan, onChoose }) {
  return (
    <Card title={plan.name}>
      <p>
        <strong>{formatPrice(plan.price)}</strong>
        {plan.price > 0 && ' в месяц'}
      </p>
      <p>До {plan.diagramsPerDay} диаграмм в день</p>
      <ul>
        {plan.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      <Button onClick={() => onChoose(plan)}>Выбрать</Button>
    </Card>
  );
}

export default PlanCard;
