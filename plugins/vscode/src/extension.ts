// v2.0-REWRITE
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('[Martian] 🚀 插件 2.0 版本启动中...');

    const getServerUrl = () => {
        const config = vscode.workspace.getConfiguration('martian');
        return config.get<string>('serverUrl', 'http://localhost:3001').replace(/\/$/, '');
    };

    // 注册命令
    context.subscriptions.push(vscode.commands.registerCommand('martian.openCreatePage', (code: string) => {
        const baseUrl = getServerUrl();
        vscode.env.openExternal(vscode.Uri.parse(`${baseUrl}/pages/problem/edit?code=${code}`));
    }));

    context.subscriptions.push(vscode.commands.registerCommand('martian.openSettings', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', '@ext:martian.martian-error-linker');
    }));

    const selector: vscode.DocumentSelector = [
        { language: 'javascript', scheme: 'file' },
        { language: 'typescript', scheme: 'file' },
        { language: 'javascriptreact', scheme: 'file' },
        { language: 'typescriptreact', scheme: 'file' },
        { language: 'java', scheme: 'file' },
        { language: 'typescript', scheme: 'untitled' } // 支持未保存的文件
    ];

    const completionProvider = vscode.languages.registerCompletionItemProvider(
        selector,
        {
            async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                const linePrefix = document.lineAt(position).text.substr(0, position.character);
                console.log(`[Martian] 检测到输入，前缀: "${linePrefix}"`);

                // 只在注释里生效：单行注释(//)或 JSDoc 块注释(/* 或 * 开头)
                const isInComment = /^\s*(\/\/|\/\*|\*)/.test(linePrefix);
                if (!isInComment) {
                    console.log(`[Martian] 非注释行，忽略: "${linePrefix}"`);
                    return undefined;
                }

                const match = linePrefix.match(/@martian\s+([a-zA-Z0-9_-]*)/i);
                if (!match && !/@/i.test(linePrefix)) {
                    console.log(`[Martian] 无关行，跳过: "${linePrefix}"`);
                    return undefined;
                }

                if (match) {
                    const typedCode = match[1];
                    const baseUrl = getServerUrl();
                    console.log(`[Martian] 正在后端查询: "${typedCode}"`);

                    // 计算"用户已输入部分"的范围，补全时整体替换它
                    const typedLength = typedCode.length;
                    const replaceRange = new vscode.Range(
                        position.line, position.character - typedLength,
                        position.line, position.character
                    );

                    try {
                        const url = `${baseUrl}/api/problem/list?keyword=${encodeURIComponent(typedCode)}`;
                        console.log(`[Martian] 请求URL: ${url}`);
                        const res = await fetch(url);
                        console.log(`[Martian] HTTP状态: ${res.status}`);
                        const json: any = await res.json();
                        console.log(`[Martian] API响应:`, JSON.stringify(json));
                        const items: vscode.CompletionItem[] = [];

                        if (json.success && json.data) {
                            console.log(`[Martian] 找到 ${json.data.length} 条结果`);
                            json.data.forEach((p: any) => {
                                const item = new vscode.CompletionItem(p.code, vscode.CompletionItemKind.Value);
                                item.detail = ` [${p.status}]`;
                                item.range = replaceRange; // 替换已输入的文字
                                // ⚠️ 关键：服务端已做过滤，告诉 VS Code 用已输入文字匹配，
                                // 避免客户端因 label 与输入不符而二次过滤掉结果
                                item.filterText = typedCode;
                                const docs = new vscode.MarkdownString();
                                docs.appendMarkdown(`**原因**: ${p.cause || '无'}\n\n`);
                                docs.appendMarkdown(`**方案**: ${p.toEngineer || '无'}\n\n`);
                                item.documentation = docs;
                                items.push(item);
                            });
                        }

                        const createItem = new vscode.CompletionItem(`🆕 创建: ${typedCode ? typedCode : '新的编码'}`, vscode.CompletionItemKind.Issue);
                        createItem.insertText = typedCode;
                        createItem.range = replaceRange; // 同样替换已输入的文字
                        createItem.command = { title: 'Open', command: 'martian.openCreatePage', arguments: [typedCode] };
                        items.push(createItem);

                        return new vscode.CompletionList(items, true);
                    } catch (err) {
                        console.error(`[Martian] API Error: ${err}`);
                        return undefined;
                    }
                }
                return new vscode.CompletionList([], true);
            }
        },
        '@' // 仅保留 @ 作为会话入口；其余字符由 onDidChangeTextDocument 统一驱动
    );

    context.subscriptions.push(completionProvider);

    // 统一监听所有文档变更（正向输入 + 退格），只要光标仍在 @martian 上下文中
    // 就主动调用 triggerSuggest，驱动 completion provider 重新查询。
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((event) => {
            const editor = vscode.window.activeTextEditor;
            if (!editor || editor.document !== event.document) { return; }

            const position = editor.selection.active;
            const linePrefix = event.document.lineAt(position).text.substr(0, position.character);

            const isInComment = /^\s*(\/\/|\/\*|\*)/.test(linePrefix);
            const inMartianContext = /@martian\s+[a-zA-Z0-9_-]*/i.test(linePrefix);

            if (isInComment && inMartianContext) {
                setTimeout(() => {
                    vscode.commands.executeCommand('editor.action.triggerSuggest');
                }, 50);
            }
        })
    );

    // 注册链接
    const linkProvider = vscode.languages.registerDocumentLinkProvider(
        ['javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'java'],
        {
            provideDocumentLinks(document: vscode.TextDocument) {
                const links: vscode.DocumentLink[] = [];
                const text = document.getText();
                const regex = /@martian\s+([a-zA-Z0-9_-]+)/g;
                let match;
                const baseUrl = getServerUrl();
                while ((match = regex.exec(text)) !== null) {
                    const code = match[1];
                    const range = new vscode.Range(document.positionAt(match.index + match[0].indexOf(code)), document.positionAt(match.index + match[0].length));
                    links.push(new vscode.DocumentLink(range, vscode.Uri.parse(`${baseUrl}/pages/problem/edit?code=${code}`)));
                }
                return links;
            }
        }
    );

    context.subscriptions.push(linkProvider);

    // 注册悬停提示
    const hoverProvider = vscode.languages.registerHoverProvider(
        ['javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'java'],
        {
            async provideHover(document: vscode.TextDocument, position: vscode.Position) {
                const line = document.lineAt(position).text;
                const regex = /@martian\s+([a-zA-Z0-9_-]+)/gi;
                let match;

                while ((match = regex.exec(line)) !== null) {
                    const code = match[1];
                    const codeStart = match.index + match[0].indexOf(code);
                    const codeEnd = codeStart + code.length;
                    const hoverRange = new vscode.Range(position.line, codeStart, position.line, codeEnd);

                    // 检查鼠标是否悬停在 code 上
                    if (position.character >= codeStart && position.character <= codeEnd) {
                        try {
                            const baseUrl = getServerUrl();
                            const res = await fetch(`${baseUrl}/api/problem/list?keyword=${code}`);
                            const json: any = await res.json();
                            const p = json?.data?.find((d: any) => d.code === code);

                            const md = new vscode.MarkdownString('', true);
                            md.isTrusted = true;
                            if (p) {
                                md.appendMarkdown(`### ${p.code}\n\n`);
                                md.appendMarkdown(`**状态**: \`${p.status || '未知'}\`\n\n`);
                                md.appendMarkdown(`**原因**: ${p.cause || '未录入'}\n\n`);
                                md.appendMarkdown(`**方案**: ${p.toEngineer || '待完善'}\n\n`);
                            } else {
                                md.appendMarkdown(`### 🛸 ${code}\n\n`);
                                md.appendMarkdown(`_该异常码在系统中尚未登记。_\n\n`);
                                md.appendMarkdown(`[立即创建](${baseUrl}/pages/problem/edit?code=${code})`);
                            }
                            return new vscode.Hover(md, hoverRange);
                        } catch {
                            return undefined;
                        }
                    }
                }
                return undefined;
            }
        }
    );

    context.subscriptions.push(hoverProvider);
}
