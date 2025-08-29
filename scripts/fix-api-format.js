#!/usr/bin/env node
/**
 * API格式统一化脚本
 * 
 * 这个脚本会自动扫描和修复API端点的返回格式，使其符合统一标准
 */

const fs = require('fs');
const path = require('path');

// 需要修复的API文件模式
const API_PATTERNS = {
  // 旧的错误返回模式
  oldErrorPatterns: [
    /return NextResponse\.json\(\s*{\s*message:\s*['"](.*?)['"].*?}\s*,\s*{\s*status:\s*(\d+)\s*}\s*\)/g,
    /return NextResponse\.json\(\s*{\s*error:\s*['"](.*?)['"].*?}\s*,\s*{\s*status:\s*(\d+)\s*}\s*\)/g,
  ],
  
  // 旧的成功返回模式
  oldSuccessPatterns: [
    /return NextResponse\.json\(\s*([^,\s][^)]*)\s*\)/g,
    /return NextResponse\.json\(\s*{\s*message:\s*['"](.*?)['"],\s*(.*?)\s*}\s*\)/g,
  ]
};

// API文件目录
const API_DIR = path.join(__dirname, '../src/app/api');

/**
 * 递归获取所有API路由文件
 */
function getAllApiFiles(dir) {
  const files = [];
  
  function walkDir(currentPath) {
    const entries = fs.readdirSync(currentPath);
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (entry === 'route.ts') {
        files.push(fullPath);
      }
    }
  }
  
  walkDir(dir);
  return files;
}

/**
 * 检查文件是否已经导入了APIResponseHelper
 */
function hasApiHelperImport(content) {
  return content.includes('APIResponseHelper') || content.includes('@/types/api');
}

/**
 * 添加API Helper导入
 */
function addApiHelperImport(content) {
  if (hasApiHelperImport(content)) return content;
  
  // 找到最后一个import语句
  const importLines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < importLines.length; i++) {
    if (importLines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    }
  }
  
  if (lastImportIndex >= 0) {
    importLines.splice(lastImportIndex + 1, 0, "import { APIResponseHelper } from '@/types/api'");
    return importLines.join('\n');
  }
  
  return content;
}

/**
 * 修复错误返回格式
 */
function fixErrorResponses(content) {
  let fixed = content;
  
  // 修复 { message: '...' } 格式的错误返回
  fixed = fixed.replace(
    /return NextResponse\.json\(\s*{\s*message:\s*(['"][^'"]*['"])[^}]*}\s*,\s*{\s*status:\s*(\d+)\s*}\s*\)/g,
    (match, message, status) => {
      return `return NextResponse.json(\n        APIResponseHelper.error(${message}, 'API error'),\n        { status: ${status} }\n      )`;
    }
  );
  
  // 修复 { error: '...' } 格式但不是统一格式的错误返回
  fixed = fixed.replace(
    /return NextResponse\.json\(\s*{\s*error:\s*(['"][^'"]*['"])\s*}\s*,\s*{\s*status:\s*(\d+)\s*}\s*\)/g,
    (match, error, status) => {
      // 跳过已经是正确格式的
      if (match.includes('APIResponseHelper')) return match;
      return `return NextResponse.json(\n        APIResponseHelper.error(${error}, 'API error'),\n        { status: ${status} }\n      )`;
    }
  );
  
  return fixed;
}

/**
 * 修复成功返回格式
 */
function fixSuccessResponses(content) {
  let fixed = content;
  
  // 查找直接返回数据的模式（不包括已经使用APIResponseHelper的）
  const directReturnPattern = /return NextResponse\.json\(([^)]+)\)(?!\s*\/\/.*APIResponseHelper)/g;
  
  fixed = fixed.replace(directReturnPattern, (match, data) => {
    // 跳过已经正确格式化的
    if (data.includes('APIResponseHelper') || data.includes('success:')) {
      return match;
    }
    
    // 如果是简单数据，包装成正确格式
    if (!data.includes('{') || data.trim().startsWith('{') && !data.includes('success:')) {
      return `return NextResponse.json(\n        APIResponseHelper.success(${data.trim()})\n      )`;
    }
    
    return match;
  });
  
  return fixed;
}

/**
 * 检查和修复单个API文件
 */
function checkAndFixApiFile(filePath) {
  console.log(`检查文件: ${path.relative(API_DIR, filePath)}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // 添加import
  const withImport = addApiHelperImport(content);
  if (withImport !== content) {
    content = withImport;
    modified = true;
  }
  
  // 修复错误返回
  const withFixedErrors = fixErrorResponses(content);
  if (withFixedErrors !== content) {
    content = withFixedErrors;
    modified = true;
  }
  
  // 修复成功返回
  const withFixedSuccess = fixSuccessResponses(content);
  if (withFixedSuccess !== content) {
    content = withFixedSuccess;
    modified = true;
  }
  
  if (modified) {
    // 备份原文件
    const backupPath = filePath + '.backup';
    if (!fs.existsSync(backupPath)) {
      fs.writeFileSync(backupPath, fs.readFileSync(filePath));
    }
    
    // 写入修复后的内容
    fs.writeFileSync(filePath, content);
    console.log(`✅ 已修复: ${path.relative(API_DIR, filePath)}`);
  } else {
    console.log(`⏭️ 无需修复: ${path.relative(API_DIR, filePath)}`);
  }
  
  return modified;
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 开始API格式统一化...\n');
  
  if (!fs.existsSync(API_DIR)) {
    console.error('❌ API目录不存在:', API_DIR);
    process.exit(1);
  }
  
  const apiFiles = getAllApiFiles(API_DIR);
  console.log(`📂 找到 ${apiFiles.length} 个API文件\n`);
  
  let fixedCount = 0;
  
  for (const file of apiFiles) {
    try {
      if (checkAndFixApiFile(file)) {
        fixedCount++;
      }
    } catch (error) {
      console.error(`❌ 处理文件失败 ${file}:`, error.message);
    }
  }
  
  console.log(`\n🎉 完成! 共修复了 ${fixedCount} 个文件`);
  
  if (fixedCount > 0) {
    console.log('\n💡 提示:');
    console.log('- 备份文件已保存为 *.backup');
    console.log('- 请检查修复结果并测试API功能');
    console.log('- 确认无误后可删除备份文件');
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = {
  checkAndFixApiFile,
  getAllApiFiles
};