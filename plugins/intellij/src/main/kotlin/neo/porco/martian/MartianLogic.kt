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

// 1. 配置管理
object MartianSettings {
    var serverUrl: String = "http://localhost:3001"
}

private val LOG = Logger.getInstance("neo.porco.martian")

private fun trace(msg: String) {
    println("[Martian] $msg")
    LOG.info("[Martian] $msg")
}

class MartianStartupActivity : StartupActivity.DumbAware {
    override fun runActivity(project: Project) {
        trace("MartianStartupActivity.runActivity, project=${project.name}")
    }
}

// 2. 自动补全逻辑 (@martian )
class MartianCompletionContributor : CompletionContributor() {

    // 空格触发 auto-popup（默认只有字母数字触发，空格不会）
    @Suppress("OverridingDeprecatedMember", "UnstableApiUsage")
    override fun invokeAutoPopup(position: PsiElement, typeChar: Char): Boolean {
        val isValidChar = typeChar == ' ' || typeChar.isLetterOrDigit() || typeChar == '_' || typeChar == '-'
        if (!isValidChar) return false
        val comment = PsiTreeUtil.getParentOfType(position, PsiComment::class.java, false)
            ?: return false
        val text = comment.text
        val triggered = if (typeChar == ' ') {
            // 空格：只要有 @martian 就触发
            text.contains(Regex("(?i)@martian\\s*$"))
        } else {
            // 字母/数字：@martian + 空格已存在才触发（避免干扰打 @martian 本身时的补全）
            text.contains(Regex("(?i)@martian\\s+"))
        }
        trace("invokeAutoPopup typeChar='$typeChar', triggered=$triggered")
        return triggered
    }

    // 永远会被调用，用来诊断 PSI 结构
    override fun beforeCompletion(context: CompletionInitializationContext) {
        val el = context.file.findElementAt(context.startOffset)
        trace("beforeCompletion: elementType=${el?.node?.elementType}, elementClass=${el?.javaClass?.simpleName}, parent=${el?.parent?.javaClass?.simpleName}")
    }

    init {
        trace("MartianCompletionContributor init")
        extend(
            CompletionType.BASIC,
            // 不限制 PSI 类型，在 addCompletions 里手动判断是否在注释内
            // 避免 pattern 匹配不上导致根本进不来
            com.intellij.patterns.PlatformPatterns.psiElement(),
            object : CompletionProvider<CompletionParameters>() {
                override fun addCompletions(
                    parameters: CompletionParameters, context: ProcessingContext, result: CompletionResultSet
                ) {
                    trace("addCompletions invoked, file=${parameters.originalFile.name}, offset=${parameters.offset}")

                    // 往上找任意层的 PsiComment（// 行注释 和 /** */ Javadoc 都能覆盖）
                    val el = parameters.position
                    val comment = PsiTreeUtil.getParentOfType(el, PsiComment::class.java, false)
                    if (comment == null) {
                        trace("not in comment, skip. elementClass=${el.javaClass.simpleName}, parent=${el.parent?.javaClass?.simpleName}")
                        return
                    }
                    trace("in comment: ${comment.javaClass.simpleName}, text='${comment.text.take(60)}'")

                    val position = parameters.editor.caretModel.offset
                    val document = parameters.editor.document
                    val textBefore = document.getText(TextRange(0, position))
                    trace("textBefore='$textBefore'")

                    val regex = Regex("@martian\\s+([a-zA-Z0-9_-]*)$", RegexOption.IGNORE_CASE)
                    val match = regex.find(textBefore)
                    if (match == null) {
                        trace("No @martian match, returning")
                        return
                    }
                    val typedRaw = match.groups[1]?.value ?: ""
                    val typedCode = typedRaw.uppercase()
                    trace("match found, typedRaw='$typedRaw', typedCode='$typedCode'")

                    // 当用户继续输入字母导致当前结果被过滤光时，重新调用 addCompletions
                    // 注意：不能用 withPrefixMatcher("") 固定前缀，否则 "结果全被过滤" 的条件永远不会触发
                    result.restartCompletionWhenNothingMatches()

                    result.addElement(
                        LookupElementBuilder.create(typedRaw).withPresentableText("🆕 创建新异常码: $typedCode")
                            .withIcon(
                                com.intellij.openapi.util.IconLoader.getIcon(
                                    "/general/add.png", MartianCompletionContributor::class.java
                                )
                            ).withInsertHandler { ctx, _ ->
                                trace("insert handler fired, code=$typedCode")
                                Desktop.getDesktop()
                                    .browse(URI("${MartianSettings.serverUrl}/pages/problem/edit?code=$typedCode"))
                            })
                    trace("addElement done")
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
