import { describe, expect, it } from '@jest/globals';
import { roundTo } from './math.js';

describe('roundTo', () => {
  it('rounds to the requested number of decimals', () => {
    expect(roundTo(1.234, 2)).toBe(1.23);
    expect(roundTo(1.235, 2)).toBe(1.24);
    expect(roundTo(1.2349, 2)).toBe(1.23);
  });

  it('rounds half up at the boundary', () => {
    expect(roundTo(0.005, 2)).toBe(0.01);
    expect(roundTo(2.5, 0)).toBe(3);
  });

  it('leaves already-rounded values untouched', () => {
    expect(roundTo(10, 2)).toBe(10);
    expect(roundTo(9.99, 2)).toBe(9.99);
  });

  it('supports zero decimals', () => {
    expect(roundTo(7.49, 0)).toBe(7);
    expect(roundTo(7.5, 0)).toBe(8);
  });

  it('handles negative numbers', () => {
    expect(roundTo(-1.236, 2)).toBe(-1.24);
    expect(roundTo(-10.5, 0)).toBe(-10); // Math.round rounds toward +Infinity at the .5 boundary
  });

  it('tames floating-point representation error', () => {
    // 0.1 + 0.2 === 0.30000000000000004 without rounding
    expect(roundTo(0.1 + 0.2, 2)).toBe(0.3);
  });
});
