// cspell:ignore OLLAMA ollama Ollama deepseek DEEPSEEK
import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const OLLAMA_API_URL = "http://localhost:11434";

const DEEPSEEK_MODELS = [
    "deepseek-coder:1.5b",
    "deepseek-coder:6.7b",
    "deepseek-coder:33b",
];

const LLAMA_MODELS = [
    "llama2",
    "llama2:13b",
    "llama2:70b",
];

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "vscode-ollama" is now active!');

    let disposable = vscode.commands.registerCommand('vscode-ollama.run', async () => {
        const model = vscode.workspace.getConfiguration('ollama').get('defaultModel') as string;
        if (!model) {
            vscode.window.showErrorMessage('No default model set. Please set ollama.defaultModel in your settings.');
            return;
        }

        const ollamaPath = vscode.workspace.getConfiguration('ollama').get('path') as string || 'ollama';

        try {
            child_process.execSync(`${ollamaPath} list`, { stdio: 'ignore' });
        } catch (error: any) {
            vscode.window.showErrorMessage(`Ollama is not installed or not in your PATH. Please install Ollama and ensure it is in your PATH. Error: ${error.message}`);
            return;
        }

        try {
            child_process.execSync(`${ollamaPath} inspect ${model}`, { stdio: 'ignore' });
        } catch (error: any) {
            const pull = await vscode.window.showInformationMessage(`Model ${model} not found. Do you want to pull it?`, 'Yes', 'No');
            if (pull === 'Yes') {
                try {
                    const progressOptions: vscode.ProgressOptions = {
                        location: vscode.ProgressLocation.Notification,
                        title: `Pulling ${model}`,
                        cancellable: true
                    };

                    await vscode.window.withProgress(progressOptions, async (progress, token) => {
                        return new Promise<void>((resolve, reject) => {
                            const ollamaPull = child_process.spawn(ollamaPath, ['pull', model]);

                            ollamaPull.stdout.on('data', (data: Buffer) => {
                                const output = data.toString();
                                const lines = output.split('\n');

                                lines.forEach(line => {
                                    if (line.includes('%')) {
                                        const percentage = parseInt(line.split('%')[0].trim());
                                        progress.report({ increment: percentage });
                                    }
                                });
                            });

                            ollamaPull.stderr.on('data', (data: Buffer) => {
                                console.error(`stderr: ${data}`);
                            });

                            ollamaPull.on('close', (code: number) => {
                                if (code === 0) {
                                    vscode.window.showInformationMessage(`Model ${model} pulled successfully.`);
                                    resolve();
                                } else {
                                    vscode.window.showErrorMessage(`Failed to pull ${model} with code ${code}`);
                                    reject();
                                }
                            });

                            token.onCancellationRequested(() => {
                                ollamaPull.kill();
                                vscode.window.showErrorMessage(`Pulling ${model} cancelled.`);
                                reject();
                            });
                        });
                    });

                } catch (error: any) {
                    vscode.window.showErrorMessage(`Failed to pull ${model}`);
                    return;
                }
            } else {
                return;
            }
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No text editor is active.');
            return;
        }

        const selection = editor.selection;
        const text = editor.document.getText(selection);

        if (!text) {
            vscode.window.showInformationMessage('No text selected.');
            return;
        }

        const tempDir = path.join(context.extensionPath, 'tmp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }

        const tempFilePath = path.join(tempDir, 'input.txt');
        fs.writeFileSync(tempFilePath, text);

        const ollamaArgs = [
            'run',
            model,
            '-f',
            tempFilePath
        ];

        const ollamaProcess = child_process.spawn(ollamaPath, ollamaArgs);

        const outputChannel = vscode.window.createOutputChannel('Ollama');
        outputChannel.show();

        outputChannel.appendLine(`Running ollama ${model} on selected text:`);
        outputChannel.appendLine(text);
        outputChannel.appendLine('--------------------------------------------------');

        ollamaProcess.stdout.on('data', (data: Buffer) => {
            outputChannel.append(data.toString());
        });

        ollamaProcess.stderr.on('data', (data: Buffer) => {
            outputChannel.append(data.toString());
        });

        ollamaProcess.on('close', (code: number) => {
            if (code === 0) {
                outputChannel.appendLine('--------------------------------------------------');
                outputChannel.appendLine(`Ollama completed successfully.`);
            } else {
                outputChannel.appendLine('--------------------------------------------------');
                outputChannel.appendLine(`Ollama failed with code ${code}.`);
            }

            fs.unlinkSync(tempFilePath);
        });
    });

    context.subscriptions.push(disposable);
}

async function handleChat(panel: vscode.WebviewPanel, userPrompt: string) {
    try {
        const response = await fetch(`${OLLAMA_API_URL}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "deepseek-coder:1.5b",
                prompt: userPrompt,
            }),
        });

        if (!response.ok) { throw new Error(`HTTP error! Status: ${response.status}`); }

        const data = await response.json();
        const responseText = data.response || "No response received.";

        panel.webview.postMessage({ command: "chatResponse", text: responseText });
    } catch (err) {
        console.error("Error:", err);
        panel.webview.postMessage({ command: "chatError", text: "An error occurred while processing your request." });
    }
}

async function checkAndUpdateModels(panel: vscode.WebviewPanel) {
    try {
        const response = await fetch(`${OLLAMA_API_URL}/api/tags`);
        if (!response.ok) { throw new Error(`HTTP error! Status: ${response.status}`); }

        const data = await response.json();
        console.log("API response:", data); // Add this line for debugging

        const installedModels = data.models.map((model: any) => model.name);

        const modelStatus = [...DEEPSEEK_MODELS, ...LLAMA_MODELS].map(model => ({
            name: model,
            installed: installedModels.includes(model)
        }));

        panel.webview.postMessage({ command: "updateModelStatus", models: modelStatus });
    } catch (err) {
        console.error("Error checking models:", err);
        panel.webview.postMessage({ command: "modelCheckError", text: "Failed to check model status." });
    }
}

export function deactivate() { }
async function pullModel(panel: vscode.WebviewPanel, model: string) {
    try {
        const response = await fetch(`${OLLAMA_API_URL}/api/pull`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: model }),
        });

        if (!response.ok) { throw new Error(`HTTP error! Status: ${response.status}`); }

        panel.webview.postMessage({ command: "modelPullSuccess", model });
    } catch (err) {
        console.error("Error pulling model:", err);
        panel.webview.postMessage({ command: "modelPullError", model, text: "Failed to pull model." });
    }
}