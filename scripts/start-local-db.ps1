# Uruchamia lokalny PostgreSQL (klaster w .local-pgdata, port 5433)
$pgBin = "C:\Program Files\PostgreSQL\18\bin"
$dataDir = Join-Path (Split-Path $PSScriptRoot -Parent) ".local-pgdata"

if (-not (Test-Path "$dataDir\PG_VERSION")) {
  Write-Host "Inicjalizacja nowego klastra PostgreSQL w $dataDir ..."
  & "$pgBin\initdb.exe" -D $dataDir -U postgres -E UTF8 --locale=C --auth-local=trust --auth-host=trust
  (Get-Content "$dataDir\postgresql.conf") -replace "#port = 5432", "port = 5433" | Set-Content "$dataDir\postgresql.conf"
}

$status = & "$pgBin\pg_ctl.exe" -D $dataDir status 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "Uruchamianie PostgreSQL..."
  & "$pgBin\pg_ctl.exe" -D $dataDir -l "$dataDir\server.log" start
  Start-Sleep -Seconds 2
}

$dbExists = & "$pgBin\psql.exe" -h 127.0.0.1 -p 5433 -U postgres -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'rejestr_prac'" 2>$null
if (-not ($dbExists -match "1")) {
  Write-Host "Tworzenie bazy rejestr_prac..."
  & "$pgBin\createdb.exe" -h 127.0.0.1 -p 5433 -U postgres rejestr_prac
  & "$pgBin\psql.exe" -h 127.0.0.1 -p 5433 -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD 'admin';" | Out-Null
}

Write-Host "PostgreSQL gotowy: postgresql://postgres:admin@127.0.0.1:5433/rejestr_prac"
