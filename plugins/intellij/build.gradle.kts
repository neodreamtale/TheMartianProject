plugins {
    id("java")
    id("org.jetbrains.kotlin.jvm") version "1.9.0"
    id("org.jetbrains.intellij.platform") version "2.0.0"
}

group = "neo.porco.martian"
version = "1.0.1-SNAPSHOT"

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
        
        ideaVersion {
            sinceBuild = "232"
            untilBuild = "253.*"
        }
    }
}

kotlin {
    jvmToolchain(17)
}

tasks {
    buildPlugin {
        destinationDirectory.set(layout.projectDirectory.dir("../release"))
    }
}
