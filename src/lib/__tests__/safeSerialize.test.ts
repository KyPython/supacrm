import React from 'react';
import { safeSerialize } from '../safeSerialize';
import { track } from '../analytics';

describe('safeSerialize', () => {
  it('replaces React elements and circular structures without throwing', () => {
    const elem = React.createElement('div', null, 'hello');
    const circular: any = { a: 1 };
    circular.self = circular;
    const payload = {
      el: elem,
      circ: circular,
      fn: () => 1,
      nested: { x: elem, y: circular },
    };

    const serialized = safeSerialize(payload);

    expect(serialized).toBeDefined();
    expect(serialized.el).toBe('[ReactElement]');
    expect(serialized.circ).toEqual({ a: 1, self: '[Circular]' });
    expect(serialized.fn).toMatch(/Function/);
  // The React element was reused in the payload; the first occurrence is
  // detected as [ReactElement], subsequent occurrences are marked as [Circular].
  expect(serialized.nested.x).toBe('[Circular]');
  });

  it('track() does not throw when passing React elements', () => {
    const elem = React.createElement('span', null, 'x');
    expect(() => track('test_event', { el: elem })).not.toThrow();
  });
});
