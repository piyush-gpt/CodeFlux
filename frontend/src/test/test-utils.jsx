import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import './mocks';

// Mock all CSS imports
vi.mock('*.css', () => ({}));
vi.mock('*.scss', () => ({}));
vi.mock('tailwindcss', () => ({}));

// Custom render function that includes providers
function customRender(ui, options = {}) {
  return render(ui, {
    wrapper: ({ children }) => (
      <BrowserRouter>
        {children}
      </BrowserRouter>
    ),
    ...options,
  });
}

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render }; 