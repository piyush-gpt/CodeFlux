import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Mock the Monaco Editor component since it's not needed for basic tests
vi.mock('@monaco-editor/react', () => ({
  default: () => <div data-testid="monaco-editor">Monaco Editor</div>
}));

describe('App Component', () => {
  it('renders without crashing', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    expect(document.body).toBeTruthy();
  });

  it('renders the main app container', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    const appElement = document.querySelector('div');
    expect(appElement).toBeInTheDocument();
  });
}); 