const profileBehavior = require('../../../behaviors/profileBehavior')

Page({
  behaviors: [profileBehavior],

  data: {
    role: 'admin',
    tabIndex: 1
  },

  onShow() {
    this.loadProfileData()
  }
})
