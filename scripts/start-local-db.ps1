$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$pgCtl = Join-Path $projectRoot '.local/postgresql/pgsql/bin/pg_ctl.exe'
$dataDir = Join-Path $projectRoot '.local/pgdata'
$logFile = Join-Path $projectRoot '.local/postgresql.log'
if (!(Test-Path -LiteralPath $pgCtl) -or !(Test-Path -LiteralPath (Join-Path $dataDir 'PG_VERSION'))) {
    throw 'Local PostgreSQL is not initialized. See docs/LOCAL_DEVELOPMENT.md.'
}
& $pgCtl -D $dataDir status
if ($LASTEXITCODE -eq 0) { exit 0 }
& $pgCtl -D $dataDir -l $logFile -o '-h 127.0.0.1 -p 5432' start
exit $LASTEXITCODE
