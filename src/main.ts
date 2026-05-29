import * as core from '@actions/core'
import {runTests} from './testRunner'

async function run(): Promise<void> {
  try {
    const scriptId = core.getInput('script_id', {required: true})
    const credentials = core.getInput('credentials', {required: true})
    const deploymentId = core.getInput('deployment_id') || undefined
    const testPrefix = core.getInput('test_prefix') || 'test'
    const testSuffix = core.getInput('test_suffix') || 'test'
    const devMode = core.getInput('dev_mode') !== 'false'

    await runTests({
      scriptId,
      credentials,
      deploymentId,
      testPrefix,
      testSuffix,
      devMode
    })
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed('An unexpected error occurred')
    }
  }
}

run()
