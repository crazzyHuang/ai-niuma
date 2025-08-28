const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // 检查测试用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: 'demo@example.com' }
    });

    if (existingUser) {
      console.log('测试用户已存在，更新密码...');
      
      // 更新密码为demo123
      const hashedPassword = await bcrypt.hash('demo123', 12);
      await prisma.user.update({
        where: { email: 'demo@example.com' },
        data: { 
          password: hashedPassword,
          name: '演示用户'
        }
      });
      console.log('✅ 测试用户密码已更新');
    } else {
      console.log('创建新的测试用户...');
      
      // 创建新的测试用户
      const hashedPassword = await bcrypt.hash('demo123', 12);
      const user = await prisma.user.create({
        data: {
          email: 'demo@example.com',
          password: hashedPassword,
          name: '演示用户',
          role: 'user',
          plan: 'free'
        }
      });
      console.log('✅ 测试用户创建成功:', user.email);
    }

    console.log('\n🎯 测试用户信息:');
    console.log('邮箱: demo@example.com');
    console.log('密码: demo123');

  } catch (error) {
    console.error('❌ 创建测试用户失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行脚本
createTestUser();