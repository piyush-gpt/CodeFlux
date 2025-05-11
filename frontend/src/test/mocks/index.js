import React from 'react';

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: () => React.createElement('div', { 'data-testid': 'monaco-editor' }, 'Monaco Editor')
}));

// Mock xterm
vi.mock('xterm', () => ({
  Terminal: vi.fn().mockImplementation(() => ({
    loadAddon: vi.fn(),
    open: vi.fn(),
    write: vi.fn(),
    clear: vi.fn(),
    dispose: vi.fn(),
  })),
}));

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { user: null } }),
    post: vi.fn().mockResolvedValue({ data: { user: null } }),
    put: vi.fn().mockResolvedValue({ data: { user: null } }),
    delete: vi.fn().mockResolvedValue({ data: { user: null } }),
    create: vi.fn().mockReturnThis(),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() }
    }
  }
}));

// Mock all style imports
vi.mock('*.css', () => ({}));
vi.mock('*.scss', () => ({}));
vi.mock('*.module.css', () => ({}));
vi.mock('*.module.scss', () => ({})); 