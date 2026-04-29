package neo.porco.processor;

import com.google.auto.service.AutoService;
import com.squareup.javapoet.FieldSpec;
import com.squareup.javapoet.JavaFile;
import com.squareup.javapoet.TypeSpec;
import neo.porco.Martians;

import javax.annotation.processing.AbstractProcessor;
import javax.annotation.processing.Processor;
import javax.annotation.processing.RoundEnvironment;
import javax.annotation.processing.SupportedAnnotationTypes;
import javax.annotation.processing.SupportedSourceVersion;
import javax.lang.model.SourceVersion;
import javax.lang.model.element.Element;
import javax.lang.model.element.Modifier;
import javax.lang.model.element.TypeElement;
import javax.tools.Diagnostic;
import java.io.IOException;
import java.util.Set;

/**
 * APT 生成代码处理器的框架，用于在编译期间拦截 @Martians 注解并生成代码。
 */
@AutoService(Processor.class)
@SupportedAnnotationTypes("neo.porco.Martians")
@SupportedSourceVersion(SourceVersion.RELEASE_17)
public class MartiansProcessor extends AbstractProcessor {

    @Override
    public boolean process(Set<? extends TypeElement> annotations, RoundEnvironment roundEnv) {
        if (annotations.isEmpty()) {
            return false;
        }
        for (Element element : roundEnv.getElementsAnnotatedWith(Martians.class)) {
            Martians martians = element.getAnnotation(Martians.class);
            String[] values = martians.value();
            // 打印日志：可以在使用方编译时的控制台看到这些输出
            processingEnv.getMessager().printMessage(Diagnostic.Kind.NOTE,
                    "==== 发现 @Martians 注解在类: " + element.getSimpleName() + " ==== \n" +
                            "==== 配置的值有: " + String.join(", ", values) + " ====");

            // 4. 着手生成代码
            String packageName = processingEnv.getElementUtils().getPackageOf(element).getQualifiedName().toString();
            String generatedClassName = element.getSimpleName() + "ErrCodes";

            TypeSpec.Builder classBuilder = TypeSpec.classBuilder(generatedClassName)
                    .addModifiers(Modifier.PUBLIC);

            // 遍历注解值，生成常量
            for (String val : values) {
                // 如果值是 "Error_USER_NOT_FOUND"，去掉 "Error_" 前缀，并确保大写
                String constantName = val.toUpperCase();

                FieldSpec fieldSpec = FieldSpec.builder(String.class, constantName)
                        .addModifiers(Modifier.PUBLIC, Modifier.STATIC, Modifier.FINAL)
                        .initializer("$S", val)
                        .build();

                classBuilder.addField(fieldSpec);
            }

            TypeSpec generatedClass = classBuilder.build();

            JavaFile javaFile = JavaFile.builder(packageName, generatedClass).build();
            try {
                javaFile.writeTo(processingEnv.getFiler());
            } catch (IOException e) {
                processingEnv.getMessager().printMessage(Diagnostic.Kind.ERROR, "生成代码失败: " + e.getMessage());
            }
        }

        // 返回 true 表示 @Martians 注解已经被此处理器消费，不需要传递给其他处理器
        return true;
    }
}
