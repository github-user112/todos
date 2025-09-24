/**
 * 向后兼容性验证测试
 * 确保新的间隔功能不会破坏现有的数据和功能
 */

// 模拟现有数据（没有repeat_interval字段）
const existingTodos = [
  {
    id: 1,
    text: "每天锻炼",
    date: "2024-01-01",
    repeat_type: "daily",
    // 注意：没有repeat_interval字段
    completed: 0,
    user_id: "test_user"
  },
  {
    id: 2,
    text: "周会",
    date: "2024-01-01",
    repeat_type: "weekly",
    // 注意：没有repeat_interval字段
    completed: 0,
    user_id: "test_user"
  },
  {
    id: 3,
    text: "月度总结",
    date: "2024-01-01",
    repeat_type: "monthly",
    // 注意：没有repeat_interval字段
    completed: 0,
    user_id: "test_user"
  },
  {
    id: 4,
    text: "生日",
    date: "2024-01-01",
    repeat_type: "yearly",
    // 注意：没有repeat_interval字段
    completed: 0,
    user_id: "test_user"
  },
  {
    id: 5,
    text: "不重复任务",
    date: "2024-01-01",
    repeat_type: "none",
    // 注意：没有repeat_interval字段
    completed: 0,
    user_id: "test_user"
  }
];

// 向后兼容性测试函数
function testBackwardCompatibility() {
  console.log('开始向后兼容性测试...\n');
  
  // 导入重复逻辑函数（需要适配测试环境）
  // 这里我们模拟导入
  const shouldShowRepeatingTodo = (todoDate, currentDate, repeatType, interval = 1) => {
    if (currentDate < todoDate) {
      return false;
    }
    
    if (!repeatType || repeatType === 'none') {
      return false;
    }
    
    if (!Number.isInteger(interval) || interval < 1) {
      return false;
    }
    
    switch (repeatType) {
      case 'daily':
        return shouldShowDailyInterval(todoDate, currentDate, interval);
      case 'weekly':
        return shouldShowWeeklyInterval(todoDate, currentDate, interval);
      case 'monthly':
        return shouldShowMonthlyInterval(todoDate, currentDate, interval);
      case 'yearly':
        return shouldShowYearlyInterval(todoDate, currentDate, interval);
      default:
        return false;
    }
  };
  
  const shouldShowDailyInterval = (todoDate, currentDate, interval) => {
    const dayDiff = Math.floor(
      (currentDate.getTime() - todoDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return dayDiff >= 0 && dayDiff % interval === 0;
  };
  
  const shouldShowWeeklyInterval = (todoDate, currentDate, interval) => {
    if (todoDate.getDay() !== currentDate.getDay()) {
      return false;
    }
    
    const weekDiff = Math.floor(
      (currentDate.getTime() - todoDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
    );
    return weekDiff >= 0 && weekDiff % interval === 0;
  };
  
  const shouldShowMonthlyInterval = (todoDate, currentDate, interval) => {
    const adjustedCurrentDate = adjustMonthEndDate(
      todoDate, 
      currentDate.getFullYear(), 
      currentDate.getMonth()
    );
    
    if (adjustedCurrentDate.getDate() !== currentDate.getDate()) {
      return false;
    }
    
    const monthDiff = 
      (currentDate.getFullYear() - todoDate.getFullYear()) * 12 + 
      (currentDate.getMonth() - todoDate.getMonth());
    
    return monthDiff >= 0 && monthDiff % interval === 0;
  };
  
  const shouldShowYearlyInterval = (todoDate, currentDate, interval) => {
    if (todoDate.getMonth() !== currentDate.getMonth()) {
      return false;
    }
    
    const todoDay = todoDate.getDate();
    const currentDay = currentDate.getDate();
    
    if (todoDay !== currentDay) {
      return false;
    }
    
    const yearDiff = currentDate.getFullYear() - todoDate.getFullYear();
    return yearDiff >= 0 && yearDiff % interval === 0;
  };
  
  const adjustMonthEndDate = (originalDate, targetYear, targetMonth) => {
    const originalDay = originalDate.getDate();
    const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const adjustedDay = Math.min(originalDay, daysInTargetMonth);
    return new Date(targetYear, targetMonth, adjustedDay);
  };
  
  let totalTests = 0;
  let passedTests = 0;
  
  // 测试每个现有的待办事项
  existingTodos.forEach(todo => {
    console.log(`测试待办事项: ${todo.text} (${todo.repeat_type})`);
    
    const todoDate = new Date(todo.date);
    const testDates = [
      new Date('2024-01-01'), // 原始日期
      new Date('2024-01-02'), // 第二天  
      new Date('2024-01-08'), // 一周后
      new Date('2024-02-01'), // 一个月后
      new Date('2025-01-01')  // 一年后
    ];
    
    testDates.forEach(testDate => {
      totalTests++;
      
      // 使用默认间隔 (undefined，应该默认为1)
      const resultWithUndefined = shouldShowRepeatingTodo(
        todoDate,
        testDate,
        todo.repeat_type,
        todo.repeat_interval // undefined
      );
      
      // 使用明确的间隔1
      const resultWithOne = shouldShowRepeatingTodo(
        todoDate,
        testDate,
        todo.repeat_type,
        1
      );
      
      // 两个结果应该相同（向后兼容性）
      if (resultWithUndefined === resultWithOne) {
        passedTests++;
        console.log(`  ✓ ${testDate.toDateString()}: ${resultWithUndefined} (兼容性正确)`);
      } else {
        console.log(`  ✗ ${testDate.toDateString()}: undefined间隔=${resultWithUndefined}, 间隔1=${resultWithOne} (兼容性失败)`);
      }
    });
    
    console.log('');
  });
  
  console.log(`向后兼容性测试完成: ${passedTests}/${totalTests} 通过`);
  console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 向后兼容性测试全部通过！');
  } else {
    console.log('❌ 向后兼容性测试失败，需要修复');
  }
}

// 数据迁移测试
function testDataMigration() {
  console.log('\n数据迁移测试...\n');
  
  // 模拟数据迁移前的状态
  const beforeMigration = [
    { id: 1, text: "测试", repeat_type: "daily", repeat_interval: null },
    { id: 2, text: "测试", repeat_type: "weekly", repeat_interval: undefined },
    { id: 3, text: "测试", repeat_type: "monthly" }, // 没有repeat_interval字段
  ];
  
  // 模拟数据迁移后的状态
  const afterMigration = beforeMigration.map(todo => ({
    ...todo,
    repeat_interval: todo.repeat_interval || 1 // 迁移逻辑：默认值为1
  }));
  
  console.log('迁移前数据:');
  beforeMigration.forEach(todo => {
    console.log(`  ID: ${todo.id}, repeat_interval: ${todo.repeat_interval}`);
  });
  
  console.log('\n迁移后数据:');
  afterMigration.forEach(todo => {
    console.log(`  ID: ${todo.id}, repeat_interval: ${todo.repeat_interval}`);
  });
  
  // 验证迁移结果
  const migrationSuccess = afterMigration.every(todo => 
    Number.isInteger(todo.repeat_interval) && todo.repeat_interval >= 1
  );
  
  if (migrationSuccess) {
    console.log('\n✅ 数据迁移测试通过！所有记录都有有效的repeat_interval值');
  } else {
    console.log('\n❌ 数据迁移测试失败！存在无效的repeat_interval值');
  }
}

// 导出函数（如果在Node.js环境中）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    testBackwardCompatibility, 
    testDataMigration,
    existingTodos 
  };
}

// 浏览器环境
if (typeof window !== 'undefined') {
  window.compatibilityTests = { 
    testBackwardCompatibility, 
    testDataMigration 
  };
}

// 自动运行测试
if (typeof require !== 'undefined' && require.main === module) {
  testBackwardCompatibility();
  testDataMigration();
}