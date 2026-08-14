import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';

function Show() {
  const { pathname, key } = useLocation();
  return (
    <div>
      <span data-testid="pathname">{pathname}</span>
      <span data-testid="key">{key}</span>
      <span data-testid="idx">{String((window.history.state as { idx?: number } | null)?.idx)}</span>
      <span data-testid="len">{String(window.history.length)}</span>
    </div>
  );
}

describe('location.key after a guard replace', () => {
  it('reports what key/idx are on a fresh tab redirected by a replace', async () => {
    window.history.replaceState(null, '', '/app/projects/abc');

    render(
      <BrowserRouter>
        <Routes>
          <Route
            path="/app/projects/:id"
            element={<Navigate to="/login" replace state={{ from: '/app/projects/abc' }} />}
          />
          <Route path="/login" element={<Show />} />
        </Routes>
      </BrowserRouter>,
    );

    await screen.findByTestId('key');

    // eslint-disable-next-line no-console
    console.log('AFTER REPLACE ->', {
      pathname: screen.getByTestId('pathname').textContent,
      key: screen.getByTestId('key').textContent,
      idx: screen.getByTestId('idx').textContent,
      len: screen.getByTestId('len').textContent,
    });

    expect({
      pathname: screen.getByTestId('pathname').textContent,
      key: screen.getByTestId('key').textContent,
      idx: screen.getByTestId('idx').textContent,
      len: screen.getByTestId('len').textContent,
    }).toBe('SHOW ME THE ACTUAL');
  });

  it('reports key/idx on a direct visit to /login', async () => {
    window.history.replaceState(null, '', '/login');

    render(
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Show />} />
        </Routes>
      </BrowserRouter>,
    );

    // eslint-disable-next-line no-console
    console.log('DIRECT VISIT ->', {
      key: screen.getByTestId('key').textContent,
      idx: screen.getByTestId('idx').textContent,
      len: screen.getByTestId('len').textContent,
    });

    expect({
      key: screen.getByTestId('key').textContent,
      idx: screen.getByTestId('idx').textContent,
      len: screen.getByTestId('len').textContent,
    }).toBe('SHOW ME THE ACTUAL');
  });
});
