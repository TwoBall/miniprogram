/**
 * 云函数 - 提交反馈
 * 班主任对学生缺课情况提交反馈信息
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/**
 * 云函数入口
 * @param {Object} event - 请求参数
 * @param {string} event.studentId - 学生ID
 * @param {string} event.feedback - 反馈内容
 */
exports.main = async (event, context) => {
  const { studentId, studentName, clubName, className, teacherName, feedback, date } = event

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
