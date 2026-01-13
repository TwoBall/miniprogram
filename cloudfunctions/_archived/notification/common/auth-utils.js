// input: 数据库实例、用户openid、角色要求
// output: 验证结果（用户信息或null）
// pos: 云函数层 > 公共模块 > 权限验证工具

const { ROLES, USER_STATUS } = require('./constants')

/**
 * 验证管理员权限
 * @param {Object} db - 数据库实例
 * @param {string} openid - 用户的openid
 * @param {Object} fields - 需要返回的字段，默认 { _id: true, userName: true }
 * @returns {Promise<Object|null>} 管理员信息或null
 */
async function verifyAdmin(db, openid, fields = { _id: true, userName: true }) {
  const res = await db.collection('users')
    .where({
      _openid: openid,
      role: ROLES.ADMIN,
      status: USER_STATUS.APPROVED
    })
    .field(fields)
    .get()

  return res.data.length > 0 ? res.data[0] : null
}

/**
 * 验证用户身份
 * @param {Object} db - 数据库实例
 * @param {string} openid - 用户的openid
 * @param {string|null} role - 要求的角色，null表示不限角色
 * @param {Object} fields - 需要返回的字段，默认返回全部
 * @returns {Promise<Object|null>} 用户信息或null
 */
async function verifyUser(db, openid, role = null, fields = null) {
  const condition = {
    _openid: openid,
    status: USER_STATUS.APPROVED
  }

  if (role) {
    condition.role = role
  }

  let query = db.collection('users').where(condition)
  if (fields) {
    query = query.field(fields)
  }

  const res = await query.get()
  return res.data.length > 0 ? res.data[0] : null
}

/**
 * 验证用户是否有指定角色之一
 * @param {Object} db - 数据库实例
 * @param {string} openid - 用户的openid
 * @param {Array<string>} roles - 允许的角色列表
 * @param {Object} fields - 需要返回的字段
 * @returns {Promise<Object|null>} 用户信息或null
 */
async function verifyUserRoles(db, openid, roles, fields = null) {
  const _ = db.command

  const condition = {
    _openid: openid,
    status: USER_STATUS.APPROVED,
    role: _.in(roles)
  }

  let query = db.collection('users').where(condition)
  if (fields) {
    query = query.field(fields)
  }

  const res = await query.get()
  return res.data.length > 0 ? res.data[0] : null
}

module.exports = {
  verifyAdmin,
  verifyUser,
  verifyUserRoles,
  ROLES,
  USER_STATUS
}
