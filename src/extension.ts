import * as vscode from "vscode";
import fetch from "node-fetch-native"; // Ensures fetch works correctly

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "br-ext" is now active!');

	const disposable = vscode.commands.registerCommand("br-ext.helloWorld", () => {
		const panel = vscode.window.createWebviewPanel("deepChat", "Deep Seek Chat", vscode.ViewColumn.One, {
			enableScripts: true,
		});
		panel.webview.html = getWebviewContent();

		panel.webview.onDidReceiveMessage(async (message: any) => {
			if (message.command === "chat") {
				const userPrompt = message.text;
				let responseText = "";

				try {
					const response = await fetch("http://localhost:2345/api/chat", { // Ensure correct port
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							model: "deepseek-r1:14b",
							messages: [{ role: "user", content: userPrompt }],
							stream: false, // Set to false for easier handling
						}),
					});

					if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

					const data = await response.json();
					if (data && data.message) {
						responseText = data.message.content; // Adjust based on actual response format
					} else if (data.content) {
						responseText = data.content; // Some models return 'content' directly
					}

					panel.webview.postMessage({ command: "chatResponse", text: responseText });
				} catch (err) {
					console.error("Error:", err);
					panel.webview.postMessage({ command: "chatError", text: "An error occurred while processing your request." });
				}
			}
		});
	});

	context.subscriptions.push(disposable);
}

function getWebviewContent(): string {
	return `
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>DeepSeek Chat</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        :root {
            --dark-bg: #1e1e1e;
            --darker-bg: #252526;
            --border-color: #3c3c3c;
            --text-color: #cccccc;
            --highlight-color: #0e639c;
            --input-bg: #3c3c3c;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: var(--text-color);
            background-color: var(--dark-bg);
            padding: 20px;
        }

        .chat-container {
            max-width: 800px;
            margin: 0 auto;
            background-color: var(--darker-bg);
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
            padding: 20px;
        }

        h1 {
            color: var(--highlight-color);
            margin-bottom: 20px;
            text-align: center;
        }

        .form-floating {
            margin-bottom: 20px;
        }

        .form-control {
            background-color: var(--input-bg);
            color: var(--text-color);
            border-color: var(--border-color);
        }

        .form-control:focus {
            background-color: var(--input-bg);
            color: var(--text-color);
            box-shadow: 0 0 0 0.2rem rgba(14, 99, 156, 0.25);
        }

        .form-floating label {
            color: #888;
        }

        #askBtn {
            background-color: var(--highlight-color);
            color: #ffffff;
            border: none;
            transition: background-color 0.3s;
        }

        #askBtn:hover {
            background-color: #1177bb;
        }

        #response {
            background-color: var(--input-bg);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 15px;
            margin-top: 20px;
            white-space: pre-wrap;
            max-height: 300px;
            overflow-y: auto;
        }
    </style>
</head>

<body>
    <div class="chat-container">
        <h1>DeepSeek Chat</h1>
        <div class="form-floating mb-3">
            <textarea class="form-control" placeholder="Ask something..." id="prompt" style="height: 100px"></textarea>
            <label for="prompt">Chat with DeepSeek</label>
        </div>
        <div class="d-flex justify-content-end">
            <button type="submit" id="askBtn" class="btn btn-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                    class="bi bi-send me-2" viewBox="0 0 16 16">
                    <path
                        d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576zm6.787-8.201L1.591 6.602l4.339 2.76z" />
                </svg>
                Send
            </button>
        </div>
        <div id="response"></div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        const vscode = acquireVsCodeApi();

        document.getElementById('askBtn').addEventListener('click', () => {
            const text = document.getElementById('prompt').value;
            vscode.postMessage({ command: 'chat', text });
        });

        window.addEventListener('message', event => {
            const { command, text } = event.data;
            if (command === 'chatResponse') {
                document.getElementById('response').innerText = text;
            }
        });
    </script>
</body>

</html>
  `;
}

export function deactivate() { }
