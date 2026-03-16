import {isTestFile, extractTestFunctions} from '../src/testRunner'

describe('isTestFile', () => {
  describe('prefix matching', () => {
    it('returns true when file name starts with prefix (exact case)', () => {
      expect(isTestFile('testUtils', 'test', 'test')).toBe(true)
    })

    it('returns true when file name starts with prefix (mixed case)', () => {
      expect(isTestFile('TestUtils', 'test', 'test')).toBe(true)
    })

    it('returns true when file name starts with prefix (uppercase prefix)', () => {
      expect(isTestFile('testUtils', 'TEST', 'TEST')).toBe(true)
    })
  })

  describe('suffix matching', () => {
    it('returns true when file name ends with suffix (exact case)', () => {
      expect(isTestFile('UtilsTest', 'test', 'test')).toBe(true)
    })

    it('returns true when file name ends with suffix (mixed case)', () => {
      expect(isTestFile('UtilsTEST', 'test', 'test')).toBe(true)
    })
  })

  describe('non-matching names', () => {
    it('returns false for a plain source file', () => {
      expect(isTestFile('Utils', 'test', 'test')).toBe(false)
    })

    it('returns false for a file that contains test in the middle', () => {
      expect(isTestFile('myTestUtils', 'test', 'test')).toBe(false)
    })

    it('returns false for an empty file name', () => {
      expect(isTestFile('', 'test', 'test')).toBe(false)
    })
  })

  describe('custom prefix/suffix', () => {
    it('returns true with a custom prefix', () => {
      expect(isTestFile('spec_something', 'spec', 'spec')).toBe(true)
    })

    it('returns true with a custom suffix', () => {
      expect(isTestFile('something_spec', 'spec', 'spec')).toBe(true)
    })
  })
})

describe('extractTestFunctions', () => {
  describe('prefix matching', () => {
    it('extracts a function with test prefix', () => {
      const source = `
        function testAdd() {}
        function helper() {}
      `
      expect(extractTestFunctions(source, 'test', 'test')).toEqual(['testAdd'])
    })

    it('extracts multiple functions with test prefix', () => {
      const source = `
        function testAdd() {}
        function testSubtract() {}
        function unrelated() {}
      `
      expect(extractTestFunctions(source, 'test', 'test')).toEqual(['testAdd', 'testSubtract'])
    })
  })

  describe('suffix matching', () => {
    it('extracts a function with test suffix', () => {
      const source = `
        function addTest() {}
        function helper() {}
      `
      expect(extractTestFunctions(source, 'test', 'test')).toEqual(['addTest'])
    })

    it('extracts multiple functions with test suffix', () => {
      const source = `
        function addTest() {}
        function subtractTest() {}
        function util() {}
      `
      expect(extractTestFunctions(source, 'test', 'test')).toEqual(['addTest', 'subtractTest'])
    })
  })

  describe('mixed prefix and suffix', () => {
    it('extracts functions matching either prefix or suffix', () => {
      const source = `
        function testAdd() {}
        function multiplyTest() {}
        function helper() {}
      `
      expect(extractTestFunctions(source, 'test', 'test')).toEqual(['testAdd', 'multiplyTest'])
    })
  })

  describe('case-insensitivity', () => {
    it('matches prefix case-insensitively', () => {
      const source = `
        function TestAdd() {}
        function TESTADD() {}
      `
      expect(extractTestFunctions(source, 'test', 'test')).toEqual(['TestAdd', 'TESTADD'])
    })

    it('matches suffix case-insensitively', () => {
      const source = `
        function addTEST() {}
        function addTest() {}
      `
      expect(extractTestFunctions(source, 'test', 'test')).toEqual(['addTEST', 'addTest'])
    })

    it('matches with uppercase prefix argument', () => {
      const source = `
        function testFoo() {}
      `
      expect(extractTestFunctions(source, 'TEST', 'TEST')).toEqual(['testFoo'])
    })
  })

  describe('edge cases', () => {
    it('returns an empty array for empty source', () => {
      expect(extractTestFunctions('', 'test', 'test')).toEqual([])
    })

    it('returns an empty array when no functions match', () => {
      const source = `
        function helperA() {}
        function helperB() {}
      `
      expect(extractTestFunctions(source, 'test', 'test')).toEqual([])
    })

    it('does not match functions with test only in the middle of the name', () => {
      const source = `
        function myTestHelper() {}
      `
      expect(extractTestFunctions(source, 'test', 'test')).toEqual([])
    })

    it('works with custom prefix and suffix', () => {
      const source = `
        function specAdd() {}
        function multiplySpec() {}
        function helper() {}
      `
      expect(extractTestFunctions(source, 'spec', 'spec')).toEqual(['specAdd', 'multiplySpec'])
    })
  })
})
