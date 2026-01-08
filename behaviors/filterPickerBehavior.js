// input: 筛选选择器交互事件
// output: 筛选状态管理和级联选择逻辑
// pos: 主包 > behaviors > 筛选选择器通用行为

const request = require('../utils/request')

/**
 * 筛选选择器 Behavior
 * 提供学部、班级、社团的级联筛选功能
 *
 * 使用方式：
 * 1. 引入: const filterPickerBehavior = require('../../../behaviors/filterPickerBehavior')
 * 2. 混入: behaviors: [filterPickerBehavior]
 * 3. 调用: await this.loadFilterOptions() 加载筛选选项
 * 4. 绑定: bindchange="onDepartmentChange" 等事件
 *
 * 提供的数据：
 * - departments: 学部列表
 * - classes: 班级列表
 * - clubs: 社团列表
 * - filteredClasses: 根据学部筛选后的班级列表
 * - selectedDepartment: 选中的学部
 * - selectedClass: 选中的班级
 * - selectedClub: 选中的社团
 * - filterLoading: 加载状态
 * - hasFilter: 是否有筛选条件
 */
module.exports = Behavior({
  data: {
    // 筛选选项数据
    departments: [],
    classes: [],
    clubs: [],
    filteredClasses: [],
    classDeptMap: {},

    // 选中状态
    selectedDepartment: '',
    selectedDepartmentIndex: 0,
    selectedClass: '',
    selectedClassIndex: 0,
    selectedClub: '',
    selectedClubIndex: 0,

    // 加载状态
    filterLoading: false,

    // 是否有筛选条件
    hasFilter: false
  },

  methods: {
    /**
     * 加载筛选选项
     * @param {boolean} forceRefresh - 是否强制刷新缓存
     */
    async loadFilterOptions(forceRefresh = false) {
      this.setData({ filterLoading: true })

      try {
        const options = await request.getFilterOptions(forceRefresh)

        this.setData({
          departments: ['全部学部', ...options.departments],
          classes: ['全部班级', ...options.classes],
          clubs: ['全部社团', ...options.clubs],
          filteredClasses: ['全部班级', ...options.classes],
          classDeptMap: options.classDeptMap || {},
          filterLoading: false
        })
      } catch (error) {
        console.error('[filterPickerBehavior] loadFilterOptions error:', error)
        this.setData({ filterLoading: false })
      }
    },

    /**
     * 学部选择变化
     * @param {Object} e - 事件对象
     */
    onDepartmentChange(e) {
      const index = e.detail.value
      const department = this.data.departments[index]
      const isAll = index === 0 || department === '全部学部'

      this.setData({
        selectedDepartmentIndex: index,
        selectedDepartment: isAll ? '' : department,
        // 重置班级选择
        selectedClassIndex: 0,
        selectedClass: ''
      })

      // 根据学部筛选班级
      this._filterClassesByDepartment(isAll ? '' : department)
      this._updateHasFilter()

      // 触发筛选变化回调
      if (typeof this.onFilterChange === 'function') {
        this.onFilterChange()
      }
    },

    /**
     * 班级选择变化
     * @param {Object} e - 事件对象
     */
    onClassChange(e) {
      const index = e.detail.value
      const classList = this.data.filteredClasses
      const className = classList[index]
      const isAll = index === 0 || className === '全部班级'

      this.setData({
        selectedClassIndex: index,
        selectedClass: isAll ? '' : className
      })

      this._updateHasFilter()

      // 触发筛选变化回调
      if (typeof this.onFilterChange === 'function') {
        this.onFilterChange()
      }
    },

    /**
     * 社团选择变化
     * @param {Object} e - 事件对象
     */
    onClubChange(e) {
      const index = e.detail.value
      const club = this.data.clubs[index]
      const isAll = index === 0 || club === '全部社团'

      this.setData({
        selectedClubIndex: index,
        selectedClub: isAll ? '' : club
      })

      this._updateHasFilter()

      // 触发筛选变化回调
      if (typeof this.onFilterChange === 'function') {
        this.onFilterChange()
      }
    },

    /**
     * 重置所有筛选条件
     */
    resetFilter() {
      this.setData({
        selectedDepartment: '',
        selectedDepartmentIndex: 0,
        selectedClass: '',
        selectedClassIndex: 0,
        selectedClub: '',
        selectedClubIndex: 0,
        filteredClasses: this.data.classes,
        hasFilter: false
      })

      // 触发筛选变化回调
      if (typeof this.onFilterChange === 'function') {
        this.onFilterChange()
      }
    },

    /**
     * 根据学部筛选班级（私有方法）
     * @param {string} department - 学部名称
     * @private
     */
    _filterClassesByDepartment(department) {
      if (!department) {
        this.setData({
          filteredClasses: this.data.classes
        })
        return
      }

      const classDeptMap = this.data.classDeptMap
      const allClasses = this.data.classes.slice(1) // 去除"全部班级"

      const filtered = allClasses.filter(className => {
        return classDeptMap[className] === department
      })

      this.setData({
        filteredClasses: ['全部班级', ...filtered]
      })
    },

    /**
     * 更新是否有筛选条件（私有方法）
     * @private
     */
    _updateHasFilter() {
      const hasFilter = !!(
        this.data.selectedDepartment ||
        this.data.selectedClass ||
        this.data.selectedClub
      )
      this.setData({ hasFilter })
    },

    /**
     * 获取当前筛选条件
     * @returns {Object} 筛选条件对象
     */
    getFilterParams() {
      const params = {}

      if (this.data.selectedDepartment) {
        params.department = this.data.selectedDepartment
      }
      if (this.data.selectedClass) {
        params.className = this.data.selectedClass
      }
      if (this.data.selectedClub) {
        params.clubName = this.data.selectedClub
      }

      return params
    },

    /**
     * 获取筛选结果描述文本
     * @returns {string} 筛选描述
     */
    getFilterDescription() {
      const parts = []

      if (this.data.selectedDepartment) {
        parts.push(this.data.selectedDepartment)
      }
      if (this.data.selectedClass) {
        parts.push(this.data.selectedClass)
      }
      if (this.data.selectedClub) {
        parts.push(this.data.selectedClub)
      }

      return parts.length > 0 ? parts.join(' > ') : '全部'
    }
  }
})
