/**
 * 重复事件功能测试
 * 用于验证新的间隔重复功能是否正常工作
 */

import { shouldShowRepeatingTodo, getNextRepeatDates, validateRepeatInterval } from '../src/utils/repeatUtils.js';

// 测试用例
const testCases = [
  // 每日间隔测试
  {
    name: '每2天重复',
    todoDate: new Date('2024-01-01'),
    repeatType: 'daily',
    interval: 2,
    testDates: [
      { date: new Date('2024-01-01'), expected: true },   // 原始日期
      { date: new Date('2024-01-02'), expected: false },  // 第二天
      { date: new Date('2024-01-03'), expected: true },   // 第三天（间隔2天）
      { date: new Date('2024-01-04'), expected: false },  // 第四天
      { date: new Date('2024-01-05'), expected: true },   // 第五天（间隔2天）
    ]
  },
  
  // 每周间隔测试
  {
    name: '每3周重复（周一）',
    todoDate: new Date('2024-01-01'), // 2024-01-01是周一
    repeatType: 'weekly',
    interval: 3,
    testDates: [
      { date: new Date('2024-01-01'), expected: true },   // 原始日期（周一）
      { date: new Date('2024-01-08'), expected: false },  // 1周后（周一）
      { date: new Date('2024-01-15'), expected: false },  // 2周后（周一）
      { date: new Date('2024-01-22'), expected: true },   // 3周后（周一）
      { date: new Date('2024-02-12'), expected: true },   // 6周后（周一）
    ]
  },
  
  // 每月间隔测试
  {
    name: '每2个月重复',
    todoDate: new Date('2024-01-15'),
    repeatType: 'monthly',
    interval: 2,
    testDates: [
      { date: new Date('2024-01-15'), expected: true },   // 原始日期
      { date: new Date('2024-02-15'), expected: false },  // 1个月后
      { date: new Date('2024-03-15'), expected: true },   // 2个月后
      { date: new Date('2024-04-15'), expected: false },  // 3个月后
      { date: new Date('2024-05-15'), expected: true },   // 4个月后
    ]
  },
  
  // 每年间隔测试
  {
    name: '每2年重复',
    todoDate: new Date('2024-03-15'),
    repeatType: 'yearly',
    interval: 2,
    testDates: [
      { date: new Date('2024-03-15'), expected: true },   // 原始日期
      { date: new Date('2025-03-15'), expected: false },  // 1年后
      { date: new Date('2026-03-15'), expected: true },   // 2年后
      { date: new Date('2027-03-15'), expected: false },  // 3年后
      { date: new Date('2028-03-15'), expected: true },   // 4年后
    ]
  },
  
  // 月末日期处理测试
  {
    name: '每月重复（月末日期处理）',
    todoDate: new Date('2024-01-31'), // 1月31日
    repeatType: 'monthly',
    interval: 1,
    testDates: [
      { date: new Date('2024-01-31'), expected: true },   // 原始日期
      { date: new Date('2024-02-29'), expected: true },   // 2月29日（闰年调整）
      { date: new Date('2024-03-31'), expected: true },   // 3月31日
      { date: new Date('2024-04-30'), expected: true },   // 4月30日（月末调整）
      { date: new Date('2024-05-31'), expected: true },   // 5月31日
    ]
  }
];

// 运行测试
function runTests() {
  console.log('开始测试重复事件间隔功能...\n');
  
  let totalTests = 0;
  let passedTests = 0;
  
  testCases.forEach(testCase => {
    console.log(`测试: ${testCase.name}`);
    console.log(`原始日期: ${testCase.todoDate.toDateString()}`);
    console.log(`重复类型: ${testCase.repeatType}, 间隔: ${testCase.interval}`);
    
    testCase.testDates.forEach(test => {
      totalTests++;
      const result = shouldShowRepeatingTodo(
        testCase.todoDate, 
        test.date, 
        testCase.repeatType, 
        testCase.interval
      );
      
      const passed = result === test.expected;
      if (passed) {
        passedTests++;
        console.log(`  ✓ ${test.date.toDateString()}: ${result} (预期: ${test.expected})`);
      } else {
        console.log(`  ✗ ${test.date.toDateString()}: ${result} (预期: ${test.expected})`);
      }
    });
    
    console.log('');
  });
  
  // 测试验证功能
  console.log('测试间隔验证功能...');
  const validationTests = [
    { type: 'daily', interval: 1, expected: true },
    { type: 'daily', interval: 365, expected: true },
    { type: 'daily', interval: 366, expected: false },
    { type: 'weekly', interval: 52, expected: true },
    { type: 'weekly', interval: 53, expected: false },
    { type: 'monthly', interval: 12, expected: true },
    { type: 'monthly', interval: 13, expected: false },
    { type: 'yearly', interval: 10, expected: true },
    { type: 'yearly', interval: 11, expected: false },
  ];
  
  validationTests.forEach(test => {
    totalTests++;
    const result = validateRepeatInterval(test.type, test.interval);
    const passed = result.valid === test.expected;
    if (passed) {
      passedTests++;
      console.log(`  ✓ ${test.type}间隔${test.interval}: ${result.valid ? '有效' : '无效'}`);
    } else {
      console.log(`  ✗ ${test.type}间隔${test.interval}: ${result.valid ? '有效' : '无效'} (预期: ${test.expected ? '有效' : '无效'})`);
      if (!result.valid) {
        console.log(`    错误信息: ${result.message}`);
      }
    }
  });
  
  // 测试获取下次重复日期功能
  console.log('\n测试获取下次重复日期功能...');
  const baseDate = new Date('2024-01-15');
  const nextDates = getNextRepeatDates(baseDate, 'weekly', 2, 3);
  
  console.log(`原始日期: ${baseDate.toDateString()}`);
  console.log('每2周重复，接下来3次:');
  nextDates.forEach((date, index) => {
    console.log(`  ${index + 1}. ${date.toDateString()}`);
  });
  
  // 测试结果总结
  console.log(`\n测试完成: ${passedTests}/${totalTests} 通过`);
  console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有测试通过！');
  } else {
    console.log('❌ 部分测试失败，需要检查实现');
  }
}

// 如果在Node.js环境中运行
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runTests };
}

// 如果在浏览器中运行
if (typeof window !== 'undefined') {
  window.repeatTestRunner = { runTests };
}

// 自动运行测试（仅在直接执行时）
if (typeof require !== 'undefined' && require.main === module) {
  runTests();
}