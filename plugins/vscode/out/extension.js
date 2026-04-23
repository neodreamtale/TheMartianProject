"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
function activate(context) {
    console.log('Martian Error Linker is now active!');
    // 注册一个专门用来打开浏览器的内置命令
    context.subscriptions.push(vscode.commands.registerCommand('martian.openCreatePage', (code) => {
        vscode.env.openExternal(vscode.Uri.parse(`http://localhost:3001/pages/problem/edit?code=${code}`));
    }));
    // ==========================================
    // 1. 动态智能补全 (真正的用户触发 + 即时反馈)
    // ==========================================
    const completionProvider = vscode.languages.registerCompletionItemProvider(['javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'java'], {
        async provideCompletionItems(document, position) {
            const linePrefix = document.lineAt(position).text.substr(0, position.character);
            // 匹配 @martian + 空格 + 正在输入的 code (允许只输了一部分)
            const regex = /@martian\s+([A-Z_0-9]*)$/;
            const match = linePrefix.match(regex);
            if (!match) {
                return undefined;
            }
            const typedCode = match[1]; // 用户当前敲下的部分，比如 "TEST_"
            try {
                // 携带 keyword 进行模糊查询 (网络层自带极短延迟，VS Code 本身也会做防抖处理)
                const res = await fetch(`http://localhost:3001/api/problem/list?keyword=${typedCode}`);
                const json = await res.json();
                const items = [];
                let exactMatchFound = false;
                if (json.success && json.data) {
                    json.data.forEach((p) => {
                        // 如果列表中包含和输入完全一样的 code，说明已经被别人建过了
                        if (p.code === typedCode) {
                            exactMatchFound = true;
                        }
                        const item = new vscode.CompletionItem(p.code, vscode.CompletionItemKind.Value);
                        item.detail = ` [${p.status}]`;
                        const docs = new vscode.MarkdownString();
                        docs.appendMarkdown(`**👨‍🚀 提示**: ${p.cause}\n\n`);
                        docs.appendMarkdown(`**💻 警报**: ${p.toEngineer}\n\n`);
                        item.documentation = docs;
                        item.sortText = '0' + p.code;
                        items.push(item);
                    });
                }
                // 核心逻辑：如果查不出来，或者列表里没有完全匹配当前的字符 -> 走新建流程
                if (typedCode.length > 0 && !exactMatchFound) {
                    const createItem = new vscode.CompletionItem(`🆕 创建新异常码: ${typedCode}`, vscode.CompletionItemKind.Issue);
                    createItem.insertText = typedCode; // 帮用户补齐文字
                    createItem.sortText = 'Z'; // 让它沉在已知列表的最后面
                    // 绑定命令：当用户选中这条提示回车时，静默帮他补齐代码，同时自动唤起浏览器弹窗！
                    createItem.command = {
                        title: 'Open Martian Edit Page',
                        command: 'martian.openCreatePage',
                        arguments: [typedCode]
                    };
                    items.push(createItem);
                }
                // 返回 CompletionList 且设置为 isIncomplete: true
                // 这行极度关键：它告诉 VS Code "这个列表是动态的，用户再敲任何一个字，你都必须重新请求我一遍！"
                return new vscode.CompletionList(items, true);
            }
            catch (err) {
                return undefined;
            }
        }
    }, ' ', '_' // 触发字符
    );
    context.subscriptions.push(completionProvider);
    // ==========================================
    // 2. 蓝色的可点击超链接 (随时可用)
    // ==========================================
    const linkProvider = vscode.languages.registerDocumentLinkProvider(['javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'java'], {
        provideDocumentLinks(document) {
            const links = [];
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
    });
    context.subscriptions.push(linkProvider);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map