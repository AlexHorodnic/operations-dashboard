import { vi } from 'vitest';

import { escapeCsvCell, exportCsv } from './csv-export';

describe('CSV export utilities', () => {
  it('escapes commas, quotes, and line breaks according to CSV rules', () => {
    expect(escapeCsvCell('plain value')).toBe('plain value');
    expect(escapeCsvCell('North, South')).toBe('"North, South"');
    expect(escapeCsvCell('She said "ready"')).toBe('"She said ""ready"""');
    expect(escapeCsvCell('line one\nline two')).toBe('"line one\nline two"');
  });

  it('creates and revokes a downloadable CSV URL', () => {
    const anchor = document.createElement('a');
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tagName: string) =>
        tagName.toLowerCase() === 'a' ? anchor : originalCreateElement(tagName),
      );
    const clickSpy = vi.spyOn(anchor, 'click').mockImplementation(() => undefined);
    const createUrl = vi.fn(() => 'blob:accounts');
    const revokeUrl = vi.fn();

    Object.defineProperty(URL, 'createObjectURL', {
      value: createUrl,
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: revokeUrl,
      configurable: true,
    });

    exportCsv(
      'accounts.csv',
      [{ company: 'North, South', revenue: 42000 }],
      [
        { header: 'Company', value: (row) => row.company },
        { header: 'Revenue', value: (row) => row.revenue },
      ],
    );

    expect(anchor.download).toBe('accounts.csv');
    expect(anchor.href).toBe('blob:accounts');
    expect(createUrl).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeUrl).toHaveBeenCalledWith('blob:accounts');

    createElementSpy.mockRestore();
  });
});
