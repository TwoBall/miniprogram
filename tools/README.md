# tools - 开发工具模块

<!-- 一旦我所属的文件夹有所变化，请更新我 -->

## 架构说明

开发工具层提供数据处理和迁移相关的 Node.js 脚本，用于数据库维护和数据导入导出操作。

## 文件索引

- `convert.js` - Excel 数据转换工具，将学生社团明细表转换为 JSON 格式
- `rename-fields.js` - 数据库字段重命名工具，批量修改 JSON 文件中的字段名
- `LOCAL_IMPORT_GUIDE.md` - 本地修改 JSON 文件后导入的操作指南
- `package.json` - Node.js 依赖配置

## 工具说明

### convert.js - Excel 转 JSON

将 Excel 数据转换为可导入云数据库的 JSON 格式。

**功能**：
- 读取 `学生社团明细表.xlsx`
- 生成 `students.json`（学生数据）
- 生成 `teachers_pre_reg.json`（班主任预注册数据）

**使用方法**：
```bash
cd tools
npm install
node convert.js
```

**输出文件**：
- `students.json` → 导入到 `students` 集合
- `teachers_pre_reg.json` → 导入到 `users` 集合

### rename-fields.js - 字段重命名

批量修改已导出 JSON 文件中的字段名（如 `name` → `studentName`）。

**使用方法**：
1. 在 `tools/data/` 放入导出的 JSON 文件
2. 运行 `node rename-fields.js`
3. 修改后的文件保存在 `tools/data/modified/`

## 依赖

```json
{
  "dependencies": {
    "xlsx": "^0.18.5"
  }
}
```

## 注意事项

- 生成的 JSON 文件采用 JSON Lines 格式（每行一条记录）
- 导入时选择 "插入新记录" 模式
- 详细操作步骤请参考 `LOCAL_IMPORT_GUIDE.md`
