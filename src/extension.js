"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
var vscode = require("vscode");
var node_fetch_1 = require("node-fetch");
function activate(context) {
    var _this = this;
    console.log('Congratulations, your extension "br-ext" is now active!');
    var disposable = vscode.commands.registerCommand("br-ext.helloWorld", function () {
        var panel = vscode.window.createWebviewPanel("deepChat", "Deep Seek Chat", vscode.ViewColumn.One, {
            enableScripts: true,
        });
        panel.webview.html = getWebviewContent();
        panel.webview.onDidReceiveMessage(function (message) { return __awaiter(_this, void 0, void 0, function () {
            var userPrompt, responseText, response, _a, _b, _c, chunk, lines, _i, lines_1, line, data, e_1_1, err_1;
            var _d, e_1, _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        if (!(message.command === "chat")) return [3 /*break*/, 16];
                        userPrompt = message.text;
                        responseText = "";
                        _g.label = 1;
                    case 1:
                        _g.trys.push([1, 15, , 16]);
                        return [4 /*yield*/, (0, node_fetch_1.default)("http://localhost:2345/api/chat", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    model: "deepseek",
                                    messages: [{ role: "user", content: userPrompt }],
                                    stream: true,
                                }),
                            })];
                    case 2:
                        response = _g.sent();
                        if (!response.body) {
                            throw new Error("No response body");
                        }
                        _g.label = 3;
                    case 3:
                        _g.trys.push([3, 8, 9, 14]);
                        _a = true, _b = __asyncValues(response.body);
                        _g.label = 4;
                    case 4: return [4 /*yield*/, _b.next()];
                    case 5:
                        if (!(_c = _g.sent(), _d = _c.done, !_d)) return [3 /*break*/, 7];
                        _f = _c.value;
                        _a = false;
                        chunk = _f;
                        lines = chunk.toString().split("\n");
                        for (_i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
                            line = lines_1[_i];
                            if (line.startsWith("data: ")) {
                                try {
                                    data = JSON.parse(line.slice(6));
                                    if (data.message) {
                                        responseText += data.message.content;
                                        panel.webview.postMessage({ command: "chatResponse", text: responseText });
                                    }
                                }
                                catch (parseError) {
                                    console.error("Error parsing JSON:", parseError);
                                }
                            }
                        }
                        _g.label = 6;
                    case 6:
                        _a = true;
                        return [3 /*break*/, 4];
                    case 7: return [3 /*break*/, 14];
                    case 8:
                        e_1_1 = _g.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 14];
                    case 9:
                        _g.trys.push([9, , 12, 13]);
                        if (!(!_a && !_d && (_e = _b.return))) return [3 /*break*/, 11];
                        return [4 /*yield*/, _e.call(_b)];
                    case 10:
                        _g.sent();
                        _g.label = 11;
                    case 11: return [3 /*break*/, 13];
                    case 12:
                        if (e_1) throw e_1.error;
                        return [7 /*endfinally*/];
                    case 13: return [7 /*endfinally*/];
                    case 14: return [3 /*break*/, 16];
                    case 15:
                        err_1 = _g.sent();
                        console.error("Error:", err_1);
                        panel.webview.postMessage({ command: "chatError", text: "An error occurred while processing your request." });
                        return [3 /*break*/, 16];
                    case 16: return [2 /*return*/];
                }
            });
        }); });
    });
    context.subscriptions.push(disposable);
}
function getWebviewContent() {
    return "\n<!doctype html>\n<html lang=\"en\">\n\n<head>\n    <meta charset=\"utf-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n    <title>Bootstrap demo</title>\n    <link href=\"https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css\" rel=\"stylesheet\"\n        integrity=\"sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH\" crossorigin=\"anonymous\">\n</head>\n\n<body>\n    <h1>Let's get deep</h1>\n    <div class=\"form-floating\">\n        <textarea class=\"form-control\" placeholder=\"Ask something ...\" id=\"prompt\" rows=\"3\"\n            style=\"height: 100px\"></textarea>\n        <label for=\"prompt\">Chat with Deepseek</label>\n    </div>\n    <button type=\"submit\" id=\"askBtn\" class=\"btn btn-primary mb-3\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\"\n            height=\"16\" fill=\"currentColor\" class=\"bi bi-send\" viewBox=\"0 0 16 16\">\n            <path\n                d=\"M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576zm6.787-8.201L1.591 6.602l4.339 2.76z\" />\n        </svg></button>\n\n    <div id=\"response\"></div>\n\n    <script src=\"https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js\"\n        integrity=\"sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz\"\n        crossorigin=\"anonymous\"></script>\n    <script>\n        const vscode = acquireVsCodeApi();\n\n        document.getElementById('askBtn').addEventListener('click', () => {\n            const text = document.getElementById('prompt').value;\n            vscode.postMessage({ command: 'chat', text });\n        });\n\n        window.addEventListener('message', event => {\n            const message = event.data;\n            switch (message.command) {\n                case 'chatResponse':\n                    document.getElementById('response').innerText = message.text;\n                    break;\n                case 'chatError':\n                    document.getElementById('response').innerText = 'Error: ' + message.text;\n                    break;\n            }\n        });\n    </script>\n</body>\n\n</html>\n  ";
}
function deactivate() { }
