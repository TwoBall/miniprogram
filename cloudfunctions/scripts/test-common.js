/**
 * 本地测试公共模块
 * 
 * 使用方式：
 *   node cloudfunctions/scripts/test-common.js
 * 
 * 功能：
 *   验证公共模块的语法正确性和基本功能
 */

const path = require('path')

console.log('========================================')
console.log('  Cloud Functions Common Module Test')
console.log('========================================\n')

// 测试列表
const tests = []
let passed = 0
let failed = 0

function test(name, fn) {
  tests.push({ name, fn })
}

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}\n  Expected: ${JSON.stringify(expected)}\n  Actual: ${JSON.stringify(actual)}`)
  }
}

function assertTrue(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

// ========== 测试用例 ==========

// 测试 constants.js
test('constants - MAX_LIMIT should be 100', () => {
  const { MAX_LIMIT } = require('../common/constants')
  assertEqual(MAX_LIMIT, 100, 'MAX_LIMIT should be 100')
})

test('constants - ROLES should have correct values', () => {
  const { ROLES } = require('../common/constants')
  assertEqual(ROLES.ADMIN, 'admin', 'ROLES.ADMIN')
  assertEqual(ROLES.TEACHER, 'teacher', 'ROLES.TEACHER')
  assertEqual(ROLES.CLASS_TEACHER, 'classTeacher', 'ROLES.CLASS_TEACHER')
  assertEqual(ROLES.LEADER, 'leader', 'ROLES.LEADER')
})

test('constants - USER_STATUS should have correct values', () => {
  const { USER_STATUS } = require('../common/constants')
  assertEqual(USER_STATUS.PENDING, 'pending', 'USER_STATUS.PENDING')
  assertEqual(USER_STATUS.APPROVED, 'approved', 'USER_STATUS.APPROVED')
  assertEqual(USER_STATUS.REJECTED, 'rejected', 'USER_STATUS.REJECTED')
})

// 测试 response-utils.js
test('response-utils - success() should return correct format', () => {
  const { success } = require('../common/response-utils')
  const result = success({ id: 1 }, '操作成功')
  assertEqual(result.success, true, 'success should be true')
  assertEqual(result.code, 0, 'code should be 0')
  assertEqual(result.message, '操作成功', 'message should match')
  assertEqual(result.data.id, 1, 'data should match')
})

test('response-utils - fail() should return correct format', () => {
  const { fail } = require('../common/response-utils')
  const result = fail('操作失败', 500)
  assertEqual(result.success, false, 'success should be false')
  assertEqual(result.code, 500, 'code should be 500')
  assertEqual(result.message, '操作失败', 'message should match')
})

test('response-utils - unauthorized() should return 401', () => {
  const { unauthorized } = require('../common/response-utils')
  const result = unauthorized('未授权')
  assertEqual(result.success, false, 'success should be false')
  assertEqual(result.code, 401, 'code should be 401')
})

test('response-utils - badRequest() should return 400', () => {
  const { badRequest } = require('../common/response-utils')
  const result = badRequest('参数错误')
  assertEqual(result.success, false, 'success should be false')
  assertEqual(result.code, 400, 'code should be 400')
})

test('response-utils - successWithPagination() should include pagination', () => {
  const { successWithPagination } = require('../common/response-utils')
  const pagination = { page: 1, pageSize: 20, total: 100, hasMore: true }
  const result = successWithPagination([{ id: 1 }], pagination)
  assertEqual(result.success, true, 'success should be true')
  assertTrue(result.pagination !== undefined, 'should have pagination')
  assertEqual(result.pagination.total, 100, 'pagination.total should be 100')
})

// 测试 sort-utils.js
test('sort-utils - zhCompare should compare Chinese strings', () => {
  const { zhCompare } = require('../common/sort-utils')
  assertTrue(zhCompare('啊', '吧') < 0, '啊 should come before 吧')
  assertTrue(zhCompare('张三', '李四') > 0, '张三 should come after 李四')
})

test('sort-utils - sortStudentsByName should sort by studentName', () => {
  const { sortStudentsByName } = require('../common/sort-utils')
  const students = [
    { studentName: '张三' },
    { studentName: '李四' },
    { studentName: '王五' }
  ]
  const sorted = sortStudentsByName([...students])
  assertEqual(sorted[0].studentName, '李四', 'First should be 李四')
  assertEqual(sorted[1].studentName, '王五', 'Second should be 王五')
  assertEqual(sorted[2].studentName, '张三', 'Third should be 张三')
})

test('sort-utils - sortOptions should sort with numeric support', () => {
  const { sortOptions } = require('../common/sort-utils')
  const options = ['10班', '2班', '1班', '3班']
  const sorted = sortOptions([...options])
  assertEqual(sorted, ['1班', '2班', '3班', '10班'], 'Should sort numerically')
})

// 测试 index.js 导出
test('index.js - should export all modules', () => {
  const common = require('../common')
  
  // 检查 db-utils
  assertTrue(typeof common.getAllData === 'function', 'should export getAllData')
  assertTrue(typeof common.paginate === 'function', 'should export paginate')
  
  // 检查 auth-utils
  assertTrue(typeof common.verifyAdmin === 'function', 'should export verifyAdmin')
  assertTrue(typeof common.verifyUser === 'function', 'should export verifyUser')
  
  // 检查 response-utils
  assertTrue(typeof common.success === 'function', 'should export success')
  assertTrue(typeof common.fail === 'function', 'should export fail')
  
  // 检查 sort-utils
  assertTrue(typeof common.sortStudentsByName === 'function', 'should export sortStudentsByName')
  
  // 检查 constants
  assertTrue(common.MAX_LIMIT === 100, 'should export MAX_LIMIT')
  assertTrue(common.ROLES !== undefined, 'should export ROLES')
})

// 测试各云函数的 common 目录
const cloudFunctions = ['attendance', 'students', 'user', 'export', 'notification', 'transfer', 'submitFeedback']

cloudFunctions.forEach(funcName => {
  test(`${funcName}/common - should be importable`, () => {
    const commonPath = path.join(__dirname, '..', funcName, 'common')
    const common = require(commonPath)
    assertTrue(typeof common.success === 'function', `${funcName}/common should export success`)
    assertTrue(common.MAX_LIMIT === 100, `${funcName}/common should export MAX_LIMIT`)
  })
})

// ========== 执行测试 ==========

console.log('Running tests...\n')

tests.forEach(({ name, fn }) => {
  try {
    fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (error) {
    console.log(`  ✗ ${name}`)
    console.log(`    Error: ${error.message}`)
    failed++
  }
})

console.log('\n========================================')
console.log(`  Results: ${passed} passed, ${failed} failed`)
console.log('========================================\n')

if (failed > 0) {
  console.log('❌ Some tests failed!')
  process.exit(1)
} else {
  console.log('✅ All tests passed!')
  console.log('\nNext steps:')
  console.log('  1. Open WeChat DevTools')
  console.log('  2. Right-click on cloud function → "Local Debug"')
  console.log('  3. Test with real data in the debug panel')
  console.log('  4. Deploy to test environment when ready')
}