// components/Navbar.tsx
export function Navbar() {
  return (
    <header class="navbar">
      <div class="container navbar-inner">
        <a href="/" class="logo-link">
          <img src="/logo.svg" alt="StatusZero Logo" width="32" height="32" />
          <span>
            Status<span class="gradient-text">Zero</span>
          </span>
          <span class="logo-badge">Deno KV</span>
        </a>

        <nav class="nav-links">
          <a href="/#how-it-works" class="nav-link">How it works</a>
          <a href="/#examples" class="nav-link">Examples</a>
          <a href="/#action-snippet" class="nav-link">GitHub Action</a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-secondary btn-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 4.435 9.795 10.59 11.23.6.11.82-.26.82-.577v-2.164c-4.32.937-5.23-2.083-5.23-2.083-.706-1.794-1.724-2.272-1.724-2.272-1.408-.963.107-.943.107-.943 1.558.11 2.378 1.6 2.378 1.6 1.384 2.37 3.633 1.685 4.518 1.29.14-.997.54-1.685.98-2.073-3.45-.39-7.078-1.725-7.078-7.68 0-1.7.606-3.09 1.6-4.18-.16-.395-.694-1.98.152-4.125 0 0 1.306-.418 4.28 1.595a14.9 14.9 0 0 1 3.896-.525c1.32.006 2.65.178 3.896.525 2.97-2.013 4.275-1.595 4.275-1.595.85 2.145.315 3.73.155 4.125 1 1.09 1.6 2.48 1.6 4.18 0 5.97-3.635 7.285-7.095 7.668.558.48.97 1.43.97 2.885v4.28c0 .32.216.694.825.576C19.565 21.79 24 17.31 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHub
          </a>
          <a
            href="https://dash.deno.com"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-primary btn-sm"
          >
            Deploy on Deno
          </a>
        </nav>
      </div>
    </header>
  );
}
