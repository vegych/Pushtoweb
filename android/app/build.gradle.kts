plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val ensureKeystore = tasks.register("ensureKeystore") {
    doLast {
        val ksFile = file("release.jks")
        if (!ksFile.exists()) {
            println("Generating release.jks keystore...")
            val javaHome = System.getProperty("java.home")
            val keytoolBin = java.io.File(javaHome, "bin/keytool").absolutePath
            val keytoolCmd = if (java.io.File(keytoolBin).exists()) keytoolBin else "keytool"

            project.exec {
                commandLine(
                    keytoolCmd,
                    "-genkeypair",
                    "-v",
                    "-keystore", ksFile.absolutePath,
                    "-alias", "pushtoweb",
                    "-keyalg", "RSA",
                    "-keysize", "2048",
                    "-validity", "10000",
                    "-storepass", "pushtowebpass",
                    "-keypass", "pushtowebpass",
                    "-dname", "CN=PushToWeb, OU=App, O=PushToWeb, L=City, ST=State, C=RU"
                )
            }
        }
    }
}

android {
    namespace = "ru.pushtoweb.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "ru.pushtoweb.app"
        minSdk = 26
        targetSdk = 34
        versionCode = (project.findProperty("versionCode") as? String)?.toIntOrNull() ?: 1
        versionName = (project.findProperty("versionName") as? String) ?: "1.0.0"
    }

    signingConfigs {
        create("release") {
            val p12File = file("release.p12")
            val jksFile = file("release.jks")
            storeFile = if (p12File.exists()) p12File else if (jksFile.exists()) jksFile else file("debug.keystore")
            storePassword = if (p12File.exists() || jksFile.exists()) "pushtowebpass" else "android"
            keyAlias = if (p12File.exists() || jksFile.exists()) "pushtoweb" else "androiddebugkey"
            keyPassword = if (p12File.exists() || jksFile.exists()) "pushtowebpass" else "android"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
        debug {
            isDebuggable = true
            signingConfig = signingConfigs.getByName("release")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.webkit:webkit:1.12.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
}
