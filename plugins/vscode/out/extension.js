"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
function activate(context) {
    console.log('Martian Error Linker is now active!');
    vscode.window.showInformationMessage('🚀 Martian 轨道指挥中心已连接！');
    // 获取配置的服务器地址
    const getServerUrl = () => {
        const config = vscode.workspace.getConfiguration('martian');
        return config.get('serverUrl', 'http://localhost:3001').replace(/\/$/, '');
    };
    context.subscriptions.push(vscode.commands.registerCommand('martian.openCreatePage', (code) => {
        const baseUrl = getServerUrl();
        vscode.env.openExternal(vscode.Uri.parse(`${baseUrl}/pages/problem/edit?code=${code}`));
    }));
    context.subscriptions.push(vscode.commands.registerCommand('martian.openSettings', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', '@ext:martian.martian-error-linker');
    }));
    const completionProvider = vscode.languages.registerCompletionItemProvider(['javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'java'], {
        async provideCompletionItems(document, position) {
            const linePrefix = document.lineAt(position).text.substr(0, position.character);
            const simpleRegex = /@martian\s+([a-zA-Z0-9_-]*)/i;
            const match = linePrefix.match(simpleRegex);
            const triggerRegex = /@/i;
            if (!match && !triggerRegex.test(linePrefix)) {
                return undefined;
            }
            if (match && match[1].length > 0) {
                const typedCode = match[1].toUpperCase();
                const baseUrl = getServerUrl();
                console.log(`[Martian] MATCH SUCCESS! -> "${typedCode}"`);
                try {
                    const res = await fetch(`${baseUrl}/api/problem/list?keyword=${typedCode}`);
                    const json = await res.json();
                    const items = [];
                    if (json.success && json.data) {
                        json.data.forEach((p) => {
                            const item = new vscode.CompletionItem(p.code, vscode.CompletionItemKind.Value);
                            item.detail = ` [${p.status}]`;
                            const docs = new vscode.MarkdownString();
                            docs.appendMarkdown(`**👨‍🚀 提示**: ${p.cause || '无原因'}\n\n`);
                            docs.appendMarkdown(`**💻 警报**: ${p.toEngineer || '无详情'}\n\n`);
                            item.documentation = docs;
                            item.sortText = '0' + p.code;
                            items.push(item);
                        });
                    }
                    const createItem = new vscode.CompletionItem(`🆕 创建新异常码: ${typedCode}`, vscode.CompletionItemKind.Issue);
                    createItem.insertText = typedCode;
                    createItem.sortText = 'z';
                    createItem.command = { title: 'Open Martian Page', command: 'martian.openCreatePage', arguments: [typedCode] };
                    items.push(createItem);
                    return new vscode.CompletionList(items, true);
                }
                catch (err) {
                    return undefined;
                }
            }
            return new vscode.CompletionList([], true);
        }
    }, '@', ' ', '_');
    context.subscriptions.push(completionProvider);
    const linkProvider = vscode.languages.registerDocumentLinkProvider(['javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'java'], {
        provideDocumentLinks(document) {
            const links = [];
            const text = document.getText();
            const regex = /@martian\s+([a-zA-Z0-9_-]+)/g;
            let match;
            const baseUrl = getServerUrl();
            while ((match = regex.exec(text)) !== null) {
                const code = match[1];
                const startPos = document.positionAt(match.index + match[0].indexOf(code));
                const endPos = document.positionAt(match.index + match[0].length);
                const range = new vscode.Range(startPos, endPos);
                const uri = vscode.Uri.parse(`${baseUrl}/pages/problem/edit?code=${code}`);
                const link = new vscode.DocumentLink(range, uri);
                link.tooltip = "前往休斯顿查看这个问题";
                links.push(link);
            }
            return links;
        }
    });
    context.subscriptions.push(linkProvider);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map