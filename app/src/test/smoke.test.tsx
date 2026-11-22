import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '@/components/ui/button';

describe('shadcn button', () => {
  it('renders children', () => {
    render(<Button>Start typing</Button>);
    expect(
      screen.getByRole('button', { name: 'Start typing' }),
    ).toBeInTheDocument();
  });
});
