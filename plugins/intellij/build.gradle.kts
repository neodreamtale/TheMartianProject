import org.jetbrains.intellij.platform.gradle.TestFrameworkType

plugins {
    id("java")
    id("org.jetbrains.kotlin.jvm") version "1.9.0"
    id("org.jetbrains.intellij.platform") version "2.0.0"
}

group = "com.neodreamtale.martian"
version = "1.0-SNAPSHOT"

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

dependencies {
    intellijPlatform {
        intellijIdeaCommunity("2023.2.5")
        bundledPlugin("com.intellij.java")
        jetbrainsRuntime()
        pluginVerifier()
        instrumentationTools()
    }
}

intellijPlatform {
    pluginConfiguration {
        id = "neo.porco.martian"
        name = "Martian（火星救援）"
        vendor {
            name = "NeoPorco"
        }
        description = "智能关联 Martian 异常管理系统的 IntelliJ IDEA 插件"
    }
}

kotlin {
    jvmToolchain(17)
}
