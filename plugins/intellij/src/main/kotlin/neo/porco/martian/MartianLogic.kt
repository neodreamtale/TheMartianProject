package neo.porco.martian

import com.intellij.codeInsight.completion.*
import com.intellij.codeInsight.lookup.LookupElementBuilder
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.options.Configurable
import com.intellij.openapi.util.TextRange
import com.intellij.psi.*
import com.intellij.util.ProcessingContext
import com.intellij.openapi.project.Project
import javax.swing.JComponent
import javax.swing.JTextField
import java.awt.Desktop
import java.net.URI

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
        trace("MartianCompletionContributor init")
        extend(
            CompletionType.BASIC,
            com.intellij.patterns.PlatformPatterns.psiElement().inside(PsiComment::class.java),
            object : CompletionProvider<CompletionParameters>() {
                override fun addCompletions(
                    parameters: CompletionParameters, context: ProcessingContext, result: CompletionResultSet
                ) {
                    trace("addCompletions invoked, file=${parameters.originalFile.name}, offset=${parameters.offset}")
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
                    val typedCode = match.groups[1]?.value?.uppercase() ?: ""
                    trace("match found, typedCode='$typedCode'")

                    result.addElement(
                        LookupElementBuilder.create(typedCode).withPresentableText("🆕 创建新异常码: $typedCode")
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
