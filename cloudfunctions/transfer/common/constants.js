// input: 无
// output: 云函数公共常量
// pos: 云函数层 > 公共模块 > 常量定义

/**
 * 云数据库单次查询最大限制
 */
const MAX_LIMIT = 100

/**
 * 用户角色枚举
 */
const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  CLASS_TEACHER: 'classTeacher',
  LEADER: 'leader'
}

/**
 * 用户状态枚举
 */
const USER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
}

/**
 * 考勤状态枚举
 */
const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent'
}

module.exports = {
  MAX_LIMIT,
  ROLES,
  USER_STATUS,
  ATTENDANCE_STATUS
}
