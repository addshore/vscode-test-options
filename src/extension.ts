// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
import * as cp from 'child_process';
import * as path from 'path';
import * as micromatch from 'micromatch';

export function activate(context: vscode.ExtensionContext) {
	// Debug output: Extension activated
	console.log('[test-options] Extension activated. Checking for vscode.tests:', !!vscode.tests);

	const getCommandExecutable = () => vscode.workspace.getConfiguration('test-options').get<string>('commandExecutable', 'go');
	const getCommandArgsTemplate = () => vscode.workspace.getConfiguration('test-options').get<string[]>('commandArgsTemplate', ['test', '-v', '-run', '^{{testName}}$']);
	const getTestFilePattern = () => vscode.workspace.getConfiguration('test-options').get<string>('testFilePattern', '**/*_test.go');
	const getTestFunctionRegex = () => vscode.workspace.getConfiguration('test-options').get<string>('testFunctionRegex', '^func (Test\\w+)\\s*\\(');
	const getRunProfileName = () => vscode.workspace.getConfiguration('test-options').get<string>('runProfileName', 'record test');
	const getRunProfileArgs = () => vscode.workspace.getConfiguration('test-options').get<string[]>('runProfileArgs', ['-record']);

	// Register test controller and auto-discover tests
	if (vscode.tests) {
		console.log('[test-options] Registering test controller...');
		const controller = vscode.tests.createTestController('test-options-controller', 'Test Options Controller');
		context.subscriptions.push(controller);
		console.log('[test-options] Test controller registered:', controller.id);

		// Add a custom run profile
		const recordProfile = controller.createRunProfile(
			getRunProfileName(),
			vscode.TestRunProfileKind.Run,
			async (request, token) => {
				console.log('[test-options] record test run profile triggered.');
				const run = controller.createTestRun(request);

				for (const test of request.include || []) {
					run.started(test);
					const testUri = test.uri;
					const testName = test.id.split('/').pop(); // Get test function name

					if (testUri) {
						const testProjectPath = path.dirname(testUri.fsPath);
						const testFile = testUri.fsPath;

						const executable = getCommandExecutable();
						const argsTemplate = getCommandArgsTemplate();
						const runArgs = getRunProfileArgs();

						const processedArgs = argsTemplate.map((arg: string) =>
							arg.replace(/{{testName}}/g, testName!)
								.replace(/{{testFile}}/g, testFile)
								.replace(/{{testProjectPath}}/g, testProjectPath)
						);
						const finalArgs = [...processedArgs, ...runArgs];

						const outputChannel = vscode.window.createOutputChannel(getRunProfileName());
						outputChannel.show(true);
						outputChannel.appendLine(`[test-options] Running: ${executable} ${finalArgs.join(' ')}`);
						outputChannel.appendLine(`[test-options] Working directory: ${testProjectPath}`);

						try {
							const proc = cp.spawn(executable, finalArgs, { cwd: testProjectPath });
							outputChannel.appendLine('[test-options] Spawned test process.');

							let output = '';
							proc.stdout.on('data', (data) => {
								const text = data.toString();
								output += text;
								outputChannel.append(text);
							});
							proc.stderr.on('data', (data) => {
								const text = data.toString();
								output += text;
								outputChannel.append(text);
							});

							proc.on('close', (code) => {
								outputChannel.appendLine(`\n[test-options] Process exited with code ${code}`);
								if (code === 0) {
									run.passed(test);
								} else {
									run.failed(test, new vscode.TestMessage(output));
								}
								run.end();
							});

							proc.on('error', (err) => {
								const errorMessage = err instanceof Error ? err.message : String(err);
								outputChannel.appendLine('[test-options] Failed to start process: ' + errorMessage);
								run.failed(test, new vscode.TestMessage(errorMessage));
								run.end();
							});
						} catch (err) {
							const errorMessage = err instanceof Error ? err.message : String(err);
							outputChannel.appendLine('[test-options] Error running test command: ' + errorMessage);
							run.failed(test, new vscode.TestMessage(errorMessage));
							run.end();
						}
					}
				}
			},
			false // not default
		);
		context.subscriptions.push(recordProfile);
		console.log('[test-options] record test run profile registered.');

		// Update profile name on configuration change
		context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('test-options.runProfileName')) {
				recordProfile.label = getRunProfileName();
			}
		}));

		// Function to discover and register tests from a test file
		const discoverTestsInFile = async (uri: vscode.Uri) => {
			try {
				const document = await vscode.workspace.openTextDocument(uri);
				const text = document.getText();
				const regexString = getTestFunctionRegex();
				const regex = new RegExp(regexString, 'gm');
				let match;

				// Create a file-level test item
				const fileItem = controller.createTestItem(uri.toString(), path.basename(uri.fsPath), uri);
				controller.items.add(fileItem);

				while ((match = regex.exec(text))) {
					const testName = match[1];
					const line = document.positionAt(match.index).line;
					const range = new vscode.Range(line, 0, line, match[0].length);

					// Create test item for each test function
					const testItem = controller.createTestItem(
						`${uri.toString()}/${testName}`,
						testName,
						uri
					);
					testItem.range = range;
					fileItem.children.add(testItem);
				}

				console.log(`[test-options] Discovered tests in ${uri.fsPath}`);
			} catch (error) {
				console.error(`[test-options] Error discovering tests in ${uri.fsPath}:`, error);
			}
		};

		let fileWatcher: vscode.FileSystemWatcher;
		let openDocumentListener: vscode.Disposable;

		const setupWatchers = () => {
			// Dispose old watchers if they exist
			if (fileWatcher) { fileWatcher.dispose(); }
			if (openDocumentListener) { openDocumentListener.dispose(); }

			const filePattern = getTestFilePattern();

			// Watch for test files being opened
			openDocumentListener = vscode.workspace.onDidOpenTextDocument((document) => {
				if (micromatch.isMatch(document.fileName, filePattern)) {
					console.log(`[test-options] Test file opened: ${document.fileName}`);
					discoverTestsInFile(document.uri);
				}
			});

			// Also watch for file system changes to discover new/changed test files
			fileWatcher = vscode.workspace.createFileSystemWatcher(filePattern);
			fileWatcher.onDidCreate((uri) => {
				console.log(`[test-options] New test file created: ${uri.fsPath}`);
				discoverTestsInFile(uri);
			});
			fileWatcher.onDidChange((uri) => {
				console.log(`[test-options] Test file changed: ${uri.fsPath}`);
				controller.items.delete(uri.toString());
				discoverTestsInFile(uri);
			});
			fileWatcher.onDidDelete((uri) => {
				console.log(`[test-options] Test file deleted: ${uri.fsPath}`);
				controller.items.delete(uri.toString());
			});

			context.subscriptions.push(fileWatcher, openDocumentListener);
		};

		// Initial setup
		setupWatchers();

		// Scan already open documents for test files
		vscode.workspace.textDocuments.forEach((document) => {
			if (micromatch.isMatch(document.fileName, getTestFilePattern())) {
				console.log(`[test-options] Found already open test file: ${document.fileName}`);
				discoverTestsInFile(document.uri);
			}
		});

	} else {
		console.log('[test-options] vscode.tests API not available.');
	}

	// --- Custom CodeLensProvider for test functions ---
	class TestCodeLensProvider implements vscode.CodeLensProvider {
		provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
			const filePattern = getTestFilePattern();
			if (!micromatch.isMatch(document.fileName, filePattern)) {
				return [];
			}

			const runProfileName = vscode.workspace.getConfiguration('test-options').get<string>('runProfileName', 'record test');
			const lenses: vscode.CodeLens[] = [];
			const regexString = getTestFunctionRegex();
			const regex = new RegExp(regexString, 'gm');
			const text = document.getText();
			let match;
			while ((match = regex.exec(text))) {
				const line = document.positionAt(match.index).line;
				const range = new vscode.Range(line, 0, line, 0);
				lenses.push(new vscode.CodeLens(range, {
					title: runProfileName,
					command: 'test-options.recordTestTerminal',
					arguments: [document.uri.fsPath, match[1]]
				}));
			}
			return lenses;
		}
	}
	context.subscriptions.push(
		vscode.languages.registerCodeLensProvider({ scheme: 'file' }, new TestCodeLensProvider())
	);

	// --- Register the command for the CodeLens ---
	context.subscriptions.push(
		vscode.commands.registerCommand('test-options.recordTestTerminal', (filePath: string, testName: string) => {
			const executable = getCommandExecutable();
			const argsTemplate = getCommandArgsTemplate();
			const runProfileName = vscode.workspace.getConfiguration('test-options').get<string>('runProfileName', 'record test');
			const runProfileArgs = vscode.workspace.getConfiguration('test-options').get<string[]>('runProfileArgs', ['-record']);
			const testProjectPath = path.dirname(filePath);

			const processedArgs = argsTemplate.map((arg: string) =>
				arg.replace(/{{testName}}/g, testName)
					.replace(/{{testFile}}/g, filePath)
					.replace(/{{testProjectPath}}/g, testProjectPath)
			);
			const finalArgs = [...processedArgs, ...runProfileArgs];

			const terminal = vscode.window.createTerminal(runProfileName);
			terminal.show();
			terminal.sendText(`cd "${testProjectPath}"`);
			terminal.sendText(`${executable} ${finalArgs.join(' ')}`);
		})
	);
}

// This method is called when your extension is deactivated
export function deactivate() { }
