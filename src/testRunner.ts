import * as core from '@actions/core'
import {google} from 'googleapis'

export interface TestRunnerOptions {
  scriptId: string
  credentials: string
  deploymentId?: string
  testPrefix: string
  testSuffix: string
  devMode: boolean
}

export interface TestResult {
  name: string
  passed: boolean
  error?: string
}

/**
 * Returns true if the given file name matches the test prefix or suffix (case-insensitive).
 */
export function isTestFile(fileName: string, prefix: string, suffix: string): boolean {
  const lowerName = fileName.toLowerCase()
  const lowerPrefix = prefix.toLowerCase()
  const lowerSuffix = suffix.toLowerCase()
  return lowerName.startsWith(lowerPrefix) || lowerName.endsWith(lowerSuffix)
}

/**
 * Parses GAS/JavaScript source code and returns the names of all functions
 * whose names start with the given prefix or end with the given suffix (case-insensitive).
 */
export function extractTestFunctions(
  source: string,
  prefix: string,
  suffix: string
): string[] {
  const functions: string[] = []

  // Match top-level function declarations: function testFoo() / function fooTest()
  const functionRegex = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g
  let match

  while ((match = functionRegex.exec(source)) !== null) {
    const name = match[1]
    const lowerName = name.toLowerCase()
    const lowerPrefix = prefix.toLowerCase()
    const lowerSuffix = suffix.toLowerCase()

    if (lowerName.startsWith(lowerPrefix) || lowerName.endsWith(lowerSuffix)) {
      functions.push(name)
    }
  }

  return functions
}

/**
 * Formats an execution error from the Apps Script API into a human-readable string.
 */
function formatExecutionError(details: unknown[]): string {
  if (details.length === 0) return 'Unknown error'
  const execError = details[0] as Record<string, unknown>
  let message = String(execError['errorMessage'] ?? 'Unknown error')
  const stackTrace = execError['scriptStackTraceElements']
  if (Array.isArray(stackTrace) && stackTrace.length > 0) {
    const frames = stackTrace
      .map(
        (e: unknown) =>
          `  at ${(e as Record<string, unknown>)['function']} (line ${(e as Record<string, unknown>)['lineNumber']})`
      )
      .join('\n')
    message += `\n${frames}`
  }
  return message
}

/**
 * Discovers and executes all test functions in a Google Apps Script project.
 * Fails the GitHub Actions job if any test function throws an error.
 */
export async function runTests(options: TestRunnerOptions): Promise<void> {
  const {scriptId, credentials, deploymentId, testPrefix, testSuffix, devMode} = options

  // Parse credentials JSON
  let credentialsObj: object
  try {
    credentialsObj = JSON.parse(credentials)
  } catch {
    throw new Error(
      'Failed to parse credentials: input must be valid JSON (service account key file)'
    )
  }

  // Authenticate with Google using the service account
  const auth = new google.auth.GoogleAuth({
    credentials: credentialsObj,
    scopes: [
      'https://www.googleapis.com/auth/script.projects',
      'https://www.googleapis.com/auth/script.scriptapp'
    ]
  })
  const scriptApi = google.script({version: 'v1', auth})

  // Retrieve the script project content
  core.info(`Fetching script project content (id: ${scriptId})`)
  const contentResponse = await scriptApi.projects.getContent({scriptId})
  const files = contentResponse.data.files ?? []
  core.info(`Found ${files.length} file(s) in project`)

  // Filter to test files only
  const testFiles = files.filter(file => isTestFile(file.name ?? '', testPrefix, testSuffix))
  core.info(`Found ${testFiles.length} test file(s) matching prefix="${testPrefix}" or suffix="${testSuffix}"`)

  if (testFiles.length === 0) {
    core.warning('No test files found. Skipping test execution.')
    return
  }

  // Discover test functions in each test file
  const testFunctions: string[] = []
  for (const file of testFiles) {
    const functions = extractTestFunctions(file.source ?? '', testPrefix, testSuffix)
    core.info(
      `  ${file.name}: ${functions.length} test function(s)${functions.length > 0 ? ` → ${functions.join(', ')}` : ''}`
    )
    testFunctions.push(...functions)
  }

  if (testFunctions.length === 0) {
    core.warning('No test functions found. Skipping test execution.')
    return
  }

  core.info(`\nRunning ${testFunctions.length} test function(s)...\n`)

  // Execute each test function via the Apps Script Execution API
  const results: TestResult[] = []
  for (const functionName of testFunctions) {
    core.info(`▶ ${functionName}`)
    try {
      const runResponse = await scriptApi.scripts.run({
        scriptId,
        requestBody: {
          function: functionName,
          devMode,
          ...(deploymentId ? {deploymentId} : {})
        }
      })
      const operation = runResponse.data

      if (operation.error) {
        const errorMessage = formatExecutionError(operation.error.details ?? [])
        core.error(`❌ FAILED: ${functionName}\n${errorMessage}`)
        results.push({name: functionName, passed: false, error: errorMessage})
      } else {
        core.info(`✅ PASSED: ${functionName}`)
        const result = operation.response?.result
        if (result !== undefined && result !== null) {
          core.info(`   Result: ${JSON.stringify(result)}`)
        }
        results.push({name: functionName, passed: true})
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      core.error(`❌ FAILED: ${functionName}\n${errorMessage}`)
      results.push({name: functionName, passed: false, error: errorMessage})
    }
  }

  // Print summary
  const passedCount = results.filter(r => r.passed).length
  const failedCount = results.filter(r => !r.passed).length

  core.info('\n========== Test Results ==========')
  for (const result of results) {
    core.info(result.passed ? `✅ ${result.name}` : `❌ ${result.name}: ${result.error}`)
  }
  core.info(`\nTotal: ${results.length} | Passed: ${passedCount} | Failed: ${failedCount}`)
  core.info('==================================')

  // Expose outputs
  core.setOutput('total', results.length)
  core.setOutput('passed', passedCount)
  core.setOutput('failed', failedCount)

  if (failedCount > 0) {
    core.setFailed(`${failedCount} test(s) failed`)
  }
}
