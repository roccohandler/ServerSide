import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';

function Show() {
  const { pathname, key } = useLocation();
  const idx = (window.history.state as { idx?: number } | null)?.idx;
  return (
    <div>
      <span data-testid="pathname">{pathname}</span>
      <span data-testid="key">{key}</span>
      <span data-testid="idx">{String(idx)}</span>
    </div>
  );
}

function read() {
  return {
    pathname: screen.getByTestId('pathname').textContent,
    key: screen.getByTestId('key').textContent,
    idx: screen.getByTestId('idx').textContent,
  };
}

describe('what key/idx actually are', () => {
  it('A: fresh tab deep link to /app, guard replaces to /login', async () => {
    window.history.replaceState(null, '', '/app/projects/abc');
    render(
      <BrowserRouter>
        <Routes>
          <Route path="/app/projects/:id" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Show />} />
        </Routes>
      </BrowserRouter>,
    );
    await screen.findByTestId('key');
    // eslint-disable-next-line no-console
    console.log('CASE A (guard replace, no history behind):', JSON.stringify(read()));
    expect(read().pathname).toBe('/login');
  });

  it('B: direct visit straight to /login', async () => {
    window.history.replaceState(null, '', '/login');
    render(
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Show />} />
        </Routes>
      </BrowserRouter>,
    );
    // eslint-disable-next-line no-console
    console.log('CASE B (direct visit):', JSON.stringify(read()));
    expect(read().pathname).toBe('/login');
  });

  it('C: pushed to /login from the homepage (real history behind it)', async () => {
    window.history.replaceState(null, '', '/');
    function Home() {
      return <Navigate to="/login" />;
    }
    render(
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Show />} />
        </Routes>
      </BrowserRouter>,
    );
    await screen.findByTestId('key');
    // eslint-disable-next-line no-console
    console.log('CASE C (pushed, history behind):', JSON.stringify(read()));
    expect(read().pathname).toBe('/login');
  });
});
