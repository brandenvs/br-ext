"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
// cspell:ignore OLLAMA ollama Ollama deepseek DEEPSEEK
const vscode = __importStar(require("vscode"));
const child_process = __importStar(require("child_process"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
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
function activate(context) {
    console.log('Congratulations, your extension "vscode-ollama" is now active!');
    let disposable = vscode.commands.registerCommand('vscode-ollama.run', async () => {
        const model = vscode.workspace.getConfiguration('ollama').get('defaultModel');
        if (!model) {
            vscode.window.showErrorMessage('No default model set. Please set ollama.defaultModel in your settings.');
            return;
        }
        const ollamaPath = vscode.workspace.getConfiguration('ollama').get('path') || 'ollama';
        try {
            child_process.execSync(`${ollamaPath} list`, { stdio: 'ignore' });
        }
        catch (error) {
            vscode.window.showErrorMessage(`Ollama is not installed or not in your PATH. Please install Ollama and ensure it is in your PATH. Error: ${error.message}`);
            return;
        }
        try {
            child_process.execSync(`${ollamaPath} inspect ${model}`, { stdio: 'ignore' });
        }
        catch (error) {
            const pull = await vscode.window.showInformationMessage(`Model ${model} not found. Do you want to pull it?`, 'Yes', 'No');
            if (pull === 'Yes') {
                try {
                    const progressOptions = {
                        location: vscode.ProgressLocation.Notification,
                        title: `Pulling ${model}`,
                        cancellable: true
                    };
                    await vscode.window.withProgress(progressOptions, async (progress, token) => {
                        return new Promise((resolve, reject) => {
                            const ollamaPull = child_process.spawn(ollamaPath, ['pull', model]);
                            ollamaPull.stdout.on('data', (data) => {
                                const output = data.toString();
                                const lines = output.split('\n');
                                lines.forEach(line => {
                                    if (line.includes('%')) {
                                        const percentage = parseInt(line.split('%')[0].trim());
                                        progress.report({ increment: percentage });
                                    }
                                });
                            });
                            ollamaPull.stderr.on('data', (data) => {
                                console.error(`stderr: ${data}`);
                            });
                            ollamaPull.on('close', (code) => {
                                if (code === 0) {
                                    vscode.window.showInformationMessage(`Model ${model} pulled successfully.`);
                                    resolve();
                                }
                                else {
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
                }
                catch (error) {
                    vscode.window.showErrorMessage(`Failed to pull ${model}`);
                    return;
                }
            }
            else {
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
        ollamaProcess.stdout.on('data', (data) => {
            outputChannel.append(data.toString());
        });
        ollamaProcess.stderr.on('data', (data) => {
            outputChannel.append(data.toString());
        });
        ollamaProcess.on('close', (code) => {
            if (code === 0) {
                outputChannel.appendLine('--------------------------------------------------');
                outputChannel.appendLine(`Ollama completed successfully.`);
            }
            else {
                outputChannel.appendLine('--------------------------------------------------');
                outputChannel.appendLine(`Ollama failed with code ${code}.`);
            }
            fs.unlinkSync(tempFilePath);
        });
    });
    context.subscriptions.push(disposable);
}
async function handleChat(panel, userPrompt) {
    try {
        const response = await fetch(`${OLLAMA_API_URL}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "deepseek-coder:1.5b",
                prompt: userPrompt,
            }),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        const responseText = data.response || "No response received.";
        panel.webview.postMessage({ command: "chatResponse", text: responseText });
    }
    catch (err) {
        console.error("Error:", err);
        panel.webview.postMessage({ command: "chatError", text: "An error occurred while processing your request." });
    }
}
async function checkAndUpdateModels(panel) {
    try {
        const response = await fetch(`${OLLAMA_API_URL}/api/tags`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        console.log("API response:", data); // Add this line for debugging
        const installedModels = data.models.map((model) => model.name);
        const modelStatus = [...DEEPSEEK_MODELS, ...LLAMA_MODELS].map(model => ({
            name: model,
            installed: installedModels.includes(model)
        }));
        panel.webview.postMessage({ command: "updateModelStatus", models: modelStatus });
    }
    catch (err) {
        console.error("Error checking models:", err);
        panel.webview.postMessage({ command: "modelCheckError", text: "Failed to check model status." });
    }
}
function deactivate() { }
async function pullModel(panel, model) {
    try {
        const response = await fetch(`${OLLAMA_API_URL}/api/pull`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: model }),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        panel.webview.postMessage({ command: "modelPullSuccess", model });
    }
    catch (err) {
        console.error("Error pulling model:", err);
        panel.webview.postMessage({ command: "modelPullError", model, text: "Failed to pull model." });
    }
}
//# sourceMappingURL=extension.js.map