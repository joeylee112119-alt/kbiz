@echo off
set DIR=%~dp0
if "%JAVA_HOME%"=="" (
  echo ERROR: Java runtime is required to run Gradle. 1>&2
  exit /b 1
)
powershell -ExecutionPolicy Bypass -NoProfile -Command "if (!(Test-Path '%DIR%\.gradle\wrapper\dists\gradle-8.10.2\bin\gradle.bat')) { New-Item -ItemType Directory -Force '%DIR%\.gradle\wrapper\dists' | Out-Null; Invoke-WebRequest 'https://services.gradle.org/distributions/gradle-8.10.2-bin.zip' -OutFile '%DIR%\.gradle\wrapper\dists\gradle-8.10.2-bin.zip'; Expand-Archive -Force '%DIR%\.gradle\wrapper\dists\gradle-8.10.2-bin.zip' '%DIR%\.gradle\wrapper\dists' }"
call "%DIR%\.gradle\wrapper\dists\gradle-8.10.2\bin\gradle.bat" %*
