/**
 * 数据库字段重命名工具
 * 用于批量修改导出的JSON文件中的字段名
 *
 * 使用方法：
 * 1. 将导出的JSON文件放在 data 文件夹中
 * 2. 运行: node rename-fields.js
 * 3. 修改后的文件会保存在 data/modified 文件夹中
 */

const fs = require('fs')
const path = require('path')

// 配置
const DATA_DIR = path.join(__dirname, 'data')
const OUTPUT_DIR = path.join(__dirname, 'data', 'modified')

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

/**
 * 重命名students集合的字段
 */
function renameStudentsFields(data) {
  return data.map(item => {
    const newItem = {}

    // 按原顺序重建对象，将 name 替换为 studentName
    for (const key in item) {
      if (key === 'name') {
        newItem.studentName = item.name
      } else {
        newItem[key] = item[key]
      }
    }

    return newItem
  })
}

/**
 * 重命名users集合的字段
 */
function renameUsersFields(data) {
  return data.map(item => {
    const newItem = {}

    // 按原顺序重建对象，将 name 替换为 userName
    for (const key in item) {
      if (key === 'name') {
        newItem.userName = item.name
      } else {
        newItem[key] = item[key]
      }
    }

    return newItem
  })
}

/**
 * 重命名attendance_records集合的字段
 */
function renameAttendanceFields(data) {
  return data.map(item => {
    const newItem = {}

    // 按原顺序重建对象，处理嵌套的records数组
    for (const key in item) {
      if (key === 'records' && Array.isArray(item.records)) {
        newItem.records = item.records.map(record => {
          const newRecord = {}
          for (const rKey in record) {
            if (rKey === 'name') {
              newRecord.studentName = record.name
            } else {
              newRecord[rKey] = record[rKey]
            }
          }
          return newRecord
        })
      } else {
        newItem[key] = item[key]
      }
    }

    return newItem
  })
}

/**
 * 重命名feedbacks集合的字段
 */
function renameFeedbacksFields(data) {
  return data.map(item => {
    const newItem = {}

    // 按原顺序重建对象，将 name 替换为 studentName（如果存在）
    for (const key in item) {
      if (key === 'name' && item.studentName === undefined) {
        newItem.studentName = item.name
      } else {
        newItem[key] = item[key]
      }
    }

    return newItem
  })
}

/**
 * 处理JSON文件
 */
function processFile(filename) {
  const inputPath = path.join(DATA_DIR, filename)
  const outputPath = path.join(OUTPUT_DIR, filename)

  console.log(`\n处理文件: ${filename}`)

  try {
    // 读取JSON文件（JSONL格式：每行一个JSON对象）
    const content = fs.readFileSync(inputPath, 'utf8')

    // 按行分割并解析每个JSON对象
    const lines = content.trim().split('\n')
    const data = lines.map(line => JSON.parse(line.trim()))

    // 根据文件名判断集合类型并处理
    let modifiedData
    let changeCount = 0

    if (filename.includes('students') || filename.includes('学生')) {
      console.log('  -> 识别为 students 集合')
      modifiedData = renameStudentsFields(data)
      changeCount = data.filter(item => item.name !== undefined).length

    } else if (filename.includes('users') || filename.includes('用户')) {
      console.log('  -> 识别为 users 集合')
      modifiedData = renameUsersFields(data)
      changeCount = data.filter(item => item.name !== undefined).length

    } else if (filename.includes('attendance') || filename.includes('考勤')) {
      console.log('  -> 识别为 attendance_records 集合')
      modifiedData = renameAttendanceFields(data)
      changeCount = data.filter(item =>
        item.records && item.records.some(r => r.name !== undefined)
      ).length

    } else if (filename.includes('feedback') || filename.includes('反馈')) {
      console.log('  -> 识别为 feedbacks 集合')
      modifiedData = renameFeedbacksFields(data)
      changeCount = data.filter(item => item.name !== undefined).length

    } else {
      console.log('  -> 未识别的集合类型，跳过')
      modifiedData = data
    }

    // 写入修改后的文件（JSONL格式：每行一个JSON对象）
    const outputContent = modifiedData.map(item => JSON.stringify(item)).join('\n')
    fs.writeFileSync(outputPath, outputContent, 'utf8')

    console.log(`  ✓ 处理完成`)
    console.log(`    原始记录数: ${data.length}`)
    console.log(`    修改记录数: ${changeCount}`)
    console.log(`    输出文件: ${outputPath}`)

    return { success: true, count: changeCount }

  } catch (error) {
    console.error(`  ✗ 处理失败: ${error.message}`)
    return { success: false, error: error.message }
  }
}

/**
 * 主函数
 */
function main() {
  console.log('====================================')
  console.log('数据库字段重命名工具')
  console.log('====================================')

  // 检查data目录是否存在
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`\n错误: 未找到 ${DATA_DIR} 目录`)
    console.log('\n请按以下步骤操作：')
    console.log('1. 在 tools 目录下创建 data 文件夹')
    console.log('2. 将导出的JSON文件放入 data 文件夹')
    console.log('3. 重新运行此脚本')
    return
  }

  // 读取所有JSON文件
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))

  if (files.length === 0) {
    console.log('\n未找到JSON文件')
    console.log('请将导出的JSON文件放入 tools/data 目录')
    return
  }

  console.log(`\n找到 ${files.length} 个JSON文件\n`)

  // 处理每个文件
  let totalSuccess = 0
  let totalFailed = 0
  let totalChanges = 0

  files.forEach(file => {
    const result = processFile(file)
    if (result.success) {
      totalSuccess++
      totalChanges += result.count
    } else {
      totalFailed++
    }
  })

  // 输出总结
  console.log('\n====================================')
  console.log('处理完成!')
  console.log('====================================')
  console.log(`成功: ${totalSuccess} 个文件`)
  console.log(`失败: ${totalFailed} 个文件`)
  console.log(`总共修改: ${totalChanges} 条记录`)
  console.log(`\n修改后的文件保存在: ${OUTPUT_DIR}`)
  console.log('\n下一步操作：')
  console.log('1. 检查修改后的JSON文件')
  console.log('2. 在云开发控制台删除对应集合的数据')
  console.log('3. 导入修改后的JSON文件')
}

// 运行
main()
