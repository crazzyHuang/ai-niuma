#!/usr/bin/env node
/**
 * API格式验证脚本
 * 
 * 检查所有API端点是否符合统一的响应格式标准
 */

const fs = require('fs');
const path = require('path');

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
 * 检查单个API文件的格式合规性
 */
function checkApiFileCompliance(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(API_DIR, filePath);
  
  const issues = [];
  
  // 检查是否导入了APIResponseHelper
  if (!content.includes('APIResponseHelper')) {
    issues.push('❌ 未导入 APIResponseHelper');
  }
  
  // 检查是否存在旧格式的返回
  const oldPatterns = [
    // 直接返回 { message: '...' }
    /return NextResponse\.json\(\s*{\s*message:\s*['"][^'"]*['"][^}]*}\s*,/g,
    // 直接返回 { error: '...' } (不是统一格式)
    /return NextResponse\.json\(\s*{\s*error:\s*['"][^'"]*['"],?\s*}\s*,/g,
    // 直接返回数据（没有包装）
    /return NextResponse\.json\(\s*[^{][\w\s\[\]]*[^}]\s*\)/g,
  ];
  
  for (const pattern of oldPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // 排除已经正确使用APIResponseHelper的情况
        if (!match.includes('APIResponseHelper')) {
          issues.push(`⚠️ 发现旧格式返回: ${match.substring(0, 50)}...`);
        }
      });
    }
  }
  
  // 检查是否正确使用了统一格式
  const correctUsageCount = (content.match(/APIResponseHelper\.(success|error)/g) || []).length;
  const returnStatementCount = (content.match(/return NextResponse\.json/g) || []).length;
  
  return {
    relativePath,
    issues,
    correctUsageCount,
    returnStatementCount,
    hasImport: content.includes('APIResponseHelper'),
    isCompliant: issues.length === 0
  };
}

/**
 * 生成合规性报告
 */
function generateComplianceReport(results) {
  const totalFiles = results.length;
  const compliantFiles = results.filter(r => r.isCompliant).length;
  const nonCompliantFiles = results.filter(r => !r.isCompliant);
  
  console.log('\n📊 API格式合规性报告');
  console.log('='.repeat(50));
  console.log(`总文件数: ${totalFiles}`);
  console.log(`✅ 合规文件: ${compliantFiles} (${Math.round(compliantFiles/totalFiles*100)}%)`);
  console.log(`❌ 不合规文件: ${nonCompliantFiles.length} (${Math.round(nonCompliantFiles.length/totalFiles*100)}%)`);
  
  if (nonCompliantFiles.length > 0) {
    console.log('\n❌ 不合规文件详情:');
    console.log('-'.repeat(50));
    
    nonCompliantFiles.forEach(file => {
      console.log(`\n📁 ${file.relativePath}`);
      console.log(`   导入状态: ${file.hasImport ? '✅' : '❌'}`);
      console.log(`   返回语句: ${file.returnStatementCount} 个`);
      console.log(`   正确使用: ${file.correctUsageCount} 个`);
      
      if (file.issues.length > 0) {
        console.log('   问题列表:');
        file.issues.forEach(issue => {
          console.log(`   - ${issue}`);
        });
      }
    });
  }
  
  console.log('\n🎯 统计摘要:');
  console.log('-'.repeat(50));
  const totalReturns = results.reduce((sum, r) => sum + r.returnStatementCount, 0);
  const totalCorrectUsage = results.reduce((sum, r) => sum + r.correctUsageCount, 0);
  const filesWithImport = results.filter(r => r.hasImport).length;
  
  console.log(`API导入率: ${filesWithImport}/${totalFiles} (${Math.round(filesWithImport/totalFiles*100)}%)`);
  console.log(`统一格式使用率: ${totalCorrectUsage}/${totalReturns} (${Math.round(totalCorrectUsage/totalReturns*100)}%)`);
  
  return {
    totalFiles,
    compliantFiles,
    nonCompliantFiles: nonCompliantFiles.length,
    complianceRate: Math.round(compliantFiles/totalFiles*100)
  };
}

/**
 * 主函数
 */
function main() {
  console.log('🔍 开始API格式合规性检查...');
  
  if (!fs.existsSync(API_DIR)) {
    console.error('❌ API目录不存在:', API_DIR);
    process.exit(1);
  }
  
  const apiFiles = getAllApiFiles(API_DIR);
  console.log(`📂 找到 ${apiFiles.length} 个API文件`);
  
  const results = apiFiles.map(file => {
    try {
      return checkApiFileCompliance(file);
    } catch (error) {
      console.error(`❌ 检查文件失败 ${file}:`, error.message);
      return null;
    }
  }).filter(Boolean);
  
  const report = generateComplianceReport(results);
  
  if (report.complianceRate === 100) {
    console.log('\n🎉 所有API文件都符合统一格式规范！');
  } else if (report.complianceRate >= 80) {
    console.log(`\n✅ 大部分API文件已经符合规范 (${report.complianceRate}%)`);
    console.log('💡 建议修复剩余的不合规文件');
  } else {
    console.log(`\n⚠️ 仍有较多文件需要修复 (合规率: ${report.complianceRate}%)`);
    console.log('🔧 建议运行 fix-api-format.js 脚本进行自动修复');
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { checkApiFileCompliance, getAllApiFiles };