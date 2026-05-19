# Uruchom lokalną bazę, backend i frontend (3 okna PowerShell)
$root = Split-Path $PSScriptRoot -Parent

& "$PSScriptRoot\start-local-db.ps1"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root'; node server.js"
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\client'; npm run dev"

Write-Host ""
Write-Host "Frontend: http://localhost:5173"
Write-Host "API:      http://localhost:3000"
Write-Host "Pierwsze konto: zarejestruj sie na /login (rola viewer), potem admin moze nadac uprawnienia w bazie."
