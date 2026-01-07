/**
 * @file 缺勤通知服务
 * @module cloudfunctions/attendance/services/notification
 */

const { ATTENDANCE_STATUS } = require('../../../common')

/**
 * 检查缺勤情况并发送通知给班主任
 * @param {Object} db - 数据库实例
 * @param {Array<Object>} records - 考勤记录数组
 * @param {string} clubName - 社团名称
 * @param {string} date - 考勤日期
 * @returns {Promise<void>}
 */
async function checkAbsenceAndNotify(db, records, clubName, date) {
    try {
        const absentRecords = records.filter(r => r.status === ATTENDANCE_STATUS.ABSENT)

        if (absentRecords.length === 0) return

        const studentIds = absentRecords.map(r => r.studentId)
        const _ = db.command

        const studentsRes = await db.collection('students')
            .where({ _id: _.in(studentIds) })
            .get()

        const classCounts = {}
        studentsRes.data.forEach(student => {
            const className = student.className
            if (!classCounts[className]) {
                classCounts[className] = []
            }
            classCounts[className].push(student)
        })

        const classNames = Object.keys(classCounts)
        if (classNames.length === 0) return

        const allTeachersRes = await db.collection('users')
            .where({
                role: 'classTeacher',
                className: _.in(classNames),
                status: 'approved'
            })
            .get()

        const teachersByClass = {}
        allTeachersRes.data.forEach(teacher => {
            if (!teacher._openid) return
            if (!teachersByClass[teacher.className]) {
                teachersByClass[teacher.className] = []
            }
            teachersByClass[teacher.className].push(teacher)
        })

        // 批量创建通知
        const notifications = []
        for (const [className, students] of Object.entries(classCounts)) {
            const teachers = teachersByClass[className] || []
            if (teachers.length === 0) continue

            const studentNames = students.map(s => s.studentName).join('、')

            for (const classTeacher of teachers) {
                notifications.push({
                    type: 'absence_warning',
                    recipientId: classTeacher._openid,
                    title: `${clubName} 缺勤提醒`,
                    content: `您班有 ${students.length} 名学生在 ${date} 的 ${clubName} 社团活动中缺勤：${studentNames}`,
                    data: {
                        clubName,
                        date,
                        className,
                        studentIds: students.map(s => s._id),
                        studentNames
                    },
                    read: false,
                    createTime: db.serverDate()
                })
            }
        }

        // 批量写入通知（优化：减少数据库调用次数）
        if (notifications.length > 0) {
            const batchSize = 20
            for (let i = 0; i < notifications.length; i += batchSize) {
                const batch = notifications.slice(i, i + batchSize)
                await Promise.all(batch.map(n => db.collection('notifications').add({ data: n })))
            }
        }
    } catch (error) {
        console.error('创建缺勤通知失败:', error)
    }
}

module.exports = {
    checkAbsenceAndNotify
}
