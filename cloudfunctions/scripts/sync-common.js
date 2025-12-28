/**
 * 同步公共模块到所有云函数
 * 
 * 使用方式：
 *   node cloudfunctions/scripts/sync-common.js
 * 
 * 功能：
 *   1. 将 cloudfunctions/common/ 目录下的所有 .js 文件复制到各云函数的 common/ 子目录
 *   2. 支持增量更新和全量同步
 *   3. 自动创建目标目录
 */

const fs = require('fs')
const path = require('path')

// 需要同步的云函数目录
const CLOUD_FUNCTIONS = [
  'attendance',
  'students',
  'user',
  'export',
  'notification',
  'transfer',
  'submitFeedback'
]

// 公共模块源目录（相对于脚本位置）
const COMMON_SRC = path.join(__dirname, '..', 'common')

// 云函数根目录（相对于脚本位置）
const FUNCTIONS_ROOT = path.join(__dirname, '..')

/**
 * 复制文件
 */
function copyFile(src, dest) {
  const content = fs.readFileSync(src, 'utf8')
  fs.writeFileSync(dest, content, 'utf8')
}

/**
 * 获取文件的修改时间
 */
function getModTime(filePath) {
  try {
    return fs.statSync(filePath).mtimeMs
  } catch {
    return 0
  }
}

/**
 * 同步公共模块到指定云函数
 */
function syncToFunction(funcName, forceUpdate = false) {
  const targetDir = path.join(FUNCTIONS_ROOT, funcName, 'common')

  // 创建目标目录
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
    console.log(`  Created directory: ${funcName}/common/`)
  }

  // 获取所有 .js 文件
  const commonFiles = fs.readdirSync(COMMON_SRC)
    .filter(f => f.endsWith('.js'))

  let updatedCount = 0

  commonFiles.forEach(file => {
    const srcPath = path.join(COMMON_SRC, file)
    const destPath = path.join(targetDir, file)

    // 检查是否需要更新
    const srcModTime = getModTime(srcPath)
    const destModTime = getModTime(destPath)

    if (forceUpdate || srcModTime > destModTime) {
      copyFile(srcPath, destPath)
      console.log(`  Copied: ${funcName}/common/${file}`)
      updatedCount++
    }
  })

  return updatedCount
}

/**
 * 主函数
 */
function main() {
  console.log('========================================')
  console.log('  Cloud Functions Common Module Sync')
  console.log('========================================\n')

  // 检查参数
  const args = process.argv.slice(2)
  const forceUpdate = args.includes('--force') || args.includes('-f')

  if (forceUpdate) {
    console.log('Mode: Force update (overwrite all files)\n')
  } else {
    console.log('Mode: Incremental update (only changed files)\n')
  }

  // 检查源目录
  if (!fs.existsSync(COMMON_SRC)) {
    console.error(`Error: Common source directory not found: ${COMMON_SRC}`)
    process.exit(1)
  }

  // 统计
  let totalUpdated = 0
  let functionsProcessed = 0

  // 同步到各云函数
  CLOUD_FUNCTIONS.forEach(funcName => {
    const funcPath = path.join(FUNCTIONS_ROOT, funcName)

    // 检查云函数目录是否存在
    if (!fs.existsSync(funcPath)) {
      console.log(`⚠ Skipped: ${funcName}/ (directory not found)`)
      return
    }

    console.log(`→ Syncing to ${funcName}/`)
    const updated = syncToFunction(funcName, forceUpdate)
    totalUpdated += updated
    functionsProcessed++

    if (updated === 0) {
      console.log('  (no changes)')
    }
  })

  // 输出统计
  console.log('\n========================================')
  console.log(`  Summary:`)
  console.log(`  - Functions processed: ${functionsProcessed}`)
  console.log(`  - Files updated: ${totalUpdated}`)
  console.log('========================================\n')

  if (totalUpdated > 0) {
    console.log('✓ Sync completed successfully!')
    console.log('\nNext steps:')
    console.log('  1. Update cloud function imports to use ./common/ modules')
    console.log('  2. Test cloud functions locally')
    console.log('  3. Deploy cloud functions to cloud')
  } else {
    console.log('✓ All files are up to date.')
  }
}

// 执行
main()