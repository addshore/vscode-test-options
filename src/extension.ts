// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
import * as cp from 'child_process';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "test-options" is now active!');

	// Debug output: Extension activated
	console.log('[test-options] Extension activated. Checking for vscode.tests:', !!vscode.tests);

	// Register test controller and auto-discover Go tests
	if (vscode.tests) {
		console.log('[test-options] Registering test controller...');
		const controller = vscode.tests.createTestController('test-options-controller', 'Test Options Controller');
		context.subscriptions.push(controller);
		console.log('[test-options] Test controller registered:', controller.id);

		const getRunProfileName = () => vscode.workspace.getConfiguration('test-options').get<string>('runProfileName', 'record test');
		const getRunProfileArgs = () => vscode.workspace.getConfiguration('test-options').get<string[]>('runProfileArgs', ['-record']);

		// Add a run profile for "record test"
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
						const goProjectPath = path.dirname(testUri.fsPath);
						const runArgs = getRunProfileArgs();
						const outputChannel = vscode.window.createOutputChannel(getRunProfileName());
						outputChannel.show(true);
						outputChannel.appendLine(`[test-options] Running: go test -v -run ^${testName}$ ${runArgs.join(' ')}`);
						outputChannel.appendLine(`[test-options] Working directory: ${goProjectPath}`);

						try {
							const proc = cp.spawn('go', ['test', '-v', '-run', `^${testName}$`, ...runArgs], { cwd: goProjectPath });
							outputChannel.appendLine('[test-options] Spawned go test process.');

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
							outputChannel.appendLine('[test-options] Error running go test: ' + errorMessage);
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

		// Function to discover and register tests from a Go test file
		const discoverTestsInFile = async (uri: vscode.Uri) => {
			try {
				const document = await vscode.workspace.openTextDocument(uri);
				const text = document.getText();
				const regex = /^func (Test\w+)\s*\(/gm;
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

		// Watch for Go test files being opened
		const onDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument((document) => {
			if (document.fileName.endsWith('_test.go')) {
				console.log(`[test-options] Go test file opened: ${document.fileName}`);
				discoverTestsInFile(document.uri);
			}
		});
		context.subscriptions.push(onDidOpenTextDocument);

		// Scan already open documents for Go test files
		vscode.workspace.textDocuments.forEach((document) => {
			if (document.fileName.endsWith('_test.go')) {
				console.log(`[test-options] Found already open Go test file: ${document.fileName}`);
				discoverTestsInFile(document.uri);
			}
		});

		// Also watch for file system changes to discover new test files
		const watcher = vscode.workspace.createFileSystemWatcher('**/*_test.go');
		watcher.onDidCreate((uri) => {
			console.log(`[test-options] New Go test file created: ${uri.fsPath}`);
			discoverTestsInFile(uri);
		});
		watcher.onDidChange((uri) => {
			console.log(`[test-options] Go test file changed: ${uri.fsPath}`);
			// Remove existing items for this file and re-discover
			controller.items.delete(uri.toString());
			discoverTestsInFile(uri);
		});
		watcher.onDidDelete((uri) => {
			console.log(`[test-options] Go test file deleted: ${uri.fsPath}`);
			controller.items.delete(uri.toString());
		});
		context.subscriptions.push(watcher);

	} else {
		console.log('[test-options] vscode.tests API not available.');
	}

	// --- Custom CodeLensProvider for Go test functions ---
	class GoTestCodeLensProvider implements vscode.CodeLensProvider {
		provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
			const runProfileName = vscode.workspace.getConfiguration('test-options').get<string>('runProfileName', 'record test');
			const lenses: vscode.CodeLens[] = [];
			const regex = /^func (Test\w+)\s*\(/gm;
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
		vscode.languages.registerCodeLensProvider({ language: 'go', scheme: 'file' }, new GoTestCodeLensProvider())
	);

	// --- Register the command for the CodeLens ---
	context.subscriptions.push(
		vscode.commands.registerCommand('test-options.recordTestTerminal', (filePath: string, testName: string) => {
			const runProfileName = vscode.workspace.getConfiguration('test-options').get<string>('runProfileName', 'record test');
			const runProfileArgs = vscode.workspace.getConfiguration('test-options').get<string[]>('runProfileArgs', ['-record']);
			const goProjectPath = path.dirname(filePath);
			const terminal = vscode.window.createTerminal(runProfileName);
			terminal.show();
			terminal.sendText(`cd "${goProjectPath}"`);
			terminal.sendText(`go test -v -run ^${testName}$ ${runProfileArgs.join(' ')}`);
		})
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
