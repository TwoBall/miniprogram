const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// 配置信息
const CONFIG = {
    inputFile: '../学生社团明细表.xlsx',
    outputFile: '../students.json',
    // Excel 列名 -> 数据库字段名 映射
    mapping: {
        '学生姓名': 'name',
        '学部': 'department',
        '班级': 'className',
        '性别': 'gender',
        '所在社团': 'clubName',
        '班主任': 'classTeacher',
        '班主任联系方式': 'classTeacherPhone'
    }
};

function convert() {
    console.log('正在读取文件:', CONFIG.inputFile);

    const inputPath = path.resolve(__dirname, CONFIG.inputFile);
    if (!fs.existsSync(inputPath)) {
        console.error('错误: 找不到输入文件', inputPath);
        return;
    }

    // 读取 Excel
    const workbook = XLSX.readFile(inputPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 转换为 JSON 数组
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log(`成功读取 ${data.length} 条学生数据`);

    // 1. 处理学生数据
    const studentLines = data.map(row => {
        const item = {};
        for (const [excelKey, dbKey] of Object.entries(CONFIG.mapping)) {
            if (row[excelKey] !== undefined) {
                item[dbKey] = row[excelKey];
            } else {
                item[dbKey] = '';
            }
        }
        return JSON.stringify(item);
    }).join('\n');

    // 写入学生数据
    const studentOutputPath = path.resolve(__dirname, CONFIG.outputFile);
    fs.writeFileSync(studentOutputPath, studentLines, 'utf8');
    console.log('学生数据转换完成 ->', studentOutputPath);

    // 2. 提取班主任数据进行预注册
    const teachersMap = new Map();
    data.forEach(row => {
        const teacherName = row['班主任'];
        const className = row['班级'];
        const department = row['学部'];
        const phone = row['班主任联系方式'];

        if (teacherName && className) {
            // 使用姓名+班级作为唯一标识
            const key = `${teacherName}_${className}`;
            if (!teachersMap.has(key)) {
                teachersMap.set(key, {
                    name: teacherName,
                    role: 'classTeacher',
                    className: className,
                    department: department || '',
                    phone: phone || '',
                    status: 'approved', // 预注册自动通过
                    preRegistered: true, // 标记为预注册
                    createTime: { "$date": new Date().toISOString() },
                    updateTime: { "$date": new Date().toISOString() }
                });
            }
        }
    });

    const teacherLines = Array.from(teachersMap.values())
        .map(teacher => JSON.stringify(teacher))
        .join('\n');

    const teacherOutputFile = '../teachers_pre_reg.json';
    const teacherOutputPath = path.resolve(__dirname, teacherOutputFile);
    fs.writeFileSync(teacherOutputPath, teacherLines, 'utf8');

    console.log(`提取到 ${teachersMap.size} 位班主任数据 ->`, teacherOutputPath);
    console.log('\n导入建议:');
    console.log('1. 将 students.json 导入到 students 集合');
    console.log('2. 将 teachers_pre_reg.json 导入到 users 集合');
}

convert();
