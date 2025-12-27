/**
 * 云函数 - 提交反馈
 * 班主任对学生缺课情况提交反馈信息
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * 云函数入口
 * @param {Object} event - 请求参数
 * @param {string} event.studentId - 学生ID
 * @param {string} event.feedback - 反馈内容
 */
exports.main = async (event, context) => {
  const { studentId, studentName, clubName, className, teacherName, feedback, date } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  // 基本身份验证
  if (!openid) {
    return { success: false, message: '未授权访问' }
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
    return { success: false, message: '无权提交反馈' }
  }

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

    return {
      success: true,
      data: {
        _id: result._id
      }
    }
  } catch (error) {
    console.error('提交反馈失败:', error)
    return {
      success: false,
      message: '提交失败'
    }
  }
}
