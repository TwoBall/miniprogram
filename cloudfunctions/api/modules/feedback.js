/**
 * @file 反馈提交模块
 * @module api/modules/feedback
 * @description 班主任对学生缺课情况提交反馈信息
 */
const { ROLES, success, fail, unauthorized } = require('../common')

/**
 * 前置钩子 - 权限验证
 */
async function beforeAction(action, data, ctx) {
    const { db, openid } = ctx
    const _ = db.command

    if (!openid) {
        return unauthorized('未授权访问')
    }

    // 验证用户是否有提交反馈权限（班主任、管理员）
    const userCheck = await db.collection('users')
        .where({
            _openid: openid,
            role: _.in(['classTeacher', 'admin']),
            status: 'approved'
        })
        .count()

    if (userCheck.total === 0) {
        return unauthorized('无权提交反馈')
    }

    return null
}

// ========== 处理函数 ==========

/**
 * 提交反馈
 */
async function handleSubmit(event, ctx) {
    const { studentId, studentName, clubName, className, teacherName, feedback, date } = event
    const { db } = ctx

    try {
        const result = await db.collection('feedbacks').add({
            data: {
                studentId,
                studentName,
                clubName,
                className,
                teacherName,
                feedback,
                date,
                createTime: db.serverDate()
            }
        })

        return success({ _id: result._id })
    } catch (error) {
        console.error('提交反馈失败:', error)
        return fail('提交失败')
    }
}

// 导出模块
module.exports = {
    beforeAction,
    handlers: {
        submit: handleSubmit
    }
}
