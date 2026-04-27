package neo.porco.martian

import com.intellij.codeInsight.completion.*
import com.intellij.codeInsight.lookup.LookupElementBuilder
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.options.Configurable
import com.intellij.openapi.project.Project
import com.intellij.openapi.startup.StartupActivity
import com.intellij.openapi.util.TextRange
import com.intellij.psi.*
import com.intellij.psi.util.PsiTreeUtil
import com.intellij.util.ProcessingContext
import java.awt.Desktop
import java.net.URI
import javax.swing.JComponent
import javax.swing.JTextField
import kotlin.jvm.java


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
            CompletionType.BASIC, com.intellij.patterns.PlatformPatterns.psiElement().inside(PsiComment::class.java),
            object : CompletionProvider<CompletionParameters>() {
                override fun addCompletions(
                    parameters: CompletionParameters, context: ProcessingContext, result: CompletionResultSet
                ) {
                    val document = parameters.editor.document
                    val offset = parameters.offset
                    val lineStart = document.getLineStartOffset(document.getLineNumber(offset))
                    val textBeforeCaret = document.getText(TextRange(lineStart, offset))

                    // 1. 检查是否已经打出了 @martian 加上空格
                    val triggerRegex = Regex("(?i)@martian\\s+([a-zA-Z0-9_-]*)$")
                    val match = triggerRegex.find(textBeforeCaret)

                    if (match != null) {
                        val typedCode = match.groupValues[1]
                        trace("addCompletions: matched `@martian`, typedCode='$typedCode'")

                        val newResult = result.withPrefixMatcher(typedCode)
                        newResult.addElement(LookupElementBuilder.create("123123")
                            .withTypeText("模拟测试数据"))
                        return
                    }

                    // 2. 如果还没打完 @martian+空格，那我们看是不是正在打 @m...
                    // 这里非常关键：如果没有塞入任何匹配当前输入的选项，IDEA 就会立刻关闭补全窗口！
                    // 所以我们要把 @martian 作为一个合法的提示项塞进去，这样你打 @mar 的时候窗口才会继续开着。
                    val keywordRegex = Regex("(?i)@[a-zA-Z0-9_-]*$")
                    val kwMatch = keywordRegex.find(textBeforeCaret)
                    if (kwMatch != null) {
                        val typedKeyword = kwMatch.groupValues[0]
                        if ("@martian".startsWith(typedKeyword.lowercase())) {
                            trace("addCompletions: typing keyword, typedKeyword='$typedKeyword'")
                            val newResult = result.withPrefixMatcher(typedKeyword)
                            // 提供 @martian 这个补全项，这样窗口就不会因为没结果而关闭
                            newResult.addElement(LookupElementBuilder.create("@martian")
                                .withInsertHandler { ctx, _ ->
                                    // 阻止回车键或选中时产生的默认换行/字符插入动作
                                    ctx.setAddCompletionChar(false)
                                    
                                    val offset = ctx.selectionEndOffset
                                    val chars = ctx.document.charsSequence
                                    // 自动追加一个空格（如果后面没有空格的话），并且主动唤起下一次补全（展示报错码）
                                    if (offset == chars.length || chars[offset] != ' ') {
                                        ctx.document.insertString(offset, " ")
                                    }
                                    ctx.editor.caretModel.moveToOffset(offset + 1)
                                    
                                    com.intellij.codeInsight.AutoPopupController.getInstance(ctx.project)
                                        .scheduleAutoPopup(ctx.editor)
                                }
                                .withTypeText("Martian Keyword"))
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


