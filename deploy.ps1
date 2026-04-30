$ErrorActionPreference = "Stop"

$DB_NAME = "calendar_db"
$MIGRATIONS_DIR = "migrations"

function Run-Sql {
    param(
        [string]$File,
        [string]$Target = "local"
    )
    
    $flag = if ($Target -eq "remote") { "--remote" } else { "" }
    $label = if ($Target -eq "remote") { "远程" } else { "本地" }
    
    Write-Host "`n[$label] 执行: $File" -ForegroundColor Cyan
    $cmd = "npx wrangler d1 execute $DB_NAME $flag --file=$File"
    Invoke-Expression $cmd
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[$label] 执行失败: $File" -ForegroundColor Red
        return $false
    }
    Write-Host "[$label] 执行成功: $File" -ForegroundColor Green
    return $true
}

function Run-Schema {
    param([string]$Target = "local")
    Run-Sql -File "schema.sql" -Target $Target
}

function Run-Migrations {
    param([string]$Target = "local")
    
    $files = Get-ChildItem -Path $MIGRATIONS_DIR -Filter "*.sql" | Sort-Object Name
    if ($files.Count -eq 0) {
        Write-Host "没有找到迁移脚本" -ForegroundColor Yellow
        return
    }
    
    foreach ($file in $files) {
        $result = Run-Sql -File $file.FullName -Target $Target
        if (-not $result) {
            Write-Host "迁移中断" -ForegroundColor Red
            return
        }
    }
    Write-Host "`n所有迁移执行完成" -ForegroundColor Green
}

function Deploy-Worker {
    Write-Host "`n构建前端..." -ForegroundColor Cyan
    pnpm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "构建失败" -ForegroundColor Red
        return
    }
    Write-Host "构建成功" -ForegroundColor Green
    
    Write-Host "`n部署 Worker..." -ForegroundColor Cyan
    npx wrangler deploy
    if ($LASTEXITCODE -ne 0) {
        Write-Host "部署失败" -ForegroundColor Red
        return
    }
    Write-Host "部署成功" -ForegroundColor Green
}

$action = $args[0]

switch ($action) {
    "db:local" {
        Write-Host "=== 初始化本地数据库 ===" -ForegroundColor Yellow
        Run-Schema -Target "local"
    }
    "db:remote" {
        Write-Host "=== 初始化远程数据库 ===" -ForegroundColor Yellow
        Run-Schema -Target "remote"
    }
    "migrate:local" {
        Write-Host "=== 本地数据库迁移 ===" -ForegroundColor Yellow
        Run-Migrations -Target "local"
    }
    "migrate:remote" {
        Write-Host "=== 远程数据库迁移 ===" -ForegroundColor Yellow
        Run-Migrations -Target "remote"
    }
    "deploy" {
        Write-Host "=== 部署 Worker ===" -ForegroundColor Yellow
        Deploy-Worker
    }
    "deploy:full" {
        Write-Host "=== 完整部署 ===" -ForegroundColor Yellow
        Run-Migrations -Target "remote"
        Deploy-Worker
    }
    default {
        Write-Host @"
用法: .\deploy.ps1 <命令>

数据库:
  db:local          初始化本地数据库（schema.sql）
  db:remote         初始化远程数据库（schema.sql）

迁移:
  migrate:local     执行本地数据库迁移（migrations/）
  migrate:remote    执行远程数据库迁移（migrations/）

部署:
  deploy            构建前端 + 部署 Worker
  deploy:full       远程迁移 + 构建前端 + 部署 Worker
"@
    }
}
