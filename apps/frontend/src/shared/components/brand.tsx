import { Link } from 'react-router-dom';

export function Brand() {
  return (
    <Link className="brand" to="/tasks" aria-label="Foci Tasks home">
      <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
      <span>Foci Tasks</span>
    </Link>
  );
}
