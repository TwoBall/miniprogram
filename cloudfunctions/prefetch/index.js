// input: 微信后台预拉取请求
// output: 用户基本信息和角色相关数据
// pos: 云函数层 > prefetch > 数据预拉取

/**
 * 数据预拉取云函数
 * 在小程序冷启动时被微信后台调用
 * 用于提前获取用户数据，加速首屏渲染
 */
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { success: false, error: 'No openid', data: null }
  }

  try {
    // 预拉取用户基本信息
    const userRes = await db.collection('users')
      .where({
        _openid: openid,
        status: 'approved'
      })
      .field({
        name: true,
        role: true,
        clubId: true,
        clubName: true,
        avatarUrl: true,
        department: true,
        className: true
      })
      .get()

    if (userRes.data.length === 0) {
      return {
        success: true,
        data: null,
        isNewUser: true,
        timestamp: Date.now()
      }
    }

    const user = userRes.data[0]
    let extraData = {}

    // 根据角色预拉取不同数据
    const today = new Date().toISOString().split('T')[0]

    switch (user.role) {
      case 'teacher':
        // 教师：预拉取今日点名状态和社团学生数
        try {
          const [attendanceRes, studentsRes] = await Promise.all([
            db.collection('attendance_records')
              .where({
                teacherId: openid,
                date: today
              })
              .count(),
            db.collection('students')
              .where({
                clubId: user.clubId
              })
              .count()
          ])

          extraData = {
            todayAttendanceCount: attendanceRes.total,
            totalStudents: studentsRes.total,
            hasAttendanceToday: attendanceRes.total > 0
          }
        } catch (e) {
          console.error('预拉取教师数据失败:', e)
        }
        break

      case 'classTeacher':
        // 班主任：预拉取班级学生数和今日考勤情况
        try {
          const studentsRes = await db.collection('students')
            .where({
              className: user.className
            })
            .count()

          extraData = {
            totalStudents: studentsRes.total
          }
        } catch (e) {
          console.error('预拉取班主任数据失败:', e)
        }
        break

      case 'admin':
        // 管理员：预拉取待审批数量
        try {
          const pendingRes = await db.collection('users')
            .where({
              status: 'pending'
            })
            .count()

          extraData = {
            pendingApprovalCount: pendingRes.total
          }
        } catch (e) {
          console.error('预拉取管理员数据失败:', e)
        }
        break

      case 'leader':
        // 领导：预拉取今日考勤概况
        // 暂不预拉取复杂数据，避免超时
        break

      default:
        break
    }

    return {
      success: true,
      data: {
        user,
        ...extraData
      },
      timestamp: Date.now()
    }
  } catch (error) {
    console.error('预拉取失败:', error)
    return {
      success: false,
      error: error.message,
      data: null
    }
  }
}
