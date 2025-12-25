const profileBehavior = require('../../../behaviors/profileBehavior')

Page({
  behaviors: [profileBehavior],

  data: {
    role: 'leader',
    tabIndex: 1
  },

  onShow() {
    this.loadProfileData()
  }
})
