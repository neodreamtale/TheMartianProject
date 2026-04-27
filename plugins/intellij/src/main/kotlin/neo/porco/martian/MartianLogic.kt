package neo.porco.martian

import com.google.gson.JsonParser
import com.intellij.codeInsight.completion.*
import com.intellij.codeInsight.lookup.LookupElementBuilder
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.options.Configurable
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.NlsSafe
import com.intellij.openapi.util.TextRange
import com.intellij.psi.*
import com.intellij.util.ProcessingContext
import java.awt.Desktop
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL
import javax.swing.JComponent
import javax.swing.JTextField
import com.intellij.lang.documentation.AbstractDocumentationProvider
import com.intellij.lang.java.JavaDocumentationProvider
import com.intellij.psi.javadoc.PsiDocTag

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
                    val cleanText = document.getText(TextRange(lineStart, offset))
                    trace("addCompletions invoked, cleanText='$cleanText'")
                    val triggerRegex = Regex("(?i)@martian\\s+([a-zA-Z0-9_-]*)$")
                    val match = triggerRegex.find(cleanText)
                    if (match != null) {
                        completeCodeInfoIfNeed(match, result)
                    } else {
                        completeMartianIfNeed(cleanText, result, cleanText)
                    }
                }
            })
    }

    private fun completeCodeInfoIfNeed(match: MatchResult, result: CompletionResultSet) {
        val typedCode = match.groupValues[1]
        trace("addCompletions: matched `@martian`, typedCode='$typedCode'")

        val newResult = result.withPrefixMatcher(typedCode)
        // 关闭当前的本地过滤，立刻重新执行整个 addCompletions 再次发起网络请求！
        newResult.restartCompletionOnAnyPrefixChange()
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
    }

    /**
     * 如果没呼唤martian就呼唤一下martian
     */
    private fun completeMartianIfNeed(
        cleanText: String, result: CompletionResultSet, textBeforeCaret: @NlsSafe String
    ) {
        val keywordRegex = Regex("(?i)@[a-zA-Z0-9_-]*$")
        val kwMatch = keywordRegex.find(cleanText)
        if (kwMatch != null) {
            val typedKeyword = kwMatch.groupValues[0]
            if ("@martian".startsWith(typedKeyword.lowercase())) {
                trace("addCompletions: typing keyword, typedKeyword='$typedKeyword'")
                val newResult = result.withPrefixMatcher(typedKeyword)
                // 提供 @martian 这个补全项，这样窗口就不会因为没结果而关闭
                newResult.addElement(
                    LookupElementBuilder.create("@martian").withInsertHandler { ctx, _ ->
                        // 阻止回车键或选中时产生的默认换行/字符插入动作
                        ctx.setAddCompletionChar(false)

                        val offset = ctx.selectionEndOffset
                        val chars = ctx.document.charsSequence
                        // 自动追加一个空格（如果后面没有空格的话），并且主动唤起下一次补全（展示报错码）
                        if (offset == chars.length || chars[offset] != ' ') {
                            ctx.document.insertString(offset, " ")
                        }
                        ctx.editor.caretModel.moveToOffset(offset + 1)

                        ApplicationManager.getApplication().invokeLater {
                            if (!ctx.editor.isDisposed) {
                                CodeCompletionHandlerBase(
                                    CompletionType.BASIC
                                ).invokeCompletion(ctx.project, ctx.editor)
                            }
                        }
                    }.withTypeText("Martian Keyword")
                )
            }
        } else {
            trace("addCompletions: ignore, textBeforeCaret='$textBeforeCaret'")
        }
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

// 6. 监听用户敲击空格，若前面是 @martian，则立即唤起补全
class MartianTypedHandler : com.intellij.codeInsight.editorActions.TypedHandlerDelegate() {
    override fun checkAutoPopup(
        charTyped: Char, project: Project, editor: com.intellij.openapi.editor.Editor, file: PsiFile
    ): Result {
        val offset = editor.caretModel.offset
        val document = editor.document
        if (offset > 0) {
            val lineStart = document.getLineStartOffset(document.getLineNumber(offset))
            val textBeforeCaret = document.getText(TextRange(lineStart, offset))
            // 将刚敲下的字符和之前的文本组合
            val combinedText = textBeforeCaret + charTyped
            val triggerRegex = Regex("(?i)@martian\\s+[a-zA-Z0-9_-]*$")
            trace("检查是否应该弹: charTyped='$charTyped', combinedText='$combinedText'")
            if (triggerRegex.containsMatchIn(combinedText)) {
                // 命中时，由于在注释中，IDEA 的 AutoPopupController 可能会静默拦截弹窗请求
                // 我们直接使用 CodeCompletionHandlerBase 暴力唤起 IDEA 的补全窗口
                ApplicationManager.getApplication().invokeLater {
                    CodeCompletionHandlerBase(CompletionType.BASIC).invokeCompletion(project, editor)
                }
                return if (charTyped == ' ') Result.STOP else Result.CONTINUE
            }
        }
        return Result.CONTINUE
    }
}


class MartianJavadocTagInfo : com.intellij.psi.javadoc.JavadocTagInfo {
    override fun getName(): String = "martian"
    override fun isInline(): Boolean = false
    override fun isValidInContext(element: PsiElement?): Boolean = true
    override fun getReference(value: com.intellij.psi.javadoc.PsiDocTagValue?): PsiReference? {
        if (value == null) return null
        val code = value.text
        return object : PsiReferenceBase<PsiElement>(value, TextRange(0, code.length)) {
            override fun resolve(): PsiElement {
                return value
            }

            override fun getVariants(): Array<Any> = emptyArray()
        }
    }

    override fun checkTagValue(value: com.intellij.psi.javadoc.PsiDocTagValue?): String? = null
}

class MartianDocumentationProvider : AbstractDocumentationProvider() {
    override fun getCustomDocumentationElement(
        editor: com.intellij.openapi.editor.Editor, file: PsiFile, contextElement: PsiElement?, targetOffset: Int
    ): PsiElement? {
        // 向上查找，如果用户光标落在 @martian 标签本身或其附近的内容上，就精准提取这一个 Tag 作为触发元素
        var parent = contextElement
        while (parent != null) {
            if (parent is com.intellij.psi.javadoc.PsiDocTag && parent.name == "martian") {
                return parent
            }
            if (parent is PsiDocCommentOwner) break
            parent = parent.parent
        }
        return super.getCustomDocumentationElement(editor, file, contextElement, targetOffset)
    }

    override fun generateDoc(element: PsiElement, originalElement: PsiElement?): String? {
        // 2. 如果光标悬停在 @martian 这个 tag 标签本身或附近
        if (element is com.intellij.psi.javadoc.PsiDocTag && element.name == "martian") {
            val code = element.valueElement?.text ?: ""
            if (code.isNotBlank()) {
                trace("generateDoc for @martian tag with code='$code'")
                return buildMartianDoc(code)
            }
        }

        // 3. 如果光标悬停在整个方法/类上，原样追加（当你悬停在 public void test() 时看到）
        if (element is PsiDocCommentOwner) {
            val docComment = element.docComment
            if (docComment != null) {
                val martianTags = docComment.findTagsByName("martian")
                if (martianTags.isNotEmpty()) {
                    return buildMartianListDoc(element, originalElement, martianTags)
                }
            }
        }
        return super.generateDoc(element, originalElement)
    }

    private fun buildMartianDoc(code: String): String {
        val link = "${MartianSettings.serverUrl}/pages/problem/edit?code=$code"

        // 实时去服务端拉取这个错误码的详细信息
        var cause = "获取中或未找到..."
        var status = "未知"
        try {
            val url = URL("${MartianSettings.serverUrl}/api/problem/list?keyword=$code")
            val conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = 2000
            conn.readTimeout = 2000
            conn.requestMethod = "GET"

            if (conn.responseCode == 200) {
                val responseText = conn.inputStream.bufferedReader().use { it.readText() }
                val json = JsonParser.parseString(responseText).asJsonObject
                if (json.has("success") && json.get("success").asBoolean && json.has("data")) {
                    val dataArray = json.getAsJsonArray("data")
                    for (element in dataArray) {
                        val obj = element.asJsonObject
                        val itemCode = if (obj.has("code")) obj.get("code").asString else ""

                        // 找到精确匹配的那个 code
                        if (itemCode.equals(code, ignoreCase = true)) {
                            status =
                                if (obj.has("status") && !obj.get("status").isJsonNull) obj.get("status").asString else "无"
                            cause =
                                if (obj.has("cause") && !obj.get("cause").isJsonNull) obj.get("cause").asString else "无原因"
                            break
                        }
                    }
                }
            }
        } catch (e: Exception) {
            trace("获取单个详情失败: ${e.message}")
        }

        return """
            <div style="padding: 5px;">
                <h3>Martian 异常码</h3>
                <p><b>Code:</b> $code</p>
                <p><b>状态:</b> $status</p>
                <p><b>原因:</b> $cause</p>
                <p><a href="$link">查看详情</a></p>
            </div>
        """.trimIndent()
    }

    private fun buildMartianListDoc(
        element: PsiDocCommentOwner, originalElement: PsiElement?, martianTags: Array<out PsiDocTag>
    ): String {
        var baseDoc = JavaDocumentationProvider().generateDoc(element, originalElement) ?: ""
        val st = StringBuilder("<hr/><b>Martian 异常码绑定：</b><br/><ul>")
        for (tag in martianTags) {
            val code = tag.valueElement?.text ?: ""
            val link = "${MartianSettings.serverUrl}/pages/problem/edit?code=$code"
            st.append("<li><b>$code</b> <a href=\"$link\">[查看错误码]</a></li>")
        }
        st.append("</ul>")

        // 将 </body> 替换掉以插入新内容（或者直接拼在末尾）
        if (baseDoc.contains("</body>")) {
            return baseDoc.replace("</body>", st.toString() + "</body>")
        } else {
            return baseDoc + st.toString()
        }
    }

}
