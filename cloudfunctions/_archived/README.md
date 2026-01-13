# _archived - 已归档云函数

<!-- 此目录包含已废弃的独立云函数，仅供参考，不再维护 -->

## 归档说明

这些云函数已于 2026-01 迁移至统一 API 云函数 (`api/`)，不再需要独立部署。

**归档原因**：
- 减少冷启动延迟（统一 API 共享实例）
- 简化部署和维护流程
- 前端已全部切换到 `callApi` 调用方式

## 归档的云函数

| 目录 | 原用途 | 迁移至 |
|------|--------|--------|
| `attendance/` | 考勤管理 | `api/modules/attendance.js` |
| `students/` | 学生管理 | `api/modules/students.js` |
| `user/` | 用户管理 | `api/modules/user.js` |
| `export/` | 数据导出 | `api/modules/export.js` |
| `notification/` | 通知推送 | `api/modules/notification.js` |
| `transfer/` | 转社团处理 | `api/modules/transfer.js` |
| `submitFeedback/` | 反馈提交 | `api/modules/feedback.js` |
| `system/` | 系统配置 | `api/modules/system.js` |

## 注意事项

1. **请勿部署**：这些云函数已废弃，请勿再次部署到云端
2. **仅供参考**：保留代码仅供历史参考和代码审计
3. **可以删除**：确认无需保留后可以删除整个 `_archived/` 目录

## 当前活跃的云函数

| 目录 | 用途 | 说明 |
|------|------|------|
| `api/` | 统一 API 入口 | 整合所有业务模块 |
| `cleanupRateLimits/` | 定时清理 | 定时触发器，必须独立 |
| `common/` | 公共模块源码 | 由同步脚本分发 |
| `scripts/` | 构建脚本 | 公共模块同步工具 |
