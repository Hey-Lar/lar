export function Nav() {
  return (
    <nav className="nav glass" aria-label="Primary">
      <a className="brand" href="/">
        <span className="mark" aria-hidden>
          ✺
        </span>
        Lar
      </a>
      <div className="nav-links">
        <a href="#how">How it works</a>
        <a href="#bright-lines">Bright-lines</a>
        <a className="btn primary" href="http://localhost:4200/">
          Open the portal
        </a>
      </div>
    </nav>
  );
}
