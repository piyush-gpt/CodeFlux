import { describe, it, expect } from 'vitest';
import { render } from './test/test-utils';
import App from './App';

describe('App Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });
}); 