const profileBehavior = require('../../../behaviors/profileBehavior')

Page({
  behaviors: [profileBehavior],

  data: {
    role: 'classTeacher',
    tabIndex: 1
  },

  onShow() {
    this.loadProfileData()
  }
})
