import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Martian Error Linker is now active!');
    vscode.window.showInformationMessage('🚀 Martian 轨道指挥中心已连接！');

    context.subscriptions.push(vscode.commands.registerCommand('martian.openCreatePage', (code: string) => {
        vscode.env.openExternal(vscode.Uri.parse(`http://localhost:3001/pages/problem/edit?code=${code}`));
    }));

    const completionProvider = vscode.languages.registerCompletionItemProvider(
        ['javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'java'],
        {
            async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                const linePrefix = document.lineAt(position).text.substr(0, position.character);
                const simpleRegex = /@martian\s+([a-zA-Z0-9_-]*)/i;
                const match = linePrefix.match(simpleRegex);
                if (match) {
                    const typedCode = match[1].toUpperCase();
                    console.log(`[Martian] MATCH SUCCESS! -> "${typedCode}"`);
                    try {
                        const res = await fetch(`http://localhost:3001/api/problem/list?keyword=${typedCode}`);
                        const json: any = await res.json();
                        const items: vscode.CompletionItem[] = [];

                        if (json.success && json.data) {
                            json.data.forEach((p: any) => {
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
                    } catch (err) {
                        return undefined;
                    }
                }

                // 情况 B: 正在输入中 (刚打完 @ 或者刚打完空格)
                return new vscode.CompletionList([], true);
            }
        },
        '@', ' ', '_'
    );
    context.subscriptions.push(completionProvider);

    const linkProvider = vscode.languages.registerDocumentLinkProvider(
        ['javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'java'],
        {
            provideDocumentLinks(document: vscode.TextDocument) {
                const links: vscode.DocumentLink[] = [];
                const text = document.getText();
                const regex = /@martian\s+([a-zA-Z0-9_-]+)/g;
                let match;

                while ((match = regex.exec(text)) !== null) {
                    const code = match[1];
                    const startPos = document.positionAt(match.index + match[0].indexOf(code));
                    const endPos = document.positionAt(match.index + match[0].length);
                    const range = new vscode.Range(startPos, endPos);
                    const uri = vscode.Uri.parse(`http://localhost:3001/pages/problem/edit?code=${code}`);
                    const link = new vscode.DocumentLink(range, uri);
                    link.tooltip = "前往休斯顿查看这个问题";
                    links.push(link);
                }
                return links;
            }
        }
    );
    context.subscriptions.push(linkProvider);
}

export function deactivate() { }
