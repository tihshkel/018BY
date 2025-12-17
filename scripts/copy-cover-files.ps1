# Скрипт для копирования PDF обложек из исходной папки в проект
# Запуск: .\scripts\copy-cover-files.ps1

$sourceDir = "C:\Users\тихон\OneDrive\Рабочий стол\обложка"
$targetDir = "018BY\assets\pdfs\covers\pregnancy"

# Создаем целевую папку, если её нет
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    Write-Host "Создана папка: $targetDir"
}

# Маппинг: какие файлы искать и как их переименовать
$fileMapping = @{
    # DB1 (pregnancy_60 и pregnancy_a5)
    "DB1_0" = "DB1_твердый переплет.pdf"
    "DB1_п" = "DB1_пружина.pdf"
    "DB1_твердый" = "DB1_твердый переплет.pdf"
    "DB1_пружина" = "DB1_пружина.pdf"
    
    # DB2
    "DB2_0" = "DB2_твердый переплет.pdf"
    "DB2_п" = "DB2_пружина.pdf"
    "DB2_твердый" = "DB2_твердый переплет.pdf"
    "DB2_пружина" = "DB2_пружина.pdf"
    
    # DB3
    "DB3_0" = "DB3_твердый переплет.pdf"
    "DB3_п" = "DB3_пружина.pdf"
    "DB3_твердый" = "DB3_твердый переплет.pdf"
    "DB3_пружина" = "DB3_пружина.pdf"
    
    # DB4
    "DB4_0" = "DB4_твердый переплет.pdf"
    "DB4_п" = "DB4_пружина.pdf"
    "DB4_твердый" = "DB4_твердый переплет.pdf"
    "DB4_пружина" = "DB4_пружина.pdf"
    
    # DB5
    "DB5_0" = "DB5_твердый переплет.pdf"
    "DB5_п" = "DB5_пружина.pdf"
    "DB5_твердый" = "DB5_твердый переплет.pdf"
    "DB5_пружина" = "DB5_пружина.pdf"
}

Write-Host "Поиск PDF обложек для беременности..."
Write-Host "Исходная папка: $sourceDir"
Write-Host "Целевая папка: $targetDir"
Write-Host ""

$copiedCount = 0
$notFoundCount = 0

# Ищем файлы по паттернам
foreach ($pattern in $fileMapping.Keys) {
    $targetFileName = $fileMapping[$pattern]
    $targetPath = Join-Path $targetDir $targetFileName
    
    # Пропускаем, если файл уже существует
    if (Test-Path $targetPath) {
        Write-Host "✓ $targetFileName уже существует, пропускаем"
        continue
    }
    
    # Ищем файлы, которые могут соответствовать паттерну
    $found = $false
    
    # Варианты поиска
    $searchPatterns = @(
        "*$pattern*.pdf",
        "*DB*$pattern*.pdf",
        "*$pattern*"
    )
    
    foreach ($searchPattern in $searchPatterns) {
        $files = Get-ChildItem -Path $sourceDir -Filter $searchPattern -ErrorAction SilentlyContinue
        
        if ($files) {
            # Берем первый найденный файл
            $sourceFile = $files[0]
            Copy-Item -Path $sourceFile.FullName -Destination $targetPath -Force
            Write-Host "✓ Скопирован: $($sourceFile.Name) -> $targetFileName"
            $copiedCount++
            $found = $true
            break
        }
    }
    
    if (-not $found) {
        Write-Host "✗ Не найден файл для: $targetFileName"
        $notFoundCount++
    }
}

Write-Host ""
Write-Host "Готово! Скопировано: $copiedCount файлов"
if ($notFoundCount -gt 0) {
    Write-Host "Не найдено: $notFoundCount файлов"
    Write-Host ""
    Write-Host "Пожалуйста, проверьте исходную папку и при необходимости скопируйте файлы вручную."
    Write-Host "Ожидаемые имена файлов:"
    foreach ($fileName in $fileMapping.Values) {
        Write-Host "  - $fileName"
    }
}

