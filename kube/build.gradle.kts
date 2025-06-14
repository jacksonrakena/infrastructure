plugins {
    application
    kotlin("jvm") version "2.1.21"
}
application {
    mainClass = "com.jacksonrakena.infrastructure.MainKt"
}
repositories {
    mavenLocal()
    maven {
        url = uri("https://repo.maven.apache.org/maven2/")
    }
    mavenCentral()
}

dependencies {
    implementation(libs.org.cdk8s.cdk8s)
    implementation(libs.org.cdk8s.cdk8s.plus.v28)
    implementation(libs.software.constructs.constructs)
    implementation(libs.com.google.guava.guava)
    implementation(kotlin("stdlib-jdk8"))
    implementation("io.github.cdimascio:dotenv-kotlin:6.5.1")
}

group = "com.jacksonrakena.infrastructure"
version = "1.0"
description = "Jackson cloud infrastructure"

