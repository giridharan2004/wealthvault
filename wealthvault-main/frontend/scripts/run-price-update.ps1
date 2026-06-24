$ProjectDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LogDir = Join-Path $ProjectDir 'logs'
$LogFile = Join-Path $LogDir 'price-update.log'

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Set-Location $ProjectDir

$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
"[$timestamp] Starting price update" | Out-File -FilePath $LogFile -Append -Encoding utf8

npm run update:prices *>> $LogFile
$exitCode = $LASTEXITCODE

$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
"[$timestamp] Finished price update with exit code $exitCode" | Out-File -FilePath $LogFile -Append -Encoding utf8
"" | Out-File -FilePath $LogFile -Append -Encoding utf8

exit $exitCode
