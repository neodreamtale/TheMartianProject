plugins {
    id("java")
    id("maven-publish")
}

group = "neo.porco"
version = "1.0.1-SNAPSHOT"

java {
    sourceCompatibility = JavaVersion.VERSION_1_8
    targetCompatibility = JavaVersion.VERSION_1_8
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("com.squareup:javapoet:1.13.0")
    compileOnly("com.google.auto.service:auto-service:1.1.1")
    annotationProcessor("com.google.auto.service:auto-service:1.1.1")
    testAnnotationProcessor(sourceSets.main.get().output)
    testAnnotationProcessor("com.squareup:javapoet:1.13.0")
    testImplementation(platform("org.junit:junit-bom:5.10.0"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<JavaCompile> {
    options.encoding = "UTF-8"
}

tasks.test {
    useJUnitPlatform()
}

publishing {
    publications {
        create<MavenPublication>("mavenJava") {
            from(components["java"])
            artifact(tasks.register("sourcesJar", Jar::class) {
                archiveClassifier.set("sources")
                from(sourceSets.main.get().allSource)
            })
        }
    }
    repositories {
        maven {
            // 根据你的 settings.xml，推测你们公司 Nexus 的上传（宿主）仓库地址如下：
            val releasesRepoUrl = uri("http://repo.bidlink.cn/nexus/content/repositories/releases/")
            val snapshotsRepoUrl = uri("http://repo.bidlink.cn/nexus/content/repositories/snapshots/")

            url = if (version.toString().endsWith("SNAPSHOT")) snapshotsRepoUrl else releasesRepoUrl
            // 允许 HTTP 协议（由于公司的地址是 http 而不是 https，Gradle 7+ 需要显式开启）
            isAllowInsecureProtocol = true

            credentials {
                // 取自你 settings.xml 中 <server><id>snapshots</id> / <id>releases</id> 的配置
                username = "deployment"
                password = "deployment"
            }
        }
    }
}