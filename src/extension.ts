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

	// Register helloWorld command (existing)
	const disposable = vscode.commands.registerCommand('test-options.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from test-options 2!');
	});
	context.subscriptions.push(disposable);

	// Register a new test run profile: "record Test"
	if (vscode.tests) {
		console.log('[test-options] Registering test controller...');
		const controller = vscode.tests.createTestController('test-options-controller', 'Test Options Controller');
		context.subscriptions.push(controller);
		console.log('[test-options] Test controller registered:', controller.id);

		// Add a run profile for "record Test"
		const recordProfile = controller.createRunProfile(
			'record Test',
			vscode.TestRunProfileKind.Run,
			async (request, token) => {
				console.log('[test-options] record Test run profile triggered.');
				const goProjectPath = path.join(context.extensionPath, '..', '..', 'go-project');
				const outputChannel = vscode.window.createOutputChannel('record Test');
				outputChannel.show(true);
				outputChannel.appendLine('[test-options] Running: go test -v -record');
				outputChannel.appendLine(`[test-options] Working directory: ${goProjectPath}`);
				try {
					const proc = cp.spawn('go', ['test', '-v', '-record'], { cwd: goProjectPath });
					outputChannel.appendLine('[test-options] Spawned go test process.');
					proc.stdout.on('data', (data) => outputChannel.append(data.toString()));
					proc.stderr.on('data', (data) => outputChannel.append(data.toString()));
					proc.on('close', (code) => {
						outputChannel.appendLine(`\n[test-options] Process exited with code ${code}`);
					});
					proc.on('error', (err) => {
						outputChannel.appendLine('[test-options] Failed to start process: ' + err);
					});
				} catch (err) {
					outputChannel.appendLine('[test-options] Error running go test: ' + err);
				}
			},
			false // not default
		);
		context.subscriptions.push(recordProfile);
		console.log('[test-options] record Test run profile registered.');
	} else {
		console.log('[test-options] vscode.tests API not available.');
	}

	// --- Custom CodeLensProvider for Go test functions ---
	class GoTestCodeLensProvider implements vscode.CodeLensProvider {
		provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
			const lenses: vscode.CodeLens[] = [];
			const regex = /^func (Test\w+)\s*\(/gm;
			const text = document.getText();
			let match;
			while ((match = regex.exec(text))) {
				const line = document.positionAt(match.index).line;
				const range = new vscode.Range(line, 0, line, 0);
				lenses.push(new vscode.CodeLens(range, {
					title: 'record Test',
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
			const goProjectPath = path.dirname(filePath);
			const terminal = vscode.window.createTerminal('record Test');
			terminal.show();
			terminal.sendText(`cd "${goProjectPath}"`);
			terminal.sendText(`go test -v -run ^${testName}$ -record`);
		})
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
