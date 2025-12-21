// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const { studentId, studentName, clubName, className, teacherName, feedback, date } = event

  try {
    // 保存反馈记录
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
