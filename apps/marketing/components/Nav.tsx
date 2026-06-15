import { Icon } from '@lar/ui';

export function Nav() {
  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL ?? '#how';
  return (
    <nav className="nav glass" aria-label="Primary">
      <a className="brand" href="/">
        <span className="mark" aria-hidden>
          <Icon name="mark" size={20} />
        </span>
        Lar
      </a>
      <div className="nav-links">
        <a href="#how">How it works</a>
        <a href="#bright-lines">Bright-lines</a>
        <a className="btn primary" href={portalUrl}>
          Open the portal
        </a>
      </div>
    </nav>
  );
}
