/**
 * 云函数 - 字段迁移工具
 * 用于迁移数据库字段名称
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const CONFIRM_TOKEN = 'CONFIRM_MIGRATE_2025'

exports.main = async (event) => {
    const { action, confirmToken } = event

    if (confirmToken !== CONFIRM_TOKEN) {
        return { success: false, message: '确认令牌错误，请使用正确的令牌' }
    }

    const handlers = {
        check: checkStatus,
        migrateOpenid: migrateOpenidField,
        migrateName: migrateNameFields,
        rollbackOpenid: rollbackOpenidField
    }

    const handler = handlers[action]
    if (!handler) {
        return {
            success: false,
            message: '无效的操作类型',
            availableActions: Object.keys(handlers)
        }
    }

    return handler()
}

/**
 * 检查当前数据库字段状态
 */
async function checkStatus() {
    try {
        // 检查 users 集合的 openid 字段情况
        const [withOpenid, withUnderscoreOpenid, withBoth] = await Promise.all([
            db.collection('users').where({
                openid: _.exists(true),
                _openid: _.exists(false)
            }).count(),
            db.collection('users').where({
                _openid: _.exists(true),
                openid: _.exists(false)
            }).count(),
            db.collection('users').where({
                openid: _.exists(true),
                _openid: _.exists(true)
            }).count()
        ])

        // 检查 name 字段迁移情况
        const [studentsWithName, studentsWithStudentName] = await Promise.all([
            db.collection('students').where({ name: _.exists(true) }).count(),
            db.collection('students').where({ studentName: _.exists(true) }).count()
        ])

        const [usersWithName, usersWithUserName] = await Promise.all([
            db.collection('users').where({ name: _.exists(true) }).count(),
            db.collection('users').where({ userName: _.exists(true) }).count()
        ])

        return {
            success: true,
            message: '检查完成',
            status: {
                users_openid: {
                    only_openid: withOpenid.total,
                    only_underscore_openid: withUnderscoreOpenid.total,
                    both: withBoth.total,
                    needMigration: withOpenid.total > 0
                },
                students_name: {
                    with_name: studentsWithName.total,
                    with_studentName: studentsWithStudentName.total,
                    needMigration: studentsWithName.total > 0
                },
                users_name: {
                    with_name: usersWithName.total,
                    with_userName: usersWithUserName.total,
                    needMigration: usersWithName.total > 0
                }
            }
        }
    } catch (error) {
        console.error('检查状态失败:', error)
        return { success: false, message: '检查状态失败：' + error.message }
    }
}

/**
 * 迁移 openid → _openid
 */
async function migrateOpenidField() {
    try {
        // 获取所有使用 openid 字段的用户记录
        const MAX_LIMIT = 100
        let migrated = 0
        let hasMore = true

        while (hasMore) {
            const res = await db.collection('users')
                .where({
                    openid: _.exists(true)
                })
                .limit(MAX_LIMIT)
                .get()

            if (res.data.length === 0) {
                hasMore = false
                break
            }

            // 逐条更新
            for (const user of res.data) {
                await db.collection('users').doc(user._id).update({
                    data: {
                        _openid: user.openid,
                        openid: _.remove()
                    }
                })
                migrated++
            }

            if (res.data.length < MAX_LIMIT) {
                hasMore = false
            }
        }

        return {
            success: true,
            message: `openid 字段迁移完成`,
            migrated
        }
    } catch (error) {
        console.error('迁移 openid 失败:', error)
        return { success: false, message: '迁移失败：' + error.message }
    }
}

/**
 * 迁移 name → studentName/userName
 */
async function migrateNameFields() {
    try {
        const MAX_LIMIT = 100
        let studentsUpdated = 0
        let usersUpdated = 0

        // 迁移 students.name → students.studentName
        let hasMore = true
        while (hasMore) {
            const res = await db.collection('students')
                .where({ name: _.exists(true) })
                .limit(MAX_LIMIT)
                .get()

            if (res.data.length === 0) {
                hasMore = false
                break
            }

            for (const student of res.data) {
                await db.collection('students').doc(student._id).update({
                    data: {
                        studentName: student.name,
                        name: _.remove()
                    }
                })
                studentsUpdated++
            }

            if (res.data.length < MAX_LIMIT) {
                hasMore = false
            }
        }

        // 迁移 users.name → users.userName
        hasMore = true
        while (hasMore) {
            const res = await db.collection('users')
                .where({ name: _.exists(true) })
                .limit(MAX_LIMIT)
                .get()

            if (res.data.length === 0) {
                hasMore = false
                break
            }

            for (const user of res.data) {
                await db.collection('users').doc(user._id).update({
                    data: {
                        userName: user.name,
                        name: _.remove()
                    }
                })
                usersUpdated++
            }

            if (res.data.length < MAX_LIMIT) {
                hasMore = false
            }
        }

        return {
            success: true,
            message: 'name 字段迁移完成',
            studentsUpdated,
            usersUpdated
        }
    } catch (error) {
        console.error('迁移 name 失败:', error)
        return { success: false, message: '迁移失败：' + error.message }
    }
}

/**
 * 回滚 _openid → openid（如果需要）
 */
async function rollbackOpenidField() {
    try {
        const MAX_LIMIT = 100
        let rolledBack = 0
        let hasMore = true

        while (hasMore) {
            const res = await db.collection('users')
                .where({
                    _openid: _.exists(true),
                    openid: _.exists(false)
                })
                .limit(MAX_LIMIT)
                .get()

            if (res.data.length === 0) {
                hasMore = false
                break
            }

            for (const user of res.data) {
                await db.collection('users').doc(user._id).update({
                    data: {
                        openid: user._openid
                        // 不删除 _openid，因为微信可能会自动使用它
                    }
                })
                rolledBack++
            }

            if (res.data.length < MAX_LIMIT) {
                hasMore = false
            }
        }

        return {
            success: true,
            message: 'openid 字段回滚完成',
            rolledBack
        }
    } catch (error) {
        console.error('回滚 openid 失败:', error)
        return { success: false, message: '回滚失败：' + error.message }
    }
}
