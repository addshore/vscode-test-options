# Test Options

Test Options is a Visual Studio Code extension that enhances your testing workflow by allowing you to define multiple, highly-configurable test run profiles. It's designed to be language-agnostic, so you can tailor it to run tests with different arguments, environment variables, or even different test runners, all within the same project.

## Features

- **Multiple Run Profiles**: Define several ways to run your tests (e.g., with coverage, with recording, in a specific environment).
- **Language Agnostic**: Configure test commands for any language or framework, such as Go, Jest, Pytest, and more.
- **Test Explorer Integration**: Your custom profiles appear directly in the Test Explorer UI.
- **CodeLens Actions**: See and run your custom test profiles directly from your code, with links appearing above your test functions.
- **Fully Configurable**: Control the executable, arguments, environment variables, and how tests are discovered.

## Configuration

You can configure Test Options by adding `test-options.profiles` to your user or workspace `settings.json` file. This setting is an array of profile objects, where each object defines a unique way to run tests.

### Example: Go

Here’s how you can set up profiles for running standard Go tests, tests with coverage, and tests with a specific environment variable for `copyist`.

```json
{
    "test-options.profiles": [
        {
            "name": "Go: record test",
            "commandExecutable": "go",
            "commandArgsTemplate": [ "test", "-v", "-run", "^{{testName}}$" ],
            "testFilePattern": "**/*_test.go",
            "testFunctionRegex": "^func (Test\\w+)\\s*\\(",
            "args": [ "-record" ]
        },
        {
            "name": "Go: run with coverage",
            "commandExecutable": "go",
            "commandArgsTemplate": [ "test", "-v", "-run", "^{{testName}}$" ],
            "testFilePattern": "**/*_test.go",
            "testFunctionRegex": "^func (Test\\w+)\\s*\\(",
            "args": [ "-cover" ]
        },
        {
            "name": "Go: record test (env)",
            "commandExecutable": "go",
            "commandArgsTemplate": [ "test", "-v", "-run", "^{{testName}}$" ],
            "testFilePattern": "**/*_test.go",
            "testFunctionRegex": "^func (Test\\w+)\\s*\\(",
            "args": [],
            "env": { "COPYIST_RECORD": "1" }
        }
    ]
}
```

### Example: JavaScript (Jest)

You can just as easily configure it for a JavaScript project using Jest.

```json
{
    "test-options.profiles": [
        {
            "name": "Jest: run test",
            "commandExecutable": "npx",
            "commandArgsTemplate": [
                "jest",
                "{{testFile}}",
                "--testNamePattern",
                "^{{testName}}$"
            ],
            "testFilePattern": "**/*.{test,spec}.{js,ts}",
            "testFunctionRegex": "^(?:it|test)\\(['\"]([^'\"]+)['\"]",
            "args": []
        },
        {
            "name": "Jest: run with coverage",
            "commandExecutable": "npx",
            "commandArgsTemplate": [
                "jest",
                "{{testFile}}",
                "--testNamePattern",
                "^{{testName}}$"
            ],
            "testFilePattern": "**/*.{test,spec}.{js,ts}",
            "testFunctionRegex": "^(?:it|test)\\(['\"]([^'\"]+)['\"]",
            "args": ["--coverage"]
        }
    ]
}
```

## Profile Properties

----
Each object in the `test-options.profiles` array has the following properties:
* `name` (string, required): The human-readable name for the profile, which appears in the UI.
* `commandExecutable` (string, required): The command to run (e.g., `go`, `npx`, `python`).
* `commandArgsTemplate` (array of strings, required): The base arguments for the command. You can use placeholders that will be replaced at runtime:
    - `{{testName}}`: The name of the test function being run.
    - `{{testFile}}`: The absolute path to the test file.
    - `{{testProjectPath}}`: The absolute path to the directory containing the test file.
* `testFilePattern` (string, required): A glob pattern used to identify which files are test files.
* `testFunctionRegex` (string, required): A regular expression used to discover test functions within a file. **It must contain exactly one capturing group** for the test name.
* `args` (array of strings, required): Additional arguments to append to the command for this specific profile.
* `env` (object, optional): A key-value map of environment variables to set for the test run.

