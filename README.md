# gas-test-runner

A GitHub Action to automatically discover and execute Google Apps Script test functions.

## Overview

`gas-test-runner` scans your Google Apps Script project for test files and functions, executes them via the [Apps Script Execution API](https://developers.google.com/apps-script/api/reference/rest/v1/scripts/run), and fails the CI job if any test throws an error.

**Discovery rules**

| Target | Rule |
|--------|------|
| Files | File name starts **or** ends with the configured prefix/suffix (default: `test`, case-insensitive) |
| Functions | Function name starts **or** ends with the configured prefix/suffix (default: `test`, case-insensitive) |

Examples using the default `test` keyword:
- ✅ `testUtils.gs` → test file
- ✅ `UtilsTest.gs` → test file
- ✅ `function testAdd() {}` → test function
- ✅ `function addTest() {}` → test function
- ❌ `myUtils.gs` → **not** a test file
- ❌ `function myHelper() {}` → **not** a test function

## Prerequisites

1. **Google Cloud project** with the [Apps Script API](https://console.developers.google.com/apis/api/script.googleapis.com) enabled.
2. **Service account** with at least *Editor* access to the script project.
3. **API-executable deployment** in your Apps Script project (required when `dev_mode` is `false`).

### Required OAuth scopes

The action authenticates using a service account and requests the following scopes:

| Scope | Purpose |
|-------|---------|
| `https://www.googleapis.com/auth/script.projects` | Read script project files to discover test functions |
| `https://www.googleapis.com/auth/script.scriptapp` | Execute script functions via the Execution API |

> **Note:** When `dev_mode` is `true` (the default), the action runs against the latest saved code without a deployment. This is convenient for CI but requires the service account to have Editor access. Set `dev_mode: false` and provide a `deployment_id` when you want to run against a specific deployment.

## Usage

```yaml
- name: Run GAS Tests
  uses: kotaoue/gas-test-runner@v1
  with:
    script_id: ${{ secrets.GAS_SCRIPT_ID }}
    credentials: ${{ secrets.GAS_CREDENTIALS }}
```

### With all options

```yaml
- name: Run GAS Tests
  uses: kotaoue/gas-test-runner@v1
  with:
    script_id: ${{ secrets.GAS_SCRIPT_ID }}
    credentials: ${{ secrets.GAS_CREDENTIALS }}
    deployment_id: ${{ secrets.GAS_DEPLOYMENT_ID }}
    test_prefix: 'test'
    test_suffix: 'test'
    dev_mode: 'false'
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `script_id` | ✅ | — | Google Apps Script project ID |
| `credentials` | ✅ | — | Service account JSON key (store as a GitHub secret) |
| `deployment_id` | ❌ | `''` | API-executable deployment ID. Required when `dev_mode` is `false`. |
| `test_prefix` | ❌ | `test` | Prefix to identify test files and functions (case-insensitive) |
| `test_suffix` | ❌ | `test` | Suffix to identify test files and functions (case-insensitive) |
| `dev_mode` | ❌ | `true` | Run in development mode (latest saved code, no deployment needed) |

## Outputs

| Output | Description |
|--------|-------------|
| `total` | Total number of test functions executed |
| `passed` | Number of test functions that passed |
| `failed` | Number of test functions that failed |

## Example workflow

```yaml
name: GAS Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Run GAS Tests
        id: gas_tests
        uses: kotaoue/gas-test-runner@v1
        with:
          script_id: ${{ secrets.GAS_SCRIPT_ID }}
          credentials: ${{ secrets.GAS_CREDENTIALS }}

      - name: Print results
        run: echo "Passed ${{ steps.gas_tests.outputs.passed }} / ${{ steps.gas_tests.outputs.total }} tests"
```

## How test functions should be written

A test function **passes** if it returns normally, and **fails** if it throws an exception.

```javascript
// testMath.gs

function testAdd() {
  var result = add(1, 2);
  if (result !== 3) {
    throw new Error('Expected 3 but got ' + result);
  }
  Logger.log('testAdd passed');
}

function testSubtract() {
  var result = subtract(5, 3);
  if (result !== 2) {
    throw new Error('Expected 2 but got ' + result);
  }
  Logger.log('testSubtract passed');
}
```

## License

MIT

