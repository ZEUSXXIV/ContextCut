import { convertToToon } from './toonEncoder';

describe('TOON Encoder Utility', () => {
  test('should format simple primitive values and shortcuts', () => {
    // Booleans and null shortcuts
    expect(convertToToon(true)).toBe('T');
    expect(convertToToon(false)).toBe('F');
    expect(convertToToon(null)).toBe('N');
    expect(convertToToon(undefined)).toBe('N');

    // Numbers and strings
    expect(convertToToon(42)).toBe('42');
    expect(convertToToon(3.14159)).toBe('3.14159');
    expect(convertToToon('Hello World')).toBe('Hello World');
  });

  test('should handle string quoting for YAML control characters and colons', () => {
    expect(convertToToon('item: description')).toBe('"item: description"');
    expect(convertToToon('line1\nline2')).toBe('"line1\\nline2"');
    expect(convertToToon('value,with,commas')).toBe('"value,with,commas"');
    expect(convertToToon('quote"inside')).toBe('"quote\\"inside"');
  });

  test('should format flat key-value objects in YAML-style', () => {
    const obj = {
      id: 12345,
      name: 'John Doe',
      verified: true,
      notes: null,
    };
    const expected = [
      'id: 12345',
      'name: John Doe',
      'verified: T',
      'notes: N',
    ].join('\n');

    expect(convertToToon(obj)).toBe(expected);
  });

  test('should serialize uniform tabular arrays into header and CSV rows', () => {
    const inventory = [
      { id: 101, sku: 'PROD-A', price: 12.99, inStock: true },
      { id: 102, sku: 'PROD-B', price: 99.5, inStock: false },
      { id: 103, sku: 'PROD-C', price: 4.0, inStock: true },
    ];
    
    // Top-level uniform array defaults to 'root'
    const expected = [
      'root[3]{id,sku,price,inStock}:',
      '  101,PROD-A,12.99,T',
      '  102,PROD-B,99.5,F',
      '  103,PROD-C,4,T',
    ].join('\n');

    expect(convertToToon(inventory)).toBe(expected);
  });

  test('should serialize nested objects and nested uniform arrays with proper indentation', () => {
    const data = {
      category: 'Electronics',
      active: true,
      items: [
        { id: 1, name: 'Phone' },
        { id: 2, name: 'Tablet' },
      ],
    };

    const expected = [
      'category: Electronics',
      'active: T',
      'items[2]{id,name}:',
      '  1,Phone',
      '  2,Tablet',
    ].join('\n');

    expect(convertToToon(data)).toBe(expected);
  });

  test('should format non-uniform object arrays using the union of keys and fall back for primitive or empty arrays', () => {
    const mixed = {
      name: 'Irregular Data',
      simpleList: [1, 2, 3], // Primitives, not objects -> JSON fallback
      nonUniformList: [
        { id: 1, name: 'Phone' },
        { sku: 'TAB-2' }, // Different keys -> key union [id, name, sku]
      ],
      emptyList: [], // Empty list -> JSON fallback
    };

    const expected = [
      'name: Irregular Data',
      'simpleList: [1,2,3]',
      'nonUniformList[2]{id,name,sku}:',
      '  1,Phone,N',
      '  N,N,TAB-2',
      'emptyList: []',
    ].join('\n');

    expect(convertToToon(mixed)).toBe(expected);
  });
});
