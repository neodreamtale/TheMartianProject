package neo.porco.martian

import com.google.gson.JsonParser
import com.intellij.codeInsight.completion.*
import com.intellij.codeInsight.lookup.LookupElementBuilder
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.options.Configurable
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.TextRange
import com.intellij.psi.*
import com.intellij.util.ProcessingContext
import java.awt.Desktop
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL
import javax.swing.JComponent
import javax.swing.JTextField


// 1. 配置管理
object MartianSettings {
    var serverUrl: String = "http://localhost:3001"
}

private val LOG = Logger.getInstance("neo.porco.martian")

private fun trace(msg: String) {
    println("[Martian] $msg")
    LOG.info("[Martian] $msg")
}

// 2. 自动补全逻辑 (@martian )
class MartianCompletionContributor : CompletionContributor() {

    init {
        extend(
            CompletionType.BASIC,
            com.intellij.patterns.PlatformPatterns.psiElement(),
            object : CompletionProvider<CompletionParameters>() {
                override fun addCompletions(
                    parameters: CompletionParameters, context: ProcessingContext, result: CompletionResultSet
                ) {
                    val document = parameters.editor.document
                    val offset = parameters.offset
                    val lineStart = document.getLineStartOffset(document.getLineNumber(offset))
                    val textBeforeCaret = document.getText(TextRange(lineStart, offset))

                    // 1. 检查是否已经打出了 @martian 加上空格
                    // 清除 IDEA 补全期间在内存中自动注入的光标占位符 (防止它打断我们的正则匹配)
                    val dummy = CompletionUtilCore.DUMMY_IDENTIFIER_TRIMMED
                    val cleanText = textBeforeCaret
                        .replace("$dummy ", "")
                        .replace(dummy, "")
                        
                    trace("addCompletions invoked, cleanText='$cleanText'")
                    
                    val triggerRegex = Regex("(?i)@martian\\s+([a-zA-Z0-9_-]*)$")
                    val match = triggerRegex.find(cleanText)

                    if (match != null) {
                        val typedCode = match.groupValues[1]
                        trace("addCompletions: matched `@martian`, typedCode='$typedCode'")

                        val newResult = result.withPrefixMatcher(typedCode)

                        // ！！！！极其关键的一句！！！！
                        // 告诉 IDEA：每当用户多敲一个字母导致 prefix(前缀) 改变时，
                        // 关闭当前的本地过滤，立刻重新执行整个 addCompletions 再次发起网络请求！
                        newResult.restartCompletionOnAnyPrefixChange()

                        // ===== 这里开始替换为真实的网络请求展示 =====
                        var hasItems = false
                        try {
                            val url = URL("${MartianSettings.serverUrl}/api/problem/list?keyword=$typedCode")
                            val conn = url.openConnection() as HttpURLConnection
                            conn.connectTimeout = 3000 // UI补全不宜等待过久，3秒超时
                            conn.readTimeout = 3000
                            conn.requestMethod = "GET"

                            if (conn.responseCode == 200) {
                                val responseText = conn.inputStream.bufferedReader().use { it.readText() }
                                val json = JsonParser.parseString(responseText).asJsonObject

                                if (json.has("success") && json.get("success").asBoolean && json.has("data")) {
                                    val dataArray = json.getAsJsonArray("data")
                                    for (element in dataArray) {
                                        val obj = element.asJsonObject
                                        val code = if (obj.has("code")) obj.get("code").asString else ""
                                        val status =
                                            if (obj.has("status") && !obj.get("status").isJsonNull) obj.get("status").asString else "无"
                                        val cause =
                                            if (obj.has("cause") && !obj.get("cause").isJsonNull) obj.get("cause").asString else "无原因"

                                        // 构造提示列表的单行展示项
                                        val item = LookupElementBuilder.create(code).withTypeText("[$status]") // 右侧灰色小字
                                            .withTailText(" - $cause", true) // 跟随在代码后面的灰色副文本

                                        newResult.addElement(item)
                                        hasItems = true
                                    }
                                }
                            }
                        } catch (e: Exception) {
                            trace("Network request failed: ${e.message}")
                        }

                        // 无条件添加至少一个选项，否则空结果会导致 IDEA 立马关闭提示框
                        // 如果连 typedCode 都没有，网络又没返回，就加一个占位等用户继续输入
                        if (typedCode.isNotEmpty()) {
                            newResult.addElement(
                                LookupElementBuilder.create(typedCode).withPresentableText("🆕 创建新异常码: $typedCode")
                                    .withInsertHandler { _, _ ->
                                        // 选中这条后，自动用浏览器打开新建页面
                                        try {
                                            Desktop.getDesktop()
                                                .browse(URI("${MartianSettings.serverUrl}/pages/problem/edit?code=$typedCode"))
                                        } catch (e: Exception) {
                                            trace("Open browser failed $e")
                                        }
                                    })
                        } else if (!hasItems) {
                            newResult.addElement(
                                LookupElementBuilder.create("").withPresentableText("正在等待输入异常码或响应...")
                                    .withInsertHandler { _, _ -> })
                        }
                        // =======================================

                        return
                    }

                    // 2. 如果还没打完 @martian+空格，那我们看是不是正在打 @m...
                    // 这里非常关键：如果没有塞入任何匹配当前输入的选项，IDEA 就会立刻关闭补全窗口！
                    // 所以我们要把 @martian 作为一个合法的提示项塞进去，这样你打 @mar 的时候窗口才会继续开着。
                    val keywordRegex = Regex("(?i)@[a-zA-Z0-9_-]*$")
                    val kwMatch = keywordRegex.find(cleanText)
                    if (kwMatch != null) {
                        val typedKeyword = kwMatch.groupValues[0]
                        if ("@martian".startsWith(typedKeyword.lowercase())) {
                            trace("addCompletions: typing keyword, typedKeyword='$typedKeyword'")
                            val newResult = result.withPrefixMatcher(typedKeyword)
                            // 提供 @martian 这个补全项，这样窗口就不会因为没结果而关闭
                            newResult.addElement(LookupElementBuilder.create("@martian").withInsertHandler { ctx, _ ->
                                    // 阻止回车键或选中时产生的默认换行/字符插入动作
                                    ctx.setAddCompletionChar(false)

                                    val offset = ctx.selectionEndOffset
                                    val chars = ctx.document.charsSequence
                                    // 自动追加一个空格（如果后面没有空格的话），并且主动唤起下一次补全（展示报错码）
                                    if (offset == chars.length || chars[offset] != ' ') {
                                        ctx.document.insertString(offset, " ")
                                    }
                                    ctx.editor.caretModel.moveToOffset(offset + 1)

                                    com.intellij.openapi.application.ApplicationManager.getApplication().invokeLater {
                                            if (!ctx.editor.isDisposed) {
                                                CodeCompletionHandlerBase(
                                                    CompletionType.BASIC
                                                ).invokeCompletion(ctx.project, ctx.editor)
                                            }
                                        }
                                }.withTypeText("Martian Keyword"))
                        }
                    } else {
                        trace("addCompletions: ignore, textBeforeCaret='$textBeforeCaret'")
                    }
                }
            })
    }
}

// 3. 超链接逻辑 (让代码里的 @martian CODE 变得可以点击)
class MartianReferenceContributor : PsiReferenceContributor() {
    override fun registerReferenceProviders(registrar: PsiReferenceRegistrar) {
        registrar.registerReferenceProvider(
            com.intellij.patterns.PlatformPatterns.psiElement(PsiComment::class.java), object : PsiReferenceProvider() {
                override fun getReferencesByElement(
                    element: PsiElement, context: ProcessingContext
                ): Array<PsiReference> {
                    val text = element.text
                    val regex = Regex("@martian\\s+([a-zA-Z0-9_-]+)")
                    return regex.findAll(text).map { match ->
                        val range = TextRange(match.range.first, match.range.last + 1)
                        val code = match.groups[1]?.value ?: ""
                        object : PsiReferenceBase<PsiElement>(element, range) {
                            override fun resolve(): PsiElement? = null // 我们不需要跳转到代码，只需要点击效果
                            override fun handleElementRename(newElementName: String): PsiElement = element
                            override fun bindToElement(element: PsiElement): PsiElement = element
                            override fun getVariants(): Array<Any> = emptyArray()

                            // 关键：点击后的动作
                            fun resolveReference(): PsiElement? {
                                Desktop.getDesktop()
                                    .browse(URI("${MartianSettings.serverUrl}/pages/problem/edit?code=$code"))
                                return null
                            }
                        }
                    }.toList().toTypedArray()
                }
            })
    }
}

// 4. 设置界面
class MartianConfigurable : Configurable {
    private var textField: JTextField? = null
    override fun getDisplayName(): String = "Martian Settings"
    override fun createComponent(): JComponent {
        textField = JTextField(MartianSettings.serverUrl)
        return textField!!
    }

    override fun isModified(): Boolean = textField?.text != MartianSettings.serverUrl
    override fun apply() {
        MartianSettings.serverUrl = textField?.text ?: "http://localhost:3001"
    }
}

class MartianJavadocTagInfo : com.intellij.psi.javadoc.JavadocTagInfo {
    override fun getName(): String = "martian"
    override fun isInline(): Boolean = false
    override fun isValidInContext(element: PsiElement?): Boolean = true
    override fun getReference(value: com.intellij.psi.javadoc.PsiDocTagValue?): PsiReference? = null
    override fun checkTagValue(value: com.intellij.psi.javadoc.PsiDocTagValue?): String? = null
}

// 6. 监听用户敲击空格，若前面是 @martian，则立即唤起补全
class MartianTypedHandler : com.intellij.codeInsight.editorActions.TypedHandlerDelegate() {
    override fun checkAutoPopup(
        charTyped: Char, project: Project, editor: com.intellij.openapi.editor.Editor, file: PsiFile
    ): Result {
        // 允许空格、字母、数字、下划线、横线主动唤起弹窗
        if (charTyped == ' ' || charTyped.isLetterOrDigit() || charTyped == '_' || charTyped == '-') {
            val offset = editor.caretModel.offset
            val document = editor.document
            if (offset > 0) {
                val lineStart = document.getLineStartOffset(document.getLineNumber(offset))
                val textBeforeCaret = document.getText(TextRange(lineStart, offset))

                // 将刚敲下的字符和之前的文本组合
                val combinedText = textBeforeCaret + charTyped

                // 检查当前行光标前是不是属于 @martian 的输入区域
                // 例如: "@martian " 或者 "@martian CO"
                val triggerRegex = Regex("(?i)@martian\\s+[a-zA-Z0-9_-]*$")
                trace("checkAutoPopup: charTyped='$charTyped', combinedText='$combinedText'")
                if (triggerRegex.containsMatchIn(combinedText)) {
                    // 命中时，由于在注释中，IDEA 的 AutoPopupController 可能会静默拦截弹窗请求
                    // 我们直接使用 CodeCompletionHandlerBase 暴力唤起 IDEA 的补全窗口
                    com.intellij.openapi.application.ApplicationManager.getApplication().invokeLater {
                        if (!editor.isDisposed) {
                            com.intellij.codeInsight.completion.CodeCompletionHandlerBase(
                                com.intellij.codeInsight.completion.CompletionType.BASIC
                            ).invokeCompletion(project, editor)
                        }
                    }
                    // 注意：如果是空格，我们拦截并主动弹窗（STOP 防止 IDEA 忽略空格弹窗）
                    // 但如果是字母/数字/下划线，IDEA 原本就会弹窗/过滤，此时返回 CONTINUE 就能让弹窗顺畅过滤
                    return if (charTyped == ' ') Result.STOP else Result.CONTINUE
                }
            }
        }
        return Result.CONTINUE
    }
}
