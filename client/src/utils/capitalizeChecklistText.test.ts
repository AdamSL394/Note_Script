import { capitalizeChecklistText } from './capitalizeChecklistText';

describe('capitalizeChecklistText', () => {
  it('capitalizes a lowercase first letter', () => {
    expect(capitalizeChecklistText('buy milk')).toBe('Buy milk');
  });

  it('leaves an already-capitalized first letter unchanged', () => {
    expect(capitalizeChecklistText('Buy milk')).toBe('Buy milk');
  });

  it('only touches the first letter, not the rest of the string', () => {
    expect(capitalizeChecklistText('milk, EGGS')).toBe('Milk, EGGS');
  });

  it('is a no-op when the first character is not a letter', () => {
    expect(capitalizeChecklistText('2 things')).toBe('2 things');
    expect(capitalizeChecklistText('🥛 milk')).toBe('🥛 milk');
  });

  it('returns an empty string unchanged', () => {
    expect(capitalizeChecklistText('')).toBe('');
  });
});
