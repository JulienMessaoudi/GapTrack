# Applique le thème global GapTrack sans toucher à la logique React.
# À lancer depuis la racine du projet : C:\dev\gaptrack

$ErrorActionPreference = "Stop"

$project = Get-Location
$stylesDir = Join-Path $project "src\styles"
$themeFile = Join-Path $stylesDir "gaptrack-global-theme.css"
$mainFile = Join-Path $project "src\main.tsx"

New-Item -ItemType Directory -Force $stylesDir | Out-Null
Copy-Item -Force ".\gaptrack-global-theme.css" $themeFile

if (!(Test-Path $mainFile)) {
  throw "Fichier introuvable : $mainFile"
}

$content = Get-Content $mainFile -Raw
$importLine = 'import "./styles/gaptrack-global-theme.css";'

if ($content -notlike "*$importLine*") {
  if ($content -like '*import "./index.css";*') {
    $content = $content.Replace('import "./index.css";', "import \"./index.css\";`r`n$importLine")
  } elseif ($content -like '*import ''./index.css'';*') {
    $content = $content.Replace("import './index.css';", "import './index.css';`r`n$importLine")
  } else {
    $content = $importLine + "`r`n" + $content
  }
  Set-Content -Path $mainFile -Value $content -Encoding UTF8
}

Write-Host "Theme GapTrack installe." -ForegroundColor Green
Write-Host "Fichier cree : src\styles\gaptrack-global-theme.css"
Write-Host "Import ajoute dans : src\main.tsx"
Write-Host "Relance ensuite : pnpm.cmd dev"
