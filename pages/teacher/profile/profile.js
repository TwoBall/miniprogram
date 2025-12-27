const profileBehavior = require('../../../behaviors/profileBehavior')

Page({
  behaviors: [profileBehavior],

  data: {
    role: 'teacher',
    tabIndex: 1  // 表示"我的"是第二个 Tab
  },

  onShow() {
    if (!this.checkAuth()) return
    this.loadProfileData()
  }
})
