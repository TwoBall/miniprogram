# 新功能实现计划（待实现）

> 此计划已暂缓，待有时间后实现。

## 一、统一首页架构

### 目标
将各角色的主页面整合为一个统一的「首页」，根据角色动态加载不同组件。

### 架构设计
```
Tab Bar（原生，2个Tab）
├── 首页 /pages/home/home（根据角色加载组件）
└── 我的 /pages/profile/profile（通用）
```

### 需要转换为组件的页面
| 原页面 | 转为组件 |
|--------|----------|
| `/pages/teacher/attendance/attendance` | `/components/attendance/index` |
| `/pages/classTeacher/overview/overview` | `/components/overview/index` |
| `/pages/leader/dashboard/dashboard` | `/components/dashboard/index` |
| `/pages/admin/approval/approval` | `/components/approval/index` |

### 修改要点
1. 创建 `pages/home/home` 统一首页
2. 将4个主页面的 wxml/wxss/js 转换为组件（Page→Component）
3. 首页根据 `userInfo.role` 条件渲染对应组件
4. 更新 `app.json` 的 tabBar 配置
5. 修改 `login.js` 和 `switchRole.js` 的跳转逻辑

---

## 二、转社团功能

### 业务流程
| 发起方 | 场景 | 审批流程 |
|--------|------|----------|
| 旧老师 | 转出学生 | 旧发起 → 新确认 → 班主任审批 |
| 新老师 | 搜索招入 | 新发起 → 旧确认 → 班主任审批 |
| 班主任 | 未入社学生入社 | 班主任发起 → 新老师确认 → 生效 |

### 新增数据库集合
```javascript
// transfer_requests
{
  studentId, studentName, className,
  fromClub, toClub,
  initiatorType: "fromTeacher" | "toTeacher" | "classTeacher",
  status: "pending_teacher" | "pending_classTeacher" | "approved" | "rejected",
  createTime, updateTime
}
```

### 需要创建的页面
- `pages/teacher/search/search` - 新老师搜索学生
- `pages/common/transfer/transfer` - 转社团申请列表
- `pages/classTeacher/addStudent/addStudent` - 班主任添加学生

---

## 三、多次未到标记

### 规则
- 统计周期：自然月
- 预警阈值：>=3次缺课
- 可见范围：所有角色

### 实现方式
实时计算，查询时统计当月缺课次数。

---

## 四、通知系统

### 通知类型
| type | 接收人 | 触发时机 |
|------|--------|----------|
| `absence_warning` | 班主任 | 学生月缺课>=3次 |
| `transfer_request` | 老师 | 收到转社团申请 |
| `transfer_result` | 发起人 | 申请结果 |
| `register_result` | 用户 | 注册审批结果 |

### 数据结构
```javascript
// notifications
{ type, recipientId, title, content, data, read, createTime }
```

---

## 五、个人中心页面

### 菜单结构
| 菜单项 | 图标 | 显示角色 |
|--------|------|----------|
| 通知中心 | `bell` | 所有 |
| 历史记录 | `records` | 社团老师 |
| 切换身份 | `exchange` | 所有 |
| 添加新身份 | `add-o` | 所有 |
| 添加学生 | `friends-o` | 班主任 |
| 转社团申请 | `orders-o` | 社团老师/班主任 |
| 使用帮助 | `question-o` | 所有 |
| 退出登录 | `revoke` | 所有 |

---

## 开发优先级

| 顺序 | 功能 | 预计时间 |
|------|------|----------|
| 1 | 统一首页架构 | 3小时 |
| 2 | 个人中心 + 通知系统 | 4小时 |
| 3 | 多次未到标记 | 2小时 |
| 4 | 转社团功能 | 6小时 |

**总计**：约15小时
