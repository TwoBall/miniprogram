# 第一阶段控制台操作指南

> **文档版本**：v1.0  
> **创建日期**：2024年12月  
> **关联文档**：[implementation-plan.md](./implementation-plan.md)

本指南提供阶段1中需要在云开发控制台完成的配置操作步骤。

---

## 一、T1.1 云函数频率限制配置

### 1.1 操作目标
为核心云函数配置资源维度和客户端维度的频率限制，防止恶意调用。

### 1.2 操作步骤

#### 步骤1：登录云开发控制台
1. 打开微信开发者工具
2. 点击左侧「云开发」按钮
3. 进入云开发控制台

#### 步骤2：配置 user 云函数限频
1. 点击左侧菜单「云函数」
2. 找到并点击 `user` 云函数
3. 点击「限频配置」标签
4. 配置以下规则：

| 配置项 | 值 | 说明 |
|-------|-----|------|
| 资源限频 | 150 QPS | 整体调用上限 |
| 客户端限频 | 10 QPS | 单用户调用上限 |
| 标识方式 | UserID | 按用户ID限频 |

5. 点击「保存」

#### 步骤3：配置其他云函数限频

重复步骤2，为以下云函数配置限频：

| 云函数 | 资源限频 | 客户端限频 | 标识方式 |
|--------|---------|-----------|---------|
| attendance | 200 QPS | 20 QPS | UserID |
| students | 100 QPS | 10 QPS | UserID |
| transfer | 50 QPS | 5 QPS | UserID |
| export | 30 QPS | 3 QPS | UserID |
| notification | 100 QPS | 10 QPS | UserID |
| submitFeedback | 30 QPS | 3 QPS | UserID |

### 1.3 验证方法
1. 配置完成后，可在「监控」标签查看限频生效情况
2. 可使用压测工具模拟高频调用，验证限频是否生效
3. 触发限频时，云函数会返回特定错误码

### 1.4 注意事项
- 限频规则保存后约1分钟生效
- 建议同时配置告警通知，当触发限频时发送提醒
- 初期可设置较宽松的阈值，观察实际调用情况后再调整

---

## 二、T1.2 云函数安全规则配置

### 2.1 操作目标
配置云函数调用权限，确保只有登录用户才能调用受保护的云函数。

### 2.2 操作步骤

#### 步骤1：进入权限控制页面
1. 在云开发控制台中，点击左侧菜单「设置」
2. 点击「安全配置」或「权限控制」
3. 选择「云函数」标签

#### 步骤2：编写安全规则
在安全规则编辑器中，输入以下 JSON 配置：

```json
{
  "*": {
    "invoke": "auth.uid != null"
  },
  "user": {
    "invoke": true
  },
  "submitFeedback": {
    "invoke": "auth.uid != null"
  }
}
```

#### 规则说明：
| 规则 | 含义 |
|------|------|
| `"*"` | 默认规则，适用于所有未单独配置的云函数 |
| `"auth.uid != null"` | 要求用户已登录（有 openid） |
| `"invoke": true` | 允许所有人调用（用于登录接口） |

#### 步骤3：保存并等待生效
1. 点击「保存」按钮
2. 等待1-3分钟，规则开始生效
3. 在测试环境验证规则是否正常工作

### 2.3 验证方法
1. 在未登录状态下调用受保护的云函数（如 attendance），应返回权限错误
2. 调用 user 云函数的 login action，应正常工作
3. 登录后调用受保护的云函数，应正常工作

### 2.4 回滚方案
如果规则配置错误导致业务中断，使用以下回滚配置：

```json
{
  "*": {
    "invoke": true
  }
}
```

---

## 三、T1.3 数据库安全规则配置

### 3.1 操作目标
为各数据库集合配置适当的读写权限，保护用户数据安全。

### 3.2 当前集合清单

根据项目 DATABASE_SCHEMA.md，需要配置以下集合：

| 集合名 | 用途 | 目标权限 |
|-------|------|---------|
| users | 用户信息 | CUSTOM |
| students | 学生信息 | CUSTOM |
| clubs | 社团信息 | READONLY |
| attendance_records | 考勤记录 | CUSTOM |
| transfer_requests | 转社团申请 | CUSTOM |
| notifications | 通知消息 | CUSTOM |
| system_feedback | 系统反馈 | CUSTOM |

### 3.3 操作步骤

#### 步骤1：进入数据库权限配置
1. 在云开发控制台中，点击左侧菜单「数据库」
2. 选择需要配置的集合
3. 点击「权限设置」

#### 步骤2：配置各集合权限

##### users 集合
```json
{
  "read": "auth.uid == doc._openid || resource.security.admin_check(auth.uid)",
  "write": "auth.uid == doc._openid"
}
```
- 用户只能读写自己的记录
- 管理员可读取所有用户

##### students 集合
```json
{
  "read": true,
  "write": false
}
```
- 所有登录用户可读取
- 仅云函数可写入

##### clubs 集合
```json
{
  "read": true,
  "write": false
}
```
- 所有登录用户可读取
- 仅云函数可写入

##### attendance_records 集合
```json
{
  "read": true,
  "write": false
}
```
- 所有登录用户可读取
- 仅云函数可写入

##### transfer_requests 集合
```json
{
  "read": "auth.uid == doc._openid || auth.uid == doc.approverOpenid",
  "write": "auth.uid == doc._openid && doc.status == 'pending'"
}
```
- 申请人和审批人可读取
- 仅申请人可写入待审批状态的申请

##### notifications 集合
```json
{
  "read": "auth.uid == doc.recipientId",
  "write": false
}
```
- 用户只能读取发送给自己的通知
- 仅云函数可写入

##### system_feedback 集合
```json
{
  "read": "auth.uid == doc._openid",
  "write": "auth.uid == doc._openid"
}
```
- 用户只能读写自己提交的反馈

### 3.4 简化方案（推荐）

如果上述细粒度规则配置复杂，可使用以下简化方案：

**对所有数据集合使用「仅云函数可写」权限**：
```json
{
  "read": true,
  "write": false
}
```

这样：
- 前端可读取数据展示
- 所有写入操作必须通过云函数（云函数中已有权限验证）
- 安全性由云函数代码保证

### 3.5 验证方法
1. 在前端尝试直接写入数据库，应被拒绝
2. 通过云函数写入数据，应正常工作
3. 用户A不能读取用户B的私有数据

### 3.6 回滚方案
如果规则配置错误，使用以下回滚配置：
```json
{
  "read": true,
  "write": true
}
```

---

## 四、验收检查清单

完成所有配置后，请按以下清单验收：

### T1.1 云函数限频验收
- [ ] user 云函数已配置限频 (150/10 QPS)
- [ ] attendance 云函数已配置限频 (200/20 QPS)
- [ ] students 云函数已配置限频 (100/10 QPS)
- [ ] transfer 云函数已配置限频 (50/5 QPS)
- [ ] export 云函数已配置限频 (30/3 QPS)
- [ ] notification 云函数已配置限频 (100/10 QPS)
- [ ] submitFeedback 云函数已配置限频 (30/3 QPS)
- [ ] 监控告警已配置

### T1.2 云函数安全规则验收
- [ ] 默认规则要求登录 (`auth.uid != null`)
- [ ] user 云函数允许匿名调用 (`true`)
- [ ] 未登录时无法调用 attendance 等受保护云函数
- [ ] 登录后可正常使用所有功能

### T1.3 数据库安全规则验收
- [ ] users 集合权限已配置
- [ ] students 集合权限已配置
- [ ] clubs 集合权限已配置
- [ ] attendance_records 集合权限已配置
- [ ] transfer_requests 集合权限已配置
- [ ] notifications 集合权限已配置
- [ ] system_feedback 集合权限已配置
- [ ] 前端直接写入被拒绝
- [ ] 云函数写入正常

---

## 五、故障排查

### 5.1 限频触发后如何处理
1. 检查是否有异常调用来源
2. 临时调高限频阈值
3. 分析日志找出高频调用原因

### 5.2 安全规则导致功能异常
1. 首先使用回滚配置恢复服务
2. 分析哪个规则导致问题
3. 调整规则后重新测试
4. 逐步启用安全规则

### 5.3 常见错误码
| 错误码 | 含义 | 处理方法 |
|-------|------|---------|
| -501000 | 无权限调用云函数 | 检查安全规则配置 |
| -502000 | 触发限频 | 降低调用频率或调高阈值 |
| -502002 | 数据库权限不足 | 检查集合权限配置 |

---

## 六、参考资料

- [云函数限频配置文档](https://docs.cloudbase.net/envconfig/ratelimit/intro)
- [云函数安全规则文档](https://docs.cloudbase.net/envconfig/scf-security)
- [数据库安全规则文档](https://docs.cloudbase.net/envconfig/db-security)

---

**文档结束**