import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Martian Error Linker is now active!');
    vscode.window.showInformationMessage('🚀 Martian Error Linker 已启动！');

    // 注册一个专门用来打开浏览器的内置命令
    context.subscriptions.push(vscode.commands.registerCommand('martian.openCreatePage', (code: string) => {
        vscode.env.openExternal(vscode.Uri.parse(`http://localhost:3001/pages/problem/edit?code=${code}`));
    }));

    // ==========================================
    // 1. 动态智能补全 (真正的用户触发 + 即时反馈)
    // ==========================================
    const completionProvider = vscode.languages.registerCompletionItemProvider(
        ['javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'java'],
        {
            async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                const linePrefix = document.lineAt(position).text.substr(0, position.character);

                // 匹配 @martian + 空格 + 正在输入的 code
                const regex = /@martian\s+([A-Z_0-9]*)$/;
                const match = linePrefix.match(regex);

                if (!match) {
                    return undefined;
                }

                const typedCode = match[1];
                console.log(`[Martian] Searching for: "${typedCode}"`);

                try {
                    const res = await fetch(`http://localhost:3001/api/problem/list?keyword=${typedCode}`);
                    const json: any = await res.json();

                    const items: vscode.CompletionItem[] = [];
                    let exactMatchFound = false;

                    if (json.success && json.data) {
                        json.data.forEach((p: any) => {
                            if (p.code === typedCode) {
                                exactMatchFound = true;
                            }

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

                    // 改进：即使没输入字符，也给一个提示引导
                    if (typedCode.length === 0) {
                        const tipItem = new vscode.CompletionItem("💡 输入错误码前缀进行搜索...", vscode.CompletionItemKind.Text);
                        tipItem.sortText = '0';
                        items.push(tipItem);
                    } else if (!exactMatchFound) {
                        const createItem = new vscode.CompletionItem(`🆕 创建新异常码: ${typedCode}`, vscode.CompletionItemKind.Issue);
                        createItem.insertText = typedCode;
                        createItem.sortText = 'Z';
                        createItem.command = {
                            title: 'Open Martian Edit Page',
                            command: 'martian.openCreatePage',
                            arguments: [typedCode]
                        };
                        items.push(createItem);
                    }

                    return new vscode.CompletionList(items, true);

                } catch (err: any) {
                    console.error("[Martian] Fetch error:", err.message);
                    return undefined;
                }
            }
        },
        ' ', '_' // 触发字符
    );
    context.subscriptions.push(completionProvider);

    // ==========================================
    // 2. 蓝色的可点击超链接 (随时可用)
    // ==========================================
    const linkProvider = vscode.languages.registerDocumentLinkProvider(
        ['javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'java'],
        {
            provideDocumentLinks(document: vscode.TextDocument) {
                const links: vscode.DocumentLink[] = [];
                const text = document.getText();
                const regex = /@martian\s+([A-Z_0-9]+)/g;
                let match;

                while ((match = regex.exec(text)) !== null) {
                    const code = match[1];
                    const startPos = document.positionAt(match.index + match[0].indexOf(code));
                    const endPos = document.positionAt(match.index + match[0].length);
                    const range = new vscode.Range(startPos, endPos);

                    const uri = vscode.Uri.parse(`http://localhost:3001/pages/problem/edit?code=${code}`);
                    const link = new vscode.DocumentLink(range, uri);
                    link.tooltip = "🚀 点击前往 Martian 轨道指挥中心编辑此异常";
                    links.push(link);
                }
                return links;
            }
        }
    );
    context.subscriptions.push(linkProvider);
}

export function deactivate() { }
